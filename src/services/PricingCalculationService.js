/**
 * Pricing Calculation Service
 * Handles all pricing calculations for the comprehensive pricing structure
 * including group size changes, book fees, and discount applications.
 */

const db = require('../config/database');

class PricingCalculationService {
  
  /**
   * Calculate pricing for a course based on category, duration, and group size
   * @param {number} categoryId - Course category ID
   * @param {number} durationId - Course duration ID  
   * @param {number} groupSize - Number of students in group
   * @param {Object} options - Additional options
   * @returns {Object} Pricing calculation result
   */
  async calculateCoursePricing(categoryId, durationId, groupSize, options = {}) {
    try {
      // Determine pricing tier based on group size
      const pricingTier = await this.determinePricingTier(groupSize);
      
      if (!pricingTier) {
        throw new Error(`No pricing tier found for group size: ${groupSize}`);
      }

      // Get course pricing from matrix
      const coursePricing = await db('course_pricing')
        .select('*')
        .where('category_id', categoryId)
        .where('duration_id', durationId)
        .where('pricing_tier_id', pricingTier.id)
        .first();

      if (!coursePricing) {
        throw new Error(`No pricing found for category ${categoryId}, duration ${durationId}, tier ${pricingTier.id}`);
      }

      // Get category and duration details
      const category = await db('course_categories').where('id', categoryId).first();
      const duration = await db('course_durations').where('id', durationId).first();

      // Calculate pricing details
      const result = {
        category,
        duration,
        pricingTier,
        groupSize,
        basePrice: parseFloat(coursePricing.base_price),
        bookFee: options.waiveBookFee ? 0 : parseFloat(coursePricing.book_fee),
        totalPrice: options.waiveBookFee ? 
          parseFloat(coursePricing.base_price) : 
          parseFloat(coursePricing.total_price),
        pricePerHourPerPerson: parseFloat(coursePricing.price_per_hour_per_person),
        notes: coursePricing.notes,
        calculationDetails: {
          categoryCode: category.code,
          durationHours: duration.hours,
          tierType: pricingTier.tier_type,
          bookFeeWaived: options.waiveBookFee || false,
          discountApplied: options.discountPercentage || 0
        }
      };

      // Apply discount if specified
      if (options.discountPercentage && options.discountPercentage > 0) {
        const discountAmount = result.totalPrice * (options.discountPercentage / 100);
        result.discountAmount = discountAmount;
        result.finalPrice = result.totalPrice - discountAmount;
        result.calculationDetails.discountAmount = discountAmount;
      } else {
        result.finalPrice = result.totalPrice;
      }

      return result;

    } catch (error) {
      throw new Error(`Pricing calculation failed: ${error.message}`);
    }
  }

  /**
   * Determine pricing tier based on group size
   * @param {number} groupSize - Number of students
   * @returns {Object} Pricing tier object
   */
  async determinePricingTier(groupSize) {
    return await db('pricing_tiers')
      .where('min_students', '<=', groupSize)
      .where('max_students', '>=', groupSize)
      .where('active', true)
      .first();
  }

  /**
   * Recalculate pricing when group size changes
   * @param {number} enrollmentId - Enrollment ID
   * @param {number} newGroupSize - New group size
   * @param {string} changeReason - Reason for change
   * @param {number} processedBy - User ID who processed the change
   * @returns {Object} Recalculation result
   */
  async recalculatePricingForGroupChange(enrollmentId, newGroupSize, changeReason, processedBy) {
    try {
      // Get current enrollment and pricing details
      const enrollment = await db('enrollments')
        .join('courses', 'enrollments.course_id', 'courses.id')
        .join('enrollment_pricing', 'enrollments.id', 'enrollment_pricing.enrollment_id')
        .select(
          'enrollments.*',
          'courses.category_id',
          'courses.duration_id',
          'enrollment_pricing.group_size_at_enrollment as current_group_size',
          'enrollment_pricing.total_price_calculated as current_price',
          'enrollment_pricing.book_fee_waived'
        )
        .where('enrollments.id', enrollmentId)
        .first();

      if (!enrollment) {
        throw new Error(`Enrollment not found: ${enrollmentId}`);
      }

      // Calculate new pricing
      const newPricing = await this.calculateCoursePricing(
        enrollment.category_id,
        enrollment.duration_id,
        newGroupSize,
        { waiveBookFee: enrollment.book_fee_waived }
      );

      // Record pricing change history
      await db('pricing_change_history').insert({
        enrollment_id: enrollmentId,
        course_group_id: enrollment.course_group_id,
        previous_group_size: enrollment.current_group_size,
        new_group_size: newGroupSize,
        previous_price: enrollment.current_price,
        new_price: newPricing.finalPrice,
        change_reason: changeReason,
        change_details: JSON.stringify({
          previousTier: await this.determinePricingTier(enrollment.current_group_size),
          newTier: newPricing.pricingTier,
          pricingCalculation: newPricing.calculationDetails
        }),
        processed_by: processedBy
      });

      // Update enrollment pricing
      await db('enrollment_pricing')
        .where('enrollment_id', enrollmentId)
        .update({
          group_size_at_enrollment: newGroupSize,
          calculated_base_price: newPricing.basePrice,
          book_fee_applied: newPricing.bookFee,
          total_price_calculated: newPricing.finalPrice,
          pricing_calculation_details: JSON.stringify(newPricing.calculationDetails),
          updated_at: new Date()
        });

      // Update enrollment total amount
      await db('enrollments')
        .where('id', enrollmentId)
        .update({
          total_amount: newPricing.finalPrice,
          updated_at: new Date()
        });

      return {
        success: true,
        enrollmentId,
        previousGroupSize: enrollment.current_group_size,
        newGroupSize,
        previousPrice: enrollment.current_price,
        newPrice: newPricing.finalPrice,
        priceDifference: newPricing.finalPrice - enrollment.current_price,
        newPricingDetails: newPricing
      };

    } catch (error) {
      throw new Error(`Group pricing recalculation failed: ${error.message}`);
    }
  }

