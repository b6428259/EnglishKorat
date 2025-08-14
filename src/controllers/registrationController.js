/**
 * Student Registration Controller
 * Handles API endpoints for the comprehensive student registration flow
 */

const StudentRegistrationService = require('../services/StudentRegistrationService');
const GroupFormationService = require('../services/GroupFormationService');
const asyncHandler = require('../middleware/asyncHandler');
const { body, validationResult } = require('express-validator');
const { db } = require('../config/database');

const registrationService = new StudentRegistrationService();
const groupService = new GroupFormationService();

// @desc    Register student for pre-test (Google Form #1 equivalent)
// @route   POST /api/v1/registration/pre-test
// @access  Public
const registerPreTest = [
  // Validation rules
  body('first_name').notEmpty().withMessage('First name is required'),
  body('last_name').notEmpty().withMessage('Last name is required'),
  body('age').isInt({ min: 3, max: 100 }).withMessage('Valid age is required'),
  body('contact_source').notEmpty().withMessage('Contact source is required'),
  body('user_id').isInt().withMessage('Valid user ID is required'),

  asyncHandler(async (req, res) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const preTestData = {
      user_id: req.body.user_id,
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      nickname: req.body.nickname,
      age: req.body.age,
      grade_level: req.body.grade_level,
      contact_source: req.body.contact_source,
      learning_goals: req.body.learning_goals,
      referral_source: req.body.referral_source,
      admin_id: req.user?.id || 1 // Default admin if not authenticated
    };

    const result = await registrationService.registerForPreTest(preTestData);

    res.status(201).json({
      success: true,
      message: 'Pre-test registration successful',
      data: {
        registration_id: result.id,
        test_type: result.test_type,
        age_group: result.age_group,
        next_steps: result.test_type === 'paper_based' ? 
          'Please visit the institute to take the paper-based test' :
          'Please complete the online CEFR test using the provided link'
      }
    });
  })
];

// @desc    Submit test results and evidence
// @route   POST /api/v1/registration/test-results
// @access  Private (Admin/Teacher only)
const submitTestResults = [
  // Validation rules
  body('registration_id').isInt().withMessage('Valid registration ID is required'),
  body('student_id').isInt().withMessage('Valid student ID is required'),
  body('grammar_score').isInt({ min: 0, max: 100 }).withMessage('Valid grammar score required'),
  body('speaking_score').isInt({ min: 0, max: 100 }).withMessage('Valid speaking score required'),
  body('listening_score').isInt({ min: 0, max: 100 }).withMessage('Valid listening score required'),

  asyncHandler(async (req, res) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Only admin, owner, or teacher can submit test results
    if (!['admin', 'owner', 'teacher'].includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin/Teacher role required.'
      });
    }

    const testData = {
      registration_id: req.body.registration_id,
      student_id: req.body.student_id,
      grammar_score: req.body.grammar_score,
      speaking_score: req.body.speaking_score,
      listening_score: req.body.listening_score,
      reading_score: req.body.reading_score,
      writing_score: req.body.writing_score,
      test_evidence_files: req.body.test_evidence_files || [],
      conducted_by: req.user.id,
      notes: req.body.notes
    };

    const result = await registrationService.submitTestResults(testData);

    res.json({
      success: true,
      message: 'Test results submitted successfully',
      data: {
        cefr_level: result.cefr_level,
        registration_id: result.registration_id,
        next_step: 'Please complete the post-test registration with course selection'
      }
    });
  })
];

// @desc    Complete post-test registration (Google Form #2 equivalent)
// @route   POST /api/v1/registration/post-test
// @access  Private (Student themselves or Admin)
const completePostTestRegistration = [
  // Validation rules
  body('registration_id').isInt().withMessage('Valid registration ID is required'),
  body('student_id').isInt().withMessage('Valid student ID is required'),
  body('course_id').isInt().withMessage('Valid course ID is required'),
  body('learning_option').isIn(['individual', 'self_formed_group', 'institute_arranged']).withMessage('Valid learning option required'),

  asyncHandler(async (req, res) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const postTestData = {
      registration_id: req.body.registration_id,
      student_id: req.body.student_id,
      course_id: req.body.course_id,
      learning_option: req.body.learning_option,
      self_formed_group_members: req.body.self_formed_group_members || [],
      availability_schedule: req.body.availability_schedule || {},
      unavailable_times: req.body.unavailable_times || [],
      preferred_teacher_type: req.body.preferred_teacher_type || 'any',
      deposit_amount: req.body.deposit_amount || 3000
    };

    const result = await registrationService.completePostTestRegistration(postTestData);

    let responseMessage = 'Registration completed successfully';
    let nextSteps = '';

    switch (result.learning_option) {
      case 'individual':
        nextSteps = 'Your individual lessons will be scheduled soon. Please wait for schedule confirmation.';
        break;
      case 'self_formed_group':
        nextSteps = 'Your self-formed group will be processed. Please ensure all group members complete registration.';
        break;
      case 'institute_arranged':
        nextSteps = 'You have been added to the auto-grouping system. We will notify you when a compatible group is formed.';
        break;
    }

    res.json({
      success: true,
      message: responseMessage,
      data: {
        status: result.status,
        learning_option: result.learning_option,
        next_steps: nextSteps
      }
    });
  })
];

