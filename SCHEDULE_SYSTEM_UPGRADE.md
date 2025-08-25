# Schedule System Upgrade Guide

## Overview
ระบบตารางเรียนได้ถูกออกแบบใหม่เพื่อความยืดหยุ่นและการจัดการที่ดีขึ้น โดยแยกจากระบบ course_groups เดิมและสร้างตารางใหม่เฉพาะสำหรับการจัดตารางเรียน

## New Database Schema

### 1. `schedules` Table (ตารางหลัก)
- **Template สำหรับการสร้างคลาส**: ไม่ใช่เก็บคลาสแต่ละครั้ง แต่เป็น template
- `total_hours`: จำนวนชั่วโมงรวมทั้งหมด เช่น 60.0
- `hours_per_session`: ชั่วโมงต่อครั้ง เช่น 3.0  
- `sessions_per_week`: จำนวนครั้งต่อสัปดาห์ คำนวณจาก time_slots
- `estimated_end_date`: วันสิ้นสุดประมาณ (คำนวณอัตโนมัติ)
- `auto_reschedule_holidays`: เลื่อนวันหยุดอัตโนมัติหรือไม่

### 2. `schedule_time_slots` Table (เวลาเรียนรายสัปดาห์)
- เก็บว่าแต่ละสัปดาห์เรียนวันไหนบ้าง เวลาไหนบ้าง
- รองรับหลายวันต่อสัปดาห์ เช่น พุธ-พฤหัส
- `slot_order`: ลำดับในสัปดาห์ เช่น 1=พุธ, 2=พฤหัส

### 3. `schedule_sessions` Table (คลาสแต่ละครั้ง) 
- **คลาสจริงที่เกิดขึ้น**: สร้างอัตโนมัติจาก schedule template
- `session_number`: ครั้งที่เท่าไหร่ของคอร์ส (1-20)
- `week_number`: สัปดาห์ที่เท่าไหร่ 
- `is_makeup_session`: เป็น makeup session สำหรับวันหยุดหรือไม่
- `makeup_for_session_id`: ชดเชยให้กับ session ไหน
- รองรับ status: scheduled, confirmed, in_progress, completed, cancelled, rescheduled

### 4. `schedule_students` Table (นักเรียนที่ลงเรียน)
- เก็บข้อมูลนักเรียนที่ลงเรียนใน schedule template
- เก็บข้อมูลการชำระเงิน payment_status
- รองรับระบบการลาด้วย leave_credits

### 5. `schedule_exceptions` Table (ข้อยกเว้น - เดิม)
- เก็บการยกเลิก/เปลี่ยนแปลงตารางเรียนชั่วคราว
- รองรับการเปลี่ยนวันเวลา, ครู, ห้องเรียน
- มี exception_type: cancellation, reschedule, teacher_change, room_change

### 6. `class_attendances` Table (อัปเดต)
- เพิ่ม session_id เพื่อเชื่อมกับ schedule_sessions
- รองรับทั้งระบบเก่าและใหม่

## API Endpoints (New)

### Schedule Management
```
POST   /api/v1/schedules              - Create new schedule
GET    /api/v1/schedules              - Get schedules (with filters)  
GET    /api/v1/schedules/weekly       - Get weekly schedule view
GET    /api/v1/schedules/:id          - Get single schedule
PUT    /api/v1/schedules/:id          - Update schedule
DELETE /api/v1/schedules/:id          - Delete schedule
```

### Student Assignment
```
POST   /api/v1/schedules/:id/students           - Assign student to schedule
DELETE /api/v1/schedules/:id/students/:studentId - Remove student from schedule  
GET    /api/v1/schedules/:id/students           - Get students in schedule
```

### Exception Management
```
POST   /api/v1/schedules/:id/exceptions - Create schedule exception
```

### Legacy Endpoints (Backward Compatible)
```
GET    /api/v1/schedules/teacher/:teacherId     - Teacher's schedule (updated)
GET    /api/v1/schedules/student/:studentId     - Student's schedule (updated)
GET    /api/v1/schedules/room/:roomId          - Room schedule (updated) 
GET    /api/v1/schedules/branch/:branchId      - Branch schedule overview (updated)
POST   /api/v1/schedules/check-conflicts       - Check conflicts (updated)
GET    /api/v1/schedules/available-slots       - Available time slots (updated)
```

