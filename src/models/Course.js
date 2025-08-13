/**
 * Course Model - extends BaseModel with course-specific operations
 */

const BaseModel = require('./BaseModel');

class Course extends BaseModel {
  constructor() {
    super('courses');
  }

  // Find courses with category information
  async findWithCategory(id) {
    try {
      return await this.knex(this.tableName)
        .select('courses.*', 'course_categories.name as category_name', 'course_categories.name_en as category_name_en', 'course_categories.type as category_type')
        .leftJoin('course_categories', 'courses.category_id', 'course_categories.id')
        .where('courses.id', id)
        .first();
    } catch (error) {
      throw new Error(`Error finding course with category: ${error.message}`);
    }
  }

  // Find courses by branch
  async findByBranch(branchId, options = {}) {
    try {
      return await this.findAll({ branch_id: branchId }, options);
    } catch (error) {
      throw new Error(`Error finding courses by branch: ${error.message}`);
    }
  }

  // Find courses by type
  async findByType(courseType, options = {}) {
    try {
      return await this.findAll({ course_type: courseType }, options);
    } catch (error) {
      throw new Error(`Error finding courses by type: ${error.message}`);
    }
  }

  // Find courses by category
  async findByCategory(categoryId, options = {}) {
    try {
      return await this.findAll({ category_id: categoryId }, options);
    } catch (error) {
      throw new Error(`Error finding courses by category: ${error.message}`);
    }
  }

  // Get course groups
  async getGroups(courseId) {
    try {
      return await this.knex('course_groups')
        .select('course_groups.*', 'teachers.first_name as teacher_first_name', 'teachers.last_name as teacher_last_name', 'rooms.room_name')
        .leftJoin('teachers', 'course_groups.teacher_id', 'teachers.id')
        .leftJoin('rooms', 'course_groups.room_id', 'rooms.id')
        .where('course_groups.course_id', courseId)
        .orderBy('course_groups.start_date', 'desc');
    } catch (error) {
      throw new Error(`Error getting course groups: ${error.message}`);
    }
  }

  // Get active enrollments count
  async getActiveEnrollments(courseId) {
    try {
      const [{ count }] = await this.knex('enrollments')
        .count('* as count')
        .where('course_id', courseId)
        .where('status', 'active');
      return parseInt(count, 10);
    } catch (error) {
      throw new Error(`Error getting active enrollments: ${error.message}`);
    }
  }

  // Get course statistics
  async getStatistics(courseId) {
    try {
      // Get basic stats
      const enrollmentStats = await this.knex('enrollments')
        .select('status')
        .count('* as count')
        .where('course_id', courseId)
        .groupBy('status');

      // Get revenue stats
      const revenueStats = await this.knex('enrollments')
        .sum('total_amount as total_revenue')
        .sum('paid_amount as paid_revenue')
        .where('course_id', courseId)
        .first();

      // Get completion rate
      const completionStats = await this.knex('enrollments')
        .select('status')
        .count('* as count')
        .where('course_id', courseId)
        .whereIn('status', ['completed', 'active'])
        .groupBy('status');

      return {
        enrollmentStats,
        revenueStats,
        completionStats
      };
    } catch (error) {
      throw new Error(`Error getting course statistics: ${error.message}`);
    }
  }

  // Search courses with filters
  async search(filters = {}, options = {}) {
    try {
      let query = this.knex(this.tableName)
        .select('courses.*', 'course_categories.name as category_name', 'course_categories.name_en as category_name_en', 'branches.name as branch_name')
        .leftJoin('course_categories', 'courses.category_id', 'course_categories.id')
        .leftJoin('branches', 'courses.branch_id', 'branches.id');

      if (filters.name) {
        query = query.whereRaw('LOWER(courses.name) LIKE ?', [`%${filters.name.toLowerCase()}%`]);
      }

      if (filters.branch_id) {
        query = query.where('courses.branch_id', filters.branch_id);
      }

      if (filters.course_type) {
        query = query.where('courses.course_type', filters.course_type);
      }

      if (filters.category_id) {
        query = query.where('courses.category_id', filters.category_id);
      }

      if (filters.status) {
        query = query.where('courses.status', filters.status);
      }

      if (filters.price_min) {
        query = query.where('courses.price', '>=', filters.price_min);
      }

      if (filters.price_max) {
        query = query.where('courses.price', '<=', filters.price_max);
      }

      if (filters.hours_min) {
        query = query.where('courses.hours_total', '>=', filters.hours_min);
      }

      if (filters.hours_max) {
        query = query.where('courses.hours_total', '<=', filters.hours_max);
      }

      // Apply options
      if (options.orderBy) {
        query = query.orderBy(options.orderBy, options.order || 'asc');
      } else {
        query = query.orderBy('courses.name', 'asc');
      }
      
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      if (options.offset) {
        query = query.offset(options.offset);
      }

      return await query;
    } catch (error) {
      throw new Error(`Error searching courses: ${error.message}`);
    }
  }

  // Get available courses for student based on CEFR level and preferences
  async getAvailableForStudent(studentId /* , options = {} */) {
    try {
      // Get student details first
      const student = await this.knex('students')
        .select('students.*', 'users.branch_id')
        .leftJoin('users', 'students.user_id', 'users.id')
        .where('students.id', studentId)
        .first();

      if (!student) {
        throw new Error('Student not found');
      }

      // Get courses suitable for the student
      let query = this.knex(this.tableName)
        .select('courses.*', 'course_categories.name as category_name', 'course_categories.name_en as category_name_en')
        .leftJoin('course_categories', 'courses.category_id', 'course_categories.id')
        .where('courses.branch_id', student.branch_id)
        .where('courses.status', 'active');

      // Filter based on student's preferred teacher type if specified
      if (student.preferred_teacher_type && student.preferred_teacher_type !== 'any') {
        query = query.whereExists(function() {
          this.select('*')
            .from('course_groups')
            .leftJoin('teachers', 'course_groups.teacher_id', 'teachers.id')
            .whereRaw('course_groups.course_id = courses.id')
            .where('teachers.teacher_type', student.preferred_teacher_type)
            .where('course_groups.status', 'ready_to_active');
        });
      }

      return await query;
    } catch (error) {
      throw new Error(`Error getting available courses for student: ${error.message}`);
    }
  }
}

module.exports = Course;