const { db } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Create a new course
// @route   POST /api/v1/courses
// @access  Private (Admin, Owner)
const createCourse = asyncHandler(async (req, res) => {
  const {
    name,
    code,
    course_type,
    branch_id,
    max_students = 8,
    price,
    hours_total,
    payment_terms,
    description
  } = req.body;

  // Check if course code already exists
  const existingCourse = await db('courses')
    .where('code', code)
    .first();

  if (existingCourse) {
    return res.status(400).json({
      success: false,
      message: 'Course code already exists'
    });
  }

  // Verify branch exists
  const branch = await db('branches')
    .where('id', branch_id)
    .first();

  if (!branch) {
    return res.status(400).json({
      success: false,
      message: 'Branch not found'
    });
  }

  // Create course
  const [courseId] = await db('courses').insert({
    name,
    code,
    course_type,
    branch_id,
    max_students,
    price,
    hours_total,
    payment_terms: JSON.stringify(payment_terms || {}),
    description,
    status: 'active'
  });

  // Get created course with branch info
  const course = await db('courses')
    .join('branches', 'courses.branch_id', 'branches.id')
    .select(
      'courses.*',
      'branches.name_en as branch_name_en',
      'branches.name_th as branch_name_th',
      'branches.code as branch_code'
    )
    .where('courses.id', courseId)
    .first();

  if (course.payment_terms) {
    course.payment_terms = JSON.parse(course.payment_terms);
  }

  res.status(201).json({
    success: true,
    message: 'Course created successfully',
    data: { course }
  });
});

// @desc    Get all courses
// @route   GET /api/v1/courses
// @access  Private
const getCourses = asyncHandler(async (req, res) => {
  const { branch_id, course_type, status = 'active' } = req.query;

  let query = db('courses')
    .join('branches', 'courses.branch_id', 'branches.id')
    .select(
      'courses.*',
      'branches.name_en as branch_name_en',
      'branches.name_th as branch_name_th',
      'branches.code as branch_code'
    );

  // Apply filters
  if (branch_id) {
    // ถ้ามีการระบุ branch_id ใน query string ให้ใช้ตามนั้น
    query = query.where('courses.branch_id', branch_id);
  } else if (req.user.role !== 'owner') {
    // ถ้าไม่ใช่ owner ให้เห็นคอร์สของ branch ตัวเองและ branch 3 (online)
    if (req.user.branch_id === 1 || req.user.branch_id === 2) {
      query = query.whereIn('courses.branch_id', [req.user.branch_id, 3]);
    } else {
      // กรณี branch อื่นๆ เห็นเฉพาะของตัวเอง
      query = query.where('courses.branch_id', req.user.branch_id);
    }
  }

  if (course_type) {
    query = query.where('courses.course_type', course_type);
  }

  if (status) {
    query = query.where('courses.status', status);
  }

  const courses = await query.orderBy('courses.created_at', 'desc');

  // Parse JSON fields
  courses.forEach(course => {
    if (course.payment_terms) {
      course.payment_terms = JSON.parse(course.payment_terms);
    }
  });

  res.json({
    success: true,
    data: { courses }
  });
});

// @desc    Get course by ID
// @route   GET /api/v1/courses/:id
// @access  Private
const getCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let query = db('courses')
    .join('branches', 'courses.branch_id', 'branches.id')
    .select(
      'courses.*',
      'branches.name_en as branch_name_en',
      'branches.name_th as branch_name_th',
      'branches.code as branch_code'
    )
    .where('courses.id', id);

  // Apply branch restriction for non-owners
  if (req.user.role !== 'owner') {
    // branch 1 และ 2 ดูคอร์ส branch ตัวเองและ branch 3 (online)
    if (req.user.branch_id === 1 || req.user.branch_id === 2) {
      query = query.whereIn('courses.branch_id', [req.user.branch_id, 3]);
    } else {
      query = query.where('courses.branch_id', req.user.branch_id);
    }
  }

  const course = await query.first();

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  if (course.payment_terms) {
    course.payment_terms = JSON.parse(course.payment_terms);
  }

  res.json({
    success: true,
    data: { course }
  });
});

// @desc    Update course
// @route   PUT /api/v1/courses/:id
// @access  Private (Admin, Owner)
const updateCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Get current course to check permissions
  const course = await db('courses')
    .where('id', id)
    .first();

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  // Check branch permissions
  if (req.user.role !== 'owner' && course.branch_id !== req.user.branch_id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Cannot access other branch data.'
    });
  }

  // Prepare update data
  const allowedFields = [
    'name', 'code', 'course_type', 'max_students', 'price', 
    'hours_total', 'payment_terms', 'description', 'status'
  ];

  const courseUpdateData = {};
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      if (field === 'payment_terms' && typeof updateData[field] === 'object') {
        courseUpdateData[field] = JSON.stringify(updateData[field]);
      } else {
        courseUpdateData[field] = updateData[field];
      }
    }
  }

  if (Object.keys(courseUpdateData).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No data to update'
    });
  }

  await db('courses')
    .where('id', id)
    .update(courseUpdateData);

  // Get updated course
  const updatedCourse = await db('courses')
    .join('branches', 'courses.branch_id', 'branches.id')
    .select(
      'courses.*',
      'branches.name_en as branch_name_en',
      'branches.name_th as branch_name_th',
      'branches.code as branch_code'
    )
    .where('courses.id', id)
    .first();

  if (updatedCourse.payment_terms) {
    updatedCourse.payment_terms = JSON.parse(updatedCourse.payment_terms);
  }

  res.json({
    success: true,
    message: 'Course updated successfully',
    data: { course: updatedCourse }
  });
});

// @desc    Delete course
// @route   DELETE /api/v1/courses/:id
// @access  Private (Admin, Owner)
const deleteCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get course to check permissions and if it has enrollments
  const course = await db('courses')
    .where('id', id)
    .first();

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  // Check branch permissions
  if (req.user.role !== 'owner' && course.branch_id !== req.user.branch_id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Cannot access other branch data.'
    });
  }

  // Check if course has enrollments
  const enrollments = await db('enrollments')
    .where('course_id', id)
    .count('* as count')
    .first();

  if (enrollments.count > 0) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete course with existing enrollments. Set status to inactive instead.'
    });
  }

  await db('courses')
    .where('id', id)
    .del();

  res.json({
    success: true,
    message: 'Course deleted successfully'
  });
});

module.exports = {
  createCourse,
  getCourses,
  getCourse,
  updateCourse,
  deleteCourse
};