# Database Documentation

Comprehensive database schema documentation for the English Korat Language School Management System.

## 📊 Database Overview

The system uses MySQL 8.0+ with a comprehensive schema supporting multi-branch operations, user management, course enrollment, scheduling, leave policies, and financial tracking.

### Database Configuration
- **Engine**: MySQL 8.0+
- **Character Set**: utf8mb4
- **Collation**: utf8mb4_unicode_ci
- **ORM**: Knex.js with migrations
- **Connection Pooling**: Enabled (min: 2, max: 10)

## 🏗️ Schema Structure

### Core System Tables

#### Branches
Multi-branch support for different school locations.

```sql
CREATE TABLE branches (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(10) UNIQUE NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  type ENUM('offline', 'online') DEFAULT 'offline',
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### Users
Central user management for all roles.

```sql
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
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
);
```

#### User Profiles
Extended profile information for all users.

```sql
CREATE TABLE user_profiles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNIQUE NOT NULL,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  birth_date DATE,
  gender ENUM('male', 'female', 'other'),
  address TEXT,
  emergency_contact VARCHAR(20),
  avatar_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Academic System Tables

#### Courses
Course catalog with pricing and capacity information.

```sql
CREATE TABLE courses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  course_type ENUM('kids_conversation', 'adults_conversation', 'english_4_skills', 
                   'ielts_preparation', 'toeic_preparation', 'toefl_preparation',
                   'chinese_conversation', 'chinese_4_skills') NOT NULL,
  level ENUM('beginner', 'intermediate', 'advanced') NOT NULL,
  total_hours INT NOT NULL,
  price_per_hour DECIMAL(10,2) NOT NULL,
  max_students INT NOT NULL,
  min_students INT NOT NULL,
  description TEXT,
  requirements TEXT,
  learning_objectives JSON,
  materials JSON,
  assessment_methods JSON,
  branch_id INT NOT NULL,
  status ENUM('active', 'inactive', 'draft') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);
```

#### Course Groups
Individual class groups within courses.

```sql
CREATE TABLE course_groups (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL,
  group_name VARCHAR(100) NOT NULL,
  teacher_id INT,
  max_students INT NOT NULL,
  start_date DATE,
  end_date DATE,
  status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL
);
```

#### Rooms
Classroom and facility management.

```sql
CREATE TABLE rooms (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  capacity INT NOT NULL,
  equipment JSON,
  branch_id INT NOT NULL,
  status ENUM('active', 'maintenance', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);
```

### Enrollment & Scheduling Tables

#### Enrollments
Student course enrollments with payment tracking.

```sql
CREATE TABLE enrollments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  course_group_id INT,
  enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('active', 'completed', 'cancelled', 'transferred') DEFAULT 'active',
  payment_status ENUM('pending', 'partial', 'paid', 'overdue') DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  leave_credits_used INT DEFAULT 0,
  leave_credits_remaining INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (course_group_id) REFERENCES course_groups(id) ON DELETE SET NULL
);
```

#### Classes
Individual class sessions.

```sql
CREATE TABLE classes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_group_id INT NOT NULL,
  teacher_id INT NOT NULL,
  room_id INT,
  class_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  topic VARCHAR(200),
  materials_used JSON,
  homework_assigned TEXT,
  status ENUM('scheduled', 'completed', 'cancelled', 'postponed') DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_group_id) REFERENCES course_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);
```

#### Class Attendance
Attendance tracking for each class session.

```sql
CREATE TABLE class_attendances (
  id INT PRIMARY KEY AUTO_INCREMENT,
  class_id INT NOT NULL,
  student_id INT NOT NULL,
  status ENUM('present', 'absent', 'late', 'excused') NOT NULL,
  attendance_time TIMESTAMP NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_attendance (class_id, student_id)
);
```

### Leave Policy System Tables

#### Leave Policy Rules
Dynamic leave policy configurations.

```sql
CREATE TABLE leave_policy_rules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  rule_name VARCHAR(200) NOT NULL,
  course_type ENUM('kids_conversation', 'adults_conversation', 'english_4_skills', 
                   'ielts_preparation', 'toeic_preparation', 'toefl_preparation',
                   'chinese_conversation', 'chinese_4_skills'),
  course_hours INT,
  max_students INT,
  leave_credits INT NOT NULL,
  effective_date DATE NOT NULL,
  end_date DATE NULL,
  conditions JSON,
  branch_id INT,
  status ENUM('active', 'inactive', 'draft') DEFAULT 'active',
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);
```

#### Leave Policy Changes
Comprehensive change tracking and audit trail.

