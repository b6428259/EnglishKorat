# English Korat School Management System API Documentation

A comprehensive backend system for managing an English language school with multiple branches, featuring advanced leave policy management, change tracking, and notification systems.

## 🏗️ System Architecture

### Current Implementation Status: Phase 3 ✅ Complete

The system has been developed in phases:
- **Phase 1**: Core functionality (Authentication, Users, Courses, Rooms, Enrollments)
- **Phase 2**: Scheduling & Classes (Class management, Attendance tracking, Schedule coordination)
- **Phase 3**: Advanced Leave Policy Management (Dynamic rules, Change tracking, Notifications) ✅ **CURRENT**

---

## 🚀 Features Overview

### Phase 1 ✅ - Core System
#### 🔐 Authentication & Security
- JWT-based authentication with role-based access control
- Four user roles: Student, Teacher, Admin, Owner  
- Password encryption with bcrypt
- Session management and token validation
- Branch-based data isolation

#### 👥 User Management
- Comprehensive user registration and profile management
- Student profiles with CEFR levels and test scores
- Teacher and staff account management
- Multi-branch user assignment

#### 📚 Course Management  
- Dynamic course creation and management
- Support for 8 course types:
  - Kids/Adults Conversation
  - English 4 Skills 
  - IELTS/TOEIC/TOEFL Test Preparation
  - Chinese Conversation & 4 Skills
- Flexible pricing and hour configurations
- Branch-specific course organization

#### 🏫 Room & Facility Management
- Room availability checking and conflict resolution
- Capacity-based room suggestions
- Equipment tracking and requirements
- Time slot management

#### 📝 Enrollment System
- Student course enrollment with payment tracking
- Leave credit management
- Enrollment history and status tracking

### Phase 2 ✅ - Scheduling & Classes
#### 📅 Advanced Class Scheduling
- Comprehensive class creation and management
- Teacher assignment with conflict detection
- Room booking and availability checking
- Multi-status class tracking (scheduled, confirmed, in_progress, completed, cancelled)

#### 📋 Attendance Tracking
- Detailed attendance marking (present, absent, excused, late)
- Student leave request submission and approval workflow
- Attendance reports for students and classes
- Integration with leave credit system

#### 🗓️ Schedule Coordination
- Teacher, student, and room schedule views
- Branch-wide schedule management
- Conflict detection and resolution
- Available time slot suggestions

### Phase 3 ✅ - Advanced Leave Policy Management **[CURRENT]**
#### 🎯 Dynamic Leave Policy Rules
- **Configurable Leave Policies**: Replace hardcoded values with dynamic, database-driven rules
- **Course-Specific Rules**: Different policies for different course types and durations
- **Effective Date Management**: Time-bound rules with start/end dates
- **Multi-Branch Support**: Branch-specific policy configurations
- **Validation**: Prevents negative values and overlapping policies

#### 🔒 Advanced Permissions & Security
- **Role-Based Editing**: Only authorized users (admin/owner) can modify policies
- **Granular Permissions**: Separate permissions for viewing, editing, and approving
- **Change Reason Requirement**: Mandatory reasons for all policy modifications
- **Branch Access Control**: Users can only modify policies in their branch (except owners)

#### 📚 Comprehensive Change Tracking & Audit Trail
- **Complete History**: Track all create, update, delete, and revert operations
- **Before/After Values**: Store old and new values for every change
- **Change Summaries**: Human-readable descriptions of modifications
- **Revert Capability**: Owners can revert changes to previous states
- **Approval Workflow**: Optional approval process for sensitive changes

#### 🔔 Real-Time Notification System
- **Policy Change Notifications**: Instant alerts when policies are modified
- **Detailed Information**: Who changed what, when, and why
- **Rich Metadata**: Complete context with links and change details
- **Read/Unread Tracking**: Mark notifications as read/unread
- **Owner Alerts**: Automatic notifications to owners for all policy changes

