const express = require('express');
const router = express.Router();
const {
  registerStudent
} = require('../controllers/studentController');
const { validateStudentRegistration } = require('../middleware/validationMiddleware');

// Public route for student registration - singular endpoint as per requirements
router.post('/register', validateStudentRegistration, registerStudent);

module.exports = router;