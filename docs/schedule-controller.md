# Schedule Controller API Reference

This document describes all endpoints implemented in `src/controllers/scheduleController.js` and wired in `src/routes/schedules.js`.

Base path
- /api/v1/schedules

Auth and roles
- All endpoints require Bearer JWT via auth middleware
- Roles: owner (all branches), admin (own branch), teacher (read-limited on some lists)

Key concepts
- Schedule is the primary entity; sessions belong to a schedule
- Duplicate sessions are prevented by DB unique index on (schedule_id, session_date, start_time, end_time)
- Service metadata is on schedules: service_type ('course'|'custom'), service_custom_text
- Sessions store created_by and notes; appointment notes are merged into session notes
- Dates are treated as local calendar dates (YYYY-MM-DD); times are HH:mm:ss

Conflict rules (summary)
- Teacher conflicts: overlapping sessions for same date/time are blocked
- Room conflicts: overlapping sessions for same date/time are blocked
- When updating a schedule or creating sessions, teacher and room conflicts are checked

Holidays
- Holidays are retrieved from myhora.com (Thai Buddhist years); generated sessions on holidays are cancelled; optional auto-reschedule when generating schedules

---

## 1) Create schedule (auto-generate sessions)
- Method: POST
- Path: /
- Access: admin, owner
- Body
  - course_id (number, required)
  - teacher_id (number, optional)
  - room_id (number, optional)
  - schedule_name (string, required)
  - total_hours (number, required)
  - hours_per_session (number, default 3.0)
  - max_students (number, default 6)
  - start_date (YYYY-MM-DD, required)
  - time_slots (array, required): [{ day_of_week, start_time, end_time }]
  - auto_reschedule_holidays (boolean, default true)
  - notes (string, optional)
- Behavior: creates schedule + schedule_time_slots and generates sessions; skips duplicates; marks holiday sessions as cancelled and can create future makeup sessions

## 2) List schedules
- Method: GET
- Path: /
- Access: authenticated
- Query: page, limit, course_id, teacher_id, room_id, day_of_week, status, branch_id
- Returns: schedules, course/teacher/room info, current_students, available_spots, pagination

## 3) Get schedule by id
- Method: GET
- Path: /:id
- Access: authenticated; admin limited to own branch
- Returns: schedule with course/teacher/room/branch details and student counts

## 4) Update schedule
- Method: PUT
- Path: /:id
- Access: admin, owner
- Body (any of): teacher_id, room_id, schedule_name, day_of_week, start_time, end_time, duration_hours, max_students, schedule_type, recurring_pattern, start_date, end_date, status, notes
- Behavior: checks teacher/room conflicts when time or responsibility changes

## 5) Delete schedule
- Method: DELETE
- Path: /:id
- Access: admin, owner
- Behavior: blocked if there are active students in schedule

## 6) Assign student
- Method: POST
- Path: /:id/students
- Access: admin, owner
- Body: student_id (required), total_amount (number, default 0), notes (optional)

## 7) Remove student
- Method: DELETE
- Path: /:id/students/:studentId
- Access: admin, owner
- Body: reason (optional)
- Behavior: marks enrollment cancelled and decrements current_students

## 8) Get schedule students
- Method: GET
- Path: /:id/students
- Access: authenticated
- Query: status (default active)

## 9) Create schedule exception (by date)
- Method: POST
- Path: /:id/exceptions
- Access: admin, owner
- Body: exception_date (YYYY-MM-DD), exception_type ('cancellation'|'reschedule'|'time_change'...), new_date?, new_start_time?, new_end_time?, new_teacher_id?, new_room_id?, reason (required), notes?
- Behavior: applies to all sessions on that date; cancellation/reschedule/time change supported

## 10) Create schedule exception (by session)
- Method: POST
- Path: /:id/exceptions/session
- Access: admin, owner
- Body: session_id (required), exception_type, new_* overrides, reason (required), notes?
- Behavior: updates a single session (cancel/reschedule/time change)