```sql
CREATE TABLE leave_policy_changes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  policy_id INT NOT NULL,
  change_type ENUM('create', 'update', 'delete', 'revert') NOT NULL,
  changed_by INT NOT NULL,
  change_summary TEXT NOT NULL,
  old_values JSON,
  new_values JSON,
  change_reason TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_by INT NULL,
  approval_timestamp TIMESTAMP NULL,
  reverted BOOLEAN DEFAULT FALSE,
  revert_reason TEXT NULL,
  FOREIGN KEY (policy_id) REFERENCES leave_policy_rules(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);
```

#### Student Leave Requests
Individual leave requests from students.

```sql
CREATE TABLE student_leaves (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  class_id INT NOT NULL,
  leave_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  admin_notes TEXT,
  request_makeup BOOLEAN DEFAULT FALSE,
  makeup_scheduled BOOLEAN DEFAULT FALSE,
  makeup_class_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (makeup_class_id) REFERENCES classes(id) ON DELETE SET NULL
);
```

### Notification System Tables

#### Notifications
System-wide notification management.

```sql
CREATE TABLE leave_policy_notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  notification_type VARCHAR(50) NOT NULL,
  related_policy_id INT NULL,
  related_change_id INT NULL,
  metadata JSON,
  read_status BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (related_policy_id) REFERENCES leave_policy_rules(id) ON DELETE SET NULL,
  FOREIGN KEY (related_change_id) REFERENCES leave_policy_changes(id) ON DELETE SET NULL
);
```

#### Room Notifications
Room usage and conflict notifications.

```sql
CREATE TABLE room_notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  teacher_id INT NULL,
  room_id INT NULL,
  notification_type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  schedule_time TIMESTAMP NULL,
  metadata JSON,
  read_status BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);
```

## 🔗 Entity Relationships

### Primary Relationships

1. **Users → Branches**: Many-to-One (users belong to one branch)
2. **Users → User Profiles**: One-to-One (each user has one profile)
3. **Courses → Branches**: Many-to-One (courses belong to one branch)
4. **Course Groups → Courses**: Many-to-One (groups belong to one course)
5. **Course Groups → Teachers**: Many-to-One (groups have one teacher)
6. **Enrollments → Students**: Many-to-One (students can have multiple enrollments)
7. **Enrollments → Courses**: Many-to-One (courses can have multiple enrollments)
8. **Classes → Course Groups**: Many-to-One (classes belong to one group)
9. **Classes → Rooms**: Many-to-One (classes use one room)
10. **Attendance → Classes**: Many-to-One (each class has multiple attendance records)
11. **Attendance → Students**: Many-to-One (students have multiple attendance records)

### Leave Policy Relationships

1. **Leave Policies → Branches**: Many-to-One (policies can be branch-specific)
2. **Leave Changes → Policies**: Many-to-One (policies can have multiple changes)
3. **Leave Changes → Users**: Many-to-One (users can make multiple changes)
4. **Leave Requests → Students**: Many-to-One (students can have multiple requests)
5. **Leave Requests → Classes**: Many-to-One (classes can have multiple leave requests)

### Notification Relationships

1. **Notifications → Users**: Many-to-One (users receive multiple notifications)
2. **Notifications → Policies**: Many-to-One (policies can trigger multiple notifications)
3. **Room Notifications → Teachers**: Many-to-One (teachers receive multiple notifications)
4. **Room Notifications → Rooms**: Many-to-One (rooms can generate multiple notifications)

## 📋 Data Types and Constraints

### Common Patterns
- **Primary Keys**: Auto-incrementing INT
- **Foreign Keys**: INT with proper constraints
- **Timestamps**: TIMESTAMP with automatic updates
- **Enums**: Used for status fields and predefined values
- **JSON**: Used for flexible metadata and configuration
- **Text Fields**: Used for descriptions and notes
- **Decimal**: Used for monetary values (precision 10,2)

### Indexing Strategy
- Primary keys (automatic)
- Foreign keys (automatic)
- Unique constraints on business keys
- Composite indexes on frequently queried combinations
- Text indexes on searchable fields

## 🔐 Security Considerations

### Data Protection
- Passwords are hashed using bcrypt
- Sensitive data is not logged
- Foreign key constraints prevent orphaned records
- Soft deletes used where appropriate

### Access Control
- Row-level security through branch_id filtering
- Role-based access control in application layer
- Audit trails for sensitive operations
- Change tracking for policy modifications

## 📊 Performance Optimization

### Query Optimization
- Proper indexing on frequently queried fields
- Connection pooling for database connections
- Prepared statements to prevent SQL injection
- Query result caching where appropriate

### Data Archiving
- Old attendance records can be archived
- Completed enrollments moved to historical tables
- Log rotation for audit trails
- Backup strategies for data recovery