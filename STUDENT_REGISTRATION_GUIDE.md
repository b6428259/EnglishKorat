# คู่มือการใช้งาน Student Registration API

## การปรับปรุงใหม่ (Updated Features)

### 1. ฟิลด์ใหม่ที่เพิ่มเข้ามา
- `citizenId` - เลขบัตรประชาชน (จำเป็น, มีการตรวจสอบความถูกต้อง)
- `firstNameEn`, `lastNameEn` - ชื่อ-นามสกุล ภาษาอังกฤษ
- `dateOfBirth` - วันเกิด (จำเป็น)
- `gender` - เพศ
- `address` - ที่อยู่
- `currentEducation` - ระดับการศึกษาปัจจุบัน
- `preferredLanguage` - ภาษาที่ต้องการเรียน
- `languageLevel` - ระดับภาษา
- `recentCEFR` - ระดับ CEFR/HSK ล่าสุด
- `learningStyle` - รูปแบบการเรียน
- `learningGoals` - เป้าหมายการเรียน
- `parentName`, `parentPhone` - ข้อมูลผู้ปกครอง
- `emergencyContact`, `emergencyPhone` - ข้อมูลติดต่อฉุกเฉิน
- `preferredTimeSlots` - ช่วงเวลาที่ต้องการเรียน
- `unavailableTimeSlots` - ช่วงเวลาที่ไม่ว่าง
- `selectedCourses` - คอร์สที่สนใจ
- `teacherType` - ประเภทครูที่ต้องการ

### 2. การสร้างบัญชีอัตโนมัติ
- **Username**: ใช้เบอร์โทรศัพท์
- **Password**: ใช้เลขบัตรประชาชน (เข้ารหัส)
- **Role**: student
- **Status**: active
- **Registration Status**: "ยังไม่สอบ"

### 3. ความปลอดภัย
- เลขบัตรประชาชนได้รับการตรวจสอบความถูกต้องด้วยอัลกอริทึมไทย
- เลขบัตรประชาชนถูกเข้ารหัสก่อนเก็บในฐานข้อมูล
- รหัสผ่านถูกเข้ารหัสด้วย bcrypt

## การใช้งาน

### 1. ลงทะเบียนนักเรียนใหม่
```http
POST /api/v1/students/register
Content-Type: application/json

{
  "firstName": "รณสิทธิ์",
  "lastName": "ทวยทน", 
  "citizenId": "1349901174258",
  "firstNameEn": "Ronnnasit",
  "lastNameEn": "Tuayton",
  "dateOfBirth": "2002-09-04",
  "gender": "male",
  "email": "ronnasit.tuayton@gmail.com", 
  "phone": "0923799239",
  "address": "105/350 หมู่ 6 อุบลราชธานี",
  "preferredBranch": "1",
  "preferredLanguage": "english",
  "languageLevel": "elementary", 
  "selectedCourses": [99999, 30, 31],
  "learningStyle": "pair",
  "learningGoals": "อยากเรียนเก่งๆ",
  "parentName": "",
  "parentPhone": "",
  "emergencyContact": "John Doe",
  "emergencyPhone": "054745875",
  "lineId": "33044268ss",
  "nickName": "Ion",
  "currentEducation": "grade5",
  "recentCEFR": "A1",
  "teacherType": "thai",
  "preferredTimeSlots": [
    {
      "id": "1755784485129_tuesday",
      "day": "tuesday", 
      "timeFrom": "13:00",
      "timeTo": "16:00"
    }
  ],
  "unavailableTimeSlots": [
    {
      "id": "1755784492323_saturday",
      "day": "saturday",
      "timeFrom": "00:00", 
      "timeTo": "23:30"
    }
  ]
}
```

**Response (สำเร็จ):**
```json
{
  "success": true,
  "message": "Student registered successfully. Status: ยังไม่สอบ (Waiting for test)",
  "data": {
    "student": {
      "id": 1,
      "first_name": "รณสิทธิ์",
      "last_name": "ทวยทน",
      "registration_status": "ยังไม่สอบ",
      "username": "0923799239",
      // ... ข้อมูลอื่นๆ
    },
    "note": "Username is phone number, password is citizen ID. Admin will update test scores later."
  }
}
```

### 2. อัปเดตผลสอบ (Admin เท่านั้น)
```http
PUT /api/v1/students/:id/test-results
Authorization: Bearer {admin-jwt-token}
Content-Type: application/json

{
  "cefr_level": "A2",
  "grammar_score": 75,
  "speaking_score": 70,
  "listening_score": 80,
  "reading_score": 78,
  "writing_score": 72,
  "admin_contact": "admin_test"
}
```

**Response (สำเร็จ):**
```json
{
  "success": true,
  "message": "Test results updated successfully. Status changed to รอติดตาม",
  "data": {
    "student": {
      "registration_status": "รอติดตาม",
      "cefr_level": "A2",
      "grammar_score": 75,
      // ... ข้อมูลอื่นๆ
    }
  }
}
```

## Flow การทำงาน

1. **นักเรียนลงทะเบียน** → สถานะ: "ยังไม่สอบ"
   - สร้างบัญชี user และ student profile
   - Username = เบอร์โทร, Password = เลขบัตรประชาชน
   - เก็บข้อมูลครบถ้วนตามฟอร์ม

2. **Admin อัปเดตผลสอบ** → สถานะ: "รอติดตาม" 
   - เพิ่มคะแนนสอบและระดับ CEFR
   - เปลี่ยนสถานะเป็น "รอติดตาม"

## ฟิลด์ที่จำเป็น (Required)
- `firstName`
- `lastName`
- `phone`
- `citizenId`
- `dateOfBirth` 
- `preferredBranch`

## ข้อผิดพลาดที่อาจพบ
- `Invalid Thai Citizen ID format` - เลขบัตรประชาชนไม่ถูกต้อง
- `User with this phone number already exists` - เบอร์โทรซ้ำ
- `Citizen ID already registered` - เลขบัตรประชาชนซ้ำ

## การทดสอบ
1. รัน: `node test-register-student.js` เพื่อทดสอบการลงทะเบียน
2. รัน: `node test-admin-update.js` เพื่อทดสอบการอัปเดตผลสอบ

## Database Schema ใหม่
ต้องเพิ่มฟิลด์ใหม่ในตาราง `students` ดู `add_student_fields.sql`