## Migration Instructions

### Step 1: Run SQL Migration
```bash
# Connect to your MySQL database and run:
mysql -u [username] -p [database_name] < sql_update_schedule_system.sql
```

### Step 2: Verify New Tables
Check that these tables are created:
- schedules
- schedule_students  
- schedule_exceptions
- class_attendances (with schedule_id column added)

### Step 3: Deploy Updated Code
- New scheduleController.js with all functions
- Updated routes/schedules.js with new endpoints

## Key Features

### 1. **Batch Schedule Creation** 🚀
- **สร้างครั้งเดียว ได้ทุกอย่าง**: กำหนดคอร์ส, ชั่วโมงรวม, เวลาเรียน
- **Auto-Calculate**: คำนวณจำนวน sessions และสัปดาห์อัตโนมัติ  
- **Multiple Days per Week**: รองรับเรียนหลายวันต่อสัปดาห์
- **Holiday Management**: จัดการวันหยุดอัตโนมัติ พร้อม makeup sessions

### 2. **Smart Holiday Handling** 🏖️
- **Auto Detection**: ตรวจจับวันหยุดราชการไทยอัตโนมัติ
- **Auto Reschedule**: เลื่อน sessions ที่ตรงวันหยุดไปสุดท้าย
- **Makeup Sessions**: สร้าง makeup sessions ชดเชยอัตโนมัติ
- **Flexible Options**: เลือกยกเลิกถาวรหรือเลื่อนได้

### 3. **Comprehensive Session Management** 📅
- **Individual Sessions**: แต่ละครั้งเรียนเป็น record แยก
- **Session Tracking**: ติดตาม session_number, week_number
- **Status Management**: scheduled → confirmed → in_progress → completed
- **Makeup Support**: รองรับการชดเชย sessions ที่ยกเลิก

### 4. **Flexible Time Slots** ⏰
- **Multi-day Scheduling**: เช่น พุธ-พฤหัส 9:00-12:00
- **Different Times per Day**: แต่ละวันเวลาต่างกันได้
- **Time Slot Templates**: บันทึก template เพื่อใช้ซ้ำ
- **Conflict Detection**: ตรวจสอบความขิดแย้งครูและห้อง

### 5. **Progress Tracking** 📊  
- **Completion Rate**: ติดตามความคืบหน้าของคอร์ส
- **Session Statistics**: จำนวน completed, cancelled, upcoming
- **Student Progress**: ติดตามการเข้าเรียนของแต่ละคน
- **Payment Tracking**: เชื่อมกับระบบชำระเงิน

### 6. **Exception Handling** 🛠️
- **Emergency Changes**: เปลี่ยนแปลงกะทันหัน
- **Teacher/Room Changes**: เปลี่ยนครู/ห้องเฉพาะวัน  
- **One-time Cancellations**: ยกเลิกเฉพาะครั้ง
- **Reschedule Support**: เลื่อนไปวันอื่น

### 7. **Branch-based Permissions** 🔐
- **Owner Access**: เข้าถึงทุก branch
- **Admin/Teacher**: เฉพาะ branch ตนเอง
- **Student View**: ดูเฉพาะตารางตนเอง
- **Data Isolation**: แยก branch อย่างเด็ดขาด

## Data Migration Strategy

### Current Status
- ระบบใหม่ถูกสร้างขึ้นควบคู่กับระบบเก่า
- Legacy endpoints ยังคงทำงานได้เพื่อ backward compatibility
- ข้อมูลเก่าจะยังอยู่ใน classes และ course_groups tables

### Recommended Migration Process
1. **Phase 1**: ใช้ระบบใหม่สำหรับตารางเรียนใหม่
2. **Phase 2**: ย้ายข้อมูลเก่าจาก course_groups มาเป็น schedules
3. **Phase 3**: อัปเดต frontend ให้ใช้ API endpoints ใหม่
4. **Phase 4**: ปิดการใช้งาน legacy endpoints

## Example Usage

