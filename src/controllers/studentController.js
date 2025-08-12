const { db } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Register a new student with full details
// @route   POST /api/v1/students/register
// @access  Public
const registerStudent = asyncHandler(async (req, res) => {
  const {
    // User account info
    username,
    password,
    email,
    phone,
    line_id,
    
    // Student personal info
    first_name,
    last_name,
    nickname,
    age,
    grade_level,
    
    // Test results
    cefr_level,
    grammar_score,
    speaking_score,
    listening_score,
    
    // Learning preferences
    learning_preferences,
    preferred_teacher_type,
    contact_source,
    admin_contact,
    
    // Branch selection
    branch_id
  } = req.body;

  // Use database transaction
  const result = await db.transaction(async (trx) => {
    // Create user account
    const [userId] = await trx('users').insert({
      username,
      password: require('bcryptjs').hashSync(password, 10),
      email,
      phone,
      line_id,
      role: 'student',
      branch_id,
      status: 'active'
    });

    // Create student profile
    const [studentId] = await trx('students').insert({
      user_id: userId,
      first_name,
      last_name,
      nickname,
      age,
      grade_level,
      cefr_level,
      grammar_score,
      speaking_score,
      listening_score,
      learning_preferences: JSON.stringify(learning_preferences || {}),
      preferred_teacher_type,
      contact_source,
      admin_contact
    });

    return { userId, studentId };
  });

  // Get complete student data
  const student = await db('students')
    .join('users', 'students.user_id', 'users.id')
    .join('branches', 'users.branch_id', 'branches.id')
    .select(
      'students.*',
      'users.username',
      'users.email',
      'users.phone',
      'users.line_id',
      'branches.name as branch_name',
      'branches.code as branch_code'
    )
    .where('students.id', result.studentId)
    .first();

  res.status(201).json({
    success: true,
    message: 'Student registered successfully',
    data: { student }
  });
});

// @desc    Get all students
// @route   GET /api/v1/students
// @access  Private (Admin, Owner)
const getStudents = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, branch_id, status } = req.query;
  const offset = (page - 1) * limit;

  let query = db('students')
    .join('users', 'students.user_id', 'users.id')
    .join('branches', 'users.branch_id', 'branches.id')
    .select(
      'students.id',
      'students.first_name',
      'students.last_name',
      'students.nickname',
      'students.age',
      'students.grade_level',
      'students.cefr_level',
      'users.username',
      'users.email',
      'users.phone',
      'users.line_id',
      'users.status',
      'branches.name as branch_name',
      'branches.code as branch_code',
      'students.created_at'
    );

  // Apply filters
  if (search) {
    query = query.where(function() {
      this.where('students.first_name', 'like', `%${search}%`)
        .orWhere('students.last_name', 'like', `%${search}%`)
        .orWhere('students.nickname', 'like', `%${search}%`)
        .orWhere('users.username', 'like', `%${search}%`);
    });
  }

  if (branch_id && req.user.role !== 'owner') {
    query = query.where('users.branch_id', branch_id);
  } else if (req.user.role !== 'owner') {
    // Non-owners can only see their branch students
    query = query.where('users.branch_id', req.user.branch_id);
  }

  if (status) {
    query = query.where('users.status', status);
  }

  const students = await query
    .orderBy('students.created_at', 'desc')
    .limit(limit)
    .offset(offset);

  // Get total count for pagination
  const totalQuery = db('students')
    .join('users', 'students.user_id', 'users.id')
    .count('* as total');

  if (search) {
    totalQuery.where(function() {
      this.where('students.first_name', 'like', `%${search}%`)
        .orWhere('students.last_name', 'like', `%${search}%`)
        .orWhere('students.nickname', 'like', `%${search}%`)
        .orWhere('users.username', 'like', `%${search}%`);
    });
  }

  if (branch_id && req.user.role !== 'owner') {
    totalQuery.where('users.branch_id', branch_id);
  } else if (req.user.role !== 'owner') {
    totalQuery.where('users.branch_id', req.user.branch_id);
  }

  if (status) {
    totalQuery.where('users.status', status);
  }

  const [{ total }] = await totalQuery;

  res.json({
    success: true,
    data: {
      students,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: parseInt(total),
        total_pages: Math.ceil(total / limit)
      }
    }
  });
});

// @desc    Get student by ID
// @route   GET /api/v1/students/:id
// @access  Private
const getStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let query = db('students')
    .join('users', 'students.user_id', 'users.id')
    .join('branches', 'users.branch_id', 'branches.id')
    .select(
      'students.*',
      'users.username',
      'users.email',
      'users.phone',
      'users.line_id',
      'users.status',
      'branches.name as branch_name',
      'branches.code as branch_code'
    )
    .where('students.id', id);

  // Apply branch restriction for non-owners
  if (req.user.role !== 'owner') {
    query = query.where('users.branch_id', req.user.branch_id);
  }

  const student = await query.first();

  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'Student not found'
    });
  }

  // Parse JSON fields
  if (student.learning_preferences) {
    student.learning_preferences = JSON.parse(student.learning_preferences);
  }

  res.json({
    success: true,
    data: { student }
  });
});

// @desc    Update student information
// @route   PUT /api/v1/students/:id
// @access  Private (Admin, Owner, Student themselves)
const updateStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Get current student to check permissions
  const student = await db('students')
    .join('users', 'students.user_id', 'users.id')
    .select('students.*', 'users.branch_id')
    .where('students.id', id)
    .first();

  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'Student not found'
    });
  }

  // Check permissions
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

  // Prepare update data
  const allowedFields = [
    'first_name', 'last_name', 'nickname', 'age', 'grade_level',
    'cefr_level', 'grammar_score', 'speaking_score', 'listening_score',
    'learning_preferences', 'preferred_teacher_type', 'contact_source'
  ];

  const studentUpdateData = {};
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      if (field === 'learning_preferences' && typeof updateData[field] === 'object') {
        studentUpdateData[field] = JSON.stringify(updateData[field]);
      } else {
        studentUpdateData[field] = updateData[field];
      }
    }
  }

  if (Object.keys(studentUpdateData).length > 0) {
    await db('students')
      .where('id', id)
      .update(studentUpdateData);
  }

  // Get updated student data
  const updatedStudent = await db('students')
    .join('users', 'students.user_id', 'users.id')
    .join('branches', 'users.branch_id', 'branches.id')
    .select(
      'students.*',
      'users.username',
      'users.email',
      'users.phone',
      'users.line_id',
      'users.status',
      'branches.name as branch_name',
      'branches.code as branch_code'
    )
    .where('students.id', id)
    .first();

  if (updatedStudent.learning_preferences) {
    updatedStudent.learning_preferences = JSON.parse(updatedStudent.learning_preferences);
  }

  res.json({
    success: true,
    message: 'Student updated successfully',
    data: { student: updatedStudent }
  });
});

module.exports = {
  registerStudent,
  getStudents,
  getStudent,
  updateStudent
};