
const express = require('express');
const router = express.Router();
const {
  registerTeacher,
  getTeachers,
  getTeacher,
  updateTeacher
} = require('../controllers/teacherController');
const { authMiddleware, authorize } = require('../middleware/authMiddleware');
const { validateUserRegistration } = require('../middleware/validationMiddleware');

// Public route for teacher registration
router.post('/register', validateUserRegistration, registerTeacher);

// Protected routes
router.get('/', authMiddleware, authorize('admin', 'owner'), getTeachers);
router.get('/:id', authMiddleware, getTeacher);
router.put('/:id', authMiddleware, updateTeacher);

module.exports = router;
