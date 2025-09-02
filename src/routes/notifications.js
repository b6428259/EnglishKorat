const express = require('express');
const { body, param, query } = require('express-validator');
const { authMiddleware, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  sendNotification,
  getNotificationLogs,
  generateLogSummary,
  getCleanupStatus,
  triggerCleanup,
  archiveLogs
} = require('../controllers/notificationController');

const router = express.Router();

// Validation rules
const getUserNotificationsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('type')
    .optional()
    .isIn(['class_confirmation', 'leave_approval', 'class_cancellation', 'schedule_change', 'payment_reminder', 'report_deadline', 'room_conflict', 'general', 'student_registration', 'appointment_reminder', 'class_reminder', 'system_maintenance'])
    .withMessage('Invalid notification type'),
  query('read')
    .optional()
    .isBoolean()
    .withMessage('Read must be a boolean value')
];

const markReadValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Notification ID must be a positive integer')
];

const sendNotificationValidation = [
  body('type')
    .isIn(['class_confirmation', 'leave_approval', 'class_cancellation', 'schedule_change', 'payment_reminder', 'report_deadline', 'room_conflict', 'general', 'student_registration', 'appointment_reminder', 'class_reminder', 'system_maintenance'])
    .withMessage('Invalid notification type'),
  body('userId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer'),
  body('roleTargets')
    .optional()
    .isArray()
    .withMessage('Role targets must be an array'),
  body('roleTargets.*')
    .optional()
    .isIn(['student', 'teacher', 'admin', 'owner'])
    .withMessage('Invalid role'),
  body('data')
    .isObject()
    .withMessage('Data must be an object'),
  body('channels')
    .optional()
    .isArray()
    .withMessage('Channels must be an array'),
  body('channels.*')
    .optional()
    .isIn(['web', 'line', 'email'])
    .withMessage('Invalid channel')
];

const getLogsValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO8601 date'),
  query('userId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer'),
  query('type')
    .optional()
    .isIn(['class_confirmation', 'leave_approval', 'class_cancellation', 'schedule_change', 'payment_reminder', 'report_deadline', 'room_conflict', 'general', 'student_registration', 'appointment_reminder', 'class_reminder', 'system_maintenance'])
    .withMessage('Invalid notification type'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000')
];

const cleanupValidation = [
  body('type')
    .optional()
    .isIn(['class_confirmation', 'leave_approval', 'class_cancellation', 'schedule_change', 'payment_reminder', 'report_deadline', 'room_conflict', 'general', 'student_registration', 'appointment_reminder', 'class_reminder', 'system_maintenance'])
    .withMessage('Invalid notification type'),
  body('retentionDays')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Retention days must be between 1 and 365')
];

// Routes for users to manage their notifications

// @route   GET /api/v1/notifications
// @desc    Get user's notifications
// @access  Private
router.get('/', authMiddleware, getUserNotificationsValidation, validate, getUserNotifications);

// @route   POST /api/v1/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.post('/:id/read', authMiddleware, markReadValidation, validate, markNotificationAsRead);

// @route   POST /api/v1/notifications/mark-all-read
// @desc    Mark all notifications as read
// @access  Private
router.post('/mark-all-read', authMiddleware, markAllNotificationsAsRead);

// Routes for admin/owner to send notifications

// @route   POST /api/v1/notifications/send
// @desc    Send notification to user(s) or role(s)
// @access  Private (Admin, Owner)
router.post('/send', authMiddleware, authorize('admin', 'owner'), sendNotificationValidation, validate, sendNotification);

// Routes for log management (admin/owner only)

// @route   GET /api/v1/notifications/logs
// @desc    Get notification logs with filtering
// @access  Private (Admin, Owner)
router.get('/logs', authMiddleware, authorize('admin', 'owner'), getLogsValidation, validate, getNotificationLogs);

// @route   GET /api/v1/notifications/logs/summary
// @desc    Generate markdown summary of notification logs
// @access  Private (Admin, Owner)
router.get('/logs/summary', authMiddleware, authorize('admin', 'owner'), getLogsValidation, validate, generateLogSummary);

// Routes for system management (owner only)

// @route   GET /api/v1/notifications/cleanup/status
// @desc    Get notification cleanup status and statistics
// @access  Private (Owner)
router.get('/cleanup/status', authMiddleware, authorize('owner'), getCleanupStatus);

// @route   POST /api/v1/notifications/cleanup/trigger
// @desc    Trigger notification cleanup manually
// @access  Private (Owner)
router.post('/cleanup/trigger', authMiddleware, authorize('owner'), cleanupValidation, validate, triggerCleanup);

// @route   POST /api/v1/notifications/logs/archive
// @desc    Archive notification logs to S3 manually
// @access  Private (Owner)
router.post('/logs/archive', authMiddleware, authorize('owner'), archiveLogs);

module.exports = router;