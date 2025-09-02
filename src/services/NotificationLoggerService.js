/**
 * Notification Logger Service
 * Handles logging notifications to Redis and archiving to S3
 */

const { createClient } = require('redis');
const { loggingConfig } = require('../config/notifications');
const { putToS3 } = require('../utils/s3');
const logger = require('../utils/logger');
const crypto = require('crypto');
const zlib = require('zlib');

class NotificationLoggerService {
  constructor() {
    this.redisClient = null;
    this.isConnected = false;
    this.initializeRedis();
  }

  // Initialize Redis connection
  async initializeRedis() {
    try {
      this.redisClient = createClient({
        socket: {
          host: loggingConfig.redis.host,
          port: loggingConfig.redis.port
        },
        password: loggingConfig.redis.password
      });

      this.redisClient.on('error', (err) => {
        logger.error('Redis connection error:', err);
        this.isConnected = false;
      });

      this.redisClient.on('connect', () => {
        logger.info('Notification Logger Redis connected');
        this.isConnected = true;
      });

      await this.redisClient.connect();
    } catch (error) {
      logger.error('Failed to initialize Redis for notification logging:', error);
      this.isConnected = false;
    }
  }

  // Log notification to Redis
  async logNotification(notificationData) {
    if (!this.isConnected || !this.redisClient) {
      logger.warn('Redis not connected, skipping notification log');
      return false;
    }

    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        notificationId: notificationData.id,
        userId: notificationData.user_id,
        type: notificationData.type,
        title: notificationData.title,
        channels: notificationData.channels || [],
        deliveryStatus: {
          line: notificationData.line_sent || false,
          web: true, // Always true for web notifications
          email: notificationData.email_sent || false
        },
        metadata: notificationData.metadata,
        userRole: notificationData.userRole,
        sessionId: crypto.randomUUID()
      };

      // Create Redis key with timestamp for easy filtering
      const dateKey = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const logKey = `${loggingConfig.redis.keyPrefix}${dateKey}:${notificationData.id}`;

      // Store in Redis with expiry
      await this.redisClient.setEx(
        logKey, 
        loggingConfig.redis.logExpiry, 
        JSON.stringify(logEntry)
      );

      // Also add to daily list for batch processing
      const dailyListKey = `${loggingConfig.redis.keyPrefix}daily:${dateKey}`;
      await this.redisClient.rPush(dailyListKey, logKey);
      await this.redisClient.expire(dailyListKey, loggingConfig.redis.logExpiry);

