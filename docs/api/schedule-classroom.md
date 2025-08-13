# Schedule & Classroom Management API

Scheduling and room management endpoints for class scheduling, room booking, and conflict resolution.

## 🏫 Overview

The scheduling system manages class schedules, room bookings, and handles conflicts across multiple branches with real-time availability tracking.

## 📋 Endpoints

### Schedule Management

#### List Schedules
```http
GET /api/v1/schedules
Authorization: Bearer <token>
```

#### Create Schedule
```http
POST /api/v1/schedules
Authorization: Bearer <admin-or-owner-token>
```

**Request Body:**
```json
{
  "course_group_id": 1,
  "teacher_id": 5,
  "room_id": 2,
  "start_date": "2024-02-01",
  "end_date": "2024-05-01",
  "schedule_pattern": [
    {
      "day": "monday",
      "start_time": "09:00",
      "end_time": "11:00"
    },
    {
      "day": "wednesday",
      "start_time": "09:00",
      "end_time": "11:00"
    }
  ]
}
```

#### Update Schedule
```http
PUT /api/v1/schedules/:id
Authorization: Bearer <admin-or-owner-token>
```

#### Delete Schedule
```http
DELETE /api/v1/schedules/:id
Authorization: Bearer <admin-or-owner-token>
```

#### Check Schedule Conflicts
```http
GET /api/v1/schedules/conflicts
Authorization: Bearer <admin-or-owner-token>
```

### Room Management

#### List Rooms
```http
GET /api/v1/rooms
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "rooms": [
      {
        "id": 1,
        "name": "Room A101",
        "code": "A101",
        "capacity": 8,
        "equipment": ["Projector", "Whiteboard", "Audio System"],
        "branch": {
          "id": 1,
          "name": "The Mall Branch"
        },
        "status": "active",
        "current_occupancy": 0,
        "next_available": "2024-01-15T14:00:00Z"
      }
    ]
  }
}
```

#### Check Room Availability
```http
GET /api/v1/rooms/availability
Authorization: Bearer <token>
```

**Query Parameters:**
- `date` (string): Date to check availability (YYYY-MM-DD)
- `start_time` (string): Start time (HH:MM)
- `end_time` (string): End time (HH:MM)
- `branch_id` (integer): Filter by branch
- `capacity_min` (integer): Minimum capacity required

#### Reserve Room
```http
POST /api/v1/rooms/reserve
Authorization: Bearer <teacher-admin-or-owner-token>
```

**Request Body:**
```json
{
  "room_id": 1,
  "date": "2024-01-15",
  "start_time": "14:00",
  "end_time": "16:00",
  "purpose": "IELTS Practice Session",
  "notes": "Need projector for listening test"
}
```

## 📊 Conflict Detection

### Get Conflicts
```http
GET /api/v1/schedules/conflicts
Authorization: Bearer <admin-or-owner-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "conflicts": [
      {
        "type": "room_double_booking",
        "room_id": 1,
        "room_name": "Room A101",
        "date": "2024-01-15",
        "time_slot": "14:00-16:00",
        "conflicting_schedules": [
          {
            "schedule_id": 10,
            "course_name": "IELTS Preparation",
            "teacher": "Jane Smith"
          },
          {
            "schedule_id": 15,
            "course_name": "Business English",
            "teacher": "John Doe"
          }
        ],
        "suggestions": [
          {
            "room_id": 2,
            "room_name": "Room A102",
            "available": true
          }
        ]
      }
    ]
  }
}
```