// @desc    Get registration status for a student
// @route   GET /api/v1/registration/status/:student_id
// @access  Private (Student themselves, Admin, or Owner)
const getRegistrationStatus = asyncHandler(async (req, res) => {
  const { student_id } = req.params;

  // Check permissions - student can only see their own status
  if (req.user.role === 'student') {
    const student = await db('students').where('user_id', req.user.id).first();
    if (!student || student.id !== parseInt(student_id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
  }

  const status = await registrationService.getRegistrationStatus(student_id);

  if (!status) {
    return res.status(404).json({
      success: false,
      message: 'Student not found'
    });
  }

  res.json({
    success: true,
    data: {
      student: status,
      registration_flow: {
        current_step: this.determineCurrentStep(status),
        completed_steps: this.getCompletedSteps(status),
        next_action: this.getNextAction(status)
      }
    }
  });
});

// @desc    Trigger manual auto-grouping for a student
// @route   POST /api/v1/registration/trigger-grouping/:student_id
// @access  Private (Admin/Owner only)
const triggerManualGrouping = asyncHandler(async (req, res) => {
  // Only admin and owner can trigger manual grouping
  if (!['admin', 'owner'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or Owner role required.'
    });
  }

  const { student_id } = req.params;
  
  const result = await groupService.attemptAutoGrouping(parseInt(student_id));

  res.json({
    success: true,
    message: 'Auto-grouping process completed',
    data: result
  });
});

// @desc    Get students waiting for groups (Admin dashboard)
// @route   GET /api/v1/registration/waiting-students
// @access  Private (Admin/Owner only)
const getWaitingStudents = asyncHandler(async (req, res) => {
  // Only admin and owner can view waiting students
  if (!['admin', 'owner'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or Owner role required.'
    });
  }

  const { cefr_level, age_group, days_waiting_min } = req.query;

  let query = db('students')
    .join('group_waiting_list', 'students.id', 'group_waiting_list.student_id')
    .leftJoin('users', 'students.user_id', 'users.id')
    .select(
      'students.*',
      'group_waiting_list.waiting_since',
      'group_waiting_list.days_waiting',
      'group_waiting_list.available_schedule',
      'users.email',
      'users.phone',
      'users.line_id'
    )
    .where('group_waiting_list.active', true)
    .orderBy('group_waiting_list.days_waiting', 'desc');

  if (cefr_level) {
    query = query.where('students.cefr_level', cefr_level);
  }

  if (age_group) {
    query = query.where('students.age_group', age_group);
  }

  if (days_waiting_min) {
    query = query.where('group_waiting_list.days_waiting', '>=', parseInt(days_waiting_min));
  }

  const waitingStudents = await query;

  // Group by CEFR level and age group for easier management
  const groupedStudents = waitingStudents.reduce((acc, student) => {
    const key = `${student.cefr_level}_${student.age_group}`;
    if (!acc[key]) {
      acc[key] = {
        cefr_level: student.cefr_level,
        age_group: student.age_group,
        students: [],
        count: 0
      };
    }
    acc[key].students.push(student);
    acc[key].count++;
    return acc;
  }, {});

  res.json({
    success: true,
    data: {
      total_waiting: waitingStudents.length,
      grouped_by_criteria: groupedStudents,
      summary: {
        over_30_days: waitingStudents.filter(s => s.days_waiting >= 30).length,
        potential_groups: Object.values(groupedStudents).filter(g => g.count >= 2).length
      }
    }
  });
});

// Helper methods
const determineCurrentStep = (status) => {
  if (!status.cefr_level) return 'awaiting_test';
  if (status.registration_status === 'finding_group') return 'finding_group';
  if (status.registration_status === 'has_group_members') return 'group_formation';
  if (status.registration_status === 'ready_to_open_class') return 'ready_for_class';
  if (status.registration_status === 'arranging_schedule') return 'scheduling';
  if (status.registration_status === 'schedule_confirmed') return 'confirmed';
  if (status.registration_status === 'class_started') return 'active';
  return 'completed';
};

const getCompletedSteps = (status) => {
  const steps = ['registration', 'test'];
  if (status.cefr_level) steps.push('test_completed');
  if (status.deposit_amount > 0) steps.push('deposit_paid');
  if (status.registration_status !== 'finding_group') steps.push('group_assigned');
  return steps;
};

const getNextAction = (status) => {
  switch (status.registration_status) {
    case 'finding_group':
      return 'Waiting for compatible group members';
    case 'has_group_members':
      return 'Waiting for group to reach minimum size (4 students)';
    case 'ready_to_open_class':
      return 'Awaiting schedule confirmation';
    case 'arranging_schedule':
      return 'Teacher and schedule assignment in progress';
    case 'schedule_confirmed':
      return 'Waiting for class start date';
    case 'class_started':
      return 'Class is active';
    default:
      return 'Contact admin for status update';
  }
};

module.exports = {
  registerPreTest,
  submitTestResults,
  completePostTestRegistration,
  getRegistrationStatus,
  triggerManualGrouping,
  getWaitingStudents
};