#### 🏠 Room Usage Notification System
- **Teacher Alerts**: Popup notifications for room availability and conflicts
- **Real-Time Updates**: Live notifications about room changes
- **Schedule Integration**: Notifications tied to actual class schedules
- **Conflict Prevention**: Proactive alerts about room booking conflicts

---

## 🗄️ Database Schema

### Core Tables (Phase 1 & 2)
- **`branches`** - School branches (Mall, Tech, Online)
- **`users`** - User accounts with roles and branch assignments
- **`students`** - Student profiles with CEFR levels and test scores
- **`teachers`** - Teacher profiles and hourly rates
- **`courses`** - Course catalog with types and pricing
- **`rooms`** - Room inventory with capacity and equipment
- **`enrollments`** - Student course enrollments with payment tracking
- **`classes`** - Individual class sessions with schedules
- **`class_attendances`** - Attendance records for each class
- **`student_leaves`** - Leave requests and approvals

### Phase 3 Advanced Tables
- **`leave_policy_rules`** - Dynamic leave policy configurations
  - Rule definitions with course types, hours, credits
  - Effective/expiry dates and branch assignments  
  - JSON conditions for advanced rules
  
- **`leave_policy_permissions`** - Edit permissions management
  - User-specific permissions for policy rules
  - Permission types: edit, approve, view
  
- **`leave_policy_changes`** - Complete audit trail
  - All CRUD operations with before/after values
  - Change reasons and approval tracking
  - Revert capability with linked changes
  
- **`leave_policy_notifications`** - Policy change notifications
  - Recipient-specific notifications
  - Rich metadata and read/unread status
  
- **`room_notifications`** - Room usage alerts
  - Teacher-specific room notifications
  - Schedule conflict alerts and availability updates

---

### 📝 Enrollment System
- Student course enrollment
- Payment status tracking
- Leave credit management
- Enrollment history

### 🏢 Multi-Branch Support
- The Mall Branch (offline)
- Technology Branch (offline)  
- Online Branch (virtual)

## Features Implemented (Phase 2 ✅ - Scheduling & Classes)

### 📅 Class Scheduling System
- Create and manage class schedules
- Assign teachers to classes
- Update class status (scheduled, confirmed, in_progress, completed, cancelled)
- Handle schedule conflict resolution
- Room and teacher availability checking

### 📋 Attendance Tracking
- Mark student attendance (present, absent, excused, late)
- Generate attendance reports for students and classes
- Manage leave requests and approvals
- Leave credit management integration

### 🗓️ Schedule Management
- View schedules for teachers, students, and rooms
- Check for scheduling conflicts
- Suggest available time slots
- Branch-wide schedule overview

## 🔗 API Endpoints

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication Endpoints
```http
POST   /api/v1/auth/register          # Register new user
POST   /api/v1/auth/login             # User login  
GET    /api/v1/auth/profile           # Get user profile
PUT    /api/v1/auth/profile           # Update profile
PUT    /api/v1/auth/change-password   # Change password
```

### Student Management
```http
POST   /api/v1/students/register      # Student registration
GET    /api/v1/students               # List students (Admin/Owner)
GET    /api/v1/students/:id           # Get student details
PUT    /api/v1/students/:id           # Update student info
```

### Course Management
```http
GET    /api/v1/courses                # List courses
GET    /api/v1/courses/:id            # Get course details
POST   /api/v1/courses                # Create course (Admin/Owner)
PUT    /api/v1/courses/:id            # Update course (Admin/Owner)
DELETE /api/v1/courses/:id            # Delete course (Admin/Owner)
```

### Room Management
```http
GET    /api/v1/rooms                  # List rooms
GET    /api/v1/rooms/availability     # Check room availability
GET    /api/v1/rooms/suggestions      # Get room suggestions
POST   /api/v1/rooms                  # Create room (Admin/Owner)
PUT    /api/v1/rooms/:id              # Update room (Admin/Owner)
```

