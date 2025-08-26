# Session Management APIs

## Overview
ชุด APIs สำหรับการจัดการ session ในตารางเรียน รวมถึงการแก้ไข session และการเพิ่ม comments/notes

## Base URL
```
{{baseUrl}}/schedules/:scheduleId/sessions/:sessionId
```

---

## 1. Edit Session Details

### Endpoint
```
PUT /api/v1/schedules/:scheduleId/sessions/:sessionId
```

### Description
แก้ไขรายละเอียดของ session เฉพาะอัน รวมถึงวันที่ เวลา ครู ห้อง และสถานะ

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| scheduleId | integer | Yes | ID ของตารางเรียน |
| sessionId | integer | Yes | ID ของ session ที่ต้องการแก้ไข |

### Request Body
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| session_date | string | No | วันที่ session ใหม่ | "2025-08-30" |
| start_time | string | No | เวลาเริ่ม | "10:00:00" |
| end_time | string | No | เวลาจบ | "13:00:00" |
| teacher_id | integer | No | ID ครูใหม่ | 7 |
| room_id | integer | No | ID ห้องใหม่ | 5 |
| status | string | No | สถานะใหม่ | "scheduled", "completed", "cancelled" |
| notes | string | No | หมายเหตุ | "Updated due to..." |

### Example Request
```json
{
  "session_date": "2025-08-30",
  "start_time": "14:00:00",
  "end_time": "17:00:00",
  "teacher_id": 7,
  "room_id": 5,
  "notes": "Moved to afternoon due to morning conflict"
}
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Session updated successfully",
  "data": {
    "session": {
      "id": 2,
      "schedule_id": 1,
      "time_slot_id": 2,
      "session_date": "2025-08-30T00:00:00.000Z",
      "session_number": 2,
      "week_number": 1,
      "start_time": "14:00:00",
      "end_time": "17:00:00",
      "teacher_id": 7,
      "room_id": 5,
      "status": "scheduled",
      "notes": "Moved to afternoon due to morning conflict",
      "updated_at": "2025-08-26T10:00:00.000Z",
      "teacher_first_name": "John",
      "teacher_last_name": "Doe",
      "room_name": "Room B1"
    },
    "fields_changed": ["session_date", "start_time", "end_time", "teacher_id", "room_id", "notes"]
  }
}
```

---

## 2. Session Comments Management

### 2.1 Add Comment to Session

#### Endpoint
```
POST /api/v1/schedules/:scheduleId/sessions/:sessionId/comments
```

#### Request Body
| Field | Type | Required | Description | Options |
|-------|------|----------|-------------|---------|
| comment | string | Yes | ข้อความ comment | - |
| type | string | No | ประเภท comment (default: "note") | "note", "comment", "warning", "important" |
| is_private | boolean | No | เป็น comment ส่วนตัวหรือไม่ (default: false) | true, false |

#### Example Request
```json
{
  "comment": "Student requested to change time",
  "type": "note",
  "is_private": false
}
```

#### Success Response (201 Created)
```json
{
  "success": true,
  "message": "Comment added successfully",
  "data": {
    "comment": {
      "id": 15,
      "session_id": 2,
      "user_id": 1,
      "comment": "Student requested to change time",
      "type": "note",
      "is_private": false,
      "created_at": "2025-08-26T10:15:00.000Z",
      "updated_at": "2025-08-26T10:15:00.000Z",
      "username": "admin",
      "first_name": "Admin",
      "last_name": "User"
    }
  }
}
```

### 2.2 Get Session Comments

#### Endpoint
```
GET /api/v1/schedules/:scheduleId/sessions/:sessionId/comments
```

#### Query Parameters
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| type | string | No | กรอง comments ตามประเภท | "warning" |
| include_private | string | No | รวม private comments หรือไม่ (default: "false") | "true" |

