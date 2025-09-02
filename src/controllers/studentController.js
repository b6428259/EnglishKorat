/**
 * Student Controller
 * Enhanced with notification system integration
 */

const { db } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { safeJsonParse } = require('../utils/safeJson');
const { 
  validateThaiCitizenId, 
  encryptCitizenId, 
  generateUsernameFromPhone, 
  calculateAge, 
  determineAgeGroup 
} = require('../utils/citizenIdUtils');
const { sendStudentRegistrationNotification } = require('./notificationController');


// @desc    Register a new student with full details
// @route   POST /api/v1/students/register
// @access  Public
const registerStudent = asyncHandler(async (req, res) => {
  const {
    // Personal info (from form)
    firstName,
    lastName,
    firstNameEn,
    lastNameEn,
    nickName,
    dateOfBirth,
    gender,
    citizenId,
    address,
    
    // Contact info
    email,
    phone,
    lineId,
    
    // Academic info
    currentEducation,
    preferredBranch,
    preferredLanguage,
    languageLevel,
    recentCEFR,
    learningStyle,
    learningGoals,
    selectedCourses,
    teacherType,
    
    // Schedule preferences
    preferredTimeSlots,
    unavailableTimeSlots,
    
    // Emergency/Parent contact
    parentName,
    parentPhone,
    emergencyContact,
    emergencyPhone
  } = req.body;

  // Validate required fields
  if (!firstName || !lastName || !phone || !citizenId || !dateOfBirth || !preferredBranch) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: firstName, lastName, phone, citizenId, dateOfBirth, preferredBranch'
    });
  }

  // Validate Thai Citizen ID
  if (!validateThaiCitizenId(citizenId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid Thai Citizen ID format'
    });
  }

  // Calculate age from date of birth
  const age = calculateAge(dateOfBirth);
  
  // Determine age group
  const ageGroup = determineAgeGroup(currentEducation, age);

  // Generate username from phone number
  const username = generateUsernameFromPhone(phone);
  
  // Use citizen ID as password (will be hashed)
  const password = citizenId;

  // Encrypt citizen ID for storage
  const encryptedCitizenId = encryptCitizenId(citizenId);

  // Use database transaction
  const result = await db.transaction(async (trx) => {
    // Check if user with this phone/username already exists
    const existingUser = await trx('users').where('username', username).first();
    if (existingUser) {
      throw new Error('User with this phone number already exists');
    }

    // Check if citizen ID already exists
    const existingCitizenId = await trx('students').where('citizen_id', encryptedCitizenId).first();
    if (existingCitizenId) {
      throw new Error('Citizen ID already registered');
    }

    // Create user account
    const [userId] = await trx('users').insert({
      username,
      password: require('bcryptjs').hashSync(password, 10),
      email: email || null,
      phone,
      line_id: lineId || null,
      role: 'student',
      branch_id: preferredBranch,
      status: 'active'
    });

    // Create student profile
    const [studentId] = await trx('students').insert({
      user_id: userId,
      first_name: firstName,
      last_name: lastName,
      first_name_en: firstNameEn || null,
      last_name_en: lastNameEn || null,
      nickname: nickName || null,
      date_of_birth: dateOfBirth,
      gender: gender || null,
      age: age,
      age_group: ageGroup,
      address: address || null,
      citizen_id: encryptedCitizenId,
      
      // Academic info
      current_education: currentEducation || null,
      preferred_language: preferredLanguage || null,
      language_level: languageLevel || null,
      recent_cefr: recentCEFR || null,
      learning_style: learningStyle || null,
      learning_goals: learningGoals || null,
      
      // Contact info
      parent_name: parentName || null,
      parent_phone: parentPhone || null,
      emergency_contact: emergencyContact || null,
      emergency_phone: emergencyPhone || null,
      
      // Schedule and courses (JSON fields)
      preferred_time_slots: JSON.stringify(preferredTimeSlots || []),
      unavailable_time_slots: JSON.stringify(unavailableTimeSlots || []),
      selected_courses: JSON.stringify(selectedCourses || []),
      
      // Test scores and admin fields (empty for now - will be updated by admin)
      cefr_level: null,
      grammar_score: null,
      speaking_score: null,
      listening_score: null,
      reading_score: null,
      writing_score: null,
      admin_contact: null,
      
      // Registration status
      registration_status: 'ยังไม่สอบ',
      
      // Teacher preference
      preferred_teacher_type: teacherType || 'any',
      
      // Learning preferences (for compatibility)
      learning_preferences: JSON.stringify({
        preferredLanguage: preferredLanguage,
        languageLevel: languageLevel,
        learningStyle: learningStyle,
        teacherType: teacherType
      })
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
        'branches.name_en as branch_name_en',
        'branches.name_th as branch_name_th',
      'branches.code as branch_code'
    )
    .where('students.id', result.studentId)
    .first();

  // Parse JSON fields safely
  student.preferred_time_slots = safeJsonParse(student.preferred_time_slots);
  student.unavailable_time_slots = safeJsonParse(student.unavailable_time_slots);
  student.selected_courses = safeJsonParse(student.selected_courses);
  student.learning_preferences = safeJsonParse(student.learning_preferences);
  
  // Remove sensitive data
  delete student.citizen_id;

  // Send notification to admin and owner about new student registration
  try {
    const course = student.selected_courses && student.selected_courses.length > 0 
      ? student.selected_courses[0].name 
      : 'General English';
      
    await sendStudentRegistrationNotification({
      id: student.id,
      name: `${student.first_name} ${student.last_name}`,
      email: student.email,
      course_name: course,
      registrationDate: new Date().toLocaleDateString()
    });
  } catch (notificationError) {
    // Don't fail the registration if notification fails
    console.error('Failed to send student registration notification:', notificationError);
  }

  res.status(201).json({
    success: true,
    message: 'Student registered successfully. Status: ยังไม่สอบ (Waiting for test)',
    data: { 
      student,
      note: 'Username is phone number, password is citizen ID. Admin will update test scores later.'
    }
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
        'branches.name_en as branch_name_en',
        'branches.name_th as branch_name_th',
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

  // if (branch_id && req.user.role !== 'owner') {
  //   query = query.where('users.branch_id', branch_id);
  // } else if (req.user.role !== 'owner') {
  //   // Non-owners can only see their branch students
  //   query = query.where('users.branch_id', req.user.branch_id);
  // }

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

  // if (branch_id && req.user.role !== 'owner') {
  //   totalQuery.where('users.branch_id', branch_id);
  // } else if (req.user.role !== 'owner') {
  //   totalQuery.where('users.branch_id', req.user.branch_id);
  // }

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
        'branches.name_en as branch_name_en',
        'branches.name_th as branch_name_th',
      'branches.code as branch_code'
    )
    .where('students.id', id);

  if (req.user.role !== 'owner') {
    query = query.where('users.branch_id', req.user.branch_id);
  }

  const student = await query.first();

  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }

  // ✅ parse แบบปลอดภัย (ไม่พังถ้าไม่ใช่ JSON)
  student.learning_preferences = safeJsonParse(student.learning_preferences);
  student.preferred_time_slots = safeJsonParse(student.preferred_time_slots);
  student.unavailable_time_slots = safeJsonParse(student.unavailable_time_slots);
  student.selected_courses = safeJsonParse(student.selected_courses);
  
  // Remove sensitive data
  delete student.citizen_id;

  return res.json({ success: true, data: { student } });
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
    'first_name', 'last_name', 'first_name_en', 'last_name_en', 'nickname', 
    'date_of_birth', 'gender', 'age', 'current_education', 'address',
    'preferred_language', 'language_level', 'recent_cefr', 'learning_style',
    'learning_goals', 'parent_name', 'parent_phone', 'emergency_contact', 
    'emergency_phone', 'cefr_level', 'grammar_score', 'speaking_score', 
    'listening_score', 'reading_score', 'writing_score', 'learning_preferences', 
    'preferred_teacher_type', 'contact_source'
  ];

  const studentUpdateData = {};
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      if (['learning_preferences', 'preferred_time_slots', 'unavailable_time_slots', 'selected_courses'].includes(field) 
          && typeof updateData[field] === 'object') {
        studentUpdateData[field] = JSON.stringify(updateData[field]);
      } else {
        studentUpdateData[field] = updateData[field];
      }
    }
  }

  // Handle JSON fields separately
  const jsonFields = ['preferred_time_slots', 'unavailable_time_slots', 'selected_courses'];
  for (const field of jsonFields) {
    if (updateData[field] !== undefined) {
      studentUpdateData[field] = JSON.stringify(updateData[field]);
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
         'branches.name_en as branch_name_en',
        'branches.name_th as branch_name_th',
      'branches.code as branch_code'
    )
    .where('students.id', id)
    .first();

  if (updatedStudent.learning_preferences) {
    updatedStudent.learning_preferences = JSON.parse(updatedStudent.learning_preferences);
  }
  if (updatedStudent.preferred_time_slots) {
    updatedStudent.preferred_time_slots = JSON.parse(updatedStudent.preferred_time_slots);
  }
  if (updatedStudent.unavailable_time_slots) {
    updatedStudent.unavailable_time_slots = JSON.parse(updatedStudent.unavailable_time_slots);
  }
  if (updatedStudent.selected_courses) {
    updatedStudent.selected_courses = JSON.parse(updatedStudent.selected_courses);
  }
  
  // Remove sensitive data
  delete updatedStudent.citizen_id;

  res.json({
    success: true,
    message: 'Student updated successfully',
    data: { student: updatedStudent }
  });
});