      logger.debug(`Logged notification ${notificationData.id} to Redis`);
      return true;
    } catch (error) {
      logger.error('Failed to log notification to Redis:', error);
      return false;
    }
  }

  // Archive logs from Redis to S3
  async archiveLogs(targetDate = null) {
    if (!loggingConfig.archival.enabled) {
      logger.info('Log archival is disabled');
      return { success: false, reason: 'archival_disabled' };
    }

    if (!this.isConnected || !this.redisClient) {
      logger.error('Redis not connected, cannot archive logs');
      return { success: false, reason: 'redis_disconnected' };
    }

    try {
      // Default to yesterday's logs
      const archiveDate = targetDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dateKey = archiveDate.toISOString().split('T')[0];
      const dailyListKey = `${loggingConfig.redis.keyPrefix}daily:${dateKey}`;

      // Get all log keys for the date
      const logKeys = await this.redisClient.lRange(dailyListKey, 0, -1);
      
      if (logKeys.length === 0) {
        logger.info(`No logs found for date ${dateKey}`);
        return { success: true, archived: 0, reason: 'no_logs' };
      }

      // Retrieve all log entries
      const logs = [];
      for (const logKey of logKeys) {
        try {
          const logData = await this.redisClient.get(logKey);
          if (logData) {
            logs.push(JSON.parse(logData));
          }
        } catch (parseError) {
          logger.warn(`Failed to parse log entry ${logKey}:`, parseError);
        }
      }

      if (logs.length === 0) {
        logger.info(`No valid logs found for date ${dateKey}`);
        return { success: true, archived: 0, reason: 'no_valid_logs' };
      }

      // Create archive data
      const archiveData = {
        date: dateKey,
        totalLogs: logs.length,
        generatedAt: new Date().toISOString(),
        logs: logs
      };

      // Compress the data
      const jsonData = JSON.stringify(archiveData, null, 2);
      const compressedData = zlib.gzipSync(Buffer.from(jsonData), { level: loggingConfig.archival.compressionLevel });

      // Upload to S3
      const s3KeyPath = `${loggingConfig.s3.prefix}${dateKey}/${dateKey}-notifications.json.gz`;
      await putToS3(s3KeyPath, compressedData, 'application/gzip');

      // Clean up Redis keys
      const pipeline = this.redisClient.multi();
      for (const logKey of logKeys) {
        pipeline.del(logKey);
      }
      pipeline.del(dailyListKey);
      await pipeline.exec();

      logger.info(`Successfully archived ${logs.length} notification logs for ${dateKey} to S3`);
      
      return {
        success: true,
        archived: logs.length,
        s3Key: s3KeyPath,
        compressedSize: compressedData.length,
        originalSize: jsonData.length,
        compressionRatio: (jsonData.length / compressedData.length).toFixed(2)
      };

    } catch (error) {
      logger.error('Failed to archive notification logs:', error);
      return { success: false, reason: 'archive_error', error: error.message };
    }
  }

  // Get logs from Redis with filtering
  async getLogs(filters = {}) {
    if (!this.isConnected || !this.redisClient) {
      throw new Error('Redis not connected');
    }

    try {
      const {
        startDate,
        endDate,
        userId,
        type,
        page = 1
      } = filters;

      // Generate date range keys
      const startDateObj = startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDateObj = endDate ? new Date(endDate) : new Date();
      
      const logs = [];
      let currentDate = new Date(startDateObj);
      
      while (currentDate <= endDateObj) {
        const dateKey = currentDate.toISOString().split('T')[0];
        const dailyListKey = `${loggingConfig.redis.keyPrefix}daily:${dateKey}`;
        
        try {
          const logKeys = await this.redisClient.lRange(dailyListKey, 0, -1);
          
          for (const logKey of logKeys) {
            try {
              const logData = await this.redisClient.get(logKey);
              if (logData) {
                const logEntry = JSON.parse(logData);
                
                // Apply filters
                if (userId && logEntry.userId !== parseInt(userId)) continue;
                if (type && logEntry.type !== type) continue;
                
                logs.push(logEntry);
              }
            } catch (parseError) {
              logger.warn(`Failed to parse log entry ${logKey}:`, parseError);
            }
          }
        } catch (dayError) {
          logger.warn(`Failed to get logs for date ${dateKey}:`, dayError);
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Sort by timestamp (newest first)
      logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Paginate
      const limit = filters.limit || loggingConfig.filters.defaultPageSize;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedLogs = logs.slice(startIndex, endIndex);

      return {
        logs: paginatedLogs,
        total: logs.length,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(logs.length / limit),
        hasNext: endIndex < logs.length,
        hasPrevious: startIndex > 0
      };

    } catch (error) {
      logger.error('Failed to retrieve logs from Redis:', error);
      throw error;
    }
  }

  // Generate markdown summary of logs
  generateMarkdownSummary(logsData, filters = {}) {
    const { logs, total, page, limit } = logsData;
    const { startDate, endDate } = filters;

    let markdown = '# Notification Logs Summary\n\n';
    
    // Summary stats
    markdown += '## Summary Statistics\n\n';
    markdown += `- **Total Notifications**: ${total}\n`;
    markdown += `- **Page**: ${page} (showing ${logs.length} of ${total} logs)\n`;
    
    if (startDate || endDate) {
      markdown += `- **Date Range**: ${startDate || 'Beginning'} to ${endDate || 'Now'}\n`;
    }
    
    // Group by type
    const typeStats = {};
    logs.forEach(log => {
      if (!typeStats[log.type]) {
        typeStats[log.type] = { total: 0, delivered: 0 };
      }
      typeStats[log.type].total++;
      if (log.deliveryStatus.line || log.deliveryStatus.email) {
        typeStats[log.type].delivered++;
      }
    });

    if (Object.keys(typeStats).length > 0) {
      markdown += '\n## Notifications by Type\n\n';
      markdown += '| Type | Total | Delivered | Delivery Rate |\n';
      markdown += '|------|-------|-----------|---------------|\n';
      
      Object.entries(typeStats).forEach(([type, stats]) => {
        const deliveryRate = ((stats.delivered / stats.total) * 100).toFixed(1);
        markdown += `| ${type} | ${stats.total} | ${stats.delivered} | ${deliveryRate}% |\n`;
      });
    }

    // Recent logs
    if (logs.length > 0) {
      markdown += '\n## Recent Notifications\n\n';
      
      logs.slice(0, 10).forEach(log => {
        const timestamp = new Date(log.timestamp).toLocaleString();
        const channels = Object.entries(log.deliveryStatus)
          .filter(([, sent]) => sent)
          .map(([channel]) => channel)
          .join(', ') || 'none';
          
        markdown += `### ${log.title}\n`;
        markdown += `- **Time**: ${timestamp}\n`;
        markdown += `- **Type**: ${log.type}\n`;
        markdown += `- **User ID**: ${log.userId}\n`;
        markdown += `- **Channels**: ${channels}\n`;
        markdown += `- **ID**: ${log.notificationId}\n\n`;
      });
    }

    markdown += '\n---\n';
    markdown += `*Generated on ${new Date().toLocaleString()}*\n`;

    return markdown;
  }

  // Clean up old archived logs from S3 (beyond retention period)
  async cleanupArchivedLogs() {
    // This would require S3 lifecycle policies or a separate cleanup job
    // For now, log the intention
    logger.info('Archived log cleanup should be handled by S3 lifecycle policies');
    return { success: true, method: 'lifecycle_policies' };
  }

  // Close Redis connection
  async close() {
    if (this.redisClient && this.isConnected) {
      await this.redisClient.quit();
      this.isConnected = false;
      logger.info('Notification Logger Redis connection closed');
    }
  }
}

module.exports = NotificationLoggerService;