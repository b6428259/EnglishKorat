# API Documentation

This directory contains comprehensive API documentation for the English Korat Language School Management System.

## 📁 Documentation Structure

### Core Modules
- [authentication.md](authentication.md) - Authentication and authorization endpoints
- [user-management.md](user-management.md) - User registration, profiles, and management
- [course-management.md](course-management.md) - Course creation, updates, and group management
- [schedule-classroom.md](schedule-classroom.md) - Scheduling and room management
- [leave-system.md](leave-system.md) - Leave policies, requests, and management

### Advanced Features
- [notifications.md](notifications.md) - Notification system and real-time alerts
- [financial.md](financial.md) - Billing, payments, and financial management
- [reporting.md](reporting.md) - Reports and analytics endpoints
- [analytics.md](analytics.md) - System analytics and dashboard data
- [file-management.md](file-management.md) - File upload and document management

## 🚀 Quick Start

### Base URL
```
Development: http://localhost:3000/api/v1
Production: https://api.englishkorat.com/api/v1
```

### Authentication
All API requests (except registration and login) require a valid JWT token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### Response Format
All API responses follow this standard format:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Format
Error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

## 🔗 Development Phases

### Phase 1 Endpoints (Weeks 2-3) ✅
Core functionality including authentication, user management, course management, basic scheduling, and leave system.

### Phase 2 Endpoints (Weeks 4-6) ✅
Enhanced features including teaching reports, student progress tracking, financial management, and e-book system.

### Phase 3 Endpoints (Weeks 7-9) ✅
Advanced features including analytics, student portal, and advanced notifications.

### Phase 4 Endpoints (Weeks 10-12) 🚧
System testing, health monitoring, and advanced integrations.

## 📝 Usage Guidelines

### Rate Limiting
- **Anonymous users**: 100 requests per 15 minutes
- **Authenticated users**: 1000 requests per 15 minutes
- **Admin/Owner users**: 5000 requests per 15 minutes

### Pagination
Most list endpoints support pagination with these parameters:
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `sort` (field to sort by)
- `order` (asc/desc, default: asc)

### Filtering
Many endpoints support filtering with query parameters:
- `search` - Search across relevant fields
- `status` - Filter by status
- `branch_id` - Filter by branch
- `date_from` and `date_to` - Date range filtering

## 🛠️ Testing

### Postman Collection
Download the auto-generated Postman collection:
```
GET /api/v1/postman-collection.json
```

### Test Accounts
After running seed data:
```
Admin: username=admin, password=admin123
Owner: username=owner, password=admin123
Teacher: username=teacher1, password=teacher123
Student: username=student1, password=student123
```

## 🔒 Security

### Role-Based Access Control
- **Student**: Limited access to own data and course information
- **Teacher**: Access to assigned classes, students, and reports
- **Admin**: Full access within assigned branch
- **Owner**: Full system access across all branches

### API Security Features
- JWT token authentication
- Role-based endpoint protection
- Input validation and sanitization
- Rate limiting
- SQL injection prevention
- XSS protection
- HTTPS enforcement in production

## 📊 Monitoring

### Health Check
```http
GET /health
```

### API Documentation
```http
GET /api/v1
```

### System Status
```http
GET /api/v1/system/status
```