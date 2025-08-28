# Teacher Schedule API Endpoints

## 1. Get All Teacher Schedules

- **Endpoint:** `GET /api/v1/schedules/teachers`
- **Desc:** Get schedules for all teachers with filtering options
- **Query Parameters:**
  - `teacher_id` (optional): Filter by specific teacher ID
  - `branch_id` (optional): Filter by branch
  - `date_filter` (optional): "day", "week", "month" (default: "week")
  - `date` (optional): YYYY-MM-DD format (default: today)
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "teachers": [
      {
        "teacher_id": 1,
        "teacher_name": "John Smith",
        "teacher_nickname": "John",
        "teacher_avatar": "avatars/1/profile.jpg",
        "sessions": [
          {
            "session_id": 1,
            "schedule_id": 1,
            "schedule_name": "Adults Conversation A2 - Mon/Wed",
            "course_name": "Adults Conversation A2",
            "course_code": "MALL-CONV-A-A2",
            "session_date": "2025-08-27",
            "start_time": "09:00:00",
            "end_time": "12:00:00",
            "session_number": 1,
            "week_number": 1,
            "status": "scheduled",
            "room_name": "Room A1",
            "max_students": 6,
            "current_students": 4,
            "branch_id": 1,
            "branch_name_en": "The Mall Branch",
            "branch_name_th": "สาขาเดอะมอลล์",
            "notes": null
          }
        ]
      }
    ],
    "filter_info": {
      "date_filter": "week",
      "start_date": "2025-08-25",
      "end_date": "2025-08-31",
      "total_sessions": 15
    },
    "pagination": {
      "current_page": 1,
      "per_page": 50,
      "total": 15,
      "total_pages": 1
    }
  }
}
```

---

## 2. Get Specific Teacher Schedule

- **Endpoint:** `GET /api/v1/schedules/teachers/:teacher_id`
- **Desc:** Get detailed schedule for a specific teacher
- **Query Parameters:**
  - `branch_id` (optional): Filter by branch
  - `date_filter` (optional): "day", "week", "month" (default: "week")
  - `date` (optional): YYYY-MM-DD format (default: today)
  - `include_students` (optional): "true" or "false" (default: "false")
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "teacher": {
      "id": 1,
      "first_name": "John",
      "last_name": "Smith",
      "nickname": "John",
      "avatar": "avatars/1/profile.jpg",
      "teacher_type": "native",
      "specializations": ["conversation", "business"],
      "branch_id": 1,
      "email": "john@example.com",
      "phone": "0901234567"
    },
    "sessions_by_date": {
      "2025-08-27": [
        {
          "session_id": 1,
          "schedule_id": 1,
          "schedule_name": "Adults Conversation A2 - Mon/Wed",
          "course_name": "Adults Conversation A2",
          "course_code": "MALL-CONV-A-A2",
          "start_time": "09:00:00",
          "end_time": "12:00:00",
          "session_number": 1,
          "week_number": 1,
          "status": "scheduled",
          "room_name": "Room A1",
          "max_students": 6,
          "current_students": 4,
          "branch_id": 1,
          "branch_name_en": "The Mall Branch",
          "branch_name_th": "สาขาเดอะมอลล์",
          "notes": null,
          "students": [
            {
              "student_id": 1,
              "first_name": "Jane",
              "last_name": "Doe",
              "nickname": "Jane",
              "cefr_level": "A2",
              "avatar": "avatars/student1.jpg"
            }
          ]
        }
      ]
    },
    "filter_info": {
      "date_filter": "week",
      "start_date": "2025-08-25",
      "end_date": "2025-08-31",
      "total_sessions": 8
    },
    "pagination": {
      "current_page": 1,
      "per_page": 50,
      "total": 8,
      "total_pages": 1
    }
  }
}
```

---

## Features:

### 1. Multiple Teachers per Schedule
- 1 schedule สามารถมีหลาย sessions ที่มี teacher ต่างกันได้
- แต่ละ session มี teacher_id แยกต่างหาก

### 2. Flexible Date Filtering
- **day**: ดูตารางเรียนของวันเดียว
- **week**: ดูตารางเรียนของสัปดาห์ (จันทร์-อาทิตย์)
- **month**: ดูตารางเรียนของเดือน

### 3. Branch Filtering
- กรองตามสาขาได้
- Admin สามารถดูได้เฉพาะสาขาตัวเอง
- Owner สามารถดูทุกสาขาได้

### 4. Teacher-specific Views
- ดูตารางเรียนของครูคนเดียว
- แสดงข้อมูลครูแบบละเอียด
- สามารถรวมข้อมูลนักเรียนในแต่ละคลาสได้

### 5. Permissions
- **Owner**: ดูทุกสาขา, ทุกครู
- **Admin**: ดูเฉพาะสาขาตัวเอง
- **Teacher**: ดูเฉพาะตารางตัวเอง (ถ้าต้องการเพิ่มใน middleware)

---