### Enrollment Management
```http
POST   /api/v1/enrollments            # Enroll student (Admin/Owner)
GET    /api/v1/enrollments            # List enrollments
GET    /api/v1/enrollments/student/:id # Student's enrollments
PUT    /api/v1/enrollments/:id        # Update enrollment (Admin/Owner)
```

### Class Management (Phase 2)
```http
GET    /api/v1/classes                # List classes with filters
POST   /api/v1/classes                # Create class (Admin/Owner)
GET    /api/v1/classes/:id            # Get class details
PUT    /api/v1/classes/:id            # Update class (Admin/Owner)
DELETE /api/v1/classes/:id            # Delete class (Admin/Owner)
```

### Attendance Management (Phase 2)
```http
POST   /api/v1/attendance             # Mark attendance (Teacher/Admin/Owner)
GET    /api/v1/attendance/class/:classId # Get class attendance
GET    /api/v1/attendance/student/:studentId # Get student attendance report
POST   /api/v1/attendance/leave-request # Submit leave request (Student)
PUT    /api/v1/attendance/leave-request/:id # Process leave request (Admin/Owner)
GET    /api/v1/attendance/leave-requests # List leave requests
```

### Schedule Management (Phase 2)
```http
GET    /api/v1/schedules/teacher/:teacherId # Get teacher schedule
GET    /api/v1/schedules/student/:studentId # Get student schedule
GET    /api/v1/schedules/room/:roomId       # Get room schedule
GET    /api/v1/schedules/branch/:branchId   # Get branch schedule (Admin/Owner)
POST   /api/v1/schedules/check-conflicts   # Check scheduling conflicts (Admin/Owner)
GET    /api/v1/schedules/available-slots   # Get available time slots (Admin/Owner)
```

### 🆕 Leave Policy Management (Phase 3)
```http
GET    /api/v1/leave-policies         # List leave policy rules
POST   /api/v1/leave-policies         # Create leave policy rule (Admin/Owner)
GET    /api/v1/leave-policies/:id     # Get specific leave policy rule
PUT    /api/v1/leave-policies/:id     # Update leave policy rule (Admin/Owner)
```

### 🆕 Change History & Audit (Phase 3)
```http
GET    /api/v1/policy/changes         # Get change history (Admin/Owner)
POST   /api/v1/policy/revert/:changeId # Revert a change (Owner only)
```

### 🆕 Notification System (Phase 3)
```http
GET    /api/v1/policy/notifications   # Get user notifications
PUT    /api/v1/policy/notifications/:id/read # Mark notification as read
PUT    /api/v1/policy/notifications/mark-all-read # Mark all as read
```

### 🆕 Room Notifications (Phase 3)
```http
GET    /api/v1/policy/room-notifications # Get room notifications
POST   /api/v1/policy/room-notifications # Create room notification (Admin/Owner)
```

### System Endpoints
```http
GET    /health                        # Health check
GET    /api/v1                        # API documentation & available endpoints
GET    /api/v1/postman-collection.json # Download Postman collection
```

---

## 💡 Usage Examples & API Reference

### Authentication

#### Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin",
      "branch_id": 1,
      "branch_name": "The Mall Branch"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Phase 3: Leave Policy Management

#### Creating a Leave Policy Rule
```bash
curl -X POST http://localhost:3000/api/v1/leave-policies \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rule_name": "ระเบียบการลาคอร์ส 60 ชั่วโมง กลุ่มเล็ก",
    "course_type": "group_small",
    "course_hours": 60,
    "max_students": 5,
    "leave_credits": 2,
    "effective_date": "2024-01-01",
    "conditions": {
      "advance_notice_hours": 24,
      "makeup_classes_allowed": true,
      "deadline_time": "20:00"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Leave policy rule created successfully",
  "data": {
    "id": 10,
    "rule_name": "ระเบียบการลาคอร์ส 60 ชั่วโมง กลุ่มเล็ก",
    "course_type": "group_small",
    "course_hours": 60,
    "max_students": 5,
    "leave_credits": 2,
    "effective_date": "2024-01-01",
    "status": "active",
    "conditions": {
      "advance_notice_hours": 24,
      "makeup_classes_allowed": true,
      "deadline_time": "20:00"
    },
    "branch_name": "The Mall Branch",
    "created_by_username": "admin"
  }
}
```

