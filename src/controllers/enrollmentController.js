const { db } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const PricingCalculationService = require('../services/PricingCalculationService');
const Course = require('../models/Course');

// @desc    Enroll student in a course
// @route   POST /api/v1/enrollments
// @access  Private (Admin, Owner)
const enrollStudent = asyncHandler(async (req, res) => {
  const {
    student_id,
    course_id,
    course_group_id,
    payment_status = 'pending',
    total_amount,
    group_size,
    waive_book_fee = false,
    discount_percentage = 0,
    notes
  } = req.body;

  // Verify student exists and belongs to allowed branch
  const student = await db('students')
    .join('users', 'students.user_id', 'users.id')
    .select('students.*', 'users.branch_id')
    .where('students.id', student_id)
    .first();

  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'Student not found'
    });
  }

  // Check branch permissions
  if (req.user.role !== 'owner' && student.branch_id !== req.user.branch_id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Cannot enroll students from other branches.'
    });
  }

  // Verify course exists and belongs to allowed branch
  const course = await db('courses')
    .where('id', course_id)
    .where('status', 'active')
    .first();

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found or inactive'
    });
  }

  if (req.user.role !== 'owner' && course.branch_id !== req.user.branch_id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Cannot access other branch courses.'
    });
  }

  // Check if student is already enrolled in this course
  const existingEnrollment = await db('enrollments')
    .where('student_id', student_id)
    .where('course_id', course_id)
    .where('status', '!=', 'cancelled')
    .first();

  if (existingEnrollment) {
    return res.status(400).json({
      success: false,
      message: 'Student is already enrolled in this course'
    });
  }

  // Find applicable leave policy rule for this course
  const applicablePolicyRule = await db('leave_policy_rules')
    .where('branch_id', course.branch_id)
    .where('course_type', course.course_type)
    .where('course_hours', course.hours_total)
    .where('status', 'active')
    .where('effective_date', '<=', new Date())
    .where(function() {
      this.where('expiry_date', '>=', new Date())
        .orWhere('expiry_date', null);
    })
    .orderBy('effective_date', 'desc')
    .first();

  // Calculate leave credits based on policy rule or fallback to legacy logic
  let leaveCredits = 0;
  let policyRuleId = null;
  
  if (applicablePolicyRule) {
    leaveCredits = applicablePolicyRule.leave_credits;
    policyRuleId = applicablePolicyRule.id;
  } else {
    // Fallback to legacy logic for backward compatibility
    if (course.course_type.includes('conversation') || course.course_type.includes('4skills')) {
      leaveCredits = 2; // Group classes allow 2 leaves
    }
  }

  // Calculate pricing based on course configuration
  let calculatedPricing = null;
  let finalAmount = total_amount;
  let effectiveGroupSize = group_size || 1;

  if (course.uses_dynamic_pricing && course.category_id && course.duration_id) {
    // Use new comprehensive pricing system
    try {
      calculatedPricing = await PricingCalculationService.calculateCoursePricing(
        course.category_id,
        course.duration_id,
        effectiveGroupSize,
        {
          waiveBookFee: waive_book_fee,
          discountPercentage: discount_percentage
        }
      );
      finalAmount = calculatedPricing.finalPrice;
    } catch (pricingError) {
      return res.status(400).json({
        success: false,
        message: `Pricing calculation failed: ${pricingError.message}`
      });
    }
  } else {
    // Use legacy pricing if total_amount not provided
    if (!total_amount) {
      finalAmount = course.price;
    }
  }

  // Begin transaction for enrollment creation
  const trx = await db.transaction();

  try {
    // Create enrollment
    const [enrollmentId] = await trx('enrollments').insert({
      student_id,
      course_id,
      course_group_id,
      enrollment_date: new Date(),
      payment_status,
      total_amount: finalAmount,
      paid_amount: 0,
      leave_credits: leaveCredits,
      used_leaves: 0,
      leave_policy_rule_id: policyRuleId,
      status: 'active',
      notes
    });

    // Create detailed pricing record if using dynamic pricing
    if (calculatedPricing) {
      await trx('enrollment_pricing').insert({
        enrollment_id: enrollmentId,
        course_pricing_id: null, // Will be linked when we know the exact pricing record
        group_size_at_enrollment: effectiveGroupSize,
        calculated_base_price: calculatedPricing.basePrice,
        book_fee_applied: calculatedPricing.bookFee,
        total_price_calculated: calculatedPricing.finalPrice,
        book_fee_waived: waive_book_fee,
        pricing_calculation_details: JSON.stringify(calculatedPricing.calculationDetails),
        notes: calculatedPricing.notes
      });
    }

    // Commit transaction
    await trx.commit();

    // Get complete enrollment data
    const enrollment = await db('enrollments')
      .join('students', 'enrollments.student_id', 'students.id')
      .join('courses', 'enrollments.course_id', 'courses.id')
      .join('users', 'students.user_id', 'users.id')
      .join('branches', 'courses.branch_id', 'branches.id')
      .leftJoin('enrollment_pricing', 'enrollments.id', 'enrollment_pricing.enrollment_id')
      .select(
        'enrollments.*',
        'students.first_name',
        'students.last_name',
        'students.nickname',
        'courses.name as course_name',
        'courses.code as course_code',
        'courses.course_type',
        'courses.uses_dynamic_pricing',
        'branches.name_en as branch_name_en',
        'branches.name_th as branch_name_th',
        'users.phone',
        'users.email',
        'enrollment_pricing.group_size_at_enrollment',
        'enrollment_pricing.calculated_base_price',
        'enrollment_pricing.book_fee_applied',
        'enrollment_pricing.total_price_calculated',
        'enrollment_pricing.book_fee_waived',
        'enrollment_pricing.pricing_calculation_details'
      )
      .where('enrollments.id', enrollmentId)
      .first();

    // Parse pricing details if available
    if (enrollment.pricing_calculation_details) {
      try {
        enrollment.pricing_details = JSON.parse(enrollment.pricing_calculation_details);
      } catch (e) {
        console.warn('Failed to parse pricing calculation details');
      }
    }

    res.status(201).json({
      success: true,
      message: 'Student enrolled successfully',
      data: {
        enrollment,
        pricingBreakdown: calculatedPricing
      }
    });

  } catch (error) {
    // Rollback transaction on error
    await trx.rollback();
    throw error;
  }
});

