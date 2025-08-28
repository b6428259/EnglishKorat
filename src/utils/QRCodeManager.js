/**
 * QR Code generation utility for class attendance
 * Generates QR codes for classes and handles attendance check-in
 */

const crypto = require('crypto');
const { qrCodeConfig, fileNaming } = require('../config/upload');

// Helper function to format dates in local timezone
const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

class QRCodeManager {
  constructor() {
    this.config = qrCodeConfig;
  }

  // Generate QR code data for a class session
  generateQRData(classId, sessionDate, teacherId) {
    const timestamp = Date.now();
    const dateString = formatLocalDate(new Date(sessionDate));
    
    // Create unique QR code data
    const qrData = {
      prefix: this.config.prefix,
      classId,
      date: dateString,
      teacherId,
      timestamp,
      hash: this.generateHash(`${classId}-${dateString}-${teacherId}-${timestamp}`)
    };

    return JSON.stringify(qrData);
  }

  // Generate hash for QR code validation
  generateHash(data) {
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  // Validate QR code data
  validateQRCode(qrCodeData) {
    try {
      const data = JSON.parse(qrCodeData);
      
      // Check required fields
      if (!data.prefix || !data.classId || !data.date || !data.teacherId || !data.timestamp || !data.hash) {
        return { valid: false, error: 'Invalid QR code format' };
      }

      // Check prefix
      if (data.prefix !== this.config.prefix) {
        return { valid: false, error: 'Invalid QR code prefix' };
      }

      // Check expiration
      const qrTimestamp = new Date(data.timestamp);
      const now = new Date();
      const hoursDiff = (now - qrTimestamp) / (1000 * 60 * 60);
      
      if (hoursDiff > this.config.expirationHours) {
        return { valid: false, error: 'QR code has expired' };
      }

      // Validate hash
      const expectedHash = this.generateHash(`${data.classId}-${data.date}-${data.teacherId}-${data.timestamp}`);
      if (data.hash !== expectedHash) {
        return { valid: false, error: 'Invalid QR code hash' };
      }

      return { 
        valid: true, 
        data: {
          classId: data.classId,
          date: data.date,
          teacherId: data.teacherId,
          timestamp: data.timestamp
        }
      };
    } catch (error) {
      return { valid: false, error: 'Invalid QR code format' };
    }
  }

  // Generate QR code URL for frontend to create the actual QR image
  generateQRCodeURL(classId, sessionDate, teacherId) {
    const qrData = this.generateQRData(classId, sessionDate, teacherId);
    const encodedData = encodeURIComponent(qrData);
    
    // Return URL that frontend can use with QR code library
    return {
      data: qrData,
      url: `/api/v1/classes/${classId}/qr-check-in?data=${encodedData}`,
      size: this.config.size,
      expiresAt: new Date(Date.now() + this.config.expirationHours * 60 * 60 * 1000)
    };
  }

  // Generate filename for QR code image
  generateQRCodeFilename(classId, sessionDate) {
    return fileNaming.qrCode(classId, sessionDate);
  }

  // Clean up expired QR codes from database
  async cleanupExpiredQRCodes(knex) {
    try {
      const cutoffTime = new Date(Date.now() - this.config.expirationHours * 60 * 60 * 1000);
      
      const expiredQRCodes = await knex('class_sessions')
        .select('id', 'qr_code')
        .where('qr_generated_at', '<', cutoffTime)
        .whereNotNull('qr_code');

      if (expiredQRCodes.length > 0) {
        // Clear QR codes from database
        await knex('class_sessions')
          .whereIn('id', expiredQRCodes.map(q => q.id))
          .update({
            qr_code: null,
            qr_generated_at: null,
            updated_at: new Date()
          });

        console.log(`Cleaned up ${expiredQRCodes.length} expired QR codes`); // eslint-disable-line no-console
      }

      return expiredQRCodes.length;
    } catch (error) {
      throw new Error(`Error cleaning up expired QR codes: ${error.message}`);
    }
  }

  // Verify student check-in using QR code
  async verifyCheckIn(qrCodeData, studentId, knex) {
    try {
      const validation = this.validateQRCode(qrCodeData);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const { classId, date } = validation.data;

      // Find the class session
      const session = await knex('class_sessions')
        .select('class_sessions.*', 'classes.class_date')
        .leftJoin('classes', 'class_sessions.class_id', 'classes.id')
        .where('class_sessions.class_id', classId)
        .where('classes.class_date', date)
        .first();

      if (!session) {
        return { success: false, error: 'Class session not found' };
      }

      // Check if student is enrolled in this class
      const enrollment = await knex('enrollments')
        .leftJoin('course_groups', 'enrollments.course_group_id', 'course_groups.id')
        .leftJoin('classes', 'course_groups.id', 'classes.course_group_id')
        .where('enrollments.student_id', studentId)
        .where('classes.id', classId)
        .where('enrollments.status', 'active')
        .first();

      if (!enrollment) {
        return { success: false, error: 'Student not enrolled in this class' };
      }

      // Check if attendance already recorded
      const existingAttendance = await knex('student_attendance')
        .where('session_id', session.id)
        .where('student_id', studentId)
        .first();

      if (existingAttendance) {
        return { 
          success: true, 
          message: 'Attendance already recorded',
          attendance: existingAttendance
        };
      }

      // Record attendance
      const [attendanceId] = await knex('student_attendance').insert({
        session_id: session.id,
        student_id: studentId,
        status: 'present',
        check_in_time: new Date(),
        qr_check_in: true,
        created_at: new Date(),
        updated_at: new Date()
      });

      const attendance = await knex('student_attendance')
        .where('id', attendanceId)
        .first();

      return {
        success: true,
        message: 'Check-in successful',
        attendance
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get QR code statistics
  async getQRCodeStatistics(knex, dateFrom, dateTo) {
    try {
      let query = knex('student_attendance')
        .count('* as total_checkins')
        .sum('qr_check_in as qr_checkins')
        .leftJoin('class_sessions', 'student_attendance.session_id', 'class_sessions.id')
        .leftJoin('classes', 'class_sessions.class_id', 'classes.id');

      if (dateFrom) {
        query = query.where('classes.class_date', '>=', dateFrom);
      }
      if (dateTo) {
        query = query.where('classes.class_date', '<=', dateTo);
      }

      const result = await query.first();

      return {
        total_checkins: parseInt(result.total_checkins, 10),
        qr_checkins: parseInt(result.qr_checkins || 0, 10),
        manual_checkins: parseInt(result.total_checkins, 10) - parseInt(result.qr_checkins || 0, 10),
        qr_usage_rate: result.total_checkins > 0 ? 
          ((parseInt(result.qr_checkins || 0, 10) / parseInt(result.total_checkins, 10)) * 100).toFixed(2) : 0
      };
    } catch (error) {
      throw new Error(`Error getting QR code statistics: ${error.message}`);
    }
  }
}

module.exports = QRCodeManager;