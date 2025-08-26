# Schedule Exception by Session API

## Overview
API สำหรับการจัดการข้อยกเว้นของตารางเรียนผ่าน Session ID โดยตรง ทำให้การยกเลิก เปลี่ยนแปลง หรือปรับปรุงคลาสเฉพาะ session ง่ายและแม่นยำยิ่งขึ้น

## Base URL
```
{{baseUrl}}/schedules/:scheduleId/exceptions/session
```

## Create Schedule Exception by Session

### Endpoint
```
POST /api/v1/schedules/:scheduleId/exceptions/session
```

### Description
สร้างข้อยกเว้นสำหรับ session เฉพาะโดยใช้ session ID แทนการระบุวันที่

### Authorization
- **Required:** Yes
- **Roles:** Admin, Owner
- **Branch Access:** ต้องเป็นสาขาเดียวกันหรือเป็น Owner

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| scheduleId | integer | Yes | ID ของตารางเรียน |

### Request Body
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| session_id | integer | Yes | ID ของ session ที่ต้องการสร้าง exception | 2 |
| exception_type | string | No | ประเภทของ exception (default: "cancellation") | "cancellation" |
| new_date | string | No | วันที่ใหม่ (สำหรับ reschedule) | "2025-08-30" |
| new_start_time | string | No | เวลาเริ่มใหม่ | "10:00:00" |
| new_end_time | string | No | เวลาจบใหม่ | "13:00:00" |
| new_teacher_id | integer | No | ID ครูใหม่ | 7 |
| new_room_id | integer | No | ID ห้องใหม่ | 5 |
| reason | string | Yes | เหตุผลในการสร้าง exception | "School Holiday" |
| notes | string | No | หมายเหตุเพิ่มเติม | "Rescheduled due to..." |

### Exception Types
1. **cancellation** - ยกเลิกคลาส
2. **reschedule** - เปลี่ยนวันที่/เวลา
3. **teacher_change** - เปลี่ยนครู
4. **room_change** - เปลี่ยนห้อง
5. **time_change** - เปลี่ยนเฉพาะเวลา

### Request Examples

#### 1. Cancel Session
```json
{
  "session_id": 2,
  "exception_type": "cancellation",
  "reason": "School Holiday"
}
```

#### 2. Change Teacher
```json
{
  "session_id": 3,
  "exception_type": "teacher_change",
  "new_teacher_id": 7,
  "reason": "Regular teacher sick leave"
}
```

#### 3. Change Room
```json
{
  "session_id": 4,
  "exception_type": "room_change",
  "new_room_id": 5,
  "reason": "Room maintenance"
}
```

#### 4. Reschedule Session
```json
{
  "session_id": 5,
  "exception_type": "reschedule",
  "new_date": "2025-09-10",
  "new_start_time": "14:00:00",
  "new_end_time": "17:00:00",
  "reason": "Holiday conflict",
  "notes": "Moved to afternoon slot"
}
```

#### 5. Change Time Only
```json
{
  "session_id": 6,
  "exception_type": "time_change",
  "new_start_time": "10:00:00",
  "new_end_time": "13:00:00",
  "reason": "Teacher schedule conflict"
}
```

### Success Response (201 Created)
```json
{
  "success": true,
  "message": "Session cancelled successfully",
  "data": {
    "exception": {
      "id": 15,
      "schedule_id": 1,
      "exception_date": "2025-08-29",
      "exception_type": "cancellation",
      "new_date": null,
      "new_start_time": null,
      "new_end_time": null,
      "new_teacher_id": null,
      "new_room_id": null,
      "reason": "School Holiday",
      "notes": null,
      "created_by": 1,
      "approved_by": null,
      "status": "approved",
      "created_at": "2025-08-26T09:45:00.000Z",
      "updated_at": "2025-08-26T09:45:00.000Z",
      "new_teacher_first_name": null,
      "new_teacher_last_name": null,
      "new_room_name": null
    },
    "updated_session": {
      "id": 2,
      "schedule_id": 1,
      "time_slot_id": 2,
      "session_date": "2025-08-29T00:00:00.000Z",
      "session_number": 2,
      "week_number": 1,
      "start_time": "09:00:00",
      "end_time": "12:00:00",
      "teacher_id": 5,
      "room_id": 3,
      "status": "cancelled",
      "cancellation_reason": "School Holiday",
      "makeup_for_session_id": null,
      "is_makeup_session": 0,
      "notes": "Cancelled: School Holiday",
      "created_at": "2025-08-25T09:36:47.000Z",
      "updated_at": "2025-08-26T09:45:00.000Z",
      "day_of_week": "thursday",
      "teacher_first_name": "Antarika",
      "teacher_last_name": "Ruamrak",
      "room_name": "Room A3"
    },
    "original_session_date": "2025-08-29"
  }
}
```

### Error Responses

#### 400 Bad Request - Missing Required Fields
```json
{
  "success": false,
  "message": "Missing required fields: session_id, reason"
}
```

#### 404 Not Found - Schedule Not Found
```json
{
  "success": false,
  "message": "Schedule not found"
}
```

#### 404 Not Found - Session Not Found
```json
{
  "success": false,
  "message": "Session not found in this schedule"
}
```

#### 400 Bad Request - Exception Already Exists
```json
{
  "success": false,
  "message": "Exception already exists for session date: 2025-08-29"
}
```

#### 403 Forbidden - Access Denied
```json
{
  "success": false,
  "message": "Access denied"
}
```

## How Session Selection Works

### Step 1: Get Available Sessions
```
GET /api/v1/schedules/1/sessions
```

### Step 2: Choose Session ID
จากผลลัพธ์ให้เลือก session ที่ต้องการ:
- Session ID 1: วันจันทร์ที่ 26 ส.ค.
- Session ID 2: วันพฤหัสที่ 29 ส.ค.
- Session ID 3: วันจันทร์ที่ 2 ก.ย.

### Step 3: Create Exception
ใช้ Session ID ที่เลือกในการสร้าง exception

## Advantages over Date-based Exception

1. **แม่นยำ:** ไม่มีปัญหา timezone หรือการแปลงวันที่
2. **ง่าย:** ไม่ต้องคำนวณวันที่ให้ตรงกับ session
3. **ชัดเจน:** รู้แน่ชัดว่าจะยกเลิก session ไหน
4. **ปลอดภัย:** ป้องกันการยกเลิกผิด session

## Business Rules

1. หนึ่ง session date สามารถมี exception ได้เพียงหนึ่งอัน
2. Exception จะอัปเดต session โดยตรงทันที
3. การ reschedule จะเปลี่ยน session_date ของ session นั้น
4. การเปลี่ยนครู/ห้อง จะอัปเดตเฉพาะ session ที่เลือก
5. สถานะ exception จะเป็น "approved" อัตโนมัติ

## Related APIs

- `GET /api/v1/schedules/:id/sessions` - ดู sessions ทั้งหมด
- `POST /api/v1/schedules/:id/makeup` - สร้าง makeup session
- `GET /api/v1/schedules/:id/makeup` - ดู makeup sessions
- `POST /api/v1/schedules/:id/apply-exceptions` - apply exceptions ที่มีอยู่