## 11) Create makeup session
- Method: POST
- Path: /:id/makeup
- Access: admin, owner
- Body: original_session_id (required), makeup_date (YYYY-MM-DD), makeup_start_time, makeup_end_time, teacher_id?, room_id?, reason?, notes?
- Behavior: only for cancelled original; one makeup per original

## 12) List makeup sessions
- Method: GET
- Path: /:id/makeup
- Access: authenticated
- Query: page, limit, status, start_date, end_date, teacher_id, room_id, sort_by, sort_order

## 13) Handle student leave
- Method: POST
- Path: /:id/leave
- Access: admin, owner
- Body: student_id, leave_date, leave_type, reason, advance_notice_hours (default 0), notes?
- Behavior: enforces policy by class size/hours; records attendance/eligibility; private classes require 24h notice

## 14) Handle course drop/pause
- Method: POST
- Path: /:id/drop
- Access: admin, owner
- Body: student_id, drop_type ('temporary'|'permanent'), drop_date, expected_return_date?, reason, preserve_schedule (default true), notes?
- Behavior: records drop, pauses enrollment, creates reservations for temporary drops

## 15) List sessions (rich)
- Method: GET
- Path: /:id/sessions
- Access: authenticated
- Query: status, start_date, end_date, include_cancelled ('true'|'false' default 'false'), page, limit, sort_by, sort_order, teacher_id, room_id, session_number, week_number, is_makeup_session, has_comments ('true'|'false')
- Returns: sessions with teacher/room/time-slot info, comment counts, attendance summary, enrolled students, exceptions and pagination

## 16) Weekly schedule view
- Method: GET
- Path: /weekly
- Access: authenticated
- Query: week_start, teacher_id, room_id, branch_id, status (default active), course_id, min_students, max_students, include_students ('true'|'false'), time_range_start, time_range_end

## 17) Calendar view (day/week/month)
- Method: GET
- Path: /calendar
- Access: authenticated
- Query: view ('day'|'week'|'month'), date (required), branch_id, teacher_id, room_id, course_id, status (default active), include_students ('true'|'false'), include_holidays ('true'|'false')

## 18) Apply existing exceptions to sessions
- Method: POST
- Path: /:id/apply-exceptions
- Access: admin, owner
- Behavior: re-applies all approved exceptions to sessions

## 19) Session comments
- Add comment
  - POST /:id/sessions/:sessionId/comments (admin, owner)
  - Body: comment (required), type ('note'|'comment'|'warning'|'important'), is_private (default false)
- List comments
  - GET /:id/sessions/:sessionId/comments (authenticated)
  - Query: type, include_private ('true'|'false' default 'false'), page, limit, sort_by, sort_order, user_id, search
- Update comment
  - PUT /:id/sessions/:sessionId/comments/:commentId (admin, owner, or author)
- Delete comment
  - DELETE /:id/sessions/:sessionId/comments/:commentId (admin, owner, or author)

## 20) Edit session
- Method: PUT
- Path: /:id/sessions/:sessionId
- Access: admin, owner
- Body: session_date?, start_time?, end_time?, status?, notes?
- Behavior: checks teacher/room conflicts when date/time change

## 21) Create session(s) (single or repeating)
- Method: POST
- Path: /:id/sessions/create
- Access: admin, owner
- Required: session_date, start_time, end_time
- Optional:
  - repeat: {
    enabled (boolean),
    frequency ('daily'|'weekly'|'monthly'),
    interval (number >= 1),
    end: { type: 'never'|'after'|'on', count?, date? },
    days_of_week?: array of 'monday'..'sunday' (weekly only)
  }
  - is_makeup_session (boolean)
  - notes (string)
  - appointment_notes (string; merged into notes)
- Behavior
  - Generates date set per repeat rules
  - Prevents duplicates and checks teacher/room conflicts
  - Auto-creates schedule_time_slots if missing
  - Computes session_number and week_number; sets created_by from JWT
  - Returns created and skipped (duplicates/conflicts)

