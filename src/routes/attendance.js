const express = require('express');
const router = express.Router();
const {
  markAttendance,
  getClassAttendance,
  getStudentAttendance,
  submitLeaveRequest,
  processLeaveRequest,
  getLeaveRequests
} = require('../controllers/attendanceController');
const { authMiddleware, authorize } = require('../middleware/authMiddleware');
const {
  validateAttendance,
  validateLeaveRequest,
  validateLeaveRequestProcess
} = require('../middleware/validationMiddleware');

// @route   POST /api/v1/attendance
// @desc    Mark attendance for a class
// @access  Private (Teacher, Admin, Owner)
router.post('/', authMiddleware, authorize('teacher', 'admin', 'owner'), validateAttendance, markAttendance);

// @route   GET /api/v1/attendance/class/:classId
// @desc    Get attendance for a class
// @access  Private
router.get('/class/:classId', authMiddleware, getClassAttendance);

// @route   GET /api/v1/attendance/student/:studentId
// @desc    Get attendance report for a student
// @access  Private
router.get('/student/:studentId', authMiddleware, getStudentAttendance);

// @route   POST /api/v1/attendance/leave-request
// @desc    Submit leave request
// @access  Private (Student)
router.post('/leave-request', authMiddleware, authorize('student'), validateLeaveRequest, submitLeaveRequest);

// @route   PUT /api/v1/attendance/leave-request/:id
// @desc    Approve/reject leave request
// @access  Private (Admin, Owner)
router.put('/leave-request/:id', authMiddleware, authorize('admin', 'owner'), validateLeaveRequestProcess, processLeaveRequest);

// @route   GET /api/v1/attendance/leave-requests
// @desc    Get leave requests
// @access  Private
router.get('/leave-requests', authMiddleware, getLeaveRequests);

module.exports = router;