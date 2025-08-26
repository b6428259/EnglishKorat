# Test Enhanced Schedule API

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication
ใช้ Bearer Token ใน Authorization header

## Test Cases

### 1. Test GET /schedules/:id/sessions (Enhanced with teacher/student details)
```bash
# Test basic session listing
curl -X GET "http://localhost:3000/api/v1/schedules/1/sessions" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Test with pagination and filters
curl -X GET "http://localhost:3000/api/v1/schedules/1/sessions?page=1&limit=5&sort_by=session_date&sort_order=asc" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Test with status filter
curl -X GET "http://localhost:3000/api/v1/schedules/1/sessions?status=scheduled&include_cancelled=false" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 2. Test GET /schedules/calendar (Day/Week/Month view with holidays)
```bash
# Test week view
curl -X GET "http://localhost:3000/api/v1/schedules/calendar?view=week&date=2025-08-26&include_holidays=true&include_students=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Test month view
curl -X GET "http://localhost:3000/api/v1/schedules/calendar?view=month&date=2025-09-01&branch_id=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Test day view
curl -X GET "http://localhost:3000/api/v1/schedules/calendar?view=day&date=2025-08-27&teacher_id=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 3. Test with different user roles
```bash
# Owner/Admin - should see all information (phone, email)
curl -X GET "http://localhost:3000/api/v1/schedules/1/sessions" \
  -H "Authorization: Bearer OWNER_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Teacher - should see limited information (no phone/email)
curl -X GET "http://localhost:3000/api/v1/schedules/1/sessions" \
  -H "Authorization: Bearer TEACHER_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 4. Test error cases
```bash
# Invalid date format
curl -X GET "http://localhost:3000/api/v1/schedules/calendar?view=week&date=invalid-date" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Missing required date parameter
curl -X GET "http://localhost:3000/api/v1/schedules/calendar?view=week" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Invalid view parameter
curl -X GET "http://localhost:3000/api/v1/schedules/calendar?view=invalid&date=2025-08-26" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

## Expected Response Structure

### GET /schedules/:id/sessions Response
```json
{
  "success": true,
  "data": {
    "schedule": {
      "id": 1,
      "schedule_name": "English A1 Morning",
      "course_name": "General English A1",
      "branch_name": "หนองแค Branch",
      "total_hours": 60,
      "current_students": 4,
      "available_spots": 2
    },
    "students": [
      {
        "id": 101,
        "first_name": "สมชาย",
        "last_name": "ใจดี",
        "nickname": "ชาย",
        "email": "somchai@example.com", // Only for Owner/Admin
        "phone": "0812345678" // Only for Owner/Admin
      }
    ],
    "sessions": [
      {
        "id": 501,
        "session_date": "2025-09-01",
        "teacher_first_name": "John",
        "teacher_last_name": "Doe",
        "teacher_phone": "0898765432", // Only for Owner/Admin
        "teacher_email": "john@example.com", // Only for Owner/Admin
        "comment_count": 2,
        "attendance_summary": {"present": 4, "absent": 0}
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 20,
      "total": 20,
      "total_pages": 1
    }
  }
}
```

### GET /schedules/calendar Response
```json
{
  "success": true,
  "data": {
    "view": "week",
    "period": {
      "start_date": "2025-08-25",
      "end_date": "2025-08-31",
      "total_days": 7
    },
    "calendar": {
      "2025-08-26": {
        "date": "2025-08-26",
        "day_of_week": "monday",
        "is_holiday": true,
        "holiday_info": {
          "name": "วันแม่แห่งชาติ",
          "name_en": "Queen's Birthday"
        },
        "sessions": [],
        "session_count": 0
      }
    },
    "holidays": [],
    "summary": {
      "total_sessions": 12,
      "total_holidays": 1,
      "sessions_by_branch": {"หนองแค Branch": 8}
    }
  }
}
```

## Notes
- ระบบใช้ role-based filtering: Owner/Admin เห็นข้อมูลทั้งหมด, Teacher เห็นข้อมูลจำกัด
- Calendar endpoint ไม่มี pagination (แสดงข้อมูลทั้งหมดในช่วงที่เลือก)
- Holiday integration มาจาก myhora.com API
- ข้อมูล email และ phone อยู่ในตาราง users (ไม่ใช่ teachers/students table)
