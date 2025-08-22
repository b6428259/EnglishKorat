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


// Public course listing (all authenticated users can view courses)
router.get('/', getCourses);
router.get('/:id', getCourse);

// Admin/Owner only routes
router.post('/', authMiddleware, authorize('admin', 'owner'), validateCourse, createCourse);
router.put('/:id', authMiddleware, authorize('admin', 'owner'), updateCourse);
router.delete('/:id', authMiddleware, authorize('admin', 'owner'), deleteCourse);

module.exports = router;