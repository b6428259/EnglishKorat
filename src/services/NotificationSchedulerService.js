/**
 * Notification Scheduler Service
 * Handles automatic cleanup, archival, and reminder notifications
 */

const cron = require('node-cron');
const { db } = require('../config/database');
const { cleanupConfig, loggingConfig, schedulingConfig } = require('../config/notifications');
const NotificationService = require('../utils/NotificationService');
const NotificationCleanupService = require('./NotificationCleanupService');
const NotificationLoggerService = require('./NotificationLoggerService');
const logger = require('../utils/logger');

class NotificationSchedulerService {
  constructor() {
    this.notificationService = new NotificationService();
    this.cleanupService = new NotificationCleanupService();
    this.loggerService = new NotificationLoggerService();
    this.isInitialized = false;
    this.scheduledJobs = [];
  }

  // Initialize all scheduled tasks
  initialize() {
    if (this.isInitialized) {
      logger.warn('Notification scheduler already initialized');
      return;
    }

    try {
      // Daily cleanup of old notifications (runs at 2:00 AM)
      const cleanupJob = cron.schedule('0 2 * * *', async () => {
        logger.info('Starting scheduled notification cleanup');
        try {
          const result = await this.cleanupService.runCleanup();
          logger.info(`Scheduled cleanup completed:`, result);
        } catch (error) {
          logger.error('Scheduled cleanup failed:', error);
        }
      }, {
        scheduled: false,
        timezone: 'Asia/Bangkok'
      });

      // Hourly log archival (runs every hour at minute 0)
      const archivalJob = cron.schedule('0 * * * *', async () => {
        if (!loggingConfig.archival.enabled) return;
        
        logger.debug('Starting scheduled log archival check');
        try {
          // Archive logs from yesterday
          const yesterdayDate = new Date();
          yesterdayDate.setDate(yesterdayDate.getDate() - 1);
          
          const result = await this.loggerService.archiveLogs(yesterdayDate);
          if (result.success && result.archived > 0) {
            logger.info(`Scheduled archival completed: ${result.archived} logs archived`);
          }
        } catch (error) {
          logger.error('Scheduled archival failed:', error);
        }
      }, {
        scheduled: false,
        timezone: 'Asia/Bangkok'
      });

      // Appointment reminders (runs every 30 minutes)
      const reminderJob = cron.schedule('*/30 * * * *', async () => {
        logger.debug('Checking for appointment reminders');
        try {
          await this.sendAppointmentReminders();
        } catch (error) {
          logger.error('Appointment reminder check failed:', error);
        }
      }, {
        scheduled: false,
        timezone: 'Asia/Bangkok'
      });

      // Class reminders (runs every 15 minutes)
      const classReminderJob = cron.schedule('*/15 * * * *', async () => {
        logger.debug('Checking for class reminders');
        try {
          await this.sendClassReminders();
        } catch (error) {
          logger.error('Class reminder check failed:', error);
        }
      }, {
        scheduled: false,
        timezone: 'Asia/Bangkok'
      });

      this.scheduledJobs = [cleanupJob, archivalJob, reminderJob, classReminderJob];
      
      // Start all jobs
      this.scheduledJobs.forEach(job => job.start());
      
      this.isInitialized = true;
      logger.info('Notification scheduler initialized with 4 scheduled tasks');

    } catch (error) {
      logger.error('Failed to initialize notification scheduler:', error);
      throw error;
    }
  }

  // Send appointment reminders
  async sendAppointmentReminders() {
    try {
      const now = new Date();
      const reminderTime = new Date(now.getTime() + schedulingConfig.appointmentReminder.sendBefore);

      // Get upcoming appointments that need reminders
      const appointments = await db('appointments as a')
        .select(
          'a.id',
          'a.title as appointment_title',
          'a.scheduled_at',
          'a.student_id',
          'a.teacher_id',
          'a.room',
          'u_student.id as student_user_id',
          'u_teacher.id as teacher_user_id',
          's.name as student_name',
          't.name as teacher_name',
          'c.name as course_name'
        )
        .leftJoin('students as s', 'a.student_id', 's.id')
        .leftJoin('teachers as t', 'a.teacher_id', 't.id')
        .leftJoin('courses as c', 'a.course_id', 'c.id')
        .leftJoin('users as u_student', 's.user_id', 'u_student.id')
        .leftJoin('users as u_teacher', 't.user_id', 'u_teacher.id')
        .where('a.scheduled_at', '>=', now)
        .where('a.scheduled_at', '<=', reminderTime)
        .where('a.status', 'scheduled')
        .whereNotExists(function() {
          this.select('*')
            .from('notifications')
            .whereRaw('notifications.metadata->>"$.appointmentId" = CAST(a.id AS CHAR)')
            .where('notifications.type', 'appointment_reminder')
            .where('notifications.created_at', '>', db.raw('DATE_SUB(NOW(), INTERVAL 2 HOUR)'));
        });

      if (appointments.length === 0) {
        logger.debug('No appointments found for reminder');
        return { sent: 0 };
      }

      const processedAppointments = appointments.map(apt => ({
        id: apt.id,
        course_name: apt.course_name || apt.appointment_title,
        date: apt.scheduled_at.toLocaleDateString(),
        time: apt.scheduled_at.toLocaleTimeString(),
        room: apt.room,
        teacher_name: apt.teacher_name,
        student_name: apt.student_name,
        student_id: apt.student_user_id,
        teacher_id: apt.teacher_user_id,
        priority: 'normal'
      }));

      const result = await this.notificationService.sendAppointmentReminders(processedAppointments, db);
      
      if (result.totalSent > 0) {
        logger.info(`Sent ${result.totalSent} appointment reminders`);
      }

      return result;
    } catch (error) {
      logger.error('Failed to send appointment reminders:', error);
      throw error;
    }
  }

