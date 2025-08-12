const express = require('express');
const router = express.Router();
const {
  getTeacherSchedule,
  getStudentSchedule,
  getRoomSchedule,
  checkSchedulingConflicts,
  getAvailableTimeSlots,
  getBranchSchedule
} = require('../controllers/scheduleController');
const { authMiddleware, authorize } = require('../middleware/authMiddleware');
const { validateConflictCheck } = require('../middleware/validationMiddleware');

// @route   GET /api/v1/schedules/teacher/:teacherId
// @desc    Get schedule for a teacher
// @access  Private
router.get('/teacher/:teacherId', authMiddleware, getTeacherSchedule);

// @route   GET /api/v1/schedules/student/:studentId
// @desc    Get schedule for a student
// @access  Private
router.get('/student/:studentId', authMiddleware, getStudentSchedule);

// @route   GET /api/v1/schedules/room/:roomId
// @desc    Get room schedule
// @access  Private
router.get('/room/:roomId', authMiddleware, getRoomSchedule);

// @route   GET /api/v1/schedules/branch/:branchId
// @desc    Get branch schedule overview
// @access  Private (Admin, Owner)
router.get('/branch/:branchId', authMiddleware, authorize(['admin', 'owner']), getBranchSchedule);

// @route   POST /api/v1/schedules/check-conflicts
// @desc    Check for scheduling conflicts
// @access  Private (Admin, Owner)
router.post('/check-conflicts', authMiddleware, authorize(['admin', 'owner']), validateConflictCheck, checkSchedulingConflicts);

// @route   GET /api/v1/schedules/available-slots
// @desc    Get available time slots
// @access  Private (Admin, Owner)
router.get('/available-slots', authMiddleware, authorize(['admin', 'owner']), getAvailableTimeSlots);

module.exports = router;