### Create New Schedule with Auto-Generated Sessions
```javascript
POST /api/v1/schedules
{
  "course_id": 1,
  "teacher_id": 5,
  "room_id": 3,
  "schedule_name": "Adults Conversation A2 - Wed/Thu Morning", 
  "total_hours": 60.0,
  "hours_per_session": 3.0,
  "max_students": 6,
  "start_date": "2024-01-15",
  "time_slots": [
    {
      "day_of_week": "wednesday",
      "start_time": "09:00:00",
      "end_time": "12:00:00"
    },
    {
      "day_of_week": "thursday", 
      "start_time": "09:00:00",
      "end_time": "12:00:00"
    }
  ],
  "auto_reschedule_holidays": true,
  "notes": "Intensive conversation course"
}
```

**ผลลัพธ์ที่ได้:**
- ระบบจะคำนวณ: 60 ชม ÷ 3 ชม/ครั้ง = 20 sessions
- 2 ครั้ง/สัปดาห์ = 10 สัปดาห์
- สร้าง schedule_sessions อัตโนมัติ 20 ครั้ง
- วันหยุดจะถูก cancelled และสร้าง makeup sessions ต่อท้าย

### Response ที่ได้รับ:
```javascript
{
  "success": true,
  "message": "Schedule created successfully with 20 sessions generated across 10 weeks",
  "data": {
    "schedule": {
      "id": 1,
      "schedule_name": "Adults Conversation A2 - Wed/Thu Morning",
      "total_hours": 60.0,
      "sessions_per_week": 2,
      "estimated_end_date": "2024-03-25",
      // ... other schedule details
    },
    "sessions_generated": 20,
    "estimated_weeks": 10,
    "sessions_per_week": 2
  }
}
```

### Get Schedule with All Sessions
```javascript
GET /api/v1/schedules/1

// Response includes:
{
  "data": {
    "schedule": {
      "id": 1,
      "schedule_name": "Adults Conversation A2 - Wed/Thu Morning",
      "total_sessions": 20,
      "completed_sessions": 0,
      "cancelled_sessions": 2, // วันหยุด
      "upcoming_sessions": 18,
      "time_slots": [
        {
          "day_of_week": "wednesday",
          "start_time": "09:00:00",
          "end_time": "12:00:00"
        }
      ],
      "sessions": [
        {
          "session_number": 1,
          "session_date": "2024-01-17",
          "week_number": 1,
          "status": "scheduled",
          "day_of_week": "wednesday"
        },
        {
          "session_number": 2, 
          "session_date": "2024-01-18",
          "week_number": 1,
          "status": "scheduled",
          "day_of_week": "thursday"
        }
        // ... all 20+ sessions (including makeup sessions)
      ]
    }
  }
}
```

### Assign Student to Schedule
```javascript
POST /api/v1/schedules/1/students
{
  "student_id": 10,
  "enrollment_date": "2024-01-15",
  "total_amount": 3000.00,
  "payment_status": "partial",
  "paid_amount": 1500.00
}
```

### Create Schedule Exception
```javascript
POST /api/v1/schedules/1/exceptions
{
  "exception_date": "2024-02-14", 
  "exception_type": "cancellation",
  "reason": "Valentine's Day Holiday"
}
```

## Benefits of New System

1. **Better Organization**: แต่ละคอร์สมีตารางเรียนชัดเจน
2. **Flexible Timing**: รองรับการจัดเวลาที่ยืดหยุ่น
3. **Exception Handling**: จัดการกรณีพิเศษได้ดี
4. **Conflict Prevention**: ป้องกันความขิดแย้งของครูและห้อง
5. **Better Analytics**: วิเคราะห์ข้อมูลได้ดีขึ้น
6. **Scalability**: รองรับการขยายในอนาคต

## Backward Compatibility

ระบบเดิมยังคงทำงานได้ปกติ:
- Legacy API endpoints ยังใช้งานได้
- ข้อมูลใน classes/course_groups ไม่ถูกลบ
- ค่อยๆ migrate ทีละส่วน

การอัปเกรดนี้จะทำให้ระบบตารางเรียนมีความยืดหยุ่นและจัดการได้ง่ายขึ้นมาก!