// @desc    Get all enrollments
// @route   GET /api/v1/enrollments
// @access  Private
const getEnrollments = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    student_id, 
    course_id, 
    status, 
    payment_status,
    branch_id 
  } = req.query;
  
  const offset = (page - 1) * limit;

  let query = db('enrollments')
    .join('students', 'enrollments.student_id', 'students.id')
    .join('courses', 'enrollments.course_id', 'courses.id')
    .join('users', 'students.user_id', 'users.id')
    .join('branches', 'courses.branch_id', 'branches.id')
    .select(
      'enrollments.*',
      'students.first_name',
      'students.last_name',
      'students.nickname',
      'courses.name as course_name',
      'courses.code as course_code',
      'courses.course_type',
      'branches.name_en as branch_name_en',
      'branches.name_th as branch_name_th',
      'users.phone',
      'users.email'
    );

  // Apply filters
  if (student_id) {
    query = query.where('enrollments.student_id', student_id);
  }

  if (course_id) {
    query = query.where('enrollments.course_id', course_id);
  }

  if (status) {
    query = query.where('enrollments.status', status);
  }

  if (payment_status) {
    query = query.where('enrollments.payment_status', payment_status);
  }

  if (branch_id && req.user.role === 'owner') {
    query = query.where('courses.branch_id', branch_id);
  } else if (req.user.role !== 'owner') {
    // Non-owners can only see their branch enrollments
    query = query.where('courses.branch_id', req.user.branch_id);
  }

  const enrollments = await query
    .orderBy('enrollments.created_at', 'desc')
    .limit(limit)
    .offset(offset);

  // Get total count for pagination
  const totalQuery = db('enrollments')
    .join('courses', 'enrollments.course_id', 'courses.id')
    .count('* as total');

  if (student_id) totalQuery.where('enrollments.student_id', student_id);
  if (course_id) totalQuery.where('enrollments.course_id', course_id);
  if (status) totalQuery.where('enrollments.status', status);
  if (payment_status) totalQuery.where('enrollments.payment_status', payment_status);
  
  if (branch_id && req.user.role === 'owner') {
    totalQuery.where('courses.branch_id', branch_id);
  } else if (req.user.role !== 'owner') {
    totalQuery.where('courses.branch_id', req.user.branch_id);
  }

  const [{ total }] = await totalQuery;

  res.json({
    success: true,
    data: {
      enrollments,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: parseInt(total),
        total_pages: Math.ceil(total / limit)
      }
    }
  });
});

