# Leave System API

Leave policy management and student leave request endpoints with dynamic policy rules and change tracking.

## 🏖️ Overview

The leave system handles student leave requests, policy management, and change tracking with branch-specific rules and comprehensive audit trails.

## 📋 Endpoints

### Leave Policy Management

#### List Leave Policies
```http
GET /api/v1/leave-policies
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "policies": [
      {
        "id": 1,
        "rule_name": "ระเบียบการลาคอร์ส 60 ชั่วโมง กลุ่มเล็ก",
        "course_type": "group_small",
        "course_hours": 60,
        "max_students": 5,
        "leave_credits": 2,
        "effective_date": "2024-01-01T00:00:00Z",
        "end_date": null,
        "branch_id": 1,
        "conditions": {
          "advance_notice_hours": 24,
          "makeup_classes_allowed": true,
          "credit_expiry_days": 90
        },
        "status": "active",
        "created_by": "admin",
        "created_at": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

#### Create Leave Policy
```http
POST /api/v1/leave-policies
Authorization: Bearer <admin-or-owner-token>
```

**Request Body:**
```json
{
  "rule_name": "ระเบียบการลาคอร์ส 40 ชั่วโมง",
  "course_type": "adults_conversation",
  "course_hours": 40,
  "max_students": 8,
  "leave_credits": 3,
  "effective_date": "2024-02-01",
  "branch_id": 1,
  "conditions": {
    "advance_notice_hours": 12,
    "makeup_classes_allowed": true,
    "credit_expiry_days": 60,
    "min_hours_before_class": 4
  },
  "change_reason": "เพิ่มสิทธิ์การลาสำหรับคอร์สสนทนาภาษาอังกฤษ"
}
```

#### Update Leave Policy
```http
PUT /api/v1/leave-policies/:id
Authorization: Bearer <admin-or-owner-token>
```

**Request Body:**
```json
{
  "leave_credits": 4,
  "conditions": {
    "advance_notice_hours": 6,
    "makeup_classes_allowed": true,
    "credit_expiry_days": 45
  },
  "change_reason": "เพิ่มความยืดหยุ่นในการลาและลดเวลาแจ้งล่วงหน้า"
}
```

### Student Leave Requests

#### Create Leave Request
```http
POST /api/v1/leave-requests
Authorization: Bearer <student-or-teacher-or-admin-token>
```

**Request Body:**
```json
{
  "student_id": 10,
  "class_id": 25,
  "leave_date": "2024-01-20",
  "reason": "ติดภารกิจเร่งด่วน",
  "request_makeup": true,
  "preferred_makeup_dates": [
    "2024-01-22T14:00:00Z",
    "2024-01-23T16:00:00Z"
  ]
}
```

#### List Leave Requests
```http
GET /api/v1/leave-requests
Authorization: Bearer <teacher-admin-or-owner-token>
```

#### Approve/Reject Leave Request
```http
PUT /api/v1/leave-requests/:id
Authorization: Bearer <teacher-admin-or-owner-token>
```

**Request Body:**
```json
{
  "status": "approved",
  "admin_notes": "อนุมัติการลาและจัดเรียนชดเชย",
  "makeup_class_scheduled": true,
  "makeup_date": "2024-01-22T14:00:00Z",
  "makeup_room_id": 2
}
```

### Change History & Audit

#### Get Change History
```http
GET /api/v1/policy/changes
Authorization: Bearer <admin-or-owner-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "changes": [
      {
        "id": 1,
        "policy_id": 1,
        "change_type": "update",
        "changed_by": {
          "id": 2,
          "username": "admin",
          "name": "Administrator"
        },
        "change_summary": "เพิ่มสิทธิ์การลาจาก 2 เป็น 3 ครั้ง",
        "old_values": {
          "leave_credits": 2,
          "advance_notice_hours": 24
        },
        "new_values": {
          "leave_credits": 3,
          "advance_notice_hours": 12
        },
        "change_reason": "ปรับปรุงนโยบายให้ยืดหยุ่นมากขึ้น",
        "timestamp": "2024-01-15T10:30:00Z",
        "approved_by": null,
        "reverted": false
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

#### Revert Change
```http
POST /api/v1/policy/revert/:changeId
Authorization: Bearer <owner-token>
```

**Request Body:**
```json
{
  "revert_reason": "นโยบายใหม่ทำให้เกิดปัญหา ต้องย้อนกลับไปใช้ค่าเดิม"
}
```

### Leave Statistics

#### Get Leave Statistics
```http
GET /api/v1/leave-requests/statistics
Authorization: Bearer <admin-or-owner-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_requests": 245,
      "approved": 210,
      "pending": 25,
      "rejected": 10,
      "approval_rate": 85.7
    },
    "by_course_type": {
      "ielts_preparation": {
        "requests": 45,
        "approved": 40,
        "average_credits_used": 1.8
      },
      "adults_conversation": {
        "requests": 120,
        "approved": 105,
        "average_credits_used": 2.1
      }
    },
    "trends": {
      "most_common_reasons": [
        "ติดภารกิจเร่งด่วน",
        "ป่วย",
        "เดินทางต่างจังหวัด"
      ],
      "peak_leave_days": ["friday", "monday"],
      "makeup_success_rate": 78.5
    }
  }
}
```