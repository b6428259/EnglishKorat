const { db } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Enroll student in a course
// @route   POST /api/v1/enrollments
// @access  Private (Admin, Owner)
const enrollStudent = asyncHandler(async (req, res) => {
  const {
    student_id,
    course_id,
    payment_status = 'pending',
    total_amount,
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

  // Calculate leave credits based on course type
  let leaveCredits = 0;
  if (course.course_type.includes('conversation') || course.course_type.includes('4skills')) {
    leaveCredits = 2; // Group classes allow 2 leaves
  }

  // Create enrollment
  const [enrollmentId] = await db('enrollments').insert({
    student_id,
    course_id,
    enrollment_date: new Date(),
    payment_status,
    total_amount: total_amount || course.price,
    paid_amount: 0,
    leave_credits: leaveCredits,
    used_leaves: 0,
    status: 'active',
    notes
  });

  // Get complete enrollment data
  const enrollment = await db('enrollments')
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
      'branches.name as branch_name',
      'users.phone',
      'users.email'
    )
    .where('enrollments.id', enrollmentId)
    .first();

  res.status(201).json({
    success: true,
    message: 'Student enrolled successfully',
    data: { enrollment }
  });
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
      'branches.name as branch_name',
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
      'branches.name as branch_name'
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
      'branches.name as branch_name',
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