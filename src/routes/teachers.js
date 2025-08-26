
const express = require('express');
const router = express.Router();
const {
  registerTeacher,
  getTeachers,
  getTeacher,
  updateTeacher,
  updateTeacherAvatar,
  deleteTeacher
} = require('../controllers/teacherController');
const { authMiddleware, authorize } = require('../middleware/authMiddleware');
const { validateUserRegistration } = require('../middleware/validationMiddleware');

const { upload } = require('../middleware/uploadS3');
// Public route for teacher registration
router.post('/register', upload.single('avatar'), validateUserRegistration, registerTeacher);

// Protected routes
router.get('/', authMiddleware, authorize('admin', 'owner'), getTeachers);
router.get('/:id', authMiddleware, getTeacher);

// Update teacher avatar
router.put('/:id/avatar', authMiddleware, upload.single('avatar'), updateTeacherAvatar);


// Delete teacher
router.delete('/:id', authMiddleware, authorize('admin', 'owner'), deleteTeacher);

router.put('/:id', authMiddleware, updateTeacher);

module.exports = router;
