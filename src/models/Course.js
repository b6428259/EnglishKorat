/**
 * Course Model - extends BaseModel with course-specific operations
 * Enhanced with comprehensive pricing system integration
 */

const BaseModel = require('./BaseModel');
const PricingCalculationService = require('../services/PricingCalculationService');

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

  // Find courses with comprehensive pricing information
  async findWithPricing(id) {
    try {
      const course = await this.knex(this.tableName)
        .select(
          'courses.*',
          'course_categories.name as category_name',
          'course_categories.code as category_code',
          'course_durations.name as duration_name',
          'course_durations.hours as duration_hours',
          'course_durations.is_premium'
        )
        .leftJoin('course_categories', 'courses.category_id', 'course_categories.id')
        .leftJoin('course_durations', 'courses.duration_id', 'course_durations.id')
        .where('courses.id', id)
        .first();

      if (!course) {
        return null;
      }

      // Get pricing options if using dynamic pricing
      if (course.uses_dynamic_pricing && course.category_id && course.duration_id) {
        course.pricingOptions = await PricingCalculationService.getAvailablePricingOptions(
          course.category_id,
          course.duration_id
        );
        course.pricingSummary = await PricingCalculationService.getCoursePricingSummary(
          course.category_id,
          course.duration_id
        );
      }

      return course;
    } catch (error) {
      throw new Error(`Error finding course with pricing: ${error.message}`);
    }
  }

  // Calculate dynamic pricing for a specific group size
  async calculatePricingForGroupSize(courseId, groupSize, options = {}) {
    try {
      const course = await this.findById(courseId);
      if (!course) {
        throw new Error('Course not found');
      }

      if (!course.uses_dynamic_pricing || !course.category_id || !course.duration_id) {
        // Fall back to legacy pricing
        return {
          usesLegacyPricing: true,
          totalPrice: parseFloat(course.price),
          basePrice: parseFloat(course.price),
          bookFee: 0,
          pricePerHourPerPerson: parseFloat(course.price) / course.hours_total
        };
      }

      return await PricingCalculationService.calculateCoursePricing(
        course.category_id,
        course.duration_id,
        groupSize,
        options
      );
    } catch (error) {
      throw new Error(`Error calculating course pricing: ${error.message}`);
    }
  }

  // Get all pricing tiers for a course
  async getAvailablePricingTiers(courseId) {
    try {
      const course = await this.findById(courseId);
      if (!course) {
        throw new Error('Course not found');
      }

      if (!course.uses_dynamic_pricing || !course.category_id || !course.duration_id) {
        return [{
          tierType: 'legacy',
          displayName: 'Standard Pricing',
          totalPrice: parseFloat(course.price),
          minStudents: 1,
          maxStudents: course.max_students,
          usesLegacyPricing: true
        }];
      }

      return await PricingCalculationService.getAvailablePricingOptions(
        course.category_id,
        course.duration_id
      );
    } catch (error) {
      throw new Error(`Error getting pricing tiers: ${error.message}`);
    }
  }

  // Calculate potential savings when moving from individual to group
  async calculateGroupSavings(courseId, currentGroupSize, newGroupSize) {
    try {
      const course = await this.findById(courseId);
      if (!course) {
        throw new Error('Course not found');
      }

      if (!course.uses_dynamic_pricing || !course.category_id || !course.duration_id) {
        return {
          usesLegacyPricing: true,
          savingsPerStudent: 0,
          percentageSavings: 0
        };
      }

      return await PricingCalculationService.calculatePotentialSavings(
        course.category_id,
        course.duration_id,
        currentGroupSize,
        newGroupSize
      );
    } catch (error) {
      throw new Error(`Error calculating group savings: ${error.message}`);
    }
  }

  // Update course to use dynamic pricing
  async enableDynamicPricing(courseId, categoryId, durationId) {
    try {
      await this.update(courseId, {
        category_id: categoryId,
        duration_id: durationId,
        uses_dynamic_pricing: true,
        updated_at: new Date()
      });

      return await this.findWithPricing(courseId);
    } catch (error) {
      throw new Error(`Error enabling dynamic pricing: ${error.message}`);
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

  // Get course groups with pricing information
  async getGroups(courseId) {
    try {
      const groups = await this.knex('course_groups')
        .select('course_groups.*', 'teachers.first_name as teacher_first_name', 'teachers.last_name as teacher_last_name', 'rooms.room_name')
        .leftJoin('teachers', 'course_groups.teacher_id', 'teachers.id')
        .leftJoin('rooms', 'course_groups.room_id', 'rooms.id')
        .where('course_groups.course_id', courseId)
        .orderBy('course_groups.start_date', 'desc');

      // Add pricing information for each group
      const course = await this.findById(courseId);
      if (course && course.uses_dynamic_pricing) {
        for (const group of groups) {
          try {
            group.currentPricing = await this.calculatePricingForGroupSize(
              courseId,
              group.current_students || 1
            );
            if (group.target_students && group.target_students !== group.current_students) {
              group.targetPricing = await this.calculatePricingForGroupSize(
                courseId,
                group.target_students
              );
            }
          } catch (pricingError) {
            // Don't fail if pricing calculation fails
            console.warn(`Pricing calculation failed for group ${group.id}:`, pricingError.message);
          }
        }
      }

      return groups;
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

  // Get course statistics with pricing analytics
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

      // Get pricing analytics if using dynamic pricing
      let pricingAnalytics = null;
      const course = await this.findById(courseId);
      if (course && course.uses_dynamic_pricing) {
        const enrollmentPricing = await this.knex('enrollment_pricing')
          .join('enrollments', 'enrollment_pricing.enrollment_id', 'enrollments.id')
          .select(
            'enrollment_pricing.group_size_at_enrollment',
            'enrollment_pricing.total_price_calculated'
          )
          .avg('enrollment_pricing.total_price_calculated as avg_price')
          .min('enrollment_pricing.total_price_calculated as min_price')
          .max('enrollment_pricing.total_price_calculated as max_price')
          .count('* as pricing_records')
          .where('enrollments.course_id', courseId)
          .groupBy('enrollment_pricing.group_size_at_enrollment');

        pricingAnalytics = {
          pricesByGroupSize: enrollmentPricing,
          pricingChangeHistory: await this.knex('pricing_change_history')
            .join('enrollments', 'pricing_change_history.enrollment_id', 'enrollments.id')
            .select('pricing_change_history.*')
            .where('enrollments.course_id', courseId)
            .orderBy('pricing_change_history.created_at', 'desc')
            .limit(10)
        };
      }

      return {
        enrollmentStats,
        revenueStats,
        completionStats,
        pricingAnalytics
      };
    } catch (error) {
      throw new Error(`Error getting course statistics: ${error.message}`);
    }
  }

  // Search courses with filters (enhanced for pricing)
  async search(filters = {}, options = {}) {
    try {
      let query = this.knex(this.tableName)
        .select(
          'courses.*',
          'course_categories.name as category_name',
          'course_categories.name_en as category_name_en',
          'course_categories.code as category_code',
          'course_durations.name as duration_name',
          'course_durations.hours as duration_hours',
          'branches.name_en as branch_name_en',
          'branches.name_th as branch_name_th',
        )
        .leftJoin('course_categories', 'courses.category_id', 'course_categories.id')
        .leftJoin('course_durations', 'courses.duration_id', 'course_durations.id')
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

      if (filters.duration_id) {
        query = query.where('courses.duration_id', filters.duration_id);
      }

      if (filters.uses_dynamic_pricing !== undefined) {
        query = query.where('courses.uses_dynamic_pricing', filters.uses_dynamic_pricing);
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

      const courses = await query;

      // Add pricing information if requested
      if (options.includePricing) {
        for (const course of courses) {
          if (course.uses_dynamic_pricing && course.category_id && course.duration_id) {
            try {
              course.pricingOptions = await PricingCalculationService.getAvailablePricingOptions(
                course.category_id,
                course.duration_id
              );
            } catch (pricingError) {
              console.warn(`Failed to get pricing for course ${course.id}:`, pricingError.message);
            }
          }
        }
      }

      return courses;
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
        query = query.whereExists(function () {
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

module.exports = Course;