/**
 * Notification Controller
 * Handles notification management, logging, and cleanup operations
 */

const { db } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const NotificationService = require('../utils/NotificationService');
const NotificationLoggerService = require('../services/NotificationLoggerService');
const NotificationCleanupService = require('../services/NotificationCleanupService');

const logger = require('../utils/logger');

// Initialize services
const notificationService = new NotificationService();
const loggerService = new NotificationLoggerService();
const cleanupService = new NotificationCleanupService();

// @desc    Get user's notifications
// @route   GET /api/v1/notifications
// @access  Private
const getUserNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type, read } = req.query;
  const userId = req.user.id;

  let query = db('notifications')
    .select('id', 'type', 'title', 'message', 'metadata', 'web_read', 'created_at')
    .where('user_id', userId)
    .orderBy('created_at', 'desc');

  // Apply filters
  if (type) {
    query = query.where('type', type);
  }
  
  if (read !== undefined) {
    query = query.where('web_read', read === 'true');
  }

  // Get total count for pagination
  const countQuery = query.clone();
  const totalCount = await countQuery.count('id as count').first();
  const total = parseInt(totalCount.count);

  // Apply pagination
  const offset = (page - 1) * limit;
  const notifications = await query.limit(parseInt(limit)).offset(offset);

  // Parse metadata for each notification
  const processedNotifications = notifications.map(notification => ({
    ...notification,
    metadata: notification.metadata ? JSON.parse(notification.metadata) : null,
    isRead: !!notification.web_read
  }));

  res.json({
    success: true,
    data: {
      notifications: processedNotifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrevious: page > 1
      }
    }
  });
});

// @desc    Mark notification as read
// @route   POST /api/v1/notifications/:id/read
// @access  Private
const markNotificationAsRead = asyncHandler(async (req, res) => {
  const notificationId = req.params.id;
  const userId = req.user.id;

  // Check if notification exists and belongs to user
  const notification = await db('notifications')
    .where('id', notificationId)
    .where('user_id', userId)
    .first();

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found'
    });
  }

  // Update notification as read
  await db('notifications')
    .where('id', notificationId)
    .update({
      web_read: true,
      web_read_at: new Date(),
      updated_at: new Date()
    });

  res.json({
    success: true,
    message: 'Notification marked as read'
  });
});

// @desc    Mark all notifications as read
// @route   POST /api/v1/notifications/mark-all-read
// @access  Private
const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const updatedCount = await db('notifications')
    .where('user_id', userId)
    .where('web_read', false)
    .update({
      web_read: true,
      web_read_at: new Date(),
      updated_at: new Date()
    });

  res.json({
    success: true,
    message: `${updatedCount} notifications marked as read`
  });
});

// @desc    Send notification to user(s) or role(s)
// @route   POST /api/v1/notifications/send
// @access  Private (Admin, Owner)
const sendNotification = asyncHandler(async (req, res) => {
  const { type, userId, roleTargets, data, channels = ['web', 'line'] } = req.body;

  if (!userId && !roleTargets) {
    return res.status(400).json({
      success: false,
      message: 'Either userId or roleTargets must be provided'
    });
  }

  let result;

  if (userId) {
    // Send to specific user
    result = await notificationService.sendNotification(type, userId, data, db, channels);
  } else {
    // Send to role(s)
    result = await notificationService.sendRoleBasedNotification(type, roleTargets, data, db, channels);
  }

  res.json({
    success: true,
    message: 'Notification sent successfully',
    data: result
  });
});

// @desc    Get notification logs with filtering
// @route   GET /api/v1/notifications/logs
// @access  Private (Admin, Owner)
const getNotificationLogs = asyncHandler(async (req, res) => {
  const filters = {
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    userId: req.query.userId,
    type: req.query.type,
    page: req.query.page || 1,
    limit: req.query.limit || 50
  };

  const logsData = await loggerService.getLogs(filters);

  res.json({
    success: true,
    data: logsData,
    filters: filters
  });
});

// @desc    Generate markdown summary of notification logs
// @route   GET /api/v1/notifications/logs/summary
// @access  Private (Admin, Owner)
const generateLogSummary = asyncHandler(async (req, res) => {
  const filters = {
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    userId: req.query.userId,
    type: req.query.type,
    page: req.query.page || 1,
    limit: req.query.limit || 1000 // Get more logs for summary
  };

  const logsData = await loggerService.getLogs(filters);
  const markdownSummary = loggerService.generateMarkdownSummary(logsData, filters);

  // Set response headers for markdown download
  res.setHeader('Content-Type', 'text/markdown');
  res.setHeader('Content-Disposition', `attachment; filename="notification_logs_summary_${new Date().toISOString().split('T')[0]}.md"`);
  
  res.send(markdownSummary);
});

// @desc    Get notification cleanup status and statistics
// @route   GET /api/v1/notifications/cleanup/status
// @access  Private (Owner)
const getCleanupStatus = asyncHandler(async (req, res) => {
  const status = await cleanupService.getCleanupStatus();

  res.json({
    success: true,
    data: status
  });
});

// @desc    Trigger notification cleanup manually
// @route   POST /api/v1/notifications/cleanup/trigger
// @access  Private (Owner)
const triggerCleanup = asyncHandler(async (req, res) => {
  const { type, retentionDays } = req.body;

  let result;

  if (type) {
    // Clean up specific type
    result = await cleanupService.cleanupSpecificType(type, retentionDays);
  } else {
    // Run full cleanup
    result = await cleanupService.runCleanup();
  }

  res.json({
    success: true,
    message: 'Cleanup completed',
    data: result
  });
});

// @desc    Archive notification logs to S3 manually
// @route   POST /api/v1/notifications/logs/archive
// @access  Private (Owner)
const archiveLogs = asyncHandler(async (req, res) => {
  const { targetDate } = req.body;

  const result = await loggerService.archiveLogs(targetDate ? new Date(targetDate) : null);

  if (result.success) {
    res.json({
      success: true,
      message: 'Logs archived successfully',
      data: result
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Failed to archive logs',
      error: result.reason,
      details: result.error
    });
  }
});

// Helper function to send student registration notifications
const sendStudentRegistrationNotification = async (studentData, knex = db) => {
  try {
    const result = await notificationService.sendStudentRegistrationNotification(studentData, knex);
    logger.info('Student registration notification sent:', result);
    return result;
  } catch (error) {
    logger.error('Failed to send student registration notification:', error);
    return { success: false, error: error.message };
  }
};

// Helper function to send appointment reminders
const sendAppointmentReminders = async (appointments, knex = db) => {
  try {
    const result = await notificationService.sendAppointmentReminders(appointments, knex);
    logger.info('Appointment reminders sent:', result);
    return result;
  } catch (error) {
    logger.error('Failed to send appointment reminders:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  sendNotification,
  getNotificationLogs,
  generateLogSummary,
  getCleanupStatus,
  triggerCleanup,
  archiveLogs,
  // Helper functions for use by other controllers
  sendStudentRegistrationNotification,
  sendAppointmentReminders
};