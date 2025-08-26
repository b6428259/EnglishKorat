# Teacher API Endpoints

## 1. Register a new teacher

- **Endpoint:** `POST /api/v1/teachers/register`
- **Desc:** Register a new teacher
**Body:** (Content-Type: multipart/form-data)
- `avatar` (file, optional): รูปโปรไฟล์
- `username`: string
- `password`: string
- `email`: string
- `phone`: string
- `line_id`: string
- `first_name`: string
- `last_name`: string
- `nickname`: string
- `nationality`: string
- `teacher_type`: string
- `hourly_rate`: number
- `specializations`: array of string
- `certifications`: array of string
- `active`: boolean
- `branch_id`: number


## 5. Update teacher avatar

- **Endpoint:** `PUT /api/v1/teachers/:id/avatar`
- **Desc:** Update teacher avatar
- **Body:** (Content-Type: multipart/form-data)
  - `avatar` (file, required): รูปโปรไฟล์ใหม่

## 2. Get all teachers

- **Endpoint:** `GET /api/v1/teachers`
- **Desc:** Get all teachers (with filters & pagination)
- **Query Parameters:**
  - `page` (default: 1)
  - `limit` (default: 20)
  - `search` (optional)
  - `branch_id` (optional)
  - `status` (optional)
  - `teacher_type` (optional)


## 6. Delete teacher

- **Endpoint:** `DELETE /api/v1/teachers/:id`
- **Desc:** Delete teacher (ลบข้อมูลและ avatar)

## 3. Get teacher by ID

- **Endpoint:** `GET /api/v1/teachers/:id`
- **Desc:** Get teacher by ID

---

## 4. Update teacher information

- **Endpoint:** `PUT /api/v1/teachers/:id`
- **Desc:** Update teacher information (can also change branch)
- **Body:**
```json
{
  "first_name": "string",
  "last_name": "string",
  "nickname": "string",
  "nationality": "string",
  "teacher_type": "string",
  "hourly_rate": "number",
  "specializations": ["string"],
  "certifications": ["string"],
  "active": true,
  "branch_id": "number"
}
```

---
