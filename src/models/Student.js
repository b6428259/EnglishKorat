/**
 * Student Model - extends BaseModel with student-specific operations
 */

const BaseModel = require('./BaseModel');

class Student extends BaseModel {
  constructor() {
    super('students');
  }

  // Find student with user details
  async findWithUser(id) {
    try {
      return await this.knex(this.tableName)
        .select('students.*', 'users.username', 'users.email', 'users.phone', 'users.line_id', 'users.status as user_status', 'users.branch_id')
        .leftJoin('users', 'students.user_id', 'users.id')
        .where('students.id', id)
        .first();
    } catch (error) {
      throw new Error(`Error finding student with user details: ${error.message}`);
    }
  }

  // Find students by branch
  async findByBranch(branchId, options = {}) {
    try {
      return await this.findAll({ 'users.branch_id': branchId }, options);
    } catch (error) {
      throw new Error(`Error finding students by branch: ${error.message}`);
    }
  }

  // Find students by CEFR level
  async findByCefrLevel(cefrLevel, options = {}) {
    try {
      return await this.findAll({ cefr_level: cefrLevel }, options);
    } catch (error) {
      throw new Error(`Error finding students by CEFR level: ${error.message}`);
    }
  }

  // Get student enrollments
  async getEnrollments(studentId) {
    try {
      return await this.knex('enrollments')
        .select('enrollments.*', 'courses.name as course_name', 'courses.course_type', 'course_groups.group_name')
        .leftJoin('courses', 'enrollments.course_id', 'courses.id')
        .leftJoin('course_groups', 'enrollments.course_group_id', 'course_groups.id')
        .where('enrollments.student_id', studentId)
        .orderBy('enrollments.enrollment_date', 'desc');
    } catch (error) {
      throw new Error(`Error getting student enrollments: ${error.message}`);
    }
  }

  // Get student attendance summary
  async getAttendanceSummary(studentId, dateFrom, dateTo) {
    try {
      const query = this.knex('student_attendance')
        .select('student_attendance.status')
        .count('* as count')
        .leftJoin('class_sessions', 'student_attendance.session_id', 'class_sessions.id')
        .leftJoin('classes', 'class_sessions.class_id', 'classes.id')
        .where('student_attendance.student_id', studentId)
        .groupBy('student_attendance.status');

      if (dateFrom) {
        query.where('classes.class_date', '>=', dateFrom);
      }
      if (dateTo) {
        query.where('classes.class_date', '<=', dateTo);
      }

      return await query;
    } catch (error) {
      throw new Error(`Error getting attendance summary: ${error.message}`);
    }
  }

  // Get student documents
  async getDocuments(studentId) {
    try {
      return await this.knex('student_documents')
        .select('*')
        .where('student_id', studentId)
        .orderBy('uploaded_at', 'desc');
    } catch (error) {
      throw new Error(`Error getting student documents: ${error.message}`);
    }
  }

  // Get student progress
  async getProgress(studentId, limit = 10) {
    try {
      return await this.knex('student_progress')
        .select('student_progress.*', 'class_sessions.actual_start', 'classes.class_date')
        .leftJoin('class_sessions', 'student_progress.session_id', 'class_sessions.id')
        .leftJoin('classes', 'class_sessions.class_id', 'classes.id')
        .where('student_progress.student_id', studentId)
        .orderBy('classes.class_date', 'desc')
        .limit(limit);
    } catch (error) {
      throw new Error(`Error getting student progress: ${error.message}`);
    }
  }

  // Get leave credits summary
  async getLeaveCredits(studentId) {
    try {
      return await this.knex('student_groups')
        .select('student_groups.*', 'course_groups.group_name', 'courses.name as course_name')
        .leftJoin('course_groups', 'student_groups.group_id', 'course_groups.id')
        .leftJoin('courses', 'course_groups.course_id', 'courses.id')
        .where('student_groups.student_id', studentId)
        .where('student_groups.status', 'active');
    } catch (error) {
      throw new Error(`Error getting leave credits: ${error.message}`);
    }
  }

  // Search students with filters
  async search(filters = {}, options = {}) {
    try {
      let query = this.knex(this.tableName)
        .select('students.*', 'users.username', 'users.email', 'users.phone', 'users.branch_id')
        .leftJoin('users', 'students.user_id', 'users.id');

      if (filters.name) {
        query = query.where(function() {
          this.whereRaw('LOWER(students.first_name) LIKE ?', [`%${filters.name.toLowerCase()}%`])
            .orWhereRaw('LOWER(students.last_name) LIKE ?', [`%${filters.name.toLowerCase()}%`])
            .orWhereRaw('LOWER(students.nickname) LIKE ?', [`%${filters.name.toLowerCase()}%`]);
        });
      }

      if (filters.branch_id) {
        query = query.where('users.branch_id', filters.branch_id);
      }

      if (filters.cefr_level) {
        query = query.where('students.cefr_level', filters.cefr_level);
      }

      if (filters.age_min) {
        query = query.where('students.age', '>=', filters.age_min);
      }

      if (filters.age_max) {
        query = query.where('students.age', '<=', filters.age_max);
      }

      // Apply options
      if (options.orderBy) {
        query = query.orderBy(options.orderBy, options.order || 'asc');
      } else {
        query = query.orderBy('students.first_name', 'asc');
      }
      
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      if (options.offset) {
        query = query.offset(options.offset);
      }

      return await query;
    } catch (error) {
      throw new Error(`Error searching students: ${error.message}`);
    }
  }
}

module.exports = Student;