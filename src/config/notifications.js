/**
 * Notification system configuration
 * Handles LINE integration, web notifications, and notification templates
 */

// Notification types and their priorities
const notificationTypes = {
  class_confirmation: {
    priority: 'high',
    requiresAction: true,
    expiresIn: 24 * 60 * 60 * 1000, // 24 hours
    autoReminder: true,
    reminderInterval: 6 * 60 * 60 * 1000 // 6 hours
  },
  leave_approval: {
    priority: 'medium',
    requiresAction: false,
    expiresIn: 7 * 24 * 60 * 60 * 1000, // 7 days
    autoReminder: false
  },
  class_cancellation: {
    priority: 'high',
    requiresAction: false,
    expiresIn: 24 * 60 * 60 * 1000, // 24 hours
    autoReminder: false
  },
  schedule_change: {
    priority: 'high',
    requiresAction: true,
    expiresIn: 48 * 60 * 60 * 1000, // 48 hours
    autoReminder: true,
    reminderInterval: 12 * 60 * 60 * 1000 // 12 hours
  },
  payment_reminder: {
    priority: 'medium',
    requiresAction: true,
    expiresIn: 7 * 24 * 60 * 60 * 1000, // 7 days
    autoReminder: true,
    reminderInterval: 24 * 60 * 60 * 1000 // 24 hours
  },
  report_deadline: {
    priority: 'medium',
    requiresAction: true,
    expiresIn: 3 * 24 * 60 * 60 * 1000, // 3 days
    autoReminder: true,
    reminderInterval: 24 * 60 * 60 * 1000 // 24 hours
  },
  room_conflict: {
    priority: 'high',
    requiresAction: true,
    expiresIn: 2 * 60 * 60 * 1000, // 2 hours
    autoReminder: false
  },
  general: {
    priority: 'low',
    requiresAction: false,
    expiresIn: 30 * 24 * 60 * 60 * 1000, // 30 days
    autoReminder: false
  },
  // New notification types for the enhanced system
  student_registration: {
    priority: 'medium',
    requiresAction: false,
    expiresIn: 7 * 24 * 60 * 60 * 1000, // 7 days
    autoReminder: false,
    roles: ['admin', 'owner'] // Only admin and owner get these notifications
  },
  appointment_reminder: {
    priority: 'high',
    requiresAction: false,
    expiresIn: 24 * 60 * 60 * 1000, // 24 hours
    autoReminder: true,
    reminderInterval: 2 * 60 * 60 * 1000, // 2 hours
    roles: ['teacher', 'student', 'admin', 'owner'] // All roles get appointment reminders
  },
  class_reminder: {
    priority: 'high',
    requiresAction: false,
    expiresIn: 24 * 60 * 60 * 1000, // 24 hours
    autoReminder: true,
    reminderInterval: 2 * 60 * 60 * 1000, // 2 hours
    roles: ['teacher', 'student'] // Teachers and students get class reminders
  },
  system_maintenance: {
    priority: 'medium',
    requiresAction: false,
    expiresIn: 48 * 60 * 60 * 1000, // 48 hours
    autoReminder: false,
    roles: ['admin', 'owner'] // System notifications for admin/owner
  }
};

// LINE messaging configuration
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  webhookUrl: process.env.LINE_WEBHOOK_URL || '/api/v1/line/webhook',
  
  // Message templates for LINE
  messageTemplates: {
    class_confirmation: {
      type: 'flex',
      altText: 'Class Confirmation Required',
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'Class Confirmation',
              weight: 'bold',
              color: '#1DB446',
              size: 'sm'
            }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '{{course_name}}',
              weight: 'bold',
              size: 'lg'
            },
            {
              type: 'text',
              text: '{{date}} at {{time}}',
              size: 'md',
              color: '#555555',
              margin: 'md'
            },
            {
              type: 'text',
              text: 'Room: {{room}}',
              size: 'sm',
              color: '#111111',
              margin: 'md'
            },
            {
              type: 'text',
              text: 'Teacher: {{teacher_name}}',
              size: 'sm',
              color: '#111111',
              margin: 'sm'
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              height: 'sm',
              action: {
                type: 'uri',
                label: 'Confirm Attendance',
                uri: '{{confirm_url}}'
              }
            }
          ]
        }
      }
    },
    
    payment_reminder: {
      type: 'flex',
      altText: 'Payment Reminder',
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'Payment Reminder',
              weight: 'bold',
              color: '#FF5551',
              size: 'sm'
            }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'Amount Due: {{amount}} THB',
              weight: 'bold',
              size: 'lg'
            },
            {
              type: 'text',
              text: 'Due Date: {{due_date}}',
              size: 'md',
              color: '#555555',
              margin: 'md'
            },
            {
              type: 'text',
              text: 'Course: {{course_name}}',
              size: 'sm',
              color: '#111111',
              margin: 'md'
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              height: 'sm',
              action: {
                type: 'uri',
                label: 'Make Payment',
                uri: '{{payment_url}}'
              }
            }
          ]
        }
      }
    }
  },
  
  // Quick reply templates
  quickReplies: {
    class_confirmation: [
      {
        type: 'action',
        action: {
          type: 'postback',
          label: 'Confirm ✅',
          data: 'action=confirm_class&class_id={{class_id}}'
        }
      },
      {
        type: 'action',
        action: {
          type: 'postback',
          label: 'Request Leave 🏃‍♂️',
          data: 'action=request_leave&class_id={{class_id}}'
        }
      }
    ]
  }
};

