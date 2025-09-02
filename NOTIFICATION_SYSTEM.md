# Enhanced Notification System Documentation

## Overview

The Enhanced Notification System provides comprehensive notification capabilities for the English Korat School Management System, including role-based notifications, Redis logging with S3 archival, automatic cleanup, and scheduled reminders.

## Key Features

### 1. Role-Based Notifications
- **Teachers**: Receive upcoming class and appointment reminders
- **Students**: Receive upcoming class and appointment reminders
- **Admin**: Receive all above + new student registration notifications + system notifications
- **Owner**: Receive all notifications including appointment reminders and system-wide alerts

### 2. Redis Logging & S3 Archival
- All notifications are logged to Redis immediately
- After 24 hours, logs are compressed (gzip) and archived to S3
- Configurable retention period (default: 90 days)
- Automatic cleanup of old logs

### 3. Database Notification Management
- Automatic cleanup of old notifications (configurable retention: default 10 days)
- Different retention periods per notification type
- Batch processing to minimize database load

### 4. Scheduled Reminders
- Automatic class reminders (2 hours before class)
- Automatic appointment reminders (24 hours before appointment)
- System maintenance notifications
- Configurable reminder intervals

## Notification Types

### Core Types
- `class_confirmation` - Class confirmation requests (high priority)
- `leave_approval` - Leave request updates (medium priority)
- `class_cancellation` - Class cancellation notices (high priority)
- `schedule_change` - Schedule change notifications (high priority)
- `payment_reminder` - Payment due reminders (medium priority)
- `report_deadline` - Report deadline reminders (medium priority)
- `room_conflict` - Room booking conflicts (high priority)
- `general` - General announcements (low priority)

### Enhanced Types
- `student_registration` - New student registration alerts (admin/owner only)
- `appointment_reminder` - Upcoming appointment reminders (all roles)
- `class_reminder` - Upcoming class reminders (teachers/students)
- `system_maintenance` - System maintenance notifications (admin/owner)

## API Endpoints

### User Notification Management

#### GET `/api/v1/notifications`
Get user's notifications with filtering and pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20, max: 100)
- `type` (optional): Filter by notification type
- `read` (optional): Filter by read status (true/false)

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": 1,
        "type": "class_reminder",
        "title": "Class Reminder - General English",
        "message": "Your class starts in 2 hours...",
        "metadata": { "classId": 123, "room": "A1" },
        "isRead": false,
        "created_at": "2025-09-02T04:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1,
      "hasNext": false,
      "hasPrevious": false
    }
  }
}
```

#### POST `/api/v1/notifications/:id/read`
Mark a specific notification as read.

#### POST `/api/v1/notifications/mark-all-read`
Mark all user's notifications as read.

### Admin Notification Management

#### POST `/api/v1/notifications/send`
Send notification to specific user(s) or role(s). **Requires admin/owner role.**

**Request Body:**
```json
{
  "type": "system_maintenance",
  "userId": 123, // Optional: specific user ID
  "roleTargets": ["admin", "owner"], // Optional: target roles
  "data": {
    "title": "System Maintenance",
    "scheduledTime": "2025-09-02T02:00:00Z",
    "estimatedDuration": "2 hours",
    "affectedServices": "All services"
  },
  "channels": ["web", "line"] // Optional: notification channels
}
```

### Log Management (Owner Only)

#### GET `/api/v1/notifications/logs`
Get notification logs with filtering.

**Query Parameters:**
- `startDate` (optional): Start date filter (ISO8601)
- `endDate` (optional): End date filter (ISO8601)
- `userId` (optional): Filter by user ID
- `type` (optional): Filter by notification type
- `page` (optional): Page number
- `limit` (optional): Results per page (max: 1000)

#### GET `/api/v1/notifications/logs/summary`
Generate and download markdown summary of logs.

**Query Parameters:** Same as `/logs`

**Response:** Downloads a markdown file with formatted log summary.

### System Management (Owner Only)

#### GET `/api/v1/notifications/cleanup/status`
Get cleanup status and database statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "isRunning": false,
    "lastCleanup": "2025-09-02T02:00:00.000Z",
    "totalNotifications": 1234,
    "notificationsByType": {
      "class_reminder": 500,
      "appointment_reminder": 300,
      "student_registration": 50
    },
    "ageDistribution": {
      "last_24h": 100,
      "last_week": 300,
      "last_month": 500,
      "older": 334
    },
    "config": {
      "defaultRetentionDays": 10,
      "retentionByType": { ... }
    }
  }
}
```

#### POST `/api/v1/notifications/cleanup/trigger`
Manually trigger notification cleanup.

**Request Body (Optional):**
```json
{
  "type": "class_reminder", // Optional: specific type
  "retentionDays": 7 // Optional: override retention
}
```

#### POST `/api/v1/notifications/logs/archive`
Manually trigger log archival to S3.

**Request Body (Optional):**
```json
{
  "targetDate": "2025-09-01" // Optional: specific date (default: yesterday)
}
```

## Configuration

### Environment Variables

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# S3 Configuration for Log Archival
AWS_S3_BUCKET=your-s3-bucket
AWS_REGION=ap-southeast-1
NOTIFICATION_LOGS_BUCKET=your-logs-bucket # Optional: separate bucket

# Notification Retention
NOTIFICATION_RETENTION_DAYS=10 # Database retention
NOTIFICATION_LOG_RETENTION_DAYS=90 # S3 log retention
NOTIFICATION_ARCHIVAL_ENABLED=true

# Email Configuration (Optional)
NOTIFICATION_EMAIL_ENABLED=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# LINE Configuration (Optional)
LINE_CHANNEL_ACCESS_TOKEN=your_line_token
LINE_CHANNEL_SECRET=your_line_secret

# Frontend URL for notification links
FRONTEND_URL=https://your-frontend-url.com
```

### Notification Type Configuration

You can customize notification types in `src/config/notifications.js`:

```javascript
const notificationTypes = {
  custom_type: {
    priority: 'medium', // high, medium, low
    requiresAction: false,
    expiresIn: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    autoReminder: true,
    reminderInterval: 24 * 60 * 60 * 1000, // 24 hours
    roles: ['admin', 'owner'] // Allowed roles
  }
};
```

### Cleanup Configuration

Customize retention periods per notification type:

```javascript
const cleanupConfig = {
  defaultRetentionDays: 10,
  retentionByType: {
    class_reminder: 7,
    appointment_reminder: 7,
    student_registration: 90,
    system_maintenance: 30
  }
};
```

## Background Services

### NotificationSchedulerService
- Runs cleanup daily at 2:00 AM Bangkok time
- Archives logs hourly
- Sends appointment reminders every 30 minutes
- Sends class reminders every 15 minutes

### NotificationCleanupService
- Batch processing for database cleanup
- Configurable retention periods
- Non-blocking operations

### NotificationLoggerService
- Redis logging with automatic expiry
- S3 compression and archival
- Log filtering and search

## Integration Examples

### Student Registration Hook

The system automatically sends notifications to admins and owners when a new student registers:

```javascript
// In student registration controller
await sendStudentRegistrationNotification({
  id: student.id,
  name: `${student.first_name} ${student.last_name}`,
  email: student.email,
  course_name: selectedCourse,
  registrationDate: new Date().toLocaleDateString()
});
```

### Manual Notification Sending

```javascript
const NotificationService = require('./utils/NotificationService');
const notificationService = new NotificationService();

// Send to specific user
await notificationService.sendNotification(
  'appointment_reminder',
  userId,
  {
    courseName: 'General English',
    date: '2025-09-02',
    time: '14:00',
    room: 'A1',
    teacherName: 'John Doe'
  },
  db,
  ['web', 'line'],
  'student'
);

// Send to multiple roles
await notificationService.sendRoleBasedNotification(
  'system_maintenance',
  ['admin', 'owner'],
  {
    title: 'System Maintenance',
    scheduledTime: '2025-09-02T02:00:00Z'
  },
  db
);
```

## Monitoring and Troubleshooting

### Logs
- Application logs: Standard Winston logging
- Redis connection status: Logged on connection/disconnection
- Archival status: Logged with compression statistics
- Cleanup results: Logged with deletion counts

### Health Checks
- Server health endpoint includes Redis status
- Notification scheduler status via API
- Database cleanup status via API

### Common Issues

1. **Redis Connection Failures**
   - System continues without Redis logging
   - Web notifications still work
   - Check Redis configuration and network connectivity

2. **S3 Archival Failures**
   - Check AWS credentials and bucket permissions
   - Verify S3 bucket exists and region is correct
   - Logs remain in Redis until next archival attempt

3. **High Memory Usage**
   - Monitor notification table size
   - Check cleanup service is running
   - Verify retention periods are appropriate

## Security Considerations

- All sensitive data is excluded from logs and responses
- Role-based access control for all endpoints
- S3 logs are compressed and encrypted in transit
- Redis logs expire automatically to prevent memory issues
- Database notifications are cleaned up automatically

## Performance Optimization

- Batch processing for database operations
- Redis key expiry to prevent memory leaks
- Compression for S3 archival
- Indexed database queries for notifications
- Rate limiting on notification endpoints
- Async processing for notification delivery

## Backup and Recovery

- **Database**: Regular MySQL backups include notification data
- **Redis Logs**: Temporary storage, automatically archived to S3
- **S3 Archives**: Versioned and replicated according to S3 configuration
- **Configuration**: Store notification configuration in version control

For detailed implementation information, refer to the source code in:
- `src/config/notifications.js` - Configuration
- `src/services/NotificationSchedulerService.js` - Background scheduling
- `src/services/NotificationLoggerService.js` - Redis/S3 logging
- `src/services/NotificationCleanupService.js` - Database cleanup
- `src/utils/NotificationService.js` - Core notification logic
- `src/controllers/notificationController.js` - API endpoints
- `src/routes/notifications.js` - Route definitions