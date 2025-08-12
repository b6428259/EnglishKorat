const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getRooms,
  getRoomAvailability,
  getRoomSuggestions,
  createRoom,
  updateRoom
} = require('../controllers/roomController');
const { authMiddleware, authorize } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/validationMiddleware');

// Room validation
const validateRoom = [
  body('branch_id')
    .isInt({ min: 1 })
    .withMessage('Valid branch ID is required'),
  
  body('room_name')
    .notEmpty()
    .withMessage('Room name is required')
    .isLength({ max: 50 })
    .withMessage('Room name must not exceed 50 characters'),
  
  body('capacity')
    .isInt({ min: 1, max: 100 })
    .withMessage('Capacity must be between 1 and 100'),
  
  body('equipment')
    .optional()
    .isArray()
    .withMessage('Equipment must be an array'),
  
  body('status')
    .optional()
    .isIn(['available', 'maintenance', 'unavailable'])
    .withMessage('Invalid status'),
  
  handleValidationErrors
];

// All routes require authentication
router.use(authMiddleware);

// Room listing and availability checking (all authenticated users)
router.get('/', getRooms);
router.get('/availability', getRoomAvailability);
router.get('/suggestions', getRoomSuggestions);

// Admin/Owner only routes
router.post('/', authorize('admin', 'owner'), validateRoom, createRoom);
router.put('/:id', authorize('admin', 'owner'), updateRoom);

module.exports = router;