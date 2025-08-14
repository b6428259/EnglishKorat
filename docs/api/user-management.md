# User Management API

User management endpoints for administrators to manage students, teachers, and staff.

## 👥 Overview

The user management system allows administrators and owners to create, update, and manage user accounts across different branches and roles.

## 📋 Endpoints

### List Users
```http
GET /api/v1/users
Authorization: Bearer <admin-or-owner-token>
```

Get a paginated list of users with filtering options.

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 20, max: 100)
- `role` (string): Filter by role (student, teacher, admin, owner)
- `branch_id` (integer): Filter by branch ID
- `status` (string): Filter by status (active, inactive, suspended)
- `search` (string): Search by username, email, or name

**Response:**
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "users": [
      {
        "id": 1,
        "username": "student1",
        "email": "student1@example.com",
        "role": "student",
        "status": "active",
        "branch": {
          "id": 1,
          "name": "The Mall Branch",
          "code": "MALL"
        },
        "profile": {
          "first_name": "John",
          "last_name": "Doe",
          "avatar_url": "https://example.com/avatar1.jpg"
        },
        "created_at": "2024-01-01T00:00:00Z",
        "last_login": "2024-01-15T10:30:00Z"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Create User
```http
POST /api/v1/users
Authorization: Bearer <admin-or-owner-token>
```

Create a new user account.

**Request Body:**
```json
{
  "username": "newteacher",
  "password": "teacher123",
  "email": "teacher@example.com",
  "phone": "+66812345678",
  "line_id": "teacher_line",
  "role": "teacher",
  "branch_id": 1,
  "profile": {
    "first_name": "Jane",
    "last_name": "Smith",
    "birth_date": "1988-03-20",
    "gender": "female",
    "address": "456 Teacher St, Korat",
    "emergency_contact": "+66987654321",
    "qualifications": "BA English, TEFL Certificate",
    "specializations": ["IELTS", "Conversation"]
  },
  "teacher_info": {
    "hourly_rate": 500,
    "max_students_per_class": 8,
    "available_times": ["09:00-12:00", "14:00-18:00"],
    "teaching_experience_years": 5
  }
}
```

### Get User by ID
```http
GET /api/v1/users/:id
Authorization: Bearer <admin-or-owner-token>
```

Get detailed information about a specific user.

**Response:**
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "user": {
      "id": 5,
      "username": "teacher1",
      "email": "teacher1@example.com",
      "phone": "+66812345678",
      "line_id": "teacher1_line",
      "role": "teacher",
      "status": "active",
      "branch": {
        "id": 1,
        "name": "The Mall Branch",
        "code": "MALL"
      },
      "profile": {
        "first_name": "Jane",
        "last_name": "Smith",
        "birth_date": "1988-03-20",
        "gender": "female",
        "address": "456 Teacher St, Korat",
        "emergency_contact": "+66987654321",
        "avatar_url": "https://example.com/teacher1.jpg",
        "qualifications": "BA English, TEFL Certificate",
        "specializations": ["IELTS", "Conversation"]
      },
      "teacher_info": {
        "hourly_rate": 500,
        "max_students_per_class": 8,
        "available_times": ["09:00-12:00", "14:00-18:00"],
        "teaching_experience_years": 5,
        "total_classes_taught": 245,
        "average_rating": 4.8
      },
      "permissions": ["classes.read", "students.read", "reports.write"],
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "last_login": "2024-01-15T08:00:00Z"
    }
  }
}
```

### Update User
```http
PUT /api/v1/users/:id
Authorization: Bearer <admin-or-owner-token>
```

Update user information (admin/owner can update others, users can update own profile).

**Request Body:**
```json
{
  "email": "updated@example.com",
  "phone": "+66812345679",
  "status": "active",
  "profile": {
    "first_name": "Updated",
    "last_name": "Name",
    "address": "New Address",
    "emergency_contact": "+66987654322"
  },
  "teacher_info": {
    "hourly_rate": 550,
    "max_students_per_class": 10
  }
}
```

### Delete User
```http
DELETE /api/v1/users/:id
Authorization: Bearer <owner-token>
```

Soft delete a user (only owners can delete users).

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": {
    "deleted_user_id": 123,
    "deleted_at": "2024-01-15T10:30:00Z"
  }
}
```

### Get User Profile
```http
GET /api/v1/users/:id/profile
Authorization: Bearer <token>
```

Get detailed user profile (accessible by user themselves or admins).