  /**
   * Get all available pricing options for a course category and duration
   * @param {number} categoryId - Course category ID
   * @param {number} durationId - Course duration ID
   * @returns {Array} Array of pricing options
   */
  async getAvailablePricingOptions(categoryId, durationId) {
    try {
      const pricingOptions = await db('course_pricing')
        .join('pricing_tiers', 'course_pricing.pricing_tier_id', 'pricing_tiers.id')
        .join('course_categories', 'course_pricing.category_id', 'course_categories.id')
        .join('course_durations', 'course_pricing.duration_id', 'course_durations.id')
        .select(
          'course_pricing.*',
          'pricing_tiers.tier_type',
          'pricing_tiers.display_name',
          'pricing_tiers.min_students',
          'pricing_tiers.max_students',
          'course_categories.name as category_name',
          'course_categories.code as category_code',
          'course_durations.name as duration_name',
          'course_durations.hours'
        )
        .where('course_pricing.category_id', categoryId)
        .where('course_pricing.duration_id', durationId)
        .where('course_pricing.active', true)
        .orderBy('pricing_tiers.sort_order');

      return pricingOptions.map(option => ({
        id: option.id,
        tierType: option.tier_type,
        displayName: option.display_name,
        minStudents: option.min_students,
        maxStudents: option.max_students,
        basePrice: parseFloat(option.base_price),
        bookFee: parseFloat(option.book_fee),
        totalPrice: parseFloat(option.total_price),
        pricePerHourPerPerson: parseFloat(option.price_per_hour_per_person),
        notes: option.notes,
        categoryName: option.category_name,
        categoryCode: option.category_code,
        durationName: option.duration_name,
        durationHours: option.hours
      }));

    } catch (error) {
      throw new Error(`Failed to get pricing options: ${error.message}`);
    }
  }

  /**
   * Calculate potential savings when students join a group
   * @param {number} categoryId - Course category ID
   * @param {number} durationId - Course duration ID
   * @param {number} currentGroupSize - Current group size
   * @param {number} newGroupSize - Potential new group size
   * @returns {Object} Savings calculation
   */
  async calculatePotentialSavings(categoryId, durationId, currentGroupSize, newGroupSize) {
    try {
      const currentPricing = await this.calculateCoursePricing(categoryId, durationId, currentGroupSize);
      const newPricing = await this.calculateCoursePricing(categoryId, durationId, newGroupSize);

      const savingsPerStudent = currentPricing.totalPrice - newPricing.totalPrice;
      const totalSavings = savingsPerStudent * newGroupSize;

      return {
        currentGroupSize,
        newGroupSize,
        currentPricePerStudent: currentPricing.totalPrice,
        newPricePerStudent: newPricing.totalPrice,
        savingsPerStudent,
        totalSavings,
        percentageSavings: ((savingsPerStudent / currentPricing.totalPrice) * 100).toFixed(2)
      };

    } catch (error) {
      throw new Error(`Savings calculation failed: ${error.message}`);
    }
  }

  /**
   * Get comprehensive pricing summary for a specific course configuration
   * @param {number} categoryId - Course category ID
   * @param {number} durationId - Course duration ID
   * @returns {Object} Complete pricing summary
   */
  async getCoursePricingSummary(categoryId, durationId) {
    try {
      const category = await db('course_categories').where('id', categoryId).first();
      const duration = await db('course_durations').where('id', durationId).first();
      const pricingOptions = await this.getAvailablePricingOptions(categoryId, durationId);

      return {
        category: {
          id: category.id,
          name: category.name,
          code: category.code,
          includesBookFee: category.includes_book_fee,
          defaultBookFee: parseFloat(category.default_book_fee)
        },
        duration: {
          id: duration.id,
          name: duration.name,
          hours: duration.hours,
          isPremium: duration.is_premium
        },
        pricingOptions,
        summary: {
          lowestPrice: Math.min(...pricingOptions.map(p => p.totalPrice)),
          highestPrice: Math.max(...pricingOptions.map(p => p.totalPrice)),
          averagePrice: pricingOptions.reduce((sum, p) => sum + p.totalPrice, 0) / pricingOptions.length,
          totalOptions: pricingOptions.length
        }
      };

    } catch (error) {
      throw new Error(`Failed to get pricing summary: ${error.message}`);
    }
  }
}

module.exports = new PricingCalculationService();