# Authentication API

Authentication and authorization endpoints for the English Korat Language School Management System.

## 🔐 Overview

The authentication system uses JWT (JSON Web Tokens) for stateless authentication with role-based access control (RBAC).

### Supported Roles
- **Student**: Access to own profile and course information
- **Teacher**: Access to assigned classes and student management
- **Admin**: Full branch management capabilities
- **Owner**: Full system access across all branches

## 📋 Endpoints

### User Registration
```http
POST /api/v1/auth/register
```

Register a new user in the system.

**Request Body:**
```json
{
  "username": "newuser",
  "password": "securepassword123",
  "email": "user@example.com",
  "phone": "+66812345678",
  "line_id": "lineuser123",
  "role": "student",
  "branch_id": 1,
  "profile": {
    "first_name": "John",
    "last_name": "Doe",
    "birth_date": "1995-06-15",
    "gender": "male",
    "address": "123 Main St, Korat",
    "emergency_contact": "+66987654321"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 123,
      "username": "newuser",
      "email": "user@example.com",
      "role": "student",
      "branch_id": 1,
      "status": "active",
      "created_at": "2024-01-15T10:30:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### User Login
```http
POST /api/v1/auth/login
```

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@englishkorat.com",
      "role": "admin",
      "branch_id": 1,
      "permissions": ["users.read", "users.write", "courses.read", "courses.write"]
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": "24h"
  }
}
```

### Get User Profile
```http
GET /api/v1/auth/profile
Authorization: Bearer <token>
```

Get current user's profile information.

**Response:**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@englishkorat.com",
      "phone": "+66812345678",
      "line_id": "admin_line",
      "role": "admin",
      "branch": {
        "id": 1,
        "name": "The Mall Branch",
        "code": "MALL"
      },
      "profile": {
        "first_name": "Admin",
        "last_name": "User",
        "birth_date": "1990-01-01",
        "gender": "male",
        "address": "Admin Address",
        "avatar_url": "https://example.com/avatar.jpg"
      },
      "permissions": ["users.read", "users.write"],
      "last_login": "2024-01-15T10:30:00Z",
      "created_at": "2024-01-01T00:00:00Z"
    }
  }
}
```

### Update User Profile
```http
PUT /api/v1/auth/profile
Authorization: Bearer <token>
```

Update current user's profile information.

**Request Body:**
```json
{
  "email": "newemail@example.com",
  "phone": "+66812345679",
  "line_id": "new_line_id",
  "profile": {
    "first_name": "Updated",
    "last_name": "Name",
    "address": "New Address",
    "emergency_contact": "+66987654321"
  }
}
```

### Change Password
```http
PUT /api/v1/auth/change-password
Authorization: Bearer <token>
```

Change user's password.

**Request Body:**
```json
{
  "current_password": "oldpassword123",
  "new_password": "newpassword456",
  "confirm_password": "newpassword456"
}
```

### Refresh Token
```http
POST /api/v1/auth/refresh
Authorization: Bearer <token>
```

Refresh JWT token before expiration.

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": "24h"
  }
}
```

### Logout
```http
POST /api/v1/auth/logout
Authorization: Bearer <token>
```

Logout user and invalidate token.

## 🔒 Security Features

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- Special characters recommended

### Token Security
- JWT tokens expire after 24 hours
- Tokens are invalidated on logout
- Refresh tokens available for seamless renewal
- Rate limiting on authentication endpoints

### Role-Based Access Control
Each endpoint checks user permissions based on their role:

```javascript
// Example permission checks
const permissions = {
  student: ['profile.read', 'profile.write', 'courses.read'],
  teacher: ['profile.read', 'profile.write', 'classes.read', 'students.read'],
  admin: ['*'], // All permissions within branch
  owner: ['**'] // All permissions system-wide
};
```

## 📝 Error Codes

| Code | Description |
|------|-------------|
| `AUTH_001` | Invalid username or password |
| `AUTH_002` | Account suspended or inactive |
| `AUTH_003` | Token expired |
| `AUTH_004` | Invalid token format |
| `AUTH_005` | Insufficient permissions |
| `AUTH_006` | Password does not meet requirements |
| `AUTH_007` | Username already exists |
| `AUTH_008` | Email already registered |
| `AUTH_009` | Invalid branch assignment |
| `AUTH_010` | Rate limit exceeded |

## 🧪 Testing Examples

### Using cURL

**Login:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

**Get Profile:**
```bash
curl -X GET http://localhost:3000/api/v1/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Using JavaScript (Axios)

```javascript
// Login
const loginResponse = await axios.post('/api/v1/auth/login', {
  username: 'admin',
  password: 'admin123'
});

const token = loginResponse.data.data.token;

// Set default authorization header
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

// Get profile
const profile = await axios.get('/api/v1/auth/profile');
```