/**
 * Enhanced Notification Scheduler Service
 * Handles automated notifications including daily updates every 3 days at 09:00
 * and immediate status change notifications as specified in requirements
 */

const { db } = require('../config/database');
const NotificationService = require('../utils/NotificationService');
const cron = require('node-cron');

class NotificationSchedulerService {
  constructor() {
    this.notificationService = new NotificationService();
    this.initializeScheduledTasks();
  }

  /**
   * Initialize scheduled tasks
   */
  initializeScheduledTasks() {
    // Daily check at 09:00 for notifications every 3 days
    cron.schedule('0 9 * * *', async () => {
      await this.processDailyGroupUpdates();
    });

    // Hourly check for pending scheduled notifications
    cron.schedule('0 * * * *', async () => {
      await this.processPendingNotifications();
    });
  }

  /**
   * Process daily group updates (every 3 days)
   */
  async processDailyGroupUpdates() {
    try {
      const studentsForUpdate = await this.getStudentsForDailyUpdate();
      
      for (const student of studentsForUpdate) {
        await this.sendGroupUpdateNotification(student);
        await this.updateNotificationSchedule(student.user_id, 'daily_group_update');
      }

      console.log(`Processed ${studentsForUpdate.length} daily group updates`);
    } catch (error) {
      console.error('Error processing daily group updates:', error);
    }
  }

  /**
   * Get students who should receive daily updates (every 3 days)
   */
  async getStudentsForDailyUpdate() {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    
    return await db('students')
      .join('users', 'students.user_id', 'users.id')
      .leftJoin('notification_schedules', function() {
        this.on('notification_schedules.user_id', '=', 'users.id')
          .andOn('notification_schedules.notification_type', '=', db.raw('?', ['daily_group_update']));
      })
      .leftJoin('student_groups', 'students.id', 'student_groups.student_id')
      .leftJoin('course_groups', function() {
        this.on('student_groups.group_id', '=', 'course_groups.id')
          .andOn('student_groups.status', '=', db.raw('?', ['active']));
      })
      .select(
        'students.*',
        'users.line_id',
        'course_groups.current_students',
        'course_groups.target_students',
        'course_groups.required_cefr_level',
        'course_groups.required_age_group',
        'notification_schedules.last_sent_at'
      )
      .where('students.registration_status', 'in', ['finding_group', 'has_group_members'])
      .where('users.line_id', '!=', null)
      .where(function() {
        this.where('notification_schedules.last_sent_at', '<', threeDaysAgo)
          .orWhereNull('notification_schedules.last_sent_at');
      })
      .where('notification_schedules.active', true);
  }

  /**
   * Send group update notification in the specified format
   */
  async sendGroupUpdateNotification(student) {
    const nickname = student.nickname || student.first_name;
    let message;

    if (student.registration_status === 'finding_group') {
      message = `น้อง${nickname} วันนี้อัปเดตกลุ่มของคุณ: ระดับ ${student.cefr_level} ${this.getAgeGroupName(student.age_group)} ยังคงหากลุ่มอยู่ค่ะ กรุณารอสักครู่นะคะ 🔍`;
    } else if (student.current_students && student.target_students) {
      const remaining = student.target_students - student.current_students;
      if (remaining <= 0) {
        message = `น้อง${nickname} วันนี้อัปเดตกลุ่มของคุณ: ระดับ ${student.required_cefr_level} ${this.getAgeGroupName(student.required_age_group)} ตอนนี้มี ${student.current_students}/${student.target_students} คน พร้อมเปิดคลาสค่ะ 🎉`;
      } else {
        message = `น้อง${nickname} วันนี้อัปเดตกลุ่มของคุณ: ระดับ ${student.required_cefr_level} ${this.getAgeGroupName(student.required_age_group)} ตอนนี้มี ${student.current_students}/${student.target_students} คน เหลืออีก ${remaining} คนก็พร้อมเปิดคลาสค่ะ 🎉`;
      }
    } else {
      message = `น้อง${nickname} วันนี้อัปเดตกลุ่มของคุณ: ระดับ ${student.cefr_level} ${this.getAgeGroupName(student.age_group)} กำลังประมวลผลข้อมูลกลุ่มค่ะ 📊`;
    }

    try {
      await this.notificationService.sendLINENotification('group_update', student.user_id, {
        message,
        student_name: nickname,
        cefr_level: student.required_cefr_level || student.cefr_level,
        age_group: student.required_age_group || student.age_group,
        current_members: student.current_students || 0,
        target_members: student.target_students || 6
      }, db);

      console.log(`Sent group update to ${nickname} (${student.user_id})`);
    } catch (error) {
      console.error(`Failed to send group update to ${nickname}:`, error);
    }
  }

