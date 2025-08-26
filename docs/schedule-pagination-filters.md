# Schedule Management - Pagination และ Filters

## Overview
เอกสารนี้อธิบายฟีเจอร์ pagination และ filters ที่ได้รับการพัฒนาเพิ่มเติมสำหรับ schedule management system

## Enhanced Endpoints

### 1. GET /api/v1/schedules/:id/sessions
ดูรายการ sessions ของ schedule พร้อม pagination และ filters

**Query Parameters:**
- `page` (number, default: 1) - หมายเลขหน้า
- `limit` (number, default: 20) - จำนวนรายการต่อหน้า
- `sort_by` (string, default: 'session_date') - เรียงตาม: session_date, session_number, week_number, start_time, end_time, status, created_at
- `sort_order` (string, default: 'asc') - ทิศทางการเรียง: asc, desc
- `status` (string) - กรองตามสถานะ: scheduled, completed, cancelled
- `start_date` (date) - กรอง sessions จากวันที่ (YYYY-MM-DD)
- `end_date` (date) - กรอง sessions ถึงวันที่ (YYYY-MM-DD)
- `teacher_id` (number) - กรองตามครู
- `room_id` (number) - กรองตามห้องเรียน
- `session_number` (number) - กรองตามหมายเลข session
- `week_number` (number) - กรองตามสัปดาห์ที่
- `is_makeup_session` (boolean) - กรอง makeup sessions: true, false
- `has_comments` (boolean) - กรอง sessions ที่มี comments: true, false
- `include_cancelled` (boolean, default: false) - รวม sessions ที่ยกเลิก

**Response Example:**
```json
{
  "success": true,
  "data": {
    "schedule": {
      "id": 1,
      "schedule_name": "English A1 Morning",
      "course_name": "General English A1",
      "status": "active"
    },
    "sessions": [
      {
        "id": 101,
        "session_date": "2025-09-01",
        "session_number": 1,
        "week_number": 1,
        "start_time": "09:00:00",
        "end_time": "12:00:00",
        "status": "scheduled",
        "teacher_first_name": "John",
        "teacher_last_name": "Doe",
        "room_name": "Room A1",
        "comment_count": 2
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 20,
      "total": 45,
      "total_pages": 3
    },
    "summary": {
      "total_sessions": 45,
      "scheduled": 40,
      "completed": 3,
      "cancelled": 2,
      "total_exceptions": 1
    }
  }
}
```

### 2. GET /api/v1/schedules/:id/sessions/:sessionId/comments
ดูรายการ comments ของ session พร้อม pagination และ filters

**Query Parameters:**
- `page` (number, default: 1) - หมายเลขหน้า
- `limit` (number, default: 20) - จำนวนรายการต่อหน้า
- `sort_by` (string, default: 'created_at') - เรียงตาม: created_at, updated_at, type, comment
- `sort_order` (string, default: 'asc') - ทิศทางการเรียง: asc, desc
- `type` (string) - กรองตามประเภท: note, comment, warning, important
- `user_id` (number) - กรองตามผู้เขียน comment
- `search` (string) - ค้นหาในข้อความ comment
- `include_private` (boolean, default: false) - รวม private comments

**Response Example:**
```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": 1,
        "comment": "นักเรียนมาสาย 15 นาที",
        "type": "note",
        "is_private": false,
        "created_at": "2025-08-26T10:15:00.000Z",
        "username": "admin",
        "first_name": "Admin",
        "last_name": "User"
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 20,
      "total": 5,
      "total_pages": 1
    }
  }
}
```

### 3. GET /api/v1/schedules/:id/makeup
ดูรายการ makeup sessions พร้อม pagination และ filters

**Query Parameters:**
- `page` (number, default: 1) - หมายเลขหน้า
- `limit` (number, default: 20) - จำนวนรายการต่อหน้า
- `sort_by` (string, default: 'session_date') - เรียงตาม: session_date, original_date, start_time, status, created_at
- `sort_order` (string, default: 'asc') - ทิศทางการเรียง: asc, desc
- `status` (string) - กรองตามสถานะ: scheduled, completed, cancelled
- `start_date` (date) - กรอง makeup sessions จากวันที่
- `end_date` (date) - กรอง makeup sessions ถึงวันที่
- `teacher_id` (number) - กรองตามครู
- `room_id` (number) - กรองตามห้องเรียน

**Response Example:**
```json
{
  "success": true,
  "data": {
    "schedule": {
      "id": 1,
      "schedule_name": "English A1 Morning",
      "course_name": "General English A1"
    },
    "makeup_sessions": [
      {
        "id": 201,
        "session_date": "2025-09-15",
        "start_time": "14:00:00",
        "end_time": "17:00:00",
        "original_date": "2025-09-10",
        "original_start_time": "09:00:00",
        "original_end_time": "12:00:00",
        "teacher_first_name": "Jane",
        "teacher_last_name": "Smith",
        "room_name": "Room B2"
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 20,
      "total": 3,
      "total_pages": 1
    }
  }
}
```

