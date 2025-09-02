/**
 * Notification Cleanup Service
 * Handles automatic cleanup of old notifications from the database
 */

const { cleanupConfig } = require('../config/notifications');
const { db } = require('../config/database');
const logger = require('../utils/logger');

class NotificationCleanupService {
  constructor() {
    this.isRunning = false;
    this.lastCleanup = null;
  }

  // Run cleanup process
  async runCleanup() {
    if (this.isRunning) {
      logger.warn('Notification cleanup already running, skipping');
      return { success: false, reason: 'already_running' };
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting notification cleanup process');
      
      const results = {
        success: true,
        startTime: new Date(startTime).toISOString(),
        deletedByType: {},
        totalDeleted: 0,
        errors: []
      };

      // Process each notification type with its specific retention period
      for (const [type, retentionDays] of Object.entries(cleanupConfig.retentionByType)) {
        try {
          const deletedCount = await this.cleanupNotificationsByType(type, retentionDays);
          results.deletedByType[type] = deletedCount;
          results.totalDeleted += deletedCount;
          
          logger.debug(`Cleaned up ${deletedCount} notifications of type '${type}'`);
        } catch (typeError) {
          const errorMsg = `Failed to cleanup notifications of type '${type}': ${typeError.message}`;
          logger.error(errorMsg);
          results.errors.push(errorMsg);
        }
      }

      // Clean up notifications with default retention period (types not specified above)
      try {
        const defaultDeleted = await this.cleanupDefaultNotifications();
        results.totalDeleted += defaultDeleted;
        results.deletedByType.default = defaultDeleted;
        
        logger.debug(`Cleaned up ${defaultDeleted} notifications with default retention`);
      } catch (defaultError) {
        const errorMsg = `Failed to cleanup default notifications: ${defaultError.message}`;
        logger.error(errorMsg);
        results.errors.push(errorMsg);
      }

      const endTime = Date.now();
      results.endTime = new Date(endTime).toISOString();
      results.duration = endTime - startTime;
      
      this.lastCleanup = new Date();
      
      logger.info(`Notification cleanup completed. Deleted ${results.totalDeleted} notifications in ${results.duration}ms`);
      
      return results;
    } catch (error) {
      logger.error('Notification cleanup process failed:', error);
      return {
        success: false,
        error: error.message,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date().toISOString(),
        duration: Date.now() - startTime
      };
    } finally {
      this.isRunning = false;
    }
  }

  // Clean up notifications by type with specific retention period
  async cleanupNotificationsByType(type, retentionDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    let deletedCount = 0;
    let processedBatch = 0;

    try {
      // Process in batches to avoid overwhelming the database
      while (processedBatch < cleanupConfig.maxProcessingTime) {
        const batchStartTime = Date.now();
        
        // Get a batch of old notifications
        const oldNotifications = await db('notifications')
          .select('id')
          .where('type', type)
          .where('created_at', '<', cutoffDate)
          .limit(cleanupConfig.batchSize);

        if (oldNotifications.length === 0) {
          break; // No more notifications to delete
        }

        // Delete the batch
        const notificationIds = oldNotifications.map(n => n.id);
        const batchDeleted = await db('notifications')
          .whereIn('id', notificationIds)
          .del();

        deletedCount += batchDeleted;
        
        const batchTime = Date.now() - batchStartTime;
        processedBatch += batchTime;

        // Add small delay between batches to reduce database load
        if (oldNotifications.length === cleanupConfig.batchSize) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return deletedCount;
    } catch (error) {
      logger.error(`Failed to cleanup notifications of type '${type}':`, error);
      throw error;
    }
  }

  // Clean up notifications with default retention period
  async cleanupDefaultNotifications() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - cleanupConfig.defaultRetentionDays);

    const specifiedTypes = Object.keys(cleanupConfig.retentionByType);
    
    let deletedCount = 0;
    let processedBatch = 0;