  /**
   * Send immediate status change notification
   */
  async sendStatusChangeNotification(student_id, oldStatus, newStatus, additionalData = {}) {
    try {
      const student = await db('students')
        .join('users', 'students.user_id', 'users.id')
        .select('students.*', 'users.line_id')
        .where('students.id', student_id)
        .first();

      if (!student || !student.line_id) {
        return false;
      }

      const nickname = student.nickname || student.first_name;
      const message = this.formatStatusChangeMessage(nickname, oldStatus, newStatus, additionalData);

      await this.notificationService.sendLINENotification('status_change', student.user_id, {
        message,
        old_status: oldStatus,
        new_status: newStatus,
        ...additionalData
      }, db);

      // Schedule next regular update
      await this.scheduleNextNotification(student.user_id, 'daily_group_update', 3);

      return true;
    } catch (error) {
      console.error('Error sending status change notification:', error);
      return false;
    }
  }

  /**
   * Format status change message
   */
  formatStatusChangeMessage(nickname, oldStatus, newStatus, additionalData) {
    switch (newStatus) {
      case 'has_group_members':
        return `น้อง${nickname} ยินดีด้วยค่ะ! ตอนนี้คุณมีสมาชิกกลุ่มแล้ว ${additionalData.current_members || 1} คน กำลังรอสมาชิกเพิ่มเติมเพื่อเปิดคลาสค่ะ ⏳`;
      
      case 'ready_to_open_class':
        return `น้อง${nickname} ยินดีด้วยค่ะ! กลุ่มของคุณพร้อมเปิดคลาสแล้ว 🎉 เราจะติดต่อกลับเพื่อจัดตารางเรียนในเร็วๆ นี้ค่ะ`;
      
      case 'arranging_schedule':
        return `น้อง${nickname} เราเริ่มจัดตารางเรียนสำหรับกลุ่มของคุณแล้วค่ะ กรุณารอการยืนยันตารางเรียนจากทีมงานนะคะ 📅`;
      
      case 'schedule_confirmed':
        const scheduleInfo = additionalData.schedule_info ? ` วันเวลา: ${additionalData.schedule_info}` : '';
        return `น้อง${nickname} ตารางเรียนของคุณได้รับการยืนยันแล้วค่ะ${scheduleInfo} เตรียมตัวเริ่มเรียนได้เลยนะคะ ✅`;
      
      case 'class_started':
        return `น้อง${nickname} ยินดีด้วยค่ะ! คลาสของคุณเริ่มแล้ว 🚀 ขอให้มีความสุขกับการเรียนรู้นะคะ`;
      
      case 'finding_group':
        if (oldStatus === 'has_group_members') {
          return `น้อง${nickname} กลุ่มเดิมของคุณมีการเปลี่ยนแปลง เราได้นำคุณกลับสู่ระบบหากลุ่มใหม่แล้วค่ะ กรุณารอสักครู่นะคะ 🔄`;
        }
        return `น้อง${nickname} เราเริ่มหากลุ่มที่เหมาะสมสำหรับคุณแล้วค่ะ กรุณารอการแจ้งเตือนนะคะ 🔍`;
      
      default:
        return `น้อง${nickname} สถานะของคุณได้รับการอัปเดตเป็น "${this.getStatusDisplayName(newStatus)}" แล้วค่ะ`;
    }
  }

  /**
   * Process pending scheduled notifications
   */
  async processPendingNotifications() {
    try {
      const pendingNotifications = await db('notification_schedules')
        .where('active', true)
        .where('next_send_at', '<=', new Date())
        .limit(50); // Process in batches

      for (const notification of pendingNotifications) {
        await this.processScheduledNotification(notification);
      }

      console.log(`Processed ${pendingNotifications.length} pending notifications`);
    } catch (error) {
      console.error('Error processing pending notifications:', error);
    }
  }