// @desc    Get student's enrollments
// @route   GET /api/v1/enrollments/student/:student_id
// @access  Private
const getStudentEnrollments = asyncHandler(async (req, res) => {
  const { student_id } = req.params;

  // Verify student exists and check permissions
  const student = await db('students')
    .join('users', 'students.user_id', 'users.id')
    .select('students.*', 'users.branch_id')
    .where('students.id', student_id)
    .first();

  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'Student not found'
    });
  }

  // Check permissions - students can only see their own enrollments
  if (req.user.role === 'student' && student.user_id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  if (req.user.role !== 'owner' && student.branch_id !== req.user.branch_id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Cannot access other branch data.'
    });
  }

  const enrollments = await db('enrollments')
    .join('courses', 'enrollments.course_id', 'courses.id')
    .join('branches', 'courses.branch_id', 'branches.id')
    .select(
      'enrollments.*',
      'courses.name as course_name',
      'courses.code as course_code',
      'courses.course_type',
      'courses.hours_total',
      'branches.name_en as branch_name_en',
      'branches.name_th as branch_name_th'
    )
    .where('enrollments.student_id', student_id)
    .orderBy('enrollments.created_at', 'desc');

  res.json({
    success: true,
    data: { enrollments }
  });
});

// @desc    Update enrollment
// @route   PUT /api/v1/enrollments/:id
// @access  Private (Admin, Owner)
const updateEnrollment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Get current enrollment to check permissions
  const enrollment = await db('enrollments')
    .join('courses', 'enrollments.course_id', 'courses.id')
    .select('enrollments.*', 'courses.branch_id')
    .where('enrollments.id', id)
    .first();

  if (!enrollment) {
    return res.status(404).json({
      success: false,
      message: 'Enrollment not found'
    });
  }

  // Check branch permissions
  if (req.user.role !== 'owner' && enrollment.branch_id !== req.user.branch_id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Cannot access other branch data.'
    });
  }

  // Prepare update data
  const allowedFields = [
    'payment_status', 'total_amount', 'paid_amount', 
    'leave_credits', 'used_leaves', 'status', 'notes'
  ];

  const enrollmentUpdateData = {};
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      enrollmentUpdateData[field] = updateData[field];
    }
  }

  if (Object.keys(enrollmentUpdateData).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No data to update'
    });
  }

  await db('enrollments')
    .where('id', id)
    .update(enrollmentUpdateData);

  // Get updated enrollment
  const updatedEnrollment = await db('enrollments')
    .join('students', 'enrollments.student_id', 'students.id')
    .join('courses', 'enrollments.course_id', 'courses.id')
    .join('users', 'students.user_id', 'users.id')
    .join('branches', 'courses.branch_id', 'branches.id')
    .select(
      'enrollments.*',
      'students.first_name',
      'students.last_name',
      'students.nickname',
      'courses.name as course_name',
      'courses.code as course_code',
      'courses.course_type',
      'branches.name_en as branch_name_en',
      'branches.name_th as branch_name_th',
      'users.phone',
      'users.email'
    )
    .where('enrollments.id', id)
    .first();

  res.json({
    success: true,
    message: 'Enrollment updated successfully',
    data: { enrollment: updatedEnrollment }
  });
});

module.exports = {
  enrollStudent,
  getEnrollments,
  getStudentEnrollments,
  updateEnrollment
};