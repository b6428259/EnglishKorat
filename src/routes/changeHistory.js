const express = require('express');
const { body, param, query } = require('express-validator');
const { authMiddleware, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const {
  getChangesHistory,
  revertLeavePolicyChange,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getRoomNotifications,
  createRoomNotification
} = require('../controllers/changeHistoryController');

const router = express.Router();

// Validation rules
const getChangesValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('policy_rule_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Policy rule ID must be a positive integer'),
  query('change_type')
    .optional()
    .isIn(['create', 'update', 'delete', 'revert'])
    .withMessage('Invalid change type')
];

const revertValidation = [
  param('changeId')
    .isInt({ min: 1 })
    .withMessage('Change ID must be a positive integer'),
  body('revert_reason')
    .notEmpty()
    .withMessage('Revert reason is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Revert reason must be between 10 and 500 characters')
];

const notificationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('is_read')
    .optional()
    .isBoolean()
    .withMessage('is_read must be a boolean value')
];

const markReadValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Notification ID must be a positive integer')
];

const createRoomNotificationValidation = [
  body('notification_type')
    .isIn(['room_available', 'room_conflict', 'room_change', 'general'])
    .withMessage('Invalid notification type'),
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('message')
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 1000 })
    .withMessage('Message cannot exceed 1000 characters'),
  body('room_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Room ID must be a positive integer'),
  body('teacher_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Teacher ID must be a positive integer'),
  body('schedule_time')
    .optional()
    .isISO8601()
    .withMessage('Schedule time must be a valid ISO 8601 datetime'),
  body('branch_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Branch ID must be a positive integer')
];

// Change History Routes
router.get(
  '/changes',
  authMiddleware,
  authorize('admin', 'owner'),
  getChangesValidation,
  validate,
  getChangesHistory
);

router.post(
  '/revert/:changeId',
  authMiddleware,
  authorize('owner'),
  revertValidation,
  validate,
  revertLeavePolicyChange
);

// Notification Routes
router.get(
  '/notifications',
  authMiddleware,
  notificationValidation,
  validate,
  getNotifications
);

router.put(
  '/notifications/:id/read',
  authMiddleware,
  markReadValidation,
  validate,
  markNotificationAsRead
);

router.put(
  '/notifications/mark-all-read',
  authMiddleware,
  markAllNotificationsAsRead
);

// Room Notification Routes
router.get(
  '/room-notifications',
  authMiddleware,
  notificationValidation,
  validate,
  getRoomNotifications
);

router.post(
  '/room-notifications',
  authMiddleware,
  authorize('admin', 'owner'),
  createRoomNotificationValidation,
  validate,
  createRoomNotification
);

module.exports = router;