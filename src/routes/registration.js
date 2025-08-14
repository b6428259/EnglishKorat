/**
 * Student Registration Routes
 * Defines API endpoints for the comprehensive student registration and grouping system
 */

const express = require('express');
const router = express.Router();
const { authMiddleware: protect, authorize } = require('../middleware/authMiddleware');

const {
  registerPreTest,
  submitTestResults,
  completePostTestRegistration,
  getRegistrationStatus,
  triggerManualGrouping,
  getWaitingStudents
} = require('../controllers/registrationController');

// Public routes (pre-test registration)
router.post('/pre-test', registerPreTest);

// Protected routes - require authentication
router.use(protect);

// Student and admin routes
router.post('/post-test', completePostTestRegistration);
router.get('/status/:student_id', getRegistrationStatus);

// Admin/Teacher only routes
router.post('/test-results', authorize('admin', 'owner', 'teacher'), submitTestResults);
router.post('/trigger-grouping/:student_id', authorize('admin', 'owner'), triggerManualGrouping);
router.get('/waiting-students', authorize('admin', 'owner'), getWaitingStudents);

module.exports = router;