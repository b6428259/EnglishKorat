/**
 * Notification Service - handles sending notifications via multiple channels
 * Supports LINE messaging, email, and web notifications
 */

const { 
  notificationTypes, 
  lineConfig, 
  emailConfig, 
  getVariableReplacers 
} = require('../config/notifications');

class NotificationService {
  constructor() {
    this.lineConfig = lineConfig;
    this.emailConfig = emailConfig;
    this.notificationTypes = notificationTypes;
  }

  // Send notification through multiple channels
  async sendNotification(type, userId, data, knex, channels = ['web', 'line']) {
    try {
      const results = {
        web: false,
        line: false,
        email: false,
        errors: []
      };

      // Create web notification
      if (channels.includes('web')) {
        try {
          results.web = await this.createWebNotification(type, userId, data, knex);
        } catch (error) {
          results.errors.push(`Web notification error: ${error.message}`);
        }
      }

      // Send LINE notification
      if (channels.includes('line')) {
        try {
          results.line = await this.sendLINENotification(type, userId, data, knex);
        } catch (error) {
          results.errors.push(`LINE notification error: ${error.message}`);
        }
      }

      // Send email notification (backup)
      if (channels.includes('email') && this.emailConfig.enabled) {
        try {
          results.email = await this.sendEmailNotification(type, userId, data, knex);
        } catch (error) {
          results.errors.push(`Email notification error: ${error.message}`);
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Error sending notification: ${error.message}`);
    }
  }

  // Create web notification in database
  async createWebNotification(type, userId, data, knex) {
    try {
      // Get notification template
      const template = await knex('notification_templates')
        .where('type', type)
        .where('active', true)
        .first();

      if (!template) {
        throw new Error(`No template found for notification type: ${type}`);
      }

      // Replace variables in template
      const variables = getVariableReplacers(type, data);
      let title = template.title_th;
      let message = template.message_th;

      Object.keys(variables).forEach(key => {
        const placeholder = `{{${key}}}`;
        title = title.replace(new RegExp(placeholder, 'g'), variables[key] || '');
        message = message.replace(new RegExp(placeholder, 'g'), variables[key] || '');
      });

      // Create notification record
      const [notificationId] = await knex('notifications').insert({
        user_id: userId,
        type,
        title,
        message,
        metadata: JSON.stringify(data),
        created_at: new Date(),
        updated_at: new Date()
      });

      return notificationId;
    } catch (error) {
      throw new Error(`Error creating web notification: ${error.message}`);
    }
  }

  // Send LINE notification
  async sendLINENotification(type, userId, data, knex) {
    try {
      // Get user's LINE ID
      const user = await knex('users')
        .select('line_id')
        .where('id', userId)
        .first();

      if (!user || !user.line_id) {
        throw new Error('User does not have LINE ID');
      }

      // Get notification template
      const template = await knex('notification_templates')
        .where('type', type)
        .where('active', true)
        .first();

      if (!template) {
        throw new Error(`No template found for notification type: ${type}`);
      }

      // Prepare message content
      const variables = getVariableReplacers(type, data);
      let message = template.message_th;

      Object.keys(variables).forEach(key => {
        const placeholder = `{{${key}}}`;
        message = message.replace(new RegExp(placeholder, 'g'), variables[key] || '');
      });

      // Prepare LINE message
      let lineMessage;

      // Use flex message template if available
      if (this.lineConfig.messageTemplates[type]) {
        lineMessage = this.prepareFlexMessage(type, variables);
      } else {
        // Use simple text message
        lineMessage = {
          type: 'text',
          text: message
        };
      }

      // In a real implementation, you would send the message via LINE API
      // For now, we'll simulate the API call
      const success = await this.simulateLINEAPICall(user.line_id, lineMessage);

      if (success) {
        // Update notification record to mark LINE as sent
        await knex('notifications')
          .where('user_id', userId)
          .where('type', type)
          .orderBy('created_at', 'desc')
          .limit(1)
          .update({
            line_sent: true,
            line_sent_at: new Date(),
            updated_at: new Date()
          });
      }

      return success;
    } catch (error) {
      throw new Error(`Error sending LINE notification: ${error.message}`);
    }
  }

  // Prepare flex message for LINE
  prepareFlexMessage(type, variables) {
    try {
      const template = JSON.parse(JSON.stringify(this.lineConfig.messageTemplates[type]));
      
      // Replace variables in flex message template
      const replaceInObject = (obj) => {
        if (typeof obj === 'string') {
          Object.keys(variables).forEach(key => {
            const placeholder = `{{${key}}}`;
            obj = obj.replace(new RegExp(placeholder, 'g'), variables[key] || '');
          });
          return obj;
        } else if (Array.isArray(obj)) {
          return obj.map(item => replaceInObject(item));
        } else if (typeof obj === 'object' && obj !== null) {
          const newObj = {};
          Object.keys(obj).forEach(key => {
            newObj[key] = replaceInObject(obj[key]);
          });
          return newObj;
        }
        return obj;
      };

      return replaceInObject(template);
    } catch (error) {
      throw new Error(`Error preparing flex message: ${error.message}`);
    }
  }

  // Simulate LINE API call (replace with actual LINE API integration)
  async simulateLINEAPICall(lineId, message) {
    try {
      // In a real implementation, you would make an HTTP request to LINE Messaging API
      console.log(`📱 LINE Message to ${lineId}:`, JSON.stringify(message, null, 2)); // eslint-disable-line no-console
      
      // Simulate successful send
      return true;
    } catch (error) {
      console.error('LINE API simulation error:', error); // eslint-disable-line no-console
      return false;
    }
  }

  // Send email notification
  async sendEmailNotification(type, userId, data, knex) {
    try {
      // Get user's email
      const user = await knex('users')
        .select('email', 'username')
        .where('id', userId)
        .first();

      if (!user || !user.email) {
        throw new Error('User does not have email address');
      }

      // Get notification template
      const template = await knex('notification_templates')
        .where('type', type)
        .where('active', true)
        .first();

      if (!template) {
        throw new Error(`No template found for notification type: ${type}`);
      }

      // Prepare email content
      const variables = getVariableReplacers(type, data);
      let subject = template.title_en; // Use English for email subject
      let message = template.message_en; // Use English for email content

      Object.keys(variables).forEach(key => {
        const placeholder = `{{${key}}}`;
        subject = subject.replace(new RegExp(placeholder, 'g'), variables[key] || '');
        message = message.replace(new RegExp(placeholder, 'g'), variables[key] || '');
      });

      // Simulate email sending (replace with actual email service integration)
      const success = await this.simulateEmailSend(user.email, subject, message);

      return success;
    } catch (error) {
      throw new Error(`Error sending email notification: ${error.message}`);
    }
  }

  // Simulate email sending (replace with actual email service)
  async simulateEmailSend(email, subject, message) {
    try {
      // In a real implementation, you would use nodemailer or similar
      console.log(`📧 Email to ${email}:`); // eslint-disable-line no-console
      console.log(`Subject: ${subject}`); // eslint-disable-line no-console
      console.log(`Message: ${message}`); // eslint-disable-line no-console
      
      // Simulate successful send
      return true;
    } catch (error) {
      console.error('Email simulation error:', error); // eslint-disable-line no-console
      return false;
    }
  }

  // Schedule notification for later sending
  async scheduleNotification(type, userId, data, scheduledFor, knex, channels = ['web', 'line']) {
    try {
      // Create web notification with scheduled_for date
      const template = await knex('notification_templates')
        .where('type', type)
        .where('active', true)
        .first();

      if (!template) {
        throw new Error(`No template found for notification type: ${type}`);
      }

      const variables = getVariableReplacers(type, data);
      let title = template.title_th;
      let message = template.message_th;

      Object.keys(variables).forEach(key => {
        const placeholder = `{{${key}}}`;
        title = title.replace(new RegExp(placeholder, 'g'), variables[key] || '');
        message = message.replace(new RegExp(placeholder, 'g'), variables[key] || '');
      });

      const [notificationId] = await knex('notifications').insert({
        user_id: userId,
        type,
        title,
        message,
        metadata: JSON.stringify({ ...data, channels }),
        scheduled_for: scheduledFor,
        created_at: new Date(),
        updated_at: new Date()
      });

      return notificationId;
    } catch (error) {
      throw new Error(`Error scheduling notification: ${error.message}`);
    }
  }

  // Process scheduled notifications
  async processScheduledNotifications(knex) {
    try {
      const now = new Date();
      const scheduledNotifications = await knex('notifications')
        .select('*')
        .where('scheduled_for', '<=', now)
        .where('line_sent', false)
        .whereNotNull('scheduled_for')
        .orderBy('scheduled_for', 'asc')
        .limit(50); // Process in batches

      const results = [];

      for (const notification of scheduledNotifications) {
        try {
          const metadata = JSON.parse(notification.metadata || '{}');
          const channels = metadata.channels || ['line'];

          if (channels.includes('line')) {
            await this.sendLINENotification(
              notification.type, 
              notification.user_id, 
              metadata, 
              knex
            );
          }

          if (channels.includes('email') && this.emailConfig.enabled) {
            await this.sendEmailNotification(
              notification.type, 
              notification.user_id, 
              metadata, 
              knex
            );
          }

          results.push({
            id: notification.id,
            success: true
          });
        } catch (error) {
          results.push({
            id: notification.id,
            success: false,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Error processing scheduled notifications: ${error.message}`);
    }
  }

  // Get notification statistics
  async getStatistics(knex, dateFrom, dateTo) {
    try {
      let query = knex('notifications')
        .select('type', 'line_sent', 'web_read')
        .count('* as count');

      if (dateFrom) {
        query = query.where('created_at', '>=', dateFrom);
      }
      if (dateTo) {
        query = query.where('created_at', '<=', dateTo);
      }

      const stats = await query.groupBy('type', 'line_sent', 'web_read');

      const summary = {
        total: 0,
        by_type: {},
        delivery_stats: {
          line_sent: 0,
          web_created: 0,
          web_read: 0
        }
      };

      stats.forEach(stat => {
        const count = parseInt(stat.count, 10);
        summary.total += count;

        if (!summary.by_type[stat.type]) {
          summary.by_type[stat.type] = {
            total: 0,
            line_sent: 0,
            web_read: 0
          };
        }

        summary.by_type[stat.type].total += count;

        if (stat.line_sent) {
          summary.delivery_stats.line_sent += count;
          summary.by_type[stat.type].line_sent += count;
        }

        summary.delivery_stats.web_created += count;

        if (stat.web_read) {
          summary.delivery_stats.web_read += count;
          summary.by_type[stat.type].web_read += count;
        }
      });

      return summary;
    } catch (error) {
      throw new Error(`Error getting notification statistics: ${error.message}`);
    }
  }
}

module.exports = NotificationService;