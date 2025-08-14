# Course Management API

Course management endpoints for creating, updating, and managing courses across different branches.

## 📚 Overview

The course management system handles 8 different course types with flexible pricing, scheduling, and group management capabilities.

### Course Types
- **Kids Conversation** - Conversational English for children
- **Adults Conversation** - Conversational English for adults  
- **English 4 Skills** - Reading, writing, listening, speaking
- **IELTS Test Preparation** - IELTS exam preparation
- **TOEIC Test Preparation** - TOEIC exam preparation
- **TOEFL Test Preparation** - TOEFL exam preparation
- **Chinese Conversation** - Mandarin conversation classes
- **Chinese 4 Skills** - Complete Chinese language skills

## 📋 Endpoints

### List Courses
```http
GET /api/v1/courses
Authorization: Bearer <token>
```

Get a paginated list of available courses.

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 20)
- `course_type` (string): Filter by course type
- `branch_id` (integer): Filter by branch
- `level` (string): Filter by difficulty level
- `status` (string): Filter by status (active, inactive)
- `search` (string): Search by course name or description

**Response:**
```json
{
  "success": true,
  "message": "Courses retrieved successfully",
  "data": {
    "courses": [
      {
        "id": 1,
        "name": "IELTS Preparation - Advanced",
        "course_type": "ielts_preparation",
        "level": "advanced",
        "total_hours": 60,
        "price_per_hour": 300,
        "total_price": 18000,
        "max_students": 8,
        "min_students": 3,
        "description": "Comprehensive IELTS preparation for band 7+",
        "branch": {
          "id": 1,
          "name": "The Mall Branch",
          "code": "MALL"
        },
        "status": "active",
        "created_at": "2024-01-01T00:00:00Z"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### Create Course
```http
POST /api/v1/courses
Authorization: Bearer <admin-or-owner-token>
```

Create a new course.

**Request Body:**
```json
{
  "name": "Business English Conversation",
  "course_type": "adults_conversation",
  "level": "intermediate",
  "total_hours": 40,
  "price_per_hour": 350,
  "max_students": 6,
  "min_students": 3,
  "branch_id": 1,
  "description": "Professional English conversation for business environments",
  "requirements": ["Basic English proficiency", "TOEIC 400+"],
  "learning_objectives": [
    "Business communication skills",
    "Meeting participation",
    "Presentation skills",
    "Professional vocabulary"
  ],
  "materials": [
    "Business English textbook",
    "Audio materials",
    "Online resources"
  ],
  "assessment_methods": ["Participation", "Presentations", "Final assessment"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Course created successfully",
  "data": {
    "course": {
      "id": 15,
      "name": "Business English Conversation",
      "course_type": "adults_conversation",
      "level": "intermediate",
      "total_hours": 40,
      "price_per_hour": 350,
      "total_price": 14000,
      "max_students": 6,
      "min_students": 3,
      "branch_id": 1,
      "status": "active",
      "created_at": "2024-01-15T10:30:00Z"
    }
  }
}
```

### Get Course by ID
```http
GET /api/v1/courses/:id
Authorization: Bearer <token>
```

Get detailed information about a specific course.

**Response:**
```json
{
  "success": true,
  "message": "Course retrieved successfully",
  "data": {
    "course": {
      "id": 1,
      "name": "IELTS Preparation - Advanced",
      "course_type": "ielts_preparation",
      "level": "advanced",
      "total_hours": 60,
      "price_per_hour": 300,
      "total_price": 18000,
      "max_students": 8,
      "min_students": 3,
      "description": "Comprehensive IELTS preparation for band 7+",
      "requirements": ["IELTS 5.5+ or equivalent", "Upper-intermediate English"],
      "learning_objectives": [
        "Achieve IELTS band 7.0+",
        "Master all four skills",
        "Test-taking strategies",
        "Academic writing proficiency"
      ],
      "materials": [
        "Cambridge IELTS textbooks",
        "Online practice tests",
        "Audio materials"
      ],
      "assessment_methods": ["Weekly practice tests", "Mock exams", "Progress tracking"],
      "branch": {
        "id": 1,
        "name": "The Mall Branch",
        "code": "MALL",
        "address": "The Mall Korat, Nakhon Ratchasima"
      },
      "current_groups": 2,
      "total_enrolled": 14,
      "available_spots": 2,
      "next_start_date": "2024-02-01T00:00:00Z",
      "status": "active",
      "created_at": "2024-01-01T00:00:00Z"
    }
  }
}
```

### Update Course
```http
PUT /api/v1/courses/:id
Authorization: Bearer <admin-or-owner-token>
```

Update course information.

**Request Body:**
```json
{
  "name": "IELTS Preparation - Advanced (Updated)",
  "price_per_hour": 320,
  "max_students": 10,
  "description": "Updated comprehensive IELTS preparation",
  "status": "active"
}
```

### Delete Course
```http
DELETE /api/v1/courses/:id
Authorization: Bearer <owner-token>
```

Soft delete a course (only if no active enrollments).

## 👥 Course Groups Management

### Get Course Groups
```http
GET /api/v1/courses/:id/groups
Authorization: Bearer <token>
```

Get all groups for a specific course.

**Response:**
```json
{
  "success": true,
  "message": "Course groups retrieved successfully",
  "data": {
    "groups": [
      {
        "id": 1,
        "group_name": "IELTS-ADV-001",
        "course_id": 1,
        "teacher": {
          "id": 5,
          "name": "Jane Smith",
          "email": "jane@englishkorat.com"
        },
        "schedule": [
          {
            "day": "monday",
            "start_time": "09:00",
            "end_time": "11:00",
            "room": "A101"
          },
          {
            "day": "wednesday",
            "start_time": "09:00", 
            "end_time": "11:00",
            "room": "A101"
          }
        ],
        "enrolled_students": 6,
        "max_students": 8,
        "start_date": "2024-02-01",
        "end_date": "2024-05-01",
        "status": "active"
      }
    ]
  }
}
```

### Create Course Group
```http
POST /api/v1/courses/:id/groups
Authorization: Bearer <admin-or-owner-token>
```

Create a new group for a course.

**Request Body:**
```json
{
  "group_name": "IELTS-ADV-002",
  "teacher_id": 7,
  "max_students": 8,
  "start_date": "2024-03-01",
  "end_date": "2024-06-01",
  "schedule": [
    {
      "day": "tuesday",
      "start_time": "14:00",
      "end_time": "16:00",
      "room_id": 2
    },
    {
      "day": "thursday",
      "start_time": "14:00",
      "end_time": "16:00", 
      "room_id": 2
    }
  ]
}
```

### Update Course Group
```http
PUT /api/v1/courses/:courseId/groups/:groupId
Authorization: Bearer <admin-or-owner-token>
```

Update group information.

### Get Group Students
```http
GET /api/v1/courses/:courseId/groups/:groupId/students
Authorization: Bearer <teacher-admin-or-owner-token>
```

Get all students enrolled in a specific group.

## 📊 Course Statistics

### Get Course Statistics
```http
GET /api/v1/courses/statistics
Authorization: Bearer <admin-or-owner-token>
```

Get course statistics and analytics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_courses": 45,
    "by_type": {
      "ielts_preparation": 8,
      "toeic_preparation": 6,
      "adults_conversation": 12,
      "kids_conversation": 10,
      "english_4_skills": 5,
      "toefl_preparation": 2,
      "chinese_conversation": 1,
      "chinese_4_skills": 1
    },
    "by_level": {
      "beginner": 15,
      "intermediate": 18,
      "advanced": 12
    },
    "enrollment_stats": {
      "total_enrollments": 234,
      "active_enrollments": 198,
      "average_enrollment_per_course": 5.2,
      "revenue_this_month": 2850000
    },
    "popular_courses": [
      {
        "course_id": 1,
        "name": "IELTS Preparation - Advanced",
        "enrollments": 24
      }
    ]
  }
}
```

### Get Course Performance
```http
GET /api/v1/courses/:id/performance
Authorization: Bearer <admin-or-owner-token>
```

Get performance metrics for a specific course.

## 💰 Pricing Management

### Get Course Pricing
```http
GET /api/v1/courses/:id/pricing
Authorization: Bearer <token>
```

Get detailed pricing information for a course.

### Update Course Pricing
```http
PUT /api/v1/courses/:id/pricing
Authorization: Bearer <admin-or-owner-token>
```

Update course pricing structure.

**Request Body:**
```json
{
  "price_per_hour": 350,
  "discounts": [
    {
      "type": "early_bird",
      "percentage": 10,
      "valid_until": "2024-01-25"
    },
    {
      "type": "student",
      "percentage": 15,
      "requires_verification": true
    }
  ],
  "payment_plans": [
    {
      "name": "full_payment",
      "installments": 1,
      "discount_percentage": 5
    },
    {
      "name": "two_installments", 
      "installments": 2,
      "discount_percentage": 0
    }
  ]
}
```

## 🔍 Search and Filtering

### Advanced Course Search
```http
GET /api/v1/courses/search
Authorization: Bearer <token>
```

Advanced search with multiple filters.

**Query Parameters:**
- `q` (string): Search query
- `course_types[]` (array): Multiple course types
- `levels[]` (array): Multiple levels
- `branches[]` (array): Multiple branches
- `price_min` (integer): Minimum price
- `price_max` (integer): Maximum price
- `hours_min` (integer): Minimum hours
- `hours_max` (integer): Maximum hours
- `available_spots` (boolean): Only courses with available spots
- `start_date_from` (date): Courses starting from date
- `start_date_to` (date): Courses starting until date

## 📚 Course Materials

### Get Course Materials
```http
GET /api/v1/courses/:id/materials
Authorization: Bearer <token>
```

Get list of materials for a course.

### Upload Course Material
```http
POST /api/v1/courses/:id/materials
Authorization: Bearer <teacher-admin-or-owner-token>
Content-Type: multipart/form-data
```

Upload a new material file for a course.

## 📝 Error Codes

| Code | Description |
|------|-------------|
| `COURSE_001` | Course not found |
| `COURSE_002` | Invalid course type |
| `COURSE_003` | Course name already exists |
| `COURSE_004` | Invalid pricing structure |
| `COURSE_005` | Cannot delete course with active enrollments |
| `COURSE_006` | Insufficient teacher qualifications |
| `COURSE_007` | Schedule conflict detected |
| `COURSE_008` | Room capacity exceeded |
| `COURSE_009` | Invalid date range |
| `COURSE_010` | Course group is full |