### Update User Password
```http
PUT /api/v1/users/:id/password
Authorization: Bearer <admin-or-owner-token>
```

Update user password (admin/owner action).

**Request Body:**
```json
{
  "new_password": "newpassword123",
  "confirm_password": "newpassword123",
  "force_change": true
}
```

### Suspend/Reactivate User
```http
PUT /api/v1/users/:id/status
Authorization: Bearer <admin-or-owner-token>
```

Change user status (suspend, reactivate, etc.).

**Request Body:**
```json
{
  "status": "suspended",
  "reason": "Violation of terms of service",
  "notify_user": true
}
```

## 🎓 Student-Specific Endpoints

### Register Student
```http
POST /api/v1/students/register
Authorization: Bearer <admin-or-owner-token>
```

Register a new student with additional academic information.

**Request Body:**
```json
{
  "username": "student123",
  "password": "student123",
  "email": "student@example.com",
  "phone": "+66812345678",
  "branch_id": 1,
  "profile": {
    "first_name": "Alice",
    "last_name": "Johnson",
    "birth_date": "2000-05-15",
    "gender": "female",
    "address": "789 Student Ave, Korat",
    "emergency_contact": "+66987654321"
  },
  "student_info": {
    "cefr_level": "B1",
    "toeic_score": 650,
    "ielts_score": 6.0,
    "learning_goals": ["Business English", "IELTS Preparation"],
    "preferred_learning_style": "visual",
    "previous_experience": "2 years self-study"
  }
}
```

### List Students
```http
GET /api/v1/students
Authorization: Bearer <teacher-admin-or-owner-token>
```

Get list of students with academic information.

**Query Parameters:**
- `cefr_level` (string): Filter by CEFR level
- `course_id` (integer): Filter by enrolled course
- `branch_id` (integer): Filter by branch
- `status` (string): Filter by enrollment status

### Get Student Details
```http
GET /api/v1/students/:id
Authorization: Bearer <teacher-admin-or-owner-token>
```

Get detailed student information including academic progress.

### Update Student Information
```http
PUT /api/v1/students/:id
Authorization: Bearer <admin-or-owner-token>
```

Update student academic information and profile.

## 👨‍🏫 Teacher-Specific Endpoints

### List Teachers
```http
GET /api/v1/teachers
Authorization: Bearer <admin-or-owner-token>
```

Get list of teachers with teaching information.

### Get Teacher Details
```http
GET /api/v1/teachers/:id
Authorization: Bearer <admin-or-owner-token>
```

Get detailed teacher information including performance metrics.

### Update Teacher Information
```http
PUT /api/v1/teachers/:id
Authorization: Bearer <admin-or-owner-token>
```

Update teacher professional information.

## 🔒 Permission System

### Role Permissions
```javascript
const rolePermissions = {
  student: [
    'profile.read',
    'profile.write',
    'courses.read',
    'enrollments.read'
  ],
  teacher: [
    'profile.read',
    'profile.write',
    'classes.read',
    'students.read',
    'attendance.write',
    'reports.write'
  ],
  admin: [
    'users.read',
    'users.write',
    'courses.read',
    'courses.write',
    'classes.read',
    'classes.write',
    'reports.read',
    'analytics.read'
  ],
  owner: [
    'users.read',
    'users.write',
    'users.delete',
    'courses.read',
    'courses.write',
    'courses.delete',
    'analytics.read',
    'system.admin'
  ]
};
```

## 📊 User Statistics

### Get User Statistics
```http
GET /api/v1/users/statistics
Authorization: Bearer <admin-or-owner-token>
```

Get user statistics and analytics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_users": 1250,
    "by_role": {
      "student": 1000,
      "teacher": 50,
      "admin": 15,
      "owner": 5
    },
    "by_branch": {
      "1": 600,
      "2": 400,
      "3": 250
    },
    "by_status": {
      "active": 1200,
      "inactive": 30,
      "suspended": 20
    },
    "new_users_this_month": 45,
    "active_users_today": 234
  }
}
```

## 📝 Error Codes

| Code | Description |
|------|-------------|
| `USER_001` | User not found |
| `USER_002` | Username already exists |
| `USER_003` | Email already registered |
| `USER_004` | Invalid role assignment |
| `USER_005` | Insufficient permissions |
| `USER_006` | Cannot delete user with active enrollments |
| `USER_007` | Invalid branch assignment |
| `USER_008` | Password does not meet requirements |
| `USER_009` | Cannot suspend owner account |
| `USER_010` | User account is suspended |