  // Send class reminders
  async sendClassReminders() {
    try {
      const now = new Date();
      const reminderTime = new Date(now.getTime() + schedulingConfig.classReminder.sendBefore);

      // Get upcoming classes that need reminders
      const classes = await db('class_sessions as cs')
        .select(
          'cs.id',
          'cs.scheduled_at',
          'cs.room',
          'c.name as course_name',
          't.name as teacher_name',
          't.user_id as teacher_user_id',
          'e.student_id',
          's.user_id as student_user_id',
          's.name as student_name'
        )
        .join('classes as cl', 'cs.class_id', 'cl.id')
        .join('courses as c', 'cl.course_id', 'c.id')
        .join('teachers as t', 'cl.teacher_id', 't.id')
        .join('enrollments as e', 'cl.id', 'e.class_id')
        .join('students as s', 'e.student_id', 's.id')
        .where('cs.scheduled_at', '>=', now)
        .where('cs.scheduled_at', '<=', reminderTime)
        .where('cs.status', 'scheduled')
        .where('e.status', 'active')
        .whereNotExists(function() {
          this.select('*')
            .from('notifications')
            .whereRaw('notifications.metadata->>"$.classId" = CAST(cs.id AS CHAR)')
            .where('notifications.type', 'class_reminder')
            .where('notifications.created_at', '>', db.raw('DATE_SUB(NOW(), INTERVAL 1 HOUR)'));
        });

      if (classes.length === 0) {
        logger.debug('No classes found for reminder');
        return { sent: 0 };
      }

      let totalSent = 0;
      const errors = [];

      // Group by class session and send reminders
      const classSessions = classes.reduce((acc, cls) => {
        if (!acc[cls.id]) {
          acc[cls.id] = {
            id: cls.id,
            course_name: cls.course_name,
            date: cls.scheduled_at.toLocaleDateString(),
            time: cls.scheduled_at.toLocaleTimeString(),
            room: cls.room,
            teacher_name: cls.teacher_name,
            teacher_id: cls.teacher_user_id,
            students: []
          };
        }
        
        acc[cls.id].students.push({
          id: cls.student_user_id,
          name: cls.student_name
        });
        
        return acc;
      }, {});

      for (const [classId, classData] of Object.entries(classSessions)) {
        try {
          // Send to teacher
          if (classData.teacher_id) {
            const teacherResult = await this.notificationService.sendNotification(
              'class_reminder',
              classData.teacher_id,
              {
                courseName: classData.course_name,
                date: classData.date,
                time: classData.time,
                room: classData.room,
                classId: classData.id,
                studentCount: classData.students.length
              },
              db,
              ['web', 'line'],
              'teacher'
            );

            if (!teacherResult.skipped) totalSent++;
          }

          // Send to each student
          for (const student of classData.students) {
            try {
              const studentResult = await this.notificationService.sendNotification(
                'class_reminder',
                student.id,
                {
                  courseName: classData.course_name,
                  date: classData.date,
                  time: classData.time,
                  room: classData.room,
                  teacherName: classData.teacher_name,
                  classId: classData.id
                },
                db,
                ['web', 'line'],
                'student'
              );

              if (!studentResult.skipped) totalSent++;
            } catch (error) {
              errors.push({ studentId: student.id, error: error.message });
            }
          }
        } catch (error) {
          errors.push({ classId, error: error.message });
        }
      }

      if (totalSent > 0) {
        logger.info(`Sent ${totalSent} class reminders`);
      }

      return { sent: totalSent, errors };
    } catch (error) {
      logger.error('Failed to send class reminders:', error);
      throw error;
    }
  }

  // Manually trigger appointment reminders
  async triggerAppointmentReminders() {
    logger.info('Manually triggering appointment reminders');
    return await this.sendAppointmentReminders();
  }

  // Manually trigger class reminders
  async triggerClassReminders() {
    logger.info('Manually triggering class reminders');
    return await this.sendClassReminders();
  }

  // Get scheduler status
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      scheduledJobs: this.scheduledJobs.length,
      jobs: this.scheduledJobs.map(job => ({
        running: job.getStatus() === 'scheduled',
        lastDate: job.lastDate()
      }))
    };
  }

  // Stop all scheduled jobs
  stop() {
    this.scheduledJobs.forEach(job => {
      if (job.getStatus() === 'scheduled') {
        job.stop();
      }
    });
    
    this.isInitialized = false;
    logger.info('Notification scheduler stopped');
  }

  // Restart all scheduled jobs
  restart() {
    this.stop();
    setTimeout(() => {
      this.initialize();
    }, 1000);
  }

  // Close all service connections
  async close() {
    this.stop();
    await this.notificationService.close();
    await this.loggerService.close();
  }
}

module.exports = NotificationSchedulerService;