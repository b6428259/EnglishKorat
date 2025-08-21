const express = require('express');
const router = express.Router();
const {
  registerStudent,
  getStudents,
  getStudent,
  updateStudent,
  updateStudentTestResults
} = require('../controllers/studentController');
const { authMiddleware, authorize } = require('../middleware/authMiddleware');
const { validateStudentRegistration } = require('../middleware/validationMiddleware');

// Public route for student registration
router.post('/register', validateStudentRegistration, registerStudent);

// Protected routes
router.get('/', authMiddleware, authorize('admin', 'owner'), getStudents);
router.get('/:id', authMiddleware, getStudent);
router.put('/:id', authMiddleware, updateStudent);

// Admin-only route for updating test results
router.put('/:id/test-results', authMiddleware, authorize('admin', 'owner'), updateStudentTestResults);

module.exports = router;