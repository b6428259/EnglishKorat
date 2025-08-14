/**
 * Pricing Management Controller
 * Handles API endpoints for the comprehensive pricing system
 */

const asyncHandler = require('../middleware/asyncHandler');
const { db } = require('../config/database');
const PricingCalculationService = require('../services/PricingCalculationService');
const Course = require('../models/Course');

// @desc    Get all pricing categories
// @route   GET /api/v1/pricing/categories
// @access  Private
const getCategories = asyncHandler(async (req, res) => {
  const categories = await db('course_categories')
    .select('*')
    .where('active', true)
    .whereNotNull('code')
    .orderBy('sort_order', 'asc');

  res.json({
    success: true,
    count: categories.length,
    data: categories
  });
});

// @desc    Get all course durations
// @route   GET /api/v1/pricing/durations
// @access  Private
const getDurations = asyncHandler(async (req, res) => {
  const durations = await db('course_durations')
    .select('*')
    .where('active', true)
    .orderBy('hours', 'asc');

  res.json({
    success: true,
    count: durations.length,
    data: durations
  });
});

// @desc    Get all pricing tiers
// @route   GET /api/v1/pricing/tiers
// @access  Private
const getPricingTiers = asyncHandler(async (req, res) => {
  const tiers = await db('pricing_tiers')
    .select('*')
    .where('active', true)
    .orderBy('sort_order', 'asc');

  res.json({
    success: true,
    count: tiers.length,
    data: tiers
  });
});

// @desc    Get pricing matrix for a category and duration
// @route   GET /api/v1/pricing/matrix/:categoryId/:durationId
// @access  Private
const getPricingMatrix = asyncHandler(async (req, res) => {
  const { categoryId, durationId } = req.params;

  const pricingOptions = await PricingCalculationService.getAvailablePricingOptions(
    parseInt(categoryId),
    parseInt(durationId)
  );

  const summary = await PricingCalculationService.getCoursePricingSummary(
    parseInt(categoryId),
    parseInt(durationId)
  );

  res.json({
    success: true,
    data: {
      pricingOptions,
      summary
    }
  });
});

// @desc    Calculate pricing for specific parameters
// @route   POST /api/v1/pricing/calculate
// @access  Private
const calculatePricing = asyncHandler(async (req, res) => {
  const { categoryId, durationId, groupSize, waiveBookFee, discountPercentage } = req.body;

  if (!categoryId || !durationId || !groupSize) {
    return res.status(400).json({
      success: false,
      message: 'Category ID, Duration ID, and Group Size are required'
    });
  }

  const pricing = await PricingCalculationService.calculateCoursePricing(
    parseInt(categoryId),
    parseInt(durationId),
    parseInt(groupSize),
    {
      waiveBookFee: Boolean(waiveBookFee),
      discountPercentage: discountPercentage ? parseFloat(discountPercentage) : 0
    }
  );

  res.json({
    success: true,
    data: pricing
  });
});

// @desc    Calculate potential savings
// @route   POST /api/v1/pricing/savings
// @access  Private
const calculateSavings = asyncHandler(async (req, res) => {
  const { categoryId, durationId, currentGroupSize, newGroupSize } = req.body;

  if (!categoryId || !durationId || !currentGroupSize || !newGroupSize) {
    return res.status(400).json({
      success: false,
      message: 'All parameters are required'
    });
  }

  const savings = await PricingCalculationService.calculatePotentialSavings(
    parseInt(categoryId),
    parseInt(durationId),
    parseInt(currentGroupSize),
    parseInt(newGroupSize)
  );

  res.json({
    success: true,
    data: savings
  });
});

// @desc    Get course pricing information
// @route   GET /api/v1/pricing/course/:courseId
// @access  Private
const getCoursePricing = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { groupSize } = req.query;

  const course = new Course();
  const courseData = await course.findWithPricing(parseInt(courseId));

  if (!courseData) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  let pricingData = {
    course: courseData,
    pricingTiers: []
  };

  if (groupSize) {
    // Calculate pricing for specific group size
    pricingData.specificPricing = await course.calculatePricingForGroupSize(
      parseInt(courseId),
      parseInt(groupSize)
    );
  }

  // Get all available pricing tiers
  pricingData.pricingTiers = await course.getAvailablePricingTiers(parseInt(courseId));

  res.json({
    success: true,
    data: pricingData
  });
});