## 22) Teacher schedules (all)
- Method: GET
- Path: /teachers
- Access: authenticated
- Query: teacher_id?, branch_id?, date_filter ('day'|'week'|'month'), date (YYYY-MM-DD), page, limit

## 23) Specific teacher schedule
- Method: GET
- Path: /teachers/:teacher_id
- Access: authenticated; branch-limited for admin
- Query: branch_id?, date_filter ('day'|'week'|'month'), date, include_students ('true'|'false'), page, limit

---

Error responses (typical)
- 400 Bad Request: invalid/missing fields
- 403 Forbidden: access denied (role/branch)
- 404 Not Found: entity missing
- 409 Conflict: teacher/room overlap
- 500 Server Error

Data integrity notes
- Unique index on schedule_sessions(schedule_id, session_date, start_time, end_time)
- Makeup sessions link via makeup_for_session_id

Changelog highlights
- schedule_slots removed; use schedule_time_slots
- Session-level service fields removed; service kept on schedules
- createSessions endpoint added with repeat and conflict checks

---

## Example requests and responses

These examples assume Authorization: Bearer <JWT> is included.

### Create schedule (POST /api/v1/schedules)

Request

```http
POST /api/v1/schedules HTTP/1.1
Content-Type: application/json

{
  "course_id": 101,
  "teacher_id": 7,
  "room_id": 3,
  "schedule_name": "Conversation A (Morning)",
  "total_hours": 60,
  "hours_per_session": 3,
  "max_students": 6,
  "start_date": "2025-09-01",
  "time_slots": [
    { "day_of_week": "monday", "start_time": "09:00:00", "end_time": "12:00:00" },
    { "day_of_week": "wednesday", "start_time": "09:00:00", "end_time": "12:00:00" }
  ],
  "auto_reschedule_holidays": true,
  "notes": "Term 1"
}
```

Response (201)

```json
{
  "success": true,
  "message": "Schedule created successfully with 20 sessions generated across 10 weeks",
  "data": {
    "schedule": {
      "id": 42,
      "schedule_name": "Conversation A (Morning)",
      "course_id": 101,
      "course_name": "Conversation A",
      "teacher_id": 7,
      "room_id": 3,
      "start_date": "2025-09-01",
      "estimated_end_date": "2025-11-10",
      "status": "active",
      "max_students": 6,
      "current_students": 0,
      "available_spots": 6
    },
    "sessions_generated": 20,
    "estimated_weeks": 10,
    "sessions_per_week": 2
  }
}
```

---

### Create session(s) with repeat (POST /api/v1/schedules/:id/sessions/create)

Request

```http
POST /api/v1/schedules/42/sessions/create HTTP/1.1
Content-Type: application/json

{
  "session_date": "2025-09-03",
  "start_time": "13:00:00",
  "end_time": "15:00:00",
  "repeat": {
    "enabled": true,
    "frequency": "weekly",
    "interval": 1,
    "days_of_week": ["wednesday", "friday"],
    "end": { "type": "after", "count": 4 }
  },
  "notes": "Afternoon add-on",
  "appointment_notes": "Parent request"
}
```

Response (201)

```json
{
  "success": true,
  "message": "Created 4 session(s), skipped 0",
  "data": {
    "created": [
      { "session_date": "2025-09-03", "start_time": "13:00:00", "end_time": "15:00:00", "session_number": 21, "week_number": 1, "is_makeup_session": false },
      { "session_date": "2025-09-05", "start_time": "13:00:00", "end_time": "15:00:00", "session_number": 22, "week_number": 1, "is_makeup_session": false },
      { "session_date": "2025-09-10", "start_time": "13:00:00", "end_time": "15:00:00", "session_number": 23, "week_number": 2, "is_makeup_session": false },
      { "session_date": "2025-09-12", "start_time": "13:00:00", "end_time": "15:00:00", "session_number": 24, "week_number": 2, "is_makeup_session": false }
    ],
    "skipped": []
  }
}
```

Duplicate/Conflict example (201, skipped entries)