#### Example Request
```
GET /api/v1/schedules/1/sessions/2/comments?type=important&include_private=true
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": 15,
        "session_id": 2,
        "user_id": 1,
        "comment": "Session updated - Changed: session_date, start_time, end_time",
        "type": "important",
        "is_private": false,
        "created_at": "2025-08-26T10:00:00.000Z",
        "updated_at": "2025-08-26T10:00:00.000Z",
        "username": "admin",
        "first_name": "Admin",
        "last_name": "User"
      },
      {
        "id": 16,
        "session_id": 2,
        "user_id": 1,
        "comment": "Student requested to change time",
        "type": "note",
        "is_private": false,
        "created_at": "2025-08-26T10:15:00.000Z",
        "updated_at": "2025-08-26T10:15:00.000Z",
        "username": "admin",
        "first_name": "Admin",
        "last_name": "User"
      }
    ]
  }
}
```

### 2.3 Update Comment

#### Endpoint
```
PUT /api/v1/schedules/:scheduleId/sessions/:sessionId/comments/:commentId
```

#### Request Body
```json
{
  "comment": "Updated comment text",
  "type": "warning",
  "is_private": true
}
```

### 2.4 Delete Comment

#### Endpoint
```
DELETE /api/v1/schedules/:scheduleId/sessions/:sessionId/comments/:commentId
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

---

## Comment Types

| Type | Description | Use Case |
|------|-------------|----------|
| **note** | บันทึกทั่วไป | ข้อมูลเพิ่มเติม, การแจ้งเตือนธรรมดา |
| **comment** | ความคิดเห็น | ความคิดเห็นจากครูหรือผู้ดูแล |
| **warning** | คำเตือน | ปัญหาที่ต้องระวัง, ข้อควรระวัง |
| **important** | สำคัญ | ข้อมูลสำคัญที่ต้องให้ความสนใจพิเศษ |

---

## Permission Rules

### Edit Session
- **Owner:** แก้ไขได้ทุก session
- **Admin:** แก้ไขได้เฉพาะ session ในสาขาของตน

### Comments Management
- **Add Comment:** Admin, Owner
- **View Comments:** ทุกคนที่มีสิทธิ์เข้าถึง schedule
- **Edit Comment:** Owner, Admin (เฉพาะสาขาตน), หรือผู้เขียน comment
- **Delete Comment:** Owner, Admin (เฉพาะสาขาตน), หรือผู้เขียน comment

### Private Comments
- เฉพาะ Owner และผู้เขียนเท่านั้นที่เห็น private comments
- Admin เห็นได้เฉพาะ private comments ในสาขาของตน

---

## Conflict Detection

เมื่อแก้ไข session ระบบจะตรวจสอบความขัดแย้ง:

1. **Teacher Conflict:** ครูมี session อื่นในเวลาเดียวกัน
2. **Room Conflict:** ห้องถูกใช้งานในเวลาเดียวกัน

หากมีความขัดแย้ง API จะส่ง status 409 พร้อมรายละเอียดความขัดแย้ง

---

## Automatic Comments

ระบบจะสร้าง comment อัตโนมัติเมื่อ:
- แก้ไข session (type: "important")
- มีการเปลี่ยนแปลงสำคัญ เช่น วันที่ เวลา ครู ห้อง สถานะ

---

## Usage Examples

### ตัวอย่าง: เปลี่ยนเวลาเรียน
```json
// 1. แก้ไขเวลา session
PUT /api/v1/schedules/1/sessions/2
{
  "start_time": "14:00:00",
  "end_time": "17:00:00",
  "notes": "Moved to afternoon slot"
}

// 2. เพิ่ม comment อธิบายเหตุผล
POST /api/v1/schedules/1/sessions/2/comments
{
  "comment": "Parents requested afternoon class due to school schedule",
  "type": "note"
}
```

### ตัวอย่าง: เปลี่ยนครู
```json
// 1. เปลี่ยนครู
PUT /api/v1/schedules/1/sessions/2
{
  "teacher_id": 7,
  "notes": "Regular teacher sick leave"
}

// 2. เพิ่ม comment สำคัญ
POST /api/v1/schedules/1/sessions/2/comments
{
  "comment": "Substitute teacher John Doe will handle this session",
  "type": "important"
}
```

### ตัวอย่าง: แจ้งเตือนปัญหา
```json
POST /api/v1/schedules/1/sessions/2/comments
{
  "comment": "Student seems to have difficulty with the current pace",
  "type": "warning",
  "is_private": true
}
```