// @desc    Update course pricing configuration
// @route   PUT /api/v1/pricing/course/:courseId
// @access  Private (Admin/Owner)
const updateCoursePricing = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { categoryId, durationId, usesDynamicPricing, pricingNotes } = req.body;

  // Check permissions - only admin and owner can update pricing
  if (req.user.role !== 'owner' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or Owner role required.'
    });
  }

  const course = new Course();
  const existingCourse = await course.findById(parseInt(courseId));

  if (!existingCourse) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  // Check branch permissions
  if (req.user.role !== 'owner' && existingCourse.branch_id !== req.user.branch_id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Cannot update courses from other branches.'
    });
  }

  const updateData = {};
  
  if (categoryId !== undefined) updateData.category_id = categoryId;
  if (durationId !== undefined) updateData.duration_id = durationId;
  if (usesDynamicPricing !== undefined) updateData.uses_dynamic_pricing = usesDynamicPricing;
  if (pricingNotes !== undefined) updateData.pricing_notes = pricingNotes;

  await course.update(parseInt(courseId), updateData);

  const updatedCourse = await course.findWithPricing(parseInt(courseId));

  res.json({
    success: true,
    message: 'Course pricing updated successfully',
    data: updatedCourse
  });
});

// @desc    Recalculate enrollment pricing due to group changes
// @route   POST /api/v1/pricing/recalculate/:enrollmentId
// @access  Private (Admin/Owner)
const recalculateEnrollmentPricing = asyncHandler(async (req, res) => {
  const { enrollmentId } = req.params;
  const { newGroupSize, changeReason } = req.body;

  // Check permissions
  if (req.user.role !== 'owner' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or Owner role required.'
    });
  }

  if (!newGroupSize || !changeReason) {
    return res.status(400).json({
      success: false,
      message: 'New group size and change reason are required'
    });
  }

  const result = await PricingCalculationService.recalculatePricingForGroupChange(
    parseInt(enrollmentId),
    parseInt(newGroupSize),
    changeReason,
    req.user.id
  );

  res.json({
    success: true,
    message: 'Enrollment pricing recalculated successfully',
    data: result
  });
});

// @desc    Get pricing change history
// @route   GET /api/v1/pricing/history/:enrollmentId
// @access  Private
const getPricingHistory = asyncHandler(async (req, res) => {
  const { enrollmentId } = req.params;

  const history = await db('pricing_change_history')
    .select(
      'pricing_change_history.*',
      'users.first_name as processed_by_first_name',
      'users.last_name as processed_by_last_name'
    )
    .leftJoin('users', 'pricing_change_history.processed_by', 'users.id')
    .where('pricing_change_history.enrollment_id', parseInt(enrollmentId))
    .orderBy('pricing_change_history.created_at', 'desc');

  res.json({
    success: true,
    count: history.length,
    data: history
  });
});

// @desc    Get comprehensive pricing analytics
// @route   GET /api/v1/pricing/analytics
// @access  Private (Admin/Owner)
const getPricingAnalytics = asyncHandler(async (req, res) => {
  const { branchId, categoryId, dateFrom, dateTo } = req.query;

  // Check permissions
  if (req.user.role !== 'owner' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or Owner role required.'
    });
  }

  let query = db('enrollment_pricing')
    .join('enrollments', 'enrollment_pricing.enrollment_id', 'enrollments.id')
    .join('courses', 'enrollments.course_id', 'courses.id');

  // Apply branch filter
  if (branchId) {
    query = query.where('courses.branch_id', branchId);
  } else if (req.user.role !== 'owner') {
    query = query.where('courses.branch_id', req.user.branch_id);
  }

  if (categoryId) {
    query = query.where('courses.category_id', categoryId);
  }

  if (dateFrom) {
    query = query.where('enrollments.enrollment_date', '>=', dateFrom);
  }

  if (dateTo) {
    query = query.where('enrollments.enrollment_date', '<=', dateTo);
  }

  const analytics = await query
    .select(
      'enrollment_pricing.group_size_at_enrollment',
      db.raw('COUNT(*) as enrollment_count'),
      db.raw('AVG(enrollment_pricing.total_price_calculated) as avg_price'),
      db.raw('MIN(enrollment_pricing.total_price_calculated) as min_price'),
      db.raw('MAX(enrollment_pricing.total_price_calculated) as max_price'),
      db.raw('SUM(enrollment_pricing.total_price_calculated) as total_revenue')
    )
    .groupBy('enrollment_pricing.group_size_at_enrollment')
    .orderBy('enrollment_pricing.group_size_at_enrollment');

  // Get pricing change statistics
  const changeStats = await db('pricing_change_history')
    .join('enrollments', 'pricing_change_history.enrollment_id', 'enrollments.id')
    .join('courses', 'enrollments.course_id', 'courses.id')
    .select(
      'pricing_change_history.change_reason',
      db.raw('COUNT(*) as change_count'),
      db.raw('AVG(pricing_change_history.new_price - pricing_change_history.previous_price) as avg_price_change')
    )
    .groupBy('pricing_change_history.change_reason');

  res.json({
    success: true,
    data: {
      groupSizeAnalytics: analytics,
      pricingChangeStats: changeStats
    }
  });
});

module.exports = {
  getCategories,
  getDurations,
  getPricingTiers,
  getPricingMatrix,
  calculatePricing,
  calculateSavings,
  getCoursePricing,
  updateCoursePricing,
  recalculateEnrollmentPricing,
  getPricingHistory,
  getPricingAnalytics
};