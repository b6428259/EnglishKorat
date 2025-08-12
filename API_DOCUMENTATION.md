# English Korat School Management System API

A comprehensive backend system for managing an English language school with multiple branches.

## Features Implemented (Phase 1 ✅)

### 🔐 Authentication System
- JWT-based authentication
- Role-based access control (Student, Teacher, Admin, Owner)
- User registration and login
- Profile management and password change

### 👥 User Management
- Student registration with detailed profile information
- Teacher and staff account management
- Branch-based access control
- User profile updates

### 📚 Course Management
- Create and manage courses (Conversation, Test Prep, Chinese)
- Course types: Kids/Adults Conversation, 4 Skills, IELTS/TOEIC/TOEFL prep
- Pricing and payment terms management
- Branch-specific course organization

### 🏫 Room Management
- Room availability checking
- Capacity-based room suggestions
- Equipment tracking
- Time slot conflict resolution

### 📝 Enrollment System
- Student course enrollment
- Payment status tracking
- Leave credit management
- Enrollment history

### 🏢 Multi-Branch Support
- The Mall Branch (offline)
- Technology Branch (offline)  
- Online Branch (virtual)

## Features Implemented (Phase 2 ✅ - Scheduling & Classes)

### 📅 Class Scheduling System
- Create and manage class schedules
- Assign teachers to classes
- Update class status (scheduled, confirmed, in_progress, completed, cancelled)
- Handle schedule conflict resolution
- Room and teacher availability checking

### 📋 Attendance Tracking
- Mark student attendance (present, absent, excused, late)
- Generate attendance reports for students and classes
- Manage leave requests and approvals
- Leave credit management integration

### 🗓️ Schedule Management
- View schedules for teachers, students, and rooms
- Check for scheduling conflicts
- Suggest available time slots
- Branch-wide schedule overview

## API Endpoints

### Authentication
```
POST   /api/v1/auth/register      # Register new user
POST   /api/v1/auth/login         # User login
GET    /api/v1/auth/profile       # Get user profile
PUT    /api/v1/auth/profile       # Update profile
PUT    /api/v1/auth/change-password # Change password
```

### Students
```
POST   /api/v1/students/register  # Student registration
GET    /api/v1/students           # List students (Admin/Owner)
GET    /api/v1/students/:id       # Get student details
PUT    /api/v1/students/:id       # Update student info
```

### Courses
```
GET    /api/v1/courses            # List courses
GET    /api/v1/courses/:id        # Get course details
POST   /api/v1/courses            # Create course (Admin/Owner)
PUT    /api/v1/courses/:id        # Update course (Admin/Owner)
DELETE /api/v1/courses/:id        # Delete course (Admin/Owner)
```

### Rooms
```
GET    /api/v1/rooms              # List rooms
GET    /api/v1/rooms/availability # Check room availability
GET    /api/v1/rooms/suggestions  # Get room suggestions
POST   /api/v1/rooms              # Create room (Admin/Owner)
PUT    /api/v1/rooms/:id          # Update room (Admin/Owner)
```

### Enrollments
```
POST   /api/v1/enrollments        # Enroll student (Admin/Owner)
GET    /api/v1/enrollments        # List enrollments
GET    /api/v1/enrollments/student/:id # Student's enrollments
PUT    /api/v1/enrollments/:id    # Update enrollment (Admin/Owner)
```

### Classes (Phase 2 ✅)
```
GET    /api/v1/classes            # List classes with filters
POST   /api/v1/classes            # Create class (Admin/Owner)
GET    /api/v1/classes/:id        # Get class details
PUT    /api/v1/classes/:id        # Update class (Admin/Owner)
DELETE /api/v1/classes/:id        # Delete class (Admin/Owner)
```

### Attendance (Phase 2 ✅)
```
POST   /api/v1/attendance         # Mark attendance (Teacher/Admin/Owner)
GET    /api/v1/attendance/class/:classId # Get class attendance
GET    /api/v1/attendance/student/:studentId # Get student attendance report
POST   /api/v1/attendance/leave-request # Submit leave request (Student)
PUT    /api/v1/attendance/leave-request/:id # Process leave request (Admin/Owner)
GET    /api/v1/attendance/leave-requests # List leave requests
```

### Schedules (Phase 2 ✅)
```
GET    /api/v1/schedules/teacher/:teacherId # Get teacher schedule
GET    /api/v1/schedules/student/:studentId # Get student schedule
GET    /api/v1/schedules/room/:roomId # Get room schedule
GET    /api/v1/schedules/branch/:branchId # Get branch schedule (Admin/Owner)
POST   /api/v1/schedules/check-conflicts # Check scheduling conflicts (Admin/Owner)
GET    /api/v1/schedules/available-slots # Get available time slots (Admin/Owner)
```

### System
```
GET    /health                    # Health check
GET    /api/v1                    # API documentation
GET    /api/v1/postman-collection.json # Postman collection
```

## Database Schema

### Core Tables
- **branches** - School branches (Mall, Tech, Online)
- **users** - User accounts with roles
- **students** - Student profiles and test scores
- **teachers** - Teacher profiles and rates
- **courses** - Course catalog
- **rooms** - Room inventory and equipment
- **enrollments** - Student course enrollments
- **classes** - Individual class sessions
- **teaching_reports** - Teacher lesson reports
- **bills** & **payments** - Billing system

### Key Features
- CEFR level tracking (A1-C2)
- Multiple course types support
- Payment installment system
- Leave credit management
- Branch-based data isolation
- Equipment and capacity tracking

## Course Types Supported
- **conversation_kids** - Kids Conversation
- **conversation_adults** - Adults Conversation  
- **english_4skills** - English 4 Skills
- **ielts_prep** - IELTS Test Preparation
- **toeic_prep** - TOEIC Test Preparation
- **toefl_prep** - TOEFL Test Preparation
- **chinese_conversation** - Chinese Conversation
- **chinese_4skills** - Chinese 4 Skills

## Authentication & Authorization

### Roles & Permissions
- **Student**: View own profile, courses, schedules
- **Teacher**: Submit reports, view assigned classes
- **Admin**: Manage students, courses, schedules for their branch
- **Owner**: Full system access across all branches

### Security Features
- JWT token authentication
- Password hashing with bcrypt
- Input validation and sanitization
- Rate limiting
- CORS protection
- Helmet security headers

## Getting Started

### Prerequisites
- Node.js 18+
- MySQL/PostgreSQL database
- Environment variables configured

### Installation
```bash
npm install
npm run migrate  # Run database migrations
npm run seed     # Seed initial data
npm start        # Start server
```

### Development
```bash
npm run dev      # Development mode with nodemon
npm test         # Run tests
npm run lint     # Check code style
```

### Environment Variables
```env
NODE_ENV=development
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=admin
DB_PASSWORD=adminEKLS1234
DB_NAME=englishkorat
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
```

## Next Development Phases

### Phase 3: Reports & Billing
- Teaching report submission
- Payment processing
- Bill generation
- Financial reporting

### Phase 4: Advanced Features
- LINE bot integration
- File upload system
- Notification system
- Dashboard analytics

## Technology Stack
- **Backend**: Node.js, Express.js
- **Database**: MySQL with Knex.js ORM
- **Authentication**: JWT
- **Validation**: Express-validator
- **Testing**: Jest, Supertest
- **Documentation**: Auto-generated API docs

## Project Structure
```
src/
├── controllers/    # Business logic
├── routes/         # API routes
├── middleware/     # Authentication, validation
├── database/       # Migrations and seeds
├── utils/          # Helper utilities
├── config/         # Database configuration
└── tests/          # Test files
```