// @desc    Update student test results and status (Admin only)
// @route   PUT /api/v1/students/:id/test-results
// @access  Private (Admin, Owner)
const updateStudentTestResults = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    cefr_level,
    grammar_score,
    speaking_score,
    listening_score,
    reading_score,
    writing_score,
    admin_contact,
    notes
  } = req.body;

  // Check if user is admin or owner
  if (!['admin', 'owner'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or Owner role required.'
    });
  }

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

  // Check branch permissions (owners can access all branches)
  if (req.user.role !== 'owner' && student.branch_id !== req.user.branch_id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Cannot access other branch data.'
    });
  }

  // Update test results and change status
  const updateData = {
    cefr_level,
    grammar_score,
    speaking_score,
    listening_score,
    reading_score,
    writing_score,
    admin_contact: admin_contact || req.user.username,
    registration_status: 'รอติดตาม', // Change status to "waiting for follow-up"
    last_status_update: new Date()
  };

  // Remove undefined fields
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) {
      delete updateData[key];
    }
  });

  await db('students')
    .where('id', id)
    .update(updateData);

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
        'branches.name_en as branch_name_en',
        'branches.name_th as branch_name_th',
      'branches.code as branch_code'
    )
    .where('students.id', id)
    .first();

  // Parse JSON fields safely
  updatedStudent.preferred_time_slots = safeJsonParse(updatedStudent.preferred_time_slots);
  updatedStudent.unavailable_time_slots = safeJsonParse(updatedStudent.unavailable_time_slots);
  updatedStudent.selected_courses = safeJsonParse(updatedStudent.selected_courses);
  updatedStudent.learning_preferences = safeJsonParse(updatedStudent.learning_preferences);
  
  // Remove sensitive data
  delete updatedStudent.citizen_id;

  res.json({
    success: true,
    message: 'Test results updated successfully. Status changed to รอติดตาม',
    data: { student: updatedStudent }
  });
});

module.exports = {
  registerStudent,
  getStudents,
  getStudent,
  updateStudent,
  updateStudentTestResults
};