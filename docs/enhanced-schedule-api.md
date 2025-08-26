# Enhanced Schedule Management API

## Overview
เอกสารนี้อธิบาย enhanced endpoints ที่ได้รับการปรับปรุงใหม่สำหรับ schedule management system

## Enhanced Endpoints

### 1. GET /api/v1/schedules/:id/sessions
ดูรายการ sessions ของ schedule แบบละเอียดเหมือน `/schedules/:id/` แต่มีข้อมูลครบครันกว่า

**Features:**
- ✅ แสดงข้อมูลสาขาในแต่ละ schedule
- ✅ แสดงข้อมูลครูทุกคนที่สอนในตารางนั้น
- ✅ Role-based access: แอดมินเห็นทั้งหมด, ครูเห็นเฉพาะข้อมูลที่จำเป็น
- ✅ รวมข้อมูลนักเรียนที่ลงทะเบียน
- ✅ Attendance summary ของแต่ละ session
- ✅ Comment count และ exceptions

**Query Parameters:**
- `page`, `limit` - Pagination
- `sort_by`, `sort_order` - Sorting
- `status`, `start_date`, `end_date` - Date and status filters
- `teacher_id`, `room_id`, `session_number`, `week_number` - Specific filters
- `is_makeup_session`, `has_comments` - Boolean filters
- `include_cancelled` - Include cancelled sessions

**Response Example:**
```json
{
  "success": true,
  "data": {
    "schedule": {
      "id": 1,
      "schedule_name": "English A1 Morning",
      "course_name": "General English A1",
      "course_code": "ENG-A1",
      "branch_name": "หนองแค Branch",
      "total_hours": 60,
      "hours_per_session": 3,
      "max_students": 6,
      "current_students": 4,
      "available_spots": 2,
      "start_date": "2025-09-01",
      "end_date": "2025-12-15",
      "status": "active",
      "schedule_type": "regular",
      "auto_reschedule_holidays": true
    },
    "students": [
      {
        "id": 101,
        "first_name": "สมชาย",
        "last_name": "ใจดี",
        "nickname": "ชาย",
        "date_of_birth": "2000-05-15",
        "school": "โรงเรียนสาธิต",
        "email": "somchai@example.com",
        "phone": "0812345678",
        "enrollment_date": "2025-08-20",
        "enrollment_status": "active",
        "total_amount": 12000,
        "enrollment_notes": null
      }
    ],
    "sessions": [
      {
        "id": 501,
        "session_date": "2025-09-01T00:00:00.000Z",
        "session_number": 1,
        "week_number": 1,
        "start_time": "09:00:00",
        "end_time": "12:00:00",
        "status": "scheduled",
        "teacher_first_name": "John",
        "teacher_last_name": "Doe",
        "teacher_phone": "0898765432",
        "teacher_email": "john.doe@example.com",
        "teacher_date_of_birth": "1985-03-20",
        "teacher_school": "Chulalongkorn University",
        "room_name": "Room A1",
        "room_capacity": 8,
        "comment_count": 2,
        "attendance_summary": {
          "present": 4,
          "absent": 0,
          "late": 0
        }
      }
    ],
    "exceptions": [
      {
        "id": 1,
        "exception_date": "2025-09-03",
        "exception_type": "cancellation",
        "reason": "National Holiday",
        "status": "approved"
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 20,
      "total": 20,
      "total_pages": 1
    },
    "summary": {
      "total_sessions": 20,
      "scheduled": 18,
      "completed": 0,
      "cancelled": 2,
      "makeup_sessions": 1,
      "total_exceptions": 1,
      "total_enrolled_students": 4
    }
  }
}
```

**Role-based Data Filtering:**
- **Owner/Admin** เห็นข้อมูลทั้งหมดของครู: phone, email, date_of_birth, school
- **Teacher** เห็นข้อมูลครูจำกัด: first_name, last_name, date_of_birth, school เท่านั้น
- **Owner/Admin** เห็นข้อมูลนักเรียนทั้งหมด: contact info, enrollment details
- **Teacher** เห็นข้อมูลนักเรียนพื้นฐาน: name, nickname, date_of_birth, school

### 2. GET /api/v1/schedules/calendar
ดูตารางสอนแบบปฏิทิน (วัน/สัปดาห์/เดือน) พร้อมข้อมูลวันหยุด - **ไม่มี pagination**

**Query Parameters:**
- `view` (required) - มุมมองปฏิทิน: `day`, `week`, `month`
- `date` (required) - วันที่อ้างอิง (YYYY-MM-DD)
- `branch_id` - กรองตามสาขา
- `teacher_id` - กรองตามครู
- `room_id` - กรองตามห้องเรียน
- `course_id` - กรองตามคอร์ส
- `status` (default: 'active') - สถานะ schedule
- `include_students` (default: false) - รวมข้อมูลนักเรียน
- `include_holidays` (default: true) - รวมข้อมูลวันหยุด

**Response Example (Week View):**
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
      "2025-08-25": {
        "date": "2025-08-25",
        "day_of_week": "monday",
        "is_holiday": false,
        "holiday_info": null,
        "sessions": [
          {
            "id": 501,
            "schedule_name": "English A1 Morning",
            "course_name": "General English A1",
            "course_code": "ENG-A1",
            "branch_name": "หนองแค Branch",
            "session_date": "2025-08-25T00:00:00.000Z",
            "start_time": "09:00:00",
            "end_time": "12:00:00",
            "status": "scheduled",
            "teacher_first_name": "John",
            "teacher_last_name": "Doe",
            "room_name": "Room A1",
            "students": [
              {
                "id": 101,
                "first_name": "สมชาย",
                "last_name": "ใจดี",
                "nickname": "ชาย"
              }
            ]
          }
        ],
        "exceptions": [],
        "session_count": 1,
        "branch_distribution": {
          "หนองแค Branch": 1
        }
      },
      "2025-08-26": {
        "date": "2025-08-26",
        "day_of_week": "tuesday",
        "is_holiday": true,
        "holiday_info": {
          "date": "2025-08-26",
          "name": "วันแม่แห่งชาติ",
          "name_en": "Queen's Birthday",
          "type": "government"
        },
        "sessions": [],
        "exceptions": [],
        "session_count": 0,
        "branch_distribution": {}
      }
    },
    "holidays": [
      {
        "date": "2025-08-26",
        "name": "วันแม่แห่งชาติ",
        "name_en": "Queen's Birthday",
        "type": "government"
      }
    ],
    "summary": {
      "total_sessions": 12,
      "total_holidays": 1,
      "total_exceptions": 0,
      "sessions_by_status": {
        "scheduled": 10,
        "completed": 2,
        "cancelled": 0
      },
      "sessions_by_branch": {
        "หนองแค Branch": 8,
        "เมืองทอง Branch": 4
      },
      "sessions_by_teacher": {
        "John Doe": 6,
        "Jane Smith": 4,
        "Bob Wilson": 2
      },
      "days_with_sessions": 5,
      "days_with_holidays": 1
    }
  }
}
```

## การใช้งาน

### 1. ดู Sessions แบบละเอียดพร้อมข้อมูลครู/นักเรียน
```bash
GET /api/v1/schedules/1/sessions?page=1&limit=20&include_cancelled=false
```

### 2. ดูตารางสอนรายสัปดาห์พร้อมวันหยุด
```bash
GET /api/v1/schedules/calendar?view=week&date=2025-08-26&include_students=true
```

### 3. ดูตารางสอนรายเดือนสำหรับสาขาเฉพาะ
```bash
GET /api/v1/schedules/calendar?view=month&date=2025-09-01&branch_id=1&include_holidays=true
```

### 4. ดูตารางสอนรายวันสำหรับครูเฉพาะคน
```bash
GET /api/v1/schedules/calendar?view=day&date=2025-08-26&teacher_id=5&include_students=true
```

### 5. กรอง Sessions ของครูเฉพาะคน
```bash
GET /api/v1/schedules/1/sessions?teacher_id=5&sort_by=session_date&sort_order=asc
```

## Features หลัก

### 🎯 **Enhanced Session Details**
- ข้อมูลสาขาครบถ้วน
- ข้อมูลครูทุกคนในตาราง (role-based filtering)
- ข้อมูลนักเรียนที่ลงทะเบียน
- Attendance summary per session
- Comment และ exception tracking

### 📅 **Calendar Views**
- Day/Week/Month views
- Holiday integration จาก myhora.com
- Exception tracking
- Branch และ teacher distribution
- ไม่มี pagination (แสดงข้อมูลทั้งหมดในช่วงที่เลือก)

### 🔐 **Role-based Access**
- **Owner/Admin**: เห็นข้อมูลทั้งหมด (phone, email, contact info)
- **Teacher**: เห็นข้อมูลจำกัด (name, nickname, date_of_birth, school เท่านั้น)

### 🎨 **Rich Statistics**
- Sessions by status/branch/teacher
- Holiday and exception counts
- Student enrollment tracking
- Daily session distribution

### 🔍 **Advanced Filtering**
- Date ranges and specific dates
- Teacher, room, course, branch filters
- Status-based filtering
- Boolean filters (makeup sessions, has comments)

## Error Handling
- `400 Bad Request` - ค่า parameter ไม่ถูกต้อง
- `403 Forbidden` - ไม่มีสิทธิ์เข้าถึง
- `404 Not Found` - ไม่พบ schedule
- `500 Internal Server Error` - ข้อผิดพลาดระบบ

## Performance Notes
- Calendar endpoint ไม่มี pagination เพื่อให้เห็นภาพรวมทั้งหมด
- ใช้ database joins ที่ optimize แล้ว
- Role-based filtering ทำที่ application level
- Holiday data cached และ filtered ตาม date range