// Web notification configuration
const webNotificationConfig = {
  maxNotificationsPerUser: 100, // Keep only last 100 notifications per user
  autoMarkReadAfter: 7 * 24 * 60 * 60 * 1000, // Auto-mark as read after 7 days
  
  // Push notification settings (for future web push implementation)
  pushNotification: {
    enabled: false, // Set to true when implementing web push
    vapidKeys: {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY
    },
    subject: 'mailto:admin@englishkorat.com'
  }
};

// Email notification configuration (backup to LINE)
const emailConfig = {
  enabled: process.env.NOTIFICATION_EMAIL_ENABLED === 'true',
  smtpHost: process.env.SMTP_HOST,
  smtpPort: process.env.SMTP_PORT,
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  fromEmail: process.env.SMTP_USER || 'noreply@englishkorat.com',
  fromName: 'English Korat Language School',
  
  templates: {
    class_confirmation: {
      subject: 'Class Confirmation Required - {{course_name}}',
      template: 'class_confirmation.html'
    },
    payment_reminder: {
      subject: 'Payment Reminder - {{amount}} THB Due',
      template: 'payment_reminder.html'
    },
    leave_approval: {
      subject: 'Leave Request {{status}} - {{course_name}}',
      template: 'leave_approval.html'
    }
  }
};

// Notification scheduling configuration
const schedulingConfig = {
  // When to send class confirmation notifications
  classConfirmation: {
    sendBefore: 24 * 60 * 60 * 1000, // 24 hours before class
    reminderAfter: 6 * 60 * 60 * 1000, // Send reminder if not confirmed after 6 hours
    finalReminder: 2 * 60 * 60 * 1000  // Final reminder 2 hours before class
  },
  
  // When to send payment reminders
  paymentReminder: {
    firstReminder: 7 * 24 * 60 * 60 * 1000, // 7 days before due date
    secondReminder: 3 * 24 * 60 * 60 * 1000, // 3 days before due date
    finalReminder: 24 * 60 * 60 * 1000,      // 1 day before due date
    overdueReminder: 24 * 60 * 60 * 1000     // Every day after due date
  },
  
  // When to send report deadline reminders
  reportDeadline: {
    firstReminder: 3 * 24 * 60 * 60 * 1000, // 3 days before deadline
    secondReminder: 24 * 60 * 60 * 1000,     // 1 day before deadline
    finalReminder: 2 * 60 * 60 * 1000        // 2 hours before deadline
  },

  // When to send appointment reminders
  appointmentReminder: {
    sendBefore: 24 * 60 * 60 * 1000, // 24 hours before appointment
    reminderInterval: 2 * 60 * 60 * 1000, // Send reminder every 2 hours if not confirmed
    finalReminder: 30 * 60 * 1000     // Final reminder 30 minutes before
  },

  // When to send class reminders
  classReminder: {
    sendBefore: 2 * 60 * 60 * 1000,   // 2 hours before class
    finalReminder: 30 * 60 * 1000     // Final reminder 30 minutes before
  }
};