    try {
      // Process in batches
      while (processedBatch < cleanupConfig.maxProcessingTime) {
        const batchStartTime = Date.now();
        
        // Get a batch of old notifications not covered by specific type rules
        const oldNotifications = await db('notifications')
          .select('id')
          .whereNotIn('type', specifiedTypes)
          .where('created_at', '<', cutoffDate)
          .limit(cleanupConfig.batchSize);

        if (oldNotifications.length === 0) {
          break; // No more notifications to delete
        }

        // Delete the batch
        const notificationIds = oldNotifications.map(n => n.id);
        const batchDeleted = await db('notifications')
          .whereIn('id', notificationIds)
          .del();

        deletedCount += batchDeleted;
        
        const batchTime = Date.now() - batchStartTime;
        processedBatch += batchTime;

        // Add small delay between batches
        if (oldNotifications.length === cleanupConfig.batchSize) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup default notifications:', error);
      throw error;
    }
  }

  // Get cleanup status and statistics
  async getCleanupStatus() {
    try {
      const totalNotifications = await db('notifications').count('id as count').first();
      
      // Get count by type
      const notificationsByType = await db('notifications')
        .select('type')
        .count('id as count')
        .groupBy('type');
      const ageDistribution = await db('notifications')
        .select(
          db.raw(`
            CASE 
              WHEN created_at > DATE_SUB(NOW(), INTERVAL 1 DAY) THEN 'last_24h'
              WHEN created_at > DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 'last_week'
              WHEN created_at > DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 'last_month'
              ELSE 'older'
            END as age_group
          `)
        )
        .count('id as count')
        .groupBy('age_group');

      return {
        isRunning: this.isRunning,
        lastCleanup: this.lastCleanup,
        totalNotifications: parseInt(totalNotifications.count),
        notificationsByType: notificationsByType.reduce((acc, item) => {
          acc[item.type] = parseInt(item.count);
          return acc;
        }, {}),
        ageDistribution: ageDistribution.reduce((acc, item) => {
          acc[item.age_group] = parseInt(item.count);
          return acc;
        }, {}),
        config: {
          defaultRetentionDays: cleanupConfig.defaultRetentionDays,
          retentionByType: cleanupConfig.retentionByType,
          batchSize: cleanupConfig.batchSize,
          cleanupInterval: cleanupConfig.cleanupInterval
        }
      };
    } catch (error) {
      logger.error('Failed to get cleanup status:', error);
      throw error;
    }
  }

  // Manually trigger cleanup for a specific type
  async cleanupSpecificType(type, retentionDays = null) {
    if (this.isRunning) {
      throw new Error('Cleanup already running');
    }

    const retention = retentionDays || cleanupConfig.retentionByType[type] || cleanupConfig.defaultRetentionDays;
    
    this.isRunning = true;
    try {
      const deletedCount = await this.cleanupNotificationsByType(type, retention);
      logger.info(`Manual cleanup of type '${type}' completed. Deleted ${deletedCount} notifications.`);
      
      return {
        success: true,
        type: type,
        retentionDays: retention,
        deletedCount: deletedCount
      };
    } catch (error) {
      logger.error(`Manual cleanup of type '${type}' failed:`, error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  // Get retention policy for a specific type
  getRetentionPolicy(type) {
    return cleanupConfig.retentionByType[type] || cleanupConfig.defaultRetentionDays;
  }

  // Update retention policy for a type
  updateRetentionPolicy(type, retentionDays) {
    if (retentionDays < 1 || retentionDays > cleanupConfig.maxRetentionDays) {
      throw new Error(`Retention days must be between 1 and ${cleanupConfig.maxRetentionDays}`);
    }

    cleanupConfig.retentionByType[type] = retentionDays;
    logger.info(`Updated retention policy for type '${type}' to ${retentionDays} days`);
    
    return {
      type: type,
      retentionDays: retentionDays,
      updated: true
    };
  }
}

module.exports = NotificationCleanupService;