#### Updating a Policy (with Required Change Reason)
```bash
curl -X PUT http://localhost:3000/api/v1/leave-policies/10 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "leave_credits": 3,
    "change_reason": "เพิ่มสิทธิ์การลาจาก 2 เป็น 3 ครั้ง ตามนโยบายใหม่ของสถาบัน"
  }'
```

#### Getting Change History
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/v1/policy/changes?policy_rule_id=10"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 15,
      "change_type": "update",
      "changed_by_username": "admin",
      "change_reason": "เพิ่มสิทธิ์การลาจาก 2 เป็น 3 ครั้ง ตามนโยบายใหม่ของสถาบัน",
      "field_changes": "leave_credits: 2 → 3",
      "old_values": {
        "leave_credits": 2
      },
      "new_values": {
        "leave_credits": 3
      },
      "created_at": "2024-01-15T10:30:00Z",
      "rule_name": "ระเบียบการลาคอร์ส 60 ชั่วโมง กลุ่มเล็ก"
    }
  ]
}
```

#### Creating Room Notification
```bash
curl -X POST http://localhost:3000/api/v1/policy/room-notifications \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notification_type": "room_conflict",
    "title": "ห้องเรียนขัดแย้ง",
    "message": "ห้อง A1 มีการจองซ้อนกันในเวลา 14:00-16:00",
    "room_id": 1,
    "teacher_id": 5,
    "schedule_time": "2024-01-15T14:00:00Z",
    "metadata": {
      "conflicting_classes": [10, 15],
      "suggested_alternatives": [2, 3]
    }
  }'
```

### Phase 2: Class & Schedule Management

#### Creating a Class
```bash
curl -X POST http://localhost:3000/api/v1/classes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "course_group_id": 1,
    "teacher_id": 2,
    "room_id": 1,
    "class_date": "2024-01-15",
    "start_time": "14:00",
    "end_time": "16:00",
    "hours": 2,
    "notes": "Regular conversation class"
  }'
```

#### Checking Schedule Conflicts
```bash
curl -X POST http://localhost:3000/api/v1/schedules/check-conflicts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "class_date": "2024-01-15",
    "start_time": "14:00:00",
    "end_time": "16:00:00",
    "teacher_id": 2,
    "room_id": 1
  }'
```

#### Marking Attendance
```bash
curl -X POST http://localhost:3000/api/v1/attendance \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "class_id": 1,
    "attendances": [
      {
        "student_id": 1,
        "status": "present",
        "notes": "Participated actively"
      },
      {
        "student_id": 2,
        "status": "late",
        "notes": "Arrived 15 minutes late"
      }
    ]
  }'
```

---

## 🗄️ Complete Database Schema

### Core System Tables (Phase 1 & 2)
```sql
-- Branches
CREATE TABLE branches (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(10) UNIQUE NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  status ENUM('active', 'inactive') DEFAULT 'active'
);