  /**
   * Process a single scheduled notification
   */
  async processScheduledNotification(notification) {
    try {
      const { user_id, notification_type, notification_data } = notification;
      
      switch (notification_type) {
        case 'daily_group_update':
          const student = await this.getStudentForUpdate(user_id);
          if (student) {
            await this.sendGroupUpdateNotification(student);
          }
          break;
        
        case 'payment_reminder':
          await this.sendPaymentReminder(user_id, notification_data);
          break;
        
        case 'waiting_discount_offer':
          await this.sendWaitingDiscountOffer(user_id, notification_data);
          break;
      }

      // Update next send time based on frequency
      await this.updateNextSendTime(notification);
    } catch (error) {
      console.error(`Error processing notification ${notification.id}:`, error);
    }
  }

  /**
   * Schedule next notification based on frequency
   */
  async scheduleNextNotification(user_id, notification_type, daysFromNow = 3) {
    const nextSendAt = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
    
    await db('notification_schedules')
      .where('user_id', user_id)
      .where('notification_type', notification_type)
      .update({
        next_send_at: nextSendAt,
        updated_at: new Date()
      });
  }

  /**
   * Update notification schedule after sending
   */
  async updateNotificationSchedule(user_id, notification_type) {
    const nextSendAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now

    await db('notification_schedules')
      .where('user_id', user_id)
      .where('notification_type', notification_type)
      .update({
        last_sent_at: new Date(),
        next_send_at: nextSendAt,
        updated_at: new Date()
      });
  }

  /**
   * Create notification schedule for a user
   */
  async createNotificationSchedule(user_id, notification_type, frequency = 'every_3_days', notification_data = {}) {
    const nextSendAt = this.calculateNextSendTime(frequency);
    
    await db('notification_schedules').insert({
      user_id,
      notification_type,
      frequency,
      next_send_at: nextSendAt,
      notification_data: JSON.stringify(notification_data),
      active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  /**
   * Calculate next send time based on frequency
   */
  calculateNextSendTime(frequency) {
    const now = new Date();
    
    switch (frequency) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'every_3_days':
        return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Get age group display name in Thai
   */
  getAgeGroupName(ageGroup) {
    switch (ageGroup) {
      case 'kids': return 'เด็ก';
      case 'students': return 'นักเรียน';
      case 'adults': return 'วัยทำงาน';
      default: return 'ทั่วไป';
    }
  }

  /**
   * Get status display name in Thai
   */
  getStatusDisplayName(status) {
    switch (status) {
      case 'finding_group': return 'กำลังหากลุ่ม';
      case 'has_group_members': return 'มีสมาชิกกลุ่มแล้ว';
      case 'ready_to_open_class': return 'พร้อมเปิดคลาส';
      case 'arranging_schedule': return 'กำลังจัดตารางเรียน';
      case 'schedule_confirmed': return 'ยืนยันตารางเรียนแล้ว';
      case 'class_started': return 'เริ่มเรียนแล้ว';
      case 'completed': return 'เสร็จสิ้น';
      case 'cancelled': return 'ยกเลิก';
      default: return status;
    }
  }

  /**
   * Get student for update
   */
  async getStudentForUpdate(user_id) {
    return await db('students')
      .join('users', 'students.user_id', 'users.id')
      .leftJoin('student_groups', 'students.id', 'student_groups.student_id')
      .leftJoin('course_groups', function() {
        this.on('student_groups.group_id', '=', 'course_groups.id')
          .andOn('student_groups.status', '=', db.raw('?', ['active']));
      })
      .select(
        'students.*',
        'users.line_id',
        'course_groups.current_students',
        'course_groups.target_students',
        'course_groups.required_cefr_level',
        'course_groups.required_age_group'
      )
      .where('users.id', user_id)
      .first();
  }

  /**
   * Update next send time for a notification schedule
   */
  async updateNextSendTime(notification) {
    let nextSendAt;
    
    switch (notification.frequency) {
      case 'daily':
        nextSendAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        break;
      case 'every_3_days':
        nextSendAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        nextSendAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'one_time':
        // Deactivate one-time notifications
        await db('notification_schedules').where('id', notification.id).update({ active: false });
        return;
      default:
        nextSendAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    }

    await db('notification_schedules').where('id', notification.id).update({
      last_sent_at: new Date(),
      next_send_at: nextSendAt,
      updated_at: new Date()
    });
  }
}

module.exports = NotificationSchedulerService;