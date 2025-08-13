const { body, validationResult } = require('express-validator');

// Generic validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }
  next();
};

// User registration validation
const validateUserRegistration = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Must be a valid email address'),
  
  body('phone')
    .optional()
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('Invalid phone number format'),
  
  body('role')
    .isIn(['student', 'teacher', 'admin', 'owner'])
    .withMessage('Invalid role'),
  
  body('branch_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Branch ID must be a positive integer'),
  
  handleValidationErrors
];

// Student registration validation
const validateStudentRegistration = [
  body('first_name')
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 100 })
    .withMessage('First name must not exceed 100 characters'),
  
  body('last_name')
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 100 })
    .withMessage('Last name must not exceed 100 characters'),
  
  body('nickname')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Nickname must not exceed 50 characters'),
  
  body('age')
    .optional()
    .isInt({ min: 5, max: 100 })
    .withMessage('Age must be between 5 and 100'),
  
  body('cefr_level')
    .optional()
    .isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
    .withMessage('Invalid CEFR level'),
  
  body('grammar_score')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Grammar score must be between 0 and 100'),
  
  body('speaking_score')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Speaking score must be between 0 and 100'),
  
  body('listening_score')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Listening score must be between 0 and 100'),
  
  handleValidationErrors
];

// Course validation
const validateCourse = [
  body('name')
    .notEmpty()
    .withMessage('Course name is required')
    .isLength({ max: 200 })
    .withMessage('Course name must not exceed 200 characters'),
  
  body('code')
    .notEmpty()
    .withMessage('Course code is required')
    .isLength({ max: 50 })
    .withMessage('Course code must not exceed 50 characters'),
  
  body('course_type')
    .isIn([
      'conversation_kids', 'conversation_adults', 'english_4skills',
      'ielts_prep', 'toeic_prep', 'toefl_prep',
      'chinese_conversation', 'chinese_4skills'
    ])
    .withMessage('Invalid course type'),
  
  body('branch_id')
    .isInt({ min: 1 })
    .withMessage('Valid branch ID is required'),
  
  body('max_students')
    .isInt({ min: 1, max: 50 })
    .withMessage('Max students must be between 1 and 50'),
  
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  
  body('hours_total')
    .isInt({ min: 1 })
    .withMessage('Total hours must be at least 1'),
  
  handleValidationErrors
];

// Class scheduling validation
const validateClass = [
  body('course_group_id')
    .isInt({ min: 1 })
    .withMessage('Valid course group ID is required'),
  
  body('teacher_id')
    .isInt({ min: 1 })
    .withMessage('Valid teacher ID is required'),
  
  body('room_id')
    .isInt({ min: 1 })
    .withMessage('Valid room ID is required'),
  
  body('class_date')
    .isDate()
    .withMessage('Valid class date is required'),
  
  body('start_time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),
  
  body('end_time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format'),
  
  body('hours')
    .isFloat({ min: 0.5, max: 8 })
    .withMessage('Hours must be between 0.5 and 8'),
  
  handleValidationErrors
];

// Attendance validation
const validateAttendance = [
  body('class_id')
    .isInt({ min: 1 })
    .withMessage('Valid class ID is required'),
  
  body('attendances')
    .isArray({ min: 1 })
    .withMessage('Attendances array is required and must not be empty'),
  
  body('attendances.*.student_id')
    .isInt({ min: 1 })
    .withMessage('Valid student ID is required for each attendance record'),
  
  body('attendances.*.status')
    .isIn(['present', 'absent', 'excused', 'late'])
    .withMessage('Status must be one of: present, absent, excused, late'),
  
  body('attendances.*.notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters'),
  
  handleValidationErrors
];

// Leave request validation
const validateLeaveRequest = [
  body('class_id')
    .isInt({ min: 1 })
    .withMessage('Valid class ID is required'),
  
  body('reason')
    .notEmpty()
    .withMessage('Reason is required')
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters'),
  
  handleValidationErrors
];

// Leave request process validation
const validateLeaveRequestProcess = [
  body('status')
    .isIn(['approved', 'rejected'])
    .withMessage('Status must be either approved or rejected'),
  
  body('admin_notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Admin notes must not exceed 500 characters'),
  
  handleValidationErrors
];

// Schedule conflict check validation
const validateConflictCheck = [
  body('class_date')
    .isDate()
    .withMessage('Valid class date is required'),
  
  body('start_time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM:SS format'),
  
  body('end_time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM:SS format'),
  
  body('teacher_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Teacher ID must be a positive integer'),
  
  body('room_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Room ID must be a positive integer'),
  
  body('exclude_class_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Exclude class ID must be a positive integer'),
  
  handleValidationErrors
];

// Update class validation (for partial updates)
const validateClassUpdate = [
  body('teacher_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Teacher ID must be a positive integer'),
  
  body('room_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Room ID must be a positive integer'),
  
  body('class_date')
    .optional()
    .isDate()
    .withMessage('Valid class date is required'),
  
  body('start_time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM:SS format'),
  
  body('end_time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM:SS format'),
  
  body('hours')
    .optional()
    .isFloat({ min: 0.5, max: 8 })
    .withMessage('Hours must be between 0.5 and 8'),
  
  body('status')
    .optional()
    .isIn(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled'])
    .withMessage('Status must be one of: scheduled, confirmed, in_progress, completed, cancelled'),
  
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters'),
  
  handleValidationErrors
];

module.exports = {
  validate: handleValidationErrors, // Export as 'validate' for the new routes
  handleValidationErrors,
  validateUserRegistration,
  validateStudentRegistration,
  validateCourse,
  validateClass,
  validateAttendance,
  validateLeaveRequest,
  validateLeaveRequestProcess,
  validateConflictCheck,
  validateClassUpdate
};