// Notification cleanup configuration
const cleanupConfig = {
  // Auto-delete notifications after specified days
  defaultRetentionDays: parseInt(process.env.NOTIFICATION_RETENTION_DAYS) || 10,
  maxRetentionDays: 365, // Maximum retention period
  cleanupInterval: 24 * 60 * 60 * 1000, // Run cleanup every 24 hours
  
  // Retention periods by notification type (in days)
  retentionByType: {
    class_confirmation: 7,
    leave_approval: 30,
    class_cancellation: 7,
    schedule_change: 14,
    payment_reminder: 90,
    report_deadline: 30,
    room_conflict: 7,
    general: 30,
    student_registration: 90,
    appointment_reminder: 7,
    class_reminder: 7,
    system_maintenance: 30
  },
  
  // Redis cleanup configuration
  batchSize: 100, // Process notifications in batches
  maxProcessingTime: 30 * 60 * 1000 // Maximum processing time: 30 minutes
};

// Logging configuration for Redis and S3 archival
const loggingConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    keyPrefix: 'notification_logs:',
    logExpiry: 24 * 60 * 60, // Redis logs expire after 24 hours (in seconds)
  },
  
  s3: {
    bucket: process.env.NOTIFICATION_LOGS_BUCKET || process.env.AWS_S3_BUCKET,
    prefix: 'notification-logs/',
    region: process.env.AWS_REGION || 'ap-southeast-1',
  },
  
  archival: {
    enabled: process.env.NOTIFICATION_ARCHIVAL_ENABLED !== 'false',
    archiveAfterDays: 1, // Archive to S3 after 1 day
    retentionDays: parseInt(process.env.NOTIFICATION_LOG_RETENTION_DAYS) || 90,
    compressionLevel: 9, // Maximum compression for ZIP files
    archiveInterval: 60 * 60 * 1000, // Check for archival every hour
  },
  
  // Log filtering and search configuration  
  filters: {
    allowedTypes: Object.keys(notificationTypes),
    maxResults: 1000,
    defaultPageSize: 50,
  }
};

// Queue configuration for processing notifications
const queueConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD
  },
  
  // Different queues for different priorities
  queues: {
    high: 'notifications:high',
    medium: 'notifications:medium',
    low: 'notifications:low'
  },
  
  // Processing configuration
  processing: {
    high: {
      concurrency: 10,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    },
    medium: {
      concurrency: 5,
      attempts: 2,
      backoff: {
        type: 'fixed',
        delay: 5000
      }
    },
    low: {
      concurrency: 2,
      attempts: 1
    }
  }
};

// Helper functions for notification variables
const getVariableReplacers = (type, data) => {
  const common = {
    school_name: 'English Korat Language School',
    school_phone: '044-123456',
    school_website: 'https://englishkorat.com'
  };
  
  switch (type) {
  case 'class_confirmation':
    return {
      ...common,
      course_name: data.courseName,
      date: data.date,
      time: data.time,
      room: data.room,
      teacher_name: data.teacherName,
      confirm_url: `${process.env.FRONTEND_URL}/confirm-class/${data.classId}`
    };
      
  case 'payment_reminder':
    return {
      ...common,
      amount: data.amount,
      due_date: data.dueDate,
      course_name: data.courseName,
      bill_number: data.billNumber,
      payment_url: `${process.env.FRONTEND_URL}/payment/${data.billId}`
    };

  case 'student_registration':
    return {
      ...common,
      student_name: data.studentName,
      student_email: data.studentEmail,
      course_name: data.courseName,
      registration_date: data.registrationDate,
      admin_url: `${process.env.FRONTEND_URL}/admin/students/${data.studentId}`
    };

  case 'appointment_reminder':
  case 'class_reminder':
    return {
      ...common,
      course_name: data.courseName || data.appointmentTitle,
      date: data.date,
      time: data.time,
      room: data.room,
      teacher_name: data.teacherName,
      student_name: data.studentName,
      appointment_url: `${process.env.FRONTEND_URL}/appointments/${data.appointmentId || data.classId}`
    };

  case 'system_maintenance':
    return {
      ...common,
      maintenance_title: data.title,
      scheduled_time: data.scheduledTime,
      estimated_duration: data.estimatedDuration,
      affected_services: data.affectedServices
    };
      
  default:
    return common;
  }
};

module.exports = {
  notificationTypes,
  lineConfig,
  webNotificationConfig,
  emailConfig,
  schedulingConfig,
  queueConfig,
  cleanupConfig,
  loggingConfig,
  getVariableReplacers
};