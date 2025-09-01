const express = require('express');
const router = express.Router();
const {
  // New schedule system functions
  createSchedule,
  getSchedules,
  getSchedule,
  updateSchedule,
  deleteSchedule,
  assignStudentToSchedule,
  removeStudentFromSchedule,
  getScheduleStudents,
  createScheduleException,
  createScheduleExceptionBySession,
  createMakeupSession,
  getMakeupSessions,
  handleStudentLeave,
  handleCourseDrop,
  getScheduleSessions,
  getWeeklySchedule,
  getScheduleCalendar,
  applyExistingExceptions,
  addSessionComment,
  getSessionComments,
  updateSessionComment,
  deleteSessionComment,
  editSession,
  getTeacherSchedules,
  getTeacherSchedule,
  createSessions
} = require('../controllers/scheduleController');
const { authMiddleware, authorize } = require('../middleware/authMiddleware');
const { validateConflictCheck } = require('../middleware/validationMiddleware');

// ============ NEW SCHEDULE SYSTEM ROUTES ============

// @route   POST /api/v1/schedules
// @desc    Create new schedule
// @access  Private (Admin, Owner)
router.post('/', authMiddleware, authorize('admin', 'owner'), createSchedule);

// @route   GET /api/v1/schedules
// @desc    Get schedules with filtering
// @access  Private
router.get('/', authMiddleware, getSchedules);

// @route   GET /api/v1/schedules/teachers
// @desc    Get teacher schedules (all teachers or filtered)
// @access  Private
router.get('/teachers', authMiddleware, getTeacherSchedules);

// @route   GET /api/v1/schedules/teachers/:teacher_id
// @desc    Get specific teacher's schedule
// @access  Private
router.get('/teachers/:teacher_id', authMiddleware, getTeacherSchedule);

// @route   GET /api/v1/schedules/weekly
// @desc    Get weekly schedule view
// @access  Private
router.get('/weekly', authMiddleware, getWeeklySchedule);

// @route   GET /api/v1/schedules/calendar
// @desc    Get all schedules by day/week/month with holidays
// @access  Private
router.get('/calendar', authMiddleware, getScheduleCalendar);

// @route   GET /api/v1/schedules/:id
// @desc    Get single schedule
// @access  Private
router.get('/:id', authMiddleware, getSchedule);

// @route   PUT /api/v1/schedules/:id
// @desc    Update schedule
// @access  Private (Admin, Owner)
router.put('/:id', authMiddleware, authorize('admin', 'owner'), updateSchedule);

// @route   DELETE /api/v1/schedules/:id
// @desc    Delete schedule
// @access  Private (Admin, Owner)
router.delete('/:id', authMiddleware, authorize('admin', 'owner'), deleteSchedule);

// @route   POST /api/v1/schedules/:id/students
// @desc    Assign student to schedule
// @access  Private (Admin, Owner)
router.post('/:id/students', authMiddleware, authorize('admin', 'owner'), assignStudentToSchedule);

// @route   DELETE /api/v1/schedules/:id/students/:studentId
// @desc    Remove student from schedule
// @access  Private (Admin, Owner)
router.delete('/:id/students/:studentId', authMiddleware, authorize('admin', 'owner'), removeStudentFromSchedule);

// @route   GET /api/v1/schedules/:id/students
// @desc    Get students in schedule
// @access  Private
router.get('/:id/students', authMiddleware, getScheduleStudents);

// @route   POST /api/v1/schedules/:id/exceptions
// @desc    Create schedule exception
// @access  Private (Admin, Owner)
router.post('/:id/exceptions', authMiddleware, authorize('admin', 'owner'), createScheduleException);

// @route   POST /api/v1/schedules/:id/exceptions/session
// @desc    Create schedule exception by session ID
// @access  Private (Admin, Owner)
router.post('/:id/exceptions/session', authMiddleware, authorize('admin', 'owner'), createScheduleExceptionBySession);

// @route   GET /api/v1/schedules/:id/sessions
// @desc    Get schedule sessions with exceptions
// @access  Private
router.get('/:id/sessions', authMiddleware, getScheduleSessions);

// @route   POST /api/v1/schedules/:id/sessions/create
// @desc    Create single or repeating session(s)
// @access  Private (Admin, Owner)
router.post('/:id/sessions/create', authMiddleware, authorize('admin', 'owner'), createSessions);

// @route   POST /api/v1/schedules/:id/makeup
// @desc    Create makeup session
// @access  Private (Admin, Owner)
router.post('/:id/makeup', authMiddleware, authorize('admin', 'owner'), createMakeupSession);

// @route   GET /api/v1/schedules/:id/makeup
// @desc    Get makeup sessions for schedule
// @access  Private
router.get('/:id/makeup', authMiddleware, getMakeupSessions);

// @route   POST /api/v1/schedules/:id/leave
// @desc    Handle student leave request
// @access  Private (Admin, Owner)
router.post('/:id/leave', authMiddleware, authorize('admin', 'owner'), handleStudentLeave);

// @route   POST /api/v1/schedules/:id/drop
// @desc    Handle course drop/pause
// @access  Private (Admin, Owner)
router.post('/:id/drop', authMiddleware, authorize('admin', 'owner'), handleCourseDrop);

// @route   POST /api/v1/schedules/:id/apply-exceptions
// @desc    Apply existing exceptions to sessions
// @access  Private (Admin, Owner)
router.post('/:id/apply-exceptions', authMiddleware, authorize('admin', 'owner'), applyExistingExceptions);

// ============ SESSION MANAGEMENT ROUTES ============

// @route   PUT /api/v1/schedules/:id/sessions/:sessionId
// @desc    Edit session details
// @access  Private (Admin, Owner)
router.put('/:id/sessions/:sessionId', authMiddleware, authorize('admin', 'owner'), editSession);

// @route   POST /api/v1/schedules/:id/sessions/:sessionId/comments
// @desc    Add comment/note to session
// @access  Private (Admin, Owner)
router.post('/:id/sessions/:sessionId/comments', authMiddleware, authorize('admin', 'owner'), addSessionComment);

// @route   GET /api/v1/schedules/:id/sessions/:sessionId/comments
// @desc    Get session comments
// @access  Private
router.get('/:id/sessions/:sessionId/comments', authMiddleware, getSessionComments);

// @route   PUT /api/v1/schedules/:id/sessions/:sessionId/comments/:commentId
// @desc    Update session comment
// @access  Private (Admin, Owner, Comment Author)
router.put('/:id/sessions/:sessionId/comments/:commentId', authMiddleware, updateSessionComment);

// @route   DELETE /api/v1/schedules/:id/sessions/:sessionId/comments/:commentId
// @desc    Delete session comment
// @access  Private (Admin, Owner, Comment Author)
router.delete('/:id/sessions/:sessionId/comments/:commentId', authMiddleware, deleteSessionComment);


module.exports = router;