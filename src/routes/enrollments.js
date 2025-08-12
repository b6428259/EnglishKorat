const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  enrollStudent,
  getEnrollments,
  getStudentEnrollments,
  updateEnrollment
} = require('../controllers/enrollmentController');
const { authMiddleware, authorize } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/validationMiddleware');

// Enrollment validation
const validateEnrollment = [
  body('student_id')
    .isInt({ min: 1 })
    .withMessage('Valid student ID is required'),
  
  body('course_id')
    .isInt({ min: 1 })
    .withMessage('Valid course ID is required'),
  
  body('payment_status')
    .optional()
    .isIn(['pending', 'partial', 'completed', 'overdue'])
    .withMessage('Invalid payment status'),
  
  body('total_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total amount must be a positive number'),
  
  handleValidationErrors
];

// All routes require authentication
router.use(authMiddleware);

// Admin/Owner only routes for creating enrollments
router.post('/', authorize('admin', 'owner'), validateEnrollment, enrollStudent);

// Routes accessible by different roles
router.get('/', authorize('admin', 'owner', 'teacher'), getEnrollments);
router.get('/student/:student_id', getStudentEnrollments); // Students can see their own
router.put('/:id', authorize('admin', 'owner'), updateEnrollment);

module.exports = router;