# English Korat Language School Management System

A comprehensive, multi-branch school management system for English language education with advanced features including student enrollment, course management, scheduling, leave policies, financial tracking, and real-time notifications.

## 📋 Project Overview

The English Korat Language School Management System is a robust backend API designed to handle all aspects of language school operations across multiple branches. The system supports four user roles (Student, Teacher, Admin, Owner) and provides comprehensive functionality for course management, scheduling, attendance tracking, financial management, and advanced leave policy management.

### 🏗️ System Architecture

**Technology Stack:**
- **Backend**: Node.js with Express.js framework
- **Database**: MySQL 8.0+ with Knex.js ORM
- **Authentication**: JWT-based with role-based access control
- **Caching**: Redis for session management and caching
- **Testing**: Jest with Supertest for API testing
- **Documentation**: Auto-generated API docs with Postman collections

**Multi-Branch Support:**
- The Mall Branch (offline)
- Technology Branch (offline)  
- Online Branch (virtual)

### 🚀 Key Features

#### Phase 1 ✅ - Core System
- **Authentication & Security**: JWT-based auth with RBAC, password encryption
- **User Management**: Comprehensive profiles for students, teachers, and staff
- **Course Management**: 8 course types including conversation, skills, and test prep
- **Room & Facility Management**: Availability tracking and conflict resolution
- **Enrollment System**: Student course enrollment with payment tracking

#### Phase 2 ✅ - Scheduling & Classes
- **Class Management**: Individual session scheduling and management
- **Attendance Tracking**: Digital attendance with makeup session support
- **Schedule Coordination**: Conflict detection and room optimization
- **Leave System**: Student leave requests with credit management

#### Phase 3 ✅ - Advanced Leave Policy Management
- **Dynamic Leave Policies**: Configurable rules with course-specific settings
- **Change Tracking & Audit**: Complete history with revert capabilities
- **Real-Time Notifications**: Instant alerts for policy changes
- **Room Usage Alerts**: Live notifications for availability and conflicts

## 🛠️ Installation Guide

### Prerequisites

**System Requirements:**
- Node.js 18.0+ 
- MySQL 8.0+
- Redis (for caching and queue management)
- Git

**Development Tools:**
- npm 9.0+ or yarn
- Postman (for API testing)
- MySQL Workbench (optional, for database management)

### Step-by-Step Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/b6428259/EnglishKorat.git
cd EnglishKorat
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your configuration
nano .env
```

**Required Environment Variables:**
```env
# Database Configuration
DB_CLIENT=mysql2
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=admin
DB_PASSWORD=adminEKLS1234
DB_NAME=englishkorat

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3000
NODE_ENV=development

# Redis Configuration (optional)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# AWS S3 Configuration (for file uploads)
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=your-bucket-name
```

#### 4. Database Setup
```bash
# Run migrations
npm run migrate

# Seed initial data (optional)
npm run seed
```

#### 5. Start Development Server
```bash
# Development with auto-reload
npm run dev

# Production
npm start
```

#### 6. Verify Installation
- API Documentation: `http://localhost:3000/api/v1`
- Health Check: `http://localhost:3000/health`
- Postman Collection: `http://localhost:3000/api/v1/postman-collection.json`

## 🌐 Environment Setup

### Development Environment
```bash
# Install development dependencies
npm install --include=dev

# Run with nodemon for auto-reload
npm run dev

# Run tests
npm test

# Run linting
npm run lint
```

### Staging Environment
```bash
# Set NODE_ENV
export NODE_ENV=staging

# Use staging database
DB_NAME=englishkorat_staging

# Start with PM2 (recommended)
pm2 start ecosystem.config.js --env staging
```

### Production Environment
```bash
# Set NODE_ENV
export NODE_ENV=production

# Use production database
DB_NAME=englishkorat_production

# Start with PM2
pm2 start ecosystem.config.js --env production
```

## 📚 API Documentation Preview

### Core Endpoints

**Authentication**
```http
POST /api/v1/auth/register     # User registration
POST /api/v1/auth/login        # User login
GET  /api/v1/auth/profile      # Get user profile
PUT  /api/v1/auth/profile      # Update profile
```

**Course Management**
```http
GET  /api/v1/courses           # List courses
POST /api/v1/courses           # Create course (Admin/Owner)
PUT  /api/v1/courses/:id       # Update course
GET  /api/v1/courses/:id/groups # Get course groups
```

**Leave Policy Management**
```http
GET  /api/v1/leave-policies    # List leave policies
POST /api/v1/leave-policies    # Create policy (Admin/Owner)
PUT  /api/v1/leave-policies/:id # Update policy
GET  /api/v1/policy/changes    # Get change history
```

**Complete API Documentation**: [docs/api/README.md](docs/api/README.md)

Additional module docs
- Schedule Controller API: [docs/schedule-controller.md](docs/schedule-controller.md)

## 🔄 Development Workflow

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: add your feature"

# Push and create pull request
git push origin feature/your-feature-name
```

### Code Standards
- Follow ESLint configuration
- Use Prettier for code formatting
- Write tests for new features
- Update documentation for API changes

### Testing Guidelines
```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --testPathPattern=unit
npm test -- --testPathPattern=integration

# Run with coverage
npm test -- --coverage
```

## 🤝 Contributing Guidelines

### Before Contributing
1. Read the [development guidelines](docs/development/README.md)
2. Check existing issues and pull requests
3. Follow the code style guide
4. Write tests for new features

### Pull Request Process
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests and documentation
5. Ensure all tests pass
6. Submit a pull request

### Code Review Checklist
- [ ] Code follows style guidelines
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No breaking changes (or properly documented)
- [ ] Performance impact is considered

## 📄 License Information

**Proprietary License**

© 2024 English Korat Language School. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or modification is strictly prohibited.

**Contact Information:**
- Email: admin@englishkorat.com
- Phone: +66 44-123456
- Address: The Mall Korat, Nakhon Ratchasima, Thailand

---

## 🚀 Quick Start Commands

```bash
# Complete setup
npm install 

# Start production
./start-dev.ps1
```

For detailed documentation, see the [docs/](docs/) directory.