const { db } = require('../config/database');
const { transaction } = require('../config/mysql');
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
  const result = await transaction(async (connection) => {
    // Check if user with this phone/username already exists
    const [existingUsers] = await connection.execute(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );
    if (existingUsers.length > 0) {
      throw new Error('User with this phone number already exists');
    }

    // Check if citizen ID already exists
    const [existingCitizenIds] = await connection.execute(
      'SELECT id FROM students WHERE citizen_id = ?',
      [encryptedCitizenId]
    );
    if (existingCitizenIds.length > 0) {
      throw new Error('Citizen ID already registered');
    }

    // Create user account
    const [userResult] = await connection.execute(
      `INSERT INTO users (username, password, email, phone, line_id, role, branch_id, status, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        username,
        require('bcryptjs').hashSync(password, 10),
        email || null,
        phone,
        lineId || null,
        'student',
        preferredBranch,
        'active'
      ]
    );

    const userId = userResult.insertId;

    // Create student profile
    const [studentResult] = await connection.execute(
      `INSERT INTO students (
        user_id, first_name, last_name, first_name_en, last_name_en, nickname,
        date_of_birth, gender, age, age_group, address, citizen_id,
        current_education, preferred_language, language_level, recent_cefr,
        learning_style, learning_goals, parent_name, parent_phone,
        emergency_contact, emergency_phone, preferred_time_slots,
        unavailable_time_slots, selected_courses, cefr_level,
        grammar_score, speaking_score, listening_score, reading_score,
        writing_score, admin_contact, registration_status, preferred_teacher_type,
        learning_preferences, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
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
        null, // cefr_level
        null, // grammar_score
        null, // speaking_score
        null, // listening_score
        null, // reading_score
        null, // writing_score
        null, // admin_contact
        'pending_exam', // registration_status - changed from 'ยังไม่สอบ' to 'pending_exam'
        teacherType || 'any',
        JSON.stringify({
          preferredLanguage: preferredLanguage,
          languageLevel: languageLevel,
          learningStyle: learningStyle,
          teacherType: teacherType
        })
      ]
    );

    return { userId, studentId: studentResult.insertId };
  });

  // Get complete student data
  const [studentRows] = await db.execute(
    `SELECT 
      s.*,
      u.username,
      u.email,
      u.phone,
      u.line_id,
      b.name as branch_name,
      b.code as branch_code
    FROM students s
    JOIN users u ON s.user_id = u.id
    JOIN branches b ON u.branch_id = b.id
    WHERE s.id = ?`,
    [result.studentId]
  );

  if (studentRows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Student not found after creation'
    });
  }

  const student = studentRows[0];

  // Parse JSON fields safely
  student.preferred_time_slots = safeJsonParse(student.preferred_time_slots);
  student.unavailable_time_slots = safeJsonParse(student.unavailable_time_slots);
  student.selected_courses = safeJsonParse(student.selected_courses);
  student.learning_preferences = safeJsonParse(student.learning_preferences);
  
  // Remove sensitive data
  delete student.citizen_id;

  res.status(201).json({
    success: true,
    message: 'Student registered successfully. Status: pending_exam (Waiting for test)',
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

  // Build base query
  let whereClause = '';
  let params = [];
  let conditions = [];

  // Apply search filter
  if (search) {
    conditions.push(`(
      s.first_name LIKE ? OR 
      s.last_name LIKE ? OR 
      s.nickname LIKE ? OR 
      u.username LIKE ?
    )`);
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  // Apply status filter
  if (status) {
    conditions.push('u.status = ?');
    params.push(status);
  }

  // Apply branch filter (commented out as per original code)
  // if (branch_id && req.user.role !== 'owner') {
  //   conditions.push('u.branch_id = ?');
  //   params.push(branch_id);
  // } else if (req.user.role !== 'owner') {
  //   conditions.push('u.branch_id = ?');
  //   params.push(req.user.branch_id);
  // }

  if (conditions.length > 0) {
    whereClause = 'WHERE ' + conditions.join(' AND ');
  }

  // Get students with pagination
  const query = `
    SELECT 
      s.id,
      s.first_name,
      s.last_name,
      s.nickname,
      s.age,
      s.grade_level,
      s.cefr_level,
      s.registration_status,
      u.username,
      u.email,
      u.phone,
      u.line_id,
      u.status,
      b.name as branch_name,
      b.code as branch_code,
      s.created_at
    FROM students s
    JOIN users u ON s.user_id = u.id
    JOIN branches b ON u.branch_id = b.id
    ${whereClause}
    ORDER BY s.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [students] = await db.execute(query, [...params, parseInt(limit), parseInt(offset)]);

  // Get total count for pagination
  const countQuery = `
    SELECT COUNT(*) as total
    FROM students s
    JOIN users u ON s.user_id = u.id
    ${whereClause}
  `;

  const [countResult] = await db.execute(countQuery, params);
  const total = countResult[0].total;

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

  // Build query with optional branch filter
  let query = `
    SELECT 
      s.*,
      u.username,
      u.email,
      u.phone,
      u.line_id,
      u.status,
      b.name as branch_name,
      b.code as branch_code
    FROM students s
    JOIN users u ON s.user_id = u.id
    JOIN branches b ON u.branch_id = b.id
    WHERE s.id = ?
  `;

  let params = [id];

  // Add branch filter for non-owners (commented as in original)
  // if (req.user.role !== 'owner') {
  //   query += ' AND u.branch_id = ?';
  //   params.push(req.user.branch_id);
  // }

  const [students] = await db.execute(query, params);

  if (students.length === 0) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }

  const student = students[0];

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
  const [studentRows] = await db.execute(
    `SELECT s.*, u.branch_id 
     FROM students s 
     JOIN users u ON s.user_id = u.id 
     WHERE s.id = ?`,
    [id]
  );

  if (studentRows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Student not found'
    });
  }

  const student = studentRows[0];

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
  const updateFields = [];
  const updateValues = [];

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      if (['learning_preferences', 'preferred_time_slots', 'unavailable_time_slots', 'selected_courses'].includes(field) 
          && typeof updateData[field] === 'object') {
        studentUpdateData[field] = JSON.stringify(updateData[field]);
      } else {
        studentUpdateData[field] = updateData[field];
      }
      updateFields.push(`${field} = ?`);
      updateValues.push(studentUpdateData[field]);
    }
  }

  // Handle JSON fields separately
  const jsonFields = ['preferred_time_slots', 'unavailable_time_slots', 'selected_courses'];
  for (const field of jsonFields) {
    if (updateData[field] !== undefined) {
      if (!updateFields.find(f => f.startsWith(field))) {
        updateFields.push(`${field} = ?`);
        updateValues.push(JSON.stringify(updateData[field]));
      }
    }
  }

  if (updateFields.length > 0) {
    updateFields.push('updated_at = NOW()');
    updateValues.push(id);
    
    const updateQuery = `UPDATE students SET ${updateFields.join(', ')} WHERE id = ?`;
    await db.execute(updateQuery, updateValues);
  }

  // Get updated student data
  const [updatedStudentRows] = await db.execute(
    `SELECT 
      s.*,
      u.username,
      u.email,
      u.phone,
      u.line_id,
      u.status,
      b.name as branch_name,
      b.code as branch_code
    FROM students s
    JOIN users u ON s.user_id = u.id
    JOIN branches b ON u.branch_id = b.id
    WHERE s.id = ?`,
    [id]
  );

  const updatedStudent = updatedStudentRows[0];

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
  const [studentRows] = await db.execute(
    `SELECT s.*, u.branch_id 
     FROM students s 
     JOIN users u ON s.user_id = u.id 
     WHERE s.id = ?`,
    [id]
  );

  if (studentRows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Student not found'
    });
  }

  const student = studentRows[0];

  // Check branch permissions (owners can access all branches)
  if (req.user.role !== 'owner' && student.branch_id !== req.user.branch_id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Cannot access other branch data.'
    });
  }

  // Prepare update data
  const updateFields = [];
  const updateValues = [];

  if (cefr_level !== undefined) {
    updateFields.push('cefr_level = ?');
    updateValues.push(cefr_level);
  }
  if (grammar_score !== undefined) {
    updateFields.push('grammar_score = ?');
    updateValues.push(grammar_score);
  }
  if (speaking_score !== undefined) {
    updateFields.push('speaking_score = ?');
    updateValues.push(speaking_score);
  }
  if (listening_score !== undefined) {
    updateFields.push('listening_score = ?');
    updateValues.push(listening_score);
  }
  if (reading_score !== undefined) {
    updateFields.push('reading_score = ?');
    updateValues.push(reading_score);
  }
  if (writing_score !== undefined) {
    updateFields.push('writing_score = ?');
    updateValues.push(writing_score);
  }

  // Always update admin contact and status
  updateFields.push('admin_contact = ?');
  updateValues.push(admin_contact || req.user.username);
  
  updateFields.push('registration_status = ?');
  updateValues.push('follow_up'); // Change status to "follow_up"
  
  updateFields.push('updated_at = NOW()');

  updateValues.push(id);

  // Update test results and change status
  const updateQuery = `UPDATE students SET ${updateFields.join(', ')} WHERE id = ?`;
  await db.execute(updateQuery, updateValues);

  // Get updated student data
  const [updatedStudentRows] = await db.execute(
    `SELECT 
      s.*,
      u.username,
      u.email,
      u.phone,
      u.line_id,
      u.status,
      b.name as branch_name,
      b.code as branch_code
    FROM students s
    JOIN users u ON s.user_id = u.id
    JOIN branches b ON u.branch_id = b.id
    WHERE s.id = ?`,
    [id]
  );

  const updatedStudent = updatedStudentRows[0];

  // Parse JSON fields safely
  updatedStudent.preferred_time_slots = safeJsonParse(updatedStudent.preferred_time_slots);
  updatedStudent.unavailable_time_slots = safeJsonParse(updatedStudent.unavailable_time_slots);
  updatedStudent.selected_courses = safeJsonParse(updatedStudent.selected_courses);
  updatedStudent.learning_preferences = safeJsonParse(updatedStudent.learning_preferences);
  
  // Remove sensitive data
  delete updatedStudent.citizen_id;

  res.json({
    success: true,
    message: 'Test results updated successfully. Status changed to follow_up',
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