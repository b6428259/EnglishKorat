/**
 * Notification Model - handles notification operations
 */

const BaseModel = require('./BaseModel');

class Notification extends BaseModel {
  constructor() {
    super('notifications');
  }

  // Find unread notifications for user
  async findUnreadByUser(userId, options = {}) {
    try {
      return await this.findAll({ user_id: userId, web_read: false }, options);
    } catch (error) {
      throw new Error(`Error finding unread notifications: ${error.message}`);
    }
  }

  // Mark notification as read
  async markAsRead(id, userId) {
    try {
      return await this.knex(this.tableName)
        .where('id', id)
        .where('user_id', userId)
        .update({
          web_read: true,
          web_read_at: new Date(),
          updated_at: new Date()
        });
    } catch (error) {
      throw new Error(`Error marking notification as read: ${error.message}`);
    }
  }

  // Mark all notifications as read for user
  async markAllAsRead(userId) {
    try {
      return await this.knex(this.tableName)
        .where('user_id', userId)
        .where('web_read', false)
        .update({
          web_read: true,
          web_read_at: new Date(),
          updated_at: new Date()
        });
    } catch (error) {
      throw new Error(`Error marking all notifications as read: ${error.message}`);
    }
  }

  // Get notification count by type for user
  async getCountByType(userId, type) {
    try {
      const [{ count }] = await this.knex(this.tableName)
        .count('* as count')
        .where('user_id', userId)
        .where('type', type)
        .where('web_read', false);
      return parseInt(count, 10);
    } catch (error) {
      throw new Error(`Error getting notification count by type: ${error.message}`);
    }
  }

  // Create notification with template
  async createFromTemplate(templateType, userId, variables = {}) {
    try {
      // Get template
      const template = await this.knex('notification_templates')
        .where('type', templateType)
        .where('active', true)
        .first();

      if (!template) {
        throw new Error(`Template not found for type: ${templateType}`);
      }

      // Replace variables in template
      let title = template.title_th;
      let message = template.message_th;

      Object.keys(variables).forEach(key => {
        const placeholder = `{{${key}}}`;
        title = title.replace(new RegExp(placeholder, 'g'), variables[key]);
        message = message.replace(new RegExp(placeholder, 'g'), variables[key]);
      });

      return await this.create({
        user_id: userId,
        type: templateType,
        title,
        message,
        metadata: JSON.stringify(variables)
      });
    } catch (error) {
      throw new Error(`Error creating notification from template: ${error.message}`);
    }
  }

  // Get notifications with pagination and filters
  async getWithFilters(userId, filters = {}, page = 1, limit = 20) {
    try {
      let query = this.knex(this.tableName)
        .select('*')
        .where('user_id', userId);

      if (filters.type) {
        query = query.where('type', filters.type);
      }

      if (filters.read_status === 'unread') {
        query = query.where('web_read', false);
      } else if (filters.read_status === 'read') {
        query = query.where('web_read', true);
      }

      if (filters.date_from) {
        query = query.where('created_at', '>=', filters.date_from);
      }

      if (filters.date_to) {
        query = query.where('created_at', '<=', filters.date_to);
      }

      const offset = (page - 1) * limit;
      const total = await query.clone().count('* as count').first();
      const notifications = await query
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      return {
        data: notifications,
        pagination: {
          current_page: page,
          per_page: limit,
          total: parseInt(total.count, 10),
          total_pages: Math.ceil(total.count / limit)
        }
      };
    } catch (error) {
      throw new Error(`Error getting notifications with filters: ${error.message}`);
    }
  }

  // Clean up old notifications
  async cleanupOld(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      return await this.knex(this.tableName)
        .where('created_at', '<', cutoffDate)
        .where('web_read', true)
        .del();
    } catch (error) {
      throw new Error(`Error cleaning up old notifications: ${error.message}`);
    }
  }

  // Get notification statistics for user
  async getStatistics(userId) {
    try {
      const stats = await this.knex(this.tableName)
        .select('type', 'web_read')
        .count('* as count')
        .where('user_id', userId)
        .groupBy('type', 'web_read');

      const summary = {
        total: 0,
        unread: 0,
        by_type: {}
      };

      stats.forEach(stat => {
        summary.total += parseInt(stat.count, 10);
        if (!stat.web_read) {
          summary.unread += parseInt(stat.count, 10);
        }

        if (!summary.by_type[stat.type]) {
          summary.by_type[stat.type] = { total: 0, unread: 0 };
        }

        summary.by_type[stat.type].total += parseInt(stat.count, 10);
        if (!stat.web_read) {
          summary.by_type[stat.type].unread += parseInt(stat.count, 10);
        }
      });

      return summary;
    } catch (error) {
      throw new Error(`Error getting notification statistics: ${error.message}`);
    }
  }

  // Schedule notification for later delivery
  async schedule(userId, type, title, message, scheduledFor, metadata = {}) {
    try {
      return await this.create({
        user_id: userId,
        type,
        title,
        message,
        metadata: JSON.stringify(metadata),
        scheduled_for: scheduledFor
      });
    } catch (error) {
      throw new Error(`Error scheduling notification: ${error.message}`);
    }
  }

  // Get scheduled notifications ready to send
  async getScheduledReady() {
    try {
      return await this.knex(this.tableName)
        .select('*')
        .where('scheduled_for', '<=', new Date())
        .where('line_sent', false)
        .orderBy('scheduled_for', 'asc');
    } catch (error) {
      throw new Error(`Error getting scheduled notifications: ${error.message}`);
    }
  }
}

module.exports = Notification;