```json
{
  "success": true,
  "message": "Created 1 session(s), skipped 2",
  "data": {
    "created": [ { "session_date": "2025-09-10", "start_time": "13:00:00", "end_time": "15:00:00", "session_number": 23, "week_number": 2, "is_makeup_session": false } ],
    "skipped": [
      { "date": "2025-09-03", "reason": "duplicate" },
      { "date": "2025-09-05", "reason": "conflict", "details": [ { "type": "teacher" } ] }
    ]
  }
}
```

---

### List sessions (GET /api/v1/schedules/:id/sessions)

Request

```http
GET /api/v1/schedules/42/sessions?start_date=2025-09-01&end_date=2025-09-30&include_cancelled=false&page=1&limit=10 HTTP/1.1
```

Response (200)

```json
{
  "success": true,
  "data": {
    "schedule": { "id": 42, "schedule_name": "Conversation A (Morning)", "course_name": "Conversation A", "status": "active" },
    "students": [ { "id": 3001, "first_name": "Nina", "last_name": "K." } ],
    "sessions": [
      {
        "id": 501,
        "schedule_id": 42,
        "session_date": "2025-09-01",
        "start_time": "09:00:00",
        "end_time": "12:00:00",
        "session_number": 1,
        "week_number": 1,
        "status": "scheduled",
        "day_of_week": "monday",
        "teacher_first_name": "John",
        "teacher_last_name": "Doe",
        "room_name": "R1",
        "comment_count": 0,
        "attendance_summary": {}
      }
    ],
    "exceptions": [],
    "pagination": { "current_page": 1, "per_page": 10, "total": 8, "total_pages": 1 }
  }
}
```

---

### Create schedule exception (POST /api/v1/schedules/:id/exceptions)

Request (cancel by date)

```http
POST /api/v1/schedules/42/exceptions HTTP/1.1
Content-Type: application/json

{
  "exception_date": "2025-10-23",
  "exception_type": "cancellation",
  "reason": "Public holiday"
}
```

Response (201)

```json
{
  "success": true,
  "message": "Schedule exception created successfully and affected sessions updated",
  "data": { "exception": { "id": 8801, "schedule_id": 42, "exception_date": "2025-10-23", "exception_type": "cancellation", "status": "approved" } }
}
```

---

### Edit session (PUT /api/v1/schedules/:id/sessions/:sessionId)

Request

```http
PUT /api/v1/schedules/42/sessions/501 HTTP/1.1
Content-Type: application/json

{
  "start_time": "10:00:00",
  "end_time": "12:30:00",
  "notes": "Shifted later"
}
```

Response (200)

```json
{
  "success": true,
  "message": "Session updated successfully",
  "data": {
    "session": {
      "id": 501,
      "session_date": "2025-09-01",
      "start_time": "10:00:00",
      "end_time": "12:30:00",
      "status": "scheduled",
      "notes": "Shifted later"
    },
    "fields_changed": ["start_time", "end_time", "notes"]
  }
}
```

---

### Create makeup session (POST /api/v1/schedules/:id/makeup)

Request

```http
POST /api/v1/schedules/42/makeup HTTP/1.1
Content-Type: application/json

{
  "original_session_id": 501,
  "makeup_date": "2025-10-30",
  "makeup_start_time": "09:00:00",
  "makeup_end_time": "12:00:00",
  "reason": "Holiday makeup"
}
```

Response (201)

```json
{
  "success": true,
  "message": "Makeup session created successfully",
  "data": {
    "makeup_session": {
      "id": 512,
      "schedule_id": 42,
      "session_date": "2025-10-30",
      "start_time": "09:00:00",
      "end_time": "12:00:00",
      "is_makeup_session": true
    },
    "original_session": {
      "id": 501,
      "session_date": "2025-10-23",
      "status": "cancelled"
    }
  }
}
```

---

### Error examples

Missing fields (400)

```json
{ "success": false, "message": "Missing required fields: session_date, start_time, end_time" }
```

Conflict detected (409)

```json
{
  "success": false,
  "message": "Session conflicts detected",
  "conflicts": [ { "type": "room", "message": "Room has conflicting sessions on this date" } ]
}
```
