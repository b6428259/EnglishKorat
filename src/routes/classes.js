const express = require('express');
const router = express.Router();
const {
  createClass,
  getClasses,
  getClassById,
  updateClass,
  deleteClass
} = require('../controllers/classController');
const { authMiddleware, authorize } = require('../middleware/authMiddleware');
const { validateClass, validateClassUpdate } = require('../middleware/validationMiddleware');

// @route   GET /api/v1/classes
// @desc    Get classes with filters
// @access  Private
router.get('/', authMiddleware, getClasses);

// @route   POST /api/v1/classes
// @desc    Create a new class
// @access  Private (Admin, Owner)
router.post('/', authMiddleware, authorize('admin', 'owner'), validateClass, createClass);

// @route   GET /api/v1/classes/:id
// @desc    Get single class by ID
// @access  Private
router.get('/:id', authMiddleware, getClassById);

// @route   PUT /api/v1/classes/:id
// @desc    Update class
// @access  Private (Admin, Owner)
router.put('/:id', authMiddleware, authorize('admin', 'owner'), validateClassUpdate, updateClass);

// @route   DELETE /api/v1/classes/:id
// @desc    Delete class
// @access  Private (Admin, Owner)
router.delete('/:id', authMiddleware, authorize('admin', 'owner'), deleteClass);

module.exports = router;