-- Users (All roles)
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100) UNIQUE,
  phone VARCHAR(20),
  line_id VARCHAR(50),
  role ENUM('student', 'teacher', 'admin', 'owner') NOT NULL,
  branch_id INT,
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- Student profiles
CREATE TABLE students (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  nickname VARCHAR(50),
  age INT,
  cefr_level ENUM('A1', 'A2', 'B1', 'B2', 'C1', 'C2'),
  grammar_score INT CHECK (grammar_score >= 0 AND grammar_score <= 100),
  speaking_score INT CHECK (speaking_score >= 0 AND speaking_score <= 100),
  listening_score INT CHECK (listening_score >= 0 AND listening_score <= 100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Course management
CREATE TABLE courses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50) NOT NULL,
  course_type ENUM('conversation_kids', 'conversation_adults', 'english_4skills', 
                   'ielts_prep', 'toeic_prep', 'toefl_prep', 
                   'chinese_conversation', 'chinese_4skills') NOT NULL,
  branch_id INT NOT NULL,
  max_students INT NOT NULL CHECK (max_students > 0),
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  hours_total INT NOT NULL CHECK (hours_total > 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);
```

### Phase 3: Advanced Leave Policy Tables
```sql
-- Dynamic Leave Policy Rules
CREATE TABLE leave_policy_rules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  branch_id INT NOT NULL,
  rule_name VARCHAR(200) NOT NULL,
  course_type ENUM('private', 'pair', 'group_small', 'group_large',
                   'conversation_kids', 'conversation_adults', 'english_4skills',
                   'ielts_prep', 'toeic_prep', 'toefl_prep',
                   'chinese_conversation', 'chinese_4skills') NOT NULL,
  course_hours INT UNSIGNED NOT NULL,
  max_students INT UNSIGNED DEFAULT 1,
  leave_credits INT UNSIGNED NOT NULL,
  price_per_hour DECIMAL(10,2),
  conditions JSON,
  effective_date DATE NOT NULL,
  expiry_date DATE,
  status ENUM('draft', 'active', 'inactive', 'archived') DEFAULT 'draft',
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  UNIQUE KEY uniq_leave_rules (branch_id, course_type, course_hours, effective_date)
);

-- Edit Permissions
CREATE TABLE leave_policy_permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  policy_rule_id INT NOT NULL,
  user_id INT NOT NULL,
  permission_type ENUM('edit', 'approve', 'view') NOT NULL,
  granted_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (policy_rule_id) REFERENCES leave_policy_rules(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id),
  UNIQUE KEY uniq_leave_perms (policy_rule_id, user_id, permission_type)
);

-- Complete Change Tracking
CREATE TABLE leave_policy_changes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  policy_rule_id INT NOT NULL,
  change_type ENUM('create', 'update', 'delete', 'revert') NOT NULL,
  changed_by INT NOT NULL,
  change_reason TEXT NOT NULL,
  old_values JSON,
  new_values JSON,
  field_changes TEXT,
  reverted_from_change_id INT,
  status ENUM('pending_approval', 'approved', 'rejected', 'applied') DEFAULT 'applied',
  approved_by INT,
  approved_at TIMESTAMP NULL,
  applied_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (policy_rule_id) REFERENCES leave_policy_rules(id),
  FOREIGN KEY (changed_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  FOREIGN KEY (reverted_from_change_id) REFERENCES leave_policy_changes(id)
);

-- Policy Change Notifications
CREATE TABLE leave_policy_notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  change_id INT NOT NULL,
  recipient_id INT NOT NULL,
  notification_type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  metadata JSON,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (change_id) REFERENCES leave_policy_changes(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Room Usage Notifications
CREATE TABLE room_notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  branch_id INT NOT NULL,
  room_id INT,
  teacher_id INT,
  notification_type ENUM('room_available', 'room_conflict', 'room_change', 'general') NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  schedule_time DATETIME,
  metadata JSON,
  is_popup_shown BOOLEAN DEFAULT FALSE,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);
```

---

## 🔒 Security & Authorization

### Role-Based Permissions

| Endpoint | Student | Teacher | Admin | Owner |
|----------|---------|---------|-------|-------|
| **Authentication** |
| Login/Register | ✅ | ✅ | ✅ | ✅ |
| Profile management | ✅ | ✅ | ✅ | ✅ |
| **Course Management** |
| View courses | ✅ | ✅ | ✅ | ✅ |
| Create/Update courses | ❌ | ❌ | ✅ | ✅ |
| **Class & Schedule** |
| View own schedule | ✅ | ✅ | ✅ | ✅ |
| Create classes | ❌ | ❌ | ✅ | ✅ |
| Mark attendance | ❌ | ✅ | ✅ | ✅ |
| **Leave Policies** |
| View policies | ✅ | ✅ | ✅ | ✅ |
| Create/Update policies | ❌ | ❌ | ✅ | ✅ |
| View change history | ❌ | ❌ | ✅ | ✅ |
| Revert changes | ❌ | ❌ | ❌ | ✅ |

### Branch Isolation
- **Admins**: Can only access data within their assigned branch
- **Owners**: Have access to all branches and can view/manage cross-branch data
- **Students/Teachers**: Can only access their own data and relevant course information

### Security Features
- **JWT Authentication**: Secure token-based authentication
- **Password Encryption**: bcrypt hashing with salt rounds
- **Input Validation**: Comprehensive validation using express-validator
- **SQL Injection Prevention**: Parameterized queries with Knex.js
- **Rate Limiting**: Prevents API abuse
- **CORS Configuration**: Controlled cross-origin access
- **Helmet Middleware**: Security headers protection

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ 
- **Database**: MySQL 8.0+ or PostgreSQL 12+
- **Package Manager**: npm or yarn

### Quick Setup
```bash
# 1. Clone and install
git clone <repository-url>
cd EnglishKorat
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your database credentials

# 3. Database setup
npm run migrate    # Run migrations
npm run seed      # Seed initial data

# 4. Start development server
npm run dev       # Development mode
npm start         # Production mode
```

### Environment Configuration
```env
# Server
NODE_ENV=development
PORT=3000

# Database
DB_CLIENT=mysql2
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=admin
DB_PASSWORD=adminEKLS1234
DB_NAME=englishkorat

# Authentication
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Optional: Notification services
LINE_CHANNEL_ACCESS_TOKEN=your_line_token
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### Available Scripts
```bash
npm run dev        # Development with nodemon
npm test           # Run test suite
npm run lint       # ESLint code checking
npm run migrate    # Run database migrations
npm run seed       # Seed database with sample data
npm start          # Production server
```

---

## 📊 Testing & Development

### API Testing
```bash
# Get API documentation
curl http://localhost:3000/api/v1

# Download Postman collection
curl http://localhost:3000/api/v1/postman-collection.json > ekls.postman_collection.json
```

### Test Accounts (after seeding)
```
Admin: username=admin, password=admin123
Owner: username=owner, password=admin123
```

### Running Tests
```bash
npm test                    # All tests
npm test -- --watch       # Watch mode
npm test -- --coverage    # With coverage
```

---

## 🔄 Migration & Deployment Notes

### Phase 3 Migration Strategy
1. **Backward Compatibility**: Existing enrollments continue with legacy leave credits
2. **Gradual Migration**: New enrollments automatically use applicable policy rules  
3. **Data Preservation**: All historical data is maintained during migration
4. **Zero Downtime**: Migrations can be run without service interruption

### Production Deployment
```bash
# Build and deploy
npm run build
npm run migrate:production
pm2 start src/server.js --name "english-korat-api"
```

---

## 📞 Support & Documentation

### Additional Resources
- **Live API Documentation**: `GET /api/v1` 
- **Postman Collection**: `GET /api/v1/postman-collection.json`
- **Health Check**: `GET /health`

### System Monitoring
- **Logs**: Winston logging to `logs/` directory
- **Health Endpoint**: Basic system status check
- **Error Tracking**: Comprehensive error logging and response handling

---

**Version**: 3.0.0 (Phase 3 Complete)  
**Last Updated**: January 2024  
**License**: Proprietary - English Korat Language School