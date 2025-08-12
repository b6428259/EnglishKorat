const express = require('express');
const router = express.Router();
const {
  createCourse,
  getCourses,
  getCourse,
  updateCourse,
  deleteCourse
} = require('../controllers/courseController');
const { authMiddleware, authorize } = require('../middleware/authMiddleware');
const { validateCourse } = require('../middleware/validationMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Public course listing (all authenticated users can view courses)
router.get('/', getCourses);
router.get('/:id', getCourse);

// Admin/Owner only routes
router.post('/', authorize('admin', 'owner'), validateCourse, createCourse);
router.put('/:id', authorize('admin', 'owner'), updateCourse);
router.delete('/:id', authorize('admin', 'owner'), deleteCourse);

module.exports = router;