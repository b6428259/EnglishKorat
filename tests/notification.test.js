/**
 * Basic tests for the notification system
 * Tests core functionality without external dependencies (Redis/S3/Database)
 */

const { notificationTypes, cleanupConfig } = require('../src/config/notifications');
const NotificationService = require('../src/utils/NotificationService');

// Mock database for tests
const mockDb = {
  select: () => mockDb,
  where: () => mockDb,
  join: () => mockDb,
  leftJoin: () => mockDb,
  first: () => Promise.resolve({ id: 1, role: 'admin' }),
  insert: () => Promise.resolve([1]),
  update: () => Promise.resolve(1),
  del: () => Promise.resolve(1)
};

describe('Notification System', () => {
  describe('Configuration', () => {
    test('notification types should be properly configured', () => {
      expect(notificationTypes).toBeDefined();
      expect(notificationTypes.class_reminder).toBeDefined();
      expect(notificationTypes.student_registration).toBeDefined();
      expect(notificationTypes.appointment_reminder).toBeDefined();
      expect(notificationTypes.system_maintenance).toBeDefined();
    });

    test('role-based notification types should have role restrictions', () => {
      expect(notificationTypes.student_registration.roles).toContain('admin');
      expect(notificationTypes.student_registration.roles).toContain('owner');
      expect(notificationTypes.appointment_reminder.roles).toContain('teacher');
      expect(notificationTypes.appointment_reminder.roles).toContain('student');
    });

    test('cleanup configuration should be defined', () => {
      expect(cleanupConfig).toBeDefined();
      expect(cleanupConfig.defaultRetentionDays).toBe(10);
      expect(cleanupConfig.retentionByType).toBeDefined();
    });
  });

  describe('NotificationService', () => {
    let notificationService;

    beforeEach(() => {
      notificationService = new NotificationService();
    });

    afterEach(async () => {
      if (notificationService.close) {
        await notificationService.close();
      }
    });

    test('should generate appropriate titles for different notification types', () => {
      const testData = {
        courseName: 'General English',
        studentName: 'John Doe',
        amount: '5000',
        maintenance_title: 'System Upgrade'
      };

      const classTitle = notificationService.getNotificationTitle('class_reminder', testData);
      expect(classTitle).toContain('General English');

      const registrationTitle = notificationService.getNotificationTitle('student_registration', testData);
      expect(registrationTitle).toContain('John Doe');

      const paymentTitle = notificationService.getNotificationTitle('payment_reminder', testData);
      expect(paymentTitle).toContain('5000');

      const maintenanceTitle = notificationService.getNotificationTitle('system_maintenance', testData);
      expect(maintenanceTitle).toContain('System Upgrade');
    });

    test('should properly filter notifications by role', async () => {
      const result = await notificationService.sendNotification(
        'student_registration',
        1,
        { studentName: 'Test Student' },
        mockDb,
        ['web'],
        'student' // Student role should not receive registration notifications
      );

      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('role_not_applicable');
    });

    test('should allow admin role to receive registration notifications', async () => {
      const result = await notificationService.sendNotification(
        'student_registration',
        1,
        { studentName: 'Test Student' },
        mockDb,
        ['web'],
        'admin' // Admin role should receive registration notifications
      );

      expect(result.skipped).toBeUndefined();
    });
  });

  describe('Scheduler Service', () => {
    test('should initialize without errors', () => {
      const NotificationSchedulerService = require('../src/services/NotificationSchedulerService');
      const scheduler = new NotificationSchedulerService();
      
      expect(scheduler).toBeDefined();
      expect(scheduler.isInitialized).toBe(false);
      
      // Test status check
      const status = scheduler.getStatus();
      expect(status).toHaveProperty('isInitialized');
      expect(status).toHaveProperty('scheduledJobs');
    });
  });

  describe('Cleanup Service', () => {
    test('should calculate retention policies correctly', () => {
      const NotificationCleanupService = require('../src/services/NotificationCleanupService');
      const cleanupService = new NotificationCleanupService();
      
      const classReminderRetention = cleanupService.getRetentionPolicy('class_reminder');
      expect(classReminderRetention).toBe(7); // 7 days for class reminders
      
      const defaultRetention = cleanupService.getRetentionPolicy('unknown_type');
      expect(defaultRetention).toBe(10); // Default 10 days

      const registrationRetention = cleanupService.getRetentionPolicy('student_registration');
      expect(registrationRetention).toBe(90); // 90 days for registrations
    });

    test('should validate retention policy updates', () => {
      const NotificationCleanupService = require('../src/services/NotificationCleanupService');
      const cleanupService = new NotificationCleanupService();
      
      expect(() => {
        cleanupService.updateRetentionPolicy('test_type', 0);
      }).toThrow('Retention days must be between 1 and');
      
      expect(() => {
        cleanupService.updateRetentionPolicy('test_type', 500);
      }).toThrow('Retention days must be between 1 and');
      
      const result = cleanupService.updateRetentionPolicy('test_type', 15);
      expect(result.retentionDays).toBe(15);
      expect(result.updated).toBe(true);
    });
  });

  describe('Logger Service', () => {
    test('should generate markdown summaries', () => {
      const NotificationLoggerService = require('../src/services/NotificationLoggerService');
      const loggerService = new NotificationLoggerService();
      
      const mockLogsData = {
        logs: [
          {
            type: 'class_reminder',
            title: 'Test Class Reminder',
            timestamp: new Date().toISOString(),
            userId: 1,
            notificationId: 123,
            deliveryStatus: { line: true, web: true, email: false }
          },
          {
            type: 'student_registration',
            title: 'New Student Registration',
            timestamp: new Date().toISOString(),
            userId: 2,
            notificationId: 124,
            deliveryStatus: { line: true, web: true, email: false }
          }
        ],
        total: 2,
        page: 1,
        limit: 50
      };
      
      const markdown = loggerService.generateMarkdownSummary(mockLogsData);
      
      expect(markdown).toContain('# Notification Logs Summary');
      expect(markdown).toContain('**Total Notifications**: 2');
      expect(markdown).toContain('class_reminder');
      expect(markdown).toContain('student_registration');
      expect(markdown).toContain('Test Class Reminder');
      expect(markdown).toContain('| Type | Total | Delivered | Delivery Rate |');
    });
  });

  describe('Configuration Variables', () => {
    test('should generate correct variable replacers for different types', () => {
      const { getVariableReplacers } = require('../src/config/notifications');
      
      const classData = {
        courseName: 'Advanced English',
        date: '2025-09-02',
        time: '14:00',
        room: 'A1',
        teacherName: 'John Doe'
      };
      
      const classVars = getVariableReplacers('class_reminder', classData);
      expect(classVars.course_name).toBe('Advanced English');
      expect(classVars.school_name).toBe('English Korat Language School');
      
      const studentData = {
        studentName: 'Jane Smith',
        studentEmail: 'jane@example.com',
        courseName: 'General English'
      };
      
      const studentVars = getVariableReplacers('student_registration', studentData);
      expect(studentVars.student_name).toBe('Jane Smith');
      expect(studentVars.student_email).toBe('jane@example.com');
      expect(studentVars.course_name).toBe('General English');
    });
  });
});