### 4. GET /api/v1/schedules/weekly
ดูตารางสอนรายสัปดาห์พร้อม filters ขั้นสูง

**Query Parameters:**
- `week_start` (date) - วันเริ่มต้นสัปดาห์ (YYYY-MM-DD)
- `teacher_id` (number) - กรองตามครู
- `room_id` (number) - กรองตามห้องเรียน
- `branch_id` (number) - กรองตามสาขา
- `course_id` (number) - กรองตามคอร์ส
- `status` (string, default: 'active') - กรองตามสถานะ
- `min_students` (number) - กรองตามจำนวนนักเรียนขั้นต่ำ
- `max_students` (number) - กรองตามจำนวนนักเรียนสูงสุด
- `time_range_start` (time) - กรองตามช่วงเวลาเริ่มต้น (HH:MM:SS)
- `time_range_end` (time) - กรองตามช่วงเวลาสิ้นสุด (HH:MM:SS)
- `include_students` (boolean, default: false) - รวมข้อมูลนักเรียน

**Response Example:**
```json
{
  "success": true,
  "data": {
    "week_start": "2025-08-25",
    "weekly_schedule": {
      "monday": [
        {
          "id": 1,
          "schedule_name": "English A1 Morning",
          "course_name": "General English A1",
          "start_time": "09:00:00",
          "end_time": "12:00:00",
          "current_students": 4,
          "available_spots": 2,
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
      "tuesday": [],
      "wednesday": [],
      "thursday": [],
      "friday": [],
      "saturday": [],
      "sunday": []
    },
    "total_schedules": 12,
    "total_exceptions": 2,
    "summary": {
      "total_active_schedules": 12,
      "schedules_by_day": {
        "monday": 3,
        "tuesday": 2,
        "wednesday": 3,
        "thursday": 2,
        "friday": 2,
        "saturday": 0,
        "sunday": 0
      },
      "total_students_enrolled": 48,
      "average_class_size": "4.00"
    }
  }
}
```

## การใช้งาน Filters แบบ Advanced

### 1. ค้นหา Sessions ที่มี Comments
```bash
GET /api/v1/schedules/1/sessions?has_comments=true&page=1&limit=10
```

### 2. กรอง Sessions ตามช่วงวันที่และสถานะ
```bash
GET /api/v1/schedules/1/sessions?start_date=2025-09-01&end_date=2025-09-30&status=completed&sort_by=session_date&sort_order=desc
```

### 3. ค้นหา Comments ตามคำค้นหา
```bash
GET /api/v1/schedules/1/sessions/101/comments?search=สาย&type=note&sort_by=created_at&sort_order=desc
```

### 4. กรอง Weekly Schedule ตามจำนวนนักเรียนและเวลา
```bash
GET /api/v1/schedules/weekly?min_students=2&max_students=4&time_range_start=09:00:00&time_range_end=15:00:00&include_students=true
```

### 5. ดู Makeup Sessions ที่จัดในเดือนหน้า
```bash
GET /api/v1/schedules/1/makeup?start_date=2025-09-01&end_date=2025-09-30&sort_by=original_date&sort_order=asc
```

## ฟีเจอร์เสริม

### Pagination ทุก Endpoint
- ทุก endpoint ที่ส่งคืนรายการข้อมูลจะมี pagination
- รองรับการกำหนด page และ limit
- ส่งคืนข้อมูล pagination ใน response

### Sorting ที่ยืดหยุ่น
- รองรับการเรียงลำดับตามฟิลด์ต่างๆ
- รองรับทั้งการเรียงแบบ ascending และ descending
- มีการตรวจสอบ valid sort fields

### Advanced Search
- ค้นหาข้อความใน comments
- กรองตาม boolean fields (is_makeup_session, has_comments)
- กรองตามช่วงวันที่และเวลา

### Performance Optimization
- ใช้ database indexes ที่เหมาะสม
- จำกัดจำนวนข้อมูลที่ query ในแต่ละครั้ง
- มี summary statistics ที่คำนวณแบบ efficient

## Error Handling

ระบบจะส่งคืน error ในกรณีต่อไปนี้:
- `400 Bad Request` - ค่า parameter ไม่ถูกต้อง
- `403 Forbidden` - ไม่มีสิทธิ์เข้าถึงข้อมูล
- `404 Not Found` - ไม่พบ schedule หรือ session
- `500 Internal Server Error` - ข้อผิดพลาดของระบบ

## Tips การใช้งาน

1. **ใช้ limit ที่เหมาะสม** - ค่าแนะนำคือ 20-50 items ต่อหน้า
2. **ใช้ filters อย่างชาญฉลาด** - กรองข้อมูลให้เหลือเฉพาะที่จำเป็น
3. **เรียงลำดับที่มีความหมาย** - ใช้ sort ที่เหมาะสมกับการใช้งาน
4. **จัดการ pagination** - ตรวจสอบ total_pages เพื่อไม่ให้เกิน limit
5. **ใช้ search อย่างระมัดระวัง** - search string ควรมีความยาวเหมาะสม
