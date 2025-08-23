const { directDB } = require('../config/directDatabase');
const asyncHandler = require('../utils/asyncHandler');
const { safeJsonParse } = require('../utils/safeJson');
const { 
  validateThaiCitizenId, 
  encryptCitizenId, 
  generateUsernameFromPhone, 
  calculateAge, 
  determineAgeGroup 
} = require('../utils/citizenIdUtils');


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
  const result = await directDB.transaction(async (trx) => {
    // Check if user with this phone/username already exists
    const existingUserSQL = 'SELECT * FROM users WHERE username = ? LIMIT 1';
    const existingUsers = await trx.query(existingUserSQL, [username]);
    if (existingUsers.length > 0) {
      throw new Error('User with this phone number already exists');
    }

    // Check if citizen ID already exists
    const existingCitizenSQL = 'SELECT * FROM students WHERE citizen_id = ? LIMIT 1';
    const existingCitizens = await trx.query(existingCitizenSQL, [encryptedCitizenId]);
    if (existingCitizens.length > 0) {
      throw new Error('Citizen ID already registered');
    }

    // Create user account
    const insertUserSQL = `
      INSERT INTO users (username, password, email, phone, line_id, role, branch_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'student', ?, 'active', datetime('now'), datetime('now'))
    `;
    const userResult = await trx.query(insertUserSQL, [
      username,
      require('bcryptjs').hashSync(password, 10),
      email || null,
      phone,
      lineId || null,
      preferredBranch
    ]);
    const userId = userResult.insertId;

    // Create student profile with simplified approach
    const insertParams = [
        userId,
        firstName,
        lastName,
        firstNameEn || null,
        lastNameEn || null,
        nickName || null,
        dateOfBirth,
        gender || null,
        age,
        ageGroup,
        address || null,
        encryptedCitizenId,
        currentEducation || null,
        preferredLanguage || null,
        languageLevel || null,
        recentCEFR || null,
        learningStyle || null,
        learningGoals || null,
        parentName || null,
        parentPhone || null,
        emergencyContact || null,
        emergencyPhone || null,
        JSON.stringify(preferredTimeSlots || []),
        JSON.stringify(unavailableTimeSlots || []),
        JSON.stringify(selectedCourses || []),
        'finding_group', // registration_status
        teacherType || 'any',
        JSON.stringify({
          preferredLanguage: preferredLanguage,
          languageLevel: languageLevel,
          learningStyle: learningStyle,
          teacherType: teacherType
        })
    ];
    
    console.log('Insert params count:', insertParams.length);
    console.log('Registration status param:', insertParams[25]);
    
    const studentResult = await trx.query(
      `INSERT INTO students (
        user_id, first_name, last_name, first_name_en, last_name_en, nickname,
        date_of_birth, gender, age, age_group, address, citizen_id,
        current_education, preferred_language, language_level, recent_cefr,
        learning_style, learning_goals, parent_name, parent_phone,
        emergency_contact, emergency_phone, preferred_time_slots, 
        unavailable_time_slots, selected_courses, registration_status,
        preferred_teacher_type, learning_preferences,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      insertParams
    );
    const studentId = studentResult.insertId;

    return { userId, studentId };
  });

  // Get complete student data
  const studentSQL = `
    SELECT 
      students.*,
      users.username,
      users.email,
      users.phone,
      users.line_id,
      branches.name as branch_name,
      branches.code as branch_code
    FROM students 
    JOIN users ON students.user_id = users.id
    JOIN branches ON users.branch_id = branches.id
    WHERE students.id = ?
  `;
  const students = await directDB.query(studentSQL, [result.studentId]);
  const student = students[0];

  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'Student not found after creation'
    });
  }

  // Parse JSON fields safely
  student.preferred_time_slots = safeJsonParse(student.preferred_time_slots);
  student.unavailable_time_slots = safeJsonParse(student.unavailable_time_slots);
  student.selected_courses = safeJsonParse(student.selected_courses);
  student.learning_preferences = safeJsonParse(student.learning_preferences);
  
  // Remove sensitive data
  delete student.citizen_id;

  res.status(201).json({
    success: true,
    message: 'Student registered successfully. Status: finding_group (Ready for group placement)',
    data: { 
      student,
      note: 'Username is phone number, password is citizen ID. Student will be placed in appropriate group.'
    }
  });
});

// @desc    Get all students
// @route   GET /api/v1/students
// @access  Private (Admin, Owner)
const getStudents = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, branch_id, status } = req.query;
  const offset = (page - 1) * limit;

  // Build the base query
  let whereConditions = [];
  let params = [];

  // Search filter
  if (search) {
    whereConditions.push(`(
      students.first_name LIKE ? OR 
      students.last_name LIKE ? OR 
      students.nickname LIKE ? OR 
      users.username LIKE ?
    )`);
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  // Status filter
  if (status) {
    whereConditions.push('users.status = ?');
    params.push(status);
  }

  const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

  // Get students with pagination
  const studentsSQL = `
    SELECT 
      students.id,
      students.first_name,
      students.last_name,
      students.nickname,
      students.age,
      students.grade_level,
      students.cefr_level,
      students.registration_status,
      users.username,
      users.email,
      users.phone,
      users.line_id,
      users.status,
      branches.name as branch_name,
      branches.code as branch_code,
      students.created_at
    FROM students 
    JOIN users ON students.user_id = users.id
    JOIN branches ON users.branch_id = branches.id
    ${whereClause}
    ORDER BY students.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const students = await directDB.query(studentsSQL, [...params, limit, offset]);

  // Get total count for pagination
  const countSQL = `
    SELECT COUNT(*) as total
    FROM students 
    JOIN users ON students.user_id = users.id
    ${whereClause}
  `;

  const totalResult = await directDB.query(countSQL, params);
  const total = totalResult[0].total;

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

  const studentSQL = `
    SELECT 
      students.*,
      users.username,
      users.email,
      users.phone,
      users.line_id,
      users.status,
      branches.name as branch_name,
      branches.code as branch_code
    FROM students 
    JOIN users ON students.user_id = users.id
    JOIN branches ON users.branch_id = branches.id
    WHERE students.id = ?
  `;
  
  const students = await directDB.query(studentSQL, [id]);
  const student = students[0];

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
      'branches.name as branch_name',
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
      'branches.name as branch_name',
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