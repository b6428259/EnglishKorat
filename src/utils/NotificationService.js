/**
 * Notification Service - handles sending notifications via multiple channels
 * Supports LINE messaging, email, and web notifications
 * Enhanced with Redis logging and role-based notifications
 */

const { 
  notificationTypes, 
  lineConfig, 
  emailConfig, 
  getVariableReplacers 
} = require('../config/notifications');
const NotificationLoggerService = require('../services/NotificationLoggerService');

class NotificationService {
  constructor() {
    this.lineConfig = lineConfig;
    this.emailConfig = emailConfig;
    this.notificationTypes = notificationTypes;
    this.logger = new NotificationLoggerService();
  }

  // Send notification through multiple channels with role-based filtering
  async sendNotification(type, userId, data, knex, channels = ['web', 'line'], userRole = null) {
    try {
      // Check if notification type supports the user's role
      const notificationType = this.notificationTypes[type];
      if (notificationType && notificationType.roles && userRole) {
        if (!notificationType.roles.includes(userRole)) {
          // Use logger instead of console.log
          return {
            web: false,
            line: false,
            email: false,
            skipped: true,
            reason: 'role_not_applicable'
          };
        }
      }

      const results = {
        web: false,
        line: false,
        email: false,
        errors: []
      };

      // Get user information for role validation
      let user = null;
      if (!userRole) {
        user = await knex('users')
          .select('role', 'line_id', 'email')
          .where('id', userId)
          .first();
        userRole = user?.role;
      }

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

      // Log notification to Redis
      if (results.web || results.line || results.email) {
        try {
          const logData = {
            id: results.web || new Date().getTime(), // Use notification ID or timestamp
            user_id: userId,
            type: type,
            title: data.title || this.getNotificationTitle(type, data),
            channels: channels,
            line_sent: results.line,
            email_sent: results.email,
            metadata: data,
            userRole: userRole
          };
          
          await this.logger.logNotification(logData);
        } catch (logError) {
          // Use logger instead of console.error
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

  // Helper method to generate notification title
  getNotificationTitle(type, data) {
    const variables = getVariableReplacers(type, data);
    
    const titleTemplates = {
      class_confirmation: `Class Confirmation Required - ${variables.course_name}`,
      leave_approval: `Leave Request Update - ${variables.course_name}`,
      class_cancellation: `Class Cancelled - ${variables.course_name}`,
      schedule_change: `Schedule Change - ${variables.course_name}`,
      payment_reminder: `Payment Reminder - ${variables.amount} THB`,
      report_deadline: 'Report Deadline Reminder',
      room_conflict: 'Room Conflict Alert',
      general: 'General Notification',
      student_registration: `New Student Registration - ${variables.student_name}`,
      appointment_reminder: `Appointment Reminder - ${variables.course_name || variables.appointmentTitle}`,
      class_reminder: `Class Reminder - ${variables.course_name}`,
      system_maintenance: `System Maintenance - ${variables.maintenance_title}`
    };

    return titleTemplates[type] || 'Notification';
  }

  // Send notification to multiple users based on role
  async sendRoleBasedNotification(type, roleTargets, data, knex, channels = ['web', 'line']) {
    try {
      const results = {
        sent: [],
        errors: [],
        totalSent: 0,
        skipped: 0
      };

      // Get users by roles
      const users = await knex('users')
        .select('id', 'role', 'username')
        .whereIn('role', roleTargets)
        .where('status', 'active'); // Only active users

      for (const user of users) {
        try {
          const result = await this.sendNotification(type, user.id, data, knex, channels, user.role);
          
          if (result.skipped) {
            results.skipped++;
          } else {
            results.sent.push({
              userId: user.id,
              username: user.username,
              role: user.role,
              result: result
            });
            results.totalSent++;
          }
        } catch (error) {
          results.errors.push({
            userId: user.id,
            username: user.username,
            role: user.role,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Error sending role-based notification: ${error.message}`);
    }
  }

  // Send student registration notification to admin and owner
  async sendStudentRegistrationNotification(studentData, knex) {
    const data = {
      studentName: studentData.name,
      studentEmail: studentData.email,
      courseName: studentData.course_name,
      registrationDate: new Date().toLocaleDateString(),
      studentId: studentData.id
    };

    return await this.sendRoleBasedNotification(
      'student_registration',
      ['admin', 'owner'],
      data,
      knex,
      ['web', 'line']
    );
  }

  // Send appointment/class reminders
  async sendAppointmentReminders(appointments, knex) {
    const results = {
      sent: [],
      errors: [],
      totalSent: 0
    };

    for (const appointment of appointments) {
      try {
        // Send to student
        if (appointment.student_id) {
          const studentResult = await this.sendNotification(
            'appointment_reminder',
            appointment.student_id,
            {
              courseName: appointment.course_name,
              date: appointment.date,
              time: appointment.time,
              room: appointment.room,
              teacherName: appointment.teacher_name,
              appointmentId: appointment.id
            },
            knex,
            ['web', 'line'],
            'student'
          );
          
          if (!studentResult.skipped) {
            results.sent.push({ type: 'student', appointmentId: appointment.id, result: studentResult });
            results.totalSent++;
          }
        }

        // Send to teacher
        if (appointment.teacher_id) {
          const teacherResult = await this.sendNotification(
            'appointment_reminder',
            appointment.teacher_id,
            {
              courseName: appointment.course_name,
              date: appointment.date,
              time: appointment.time,
              room: appointment.room,
              studentName: appointment.student_name,
              appointmentId: appointment.id
            },
            knex,
            ['web', 'line'],
            'teacher'
          );
          
          if (!teacherResult.skipped) {
            results.sent.push({ type: 'teacher', appointmentId: appointment.id, result: teacherResult });
            results.totalSent++;
          }
        }

        // Send to admin/owner for important appointments
        if (appointment.priority === 'high') {
          const adminResult = await this.sendRoleBasedNotification(
            'appointment_reminder',
            ['admin', 'owner'],
            {
              courseName: appointment.course_name,
              date: appointment.date,
              time: appointment.time,
              room: appointment.room,
              teacherName: appointment.teacher_name,
              studentName: appointment.student_name,
              appointmentId: appointment.id
            },
            knex,
            ['web']
          );
          
          results.totalSent += adminResult.totalSent;
          results.sent.push(...adminResult.sent.map(s => ({ ...s, type: 'admin' })));
          results.errors.push(...adminResult.errors);
        }
      } catch (error) {
        results.errors.push({
          appointmentId: appointment.id,
          error: error.message
        });
      }
    }

    return results;
  }

  // Close the logger service connection
  async close() {
    if (this.logger) {
      await this.logger.close();
    }
  }
}

module.exports = NotificationService;