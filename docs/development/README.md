# Development Guidelines

Comprehensive development guidelines and best practices for the English Korat Language School Management System.

## 🎯 Development Philosophy

Our development approach prioritizes:
- **Code Quality**: Maintainable, testable, and well-documented code
- **Security First**: Secure by default with proper authentication and authorization
- **Performance**: Efficient database queries and optimized API responses
- **User Experience**: Intuitive APIs with consistent response formats
- **Team Collaboration**: Clear workflows and code review processes

## 🏗️ Code Standards

### JavaScript/Node.js Standards

#### Code Style
- Follow **ESLint** configuration (based on Standard JS)
- Use **Prettier** for code formatting
- Use **JSDoc** comments for function documentation
- Prefer `const` over `let`, avoid `var`
- Use descriptive variable and function names

```javascript
// Good
const getUsersByBranch = async (branchId, options = {}) => {
  const { page = 1, limit = 20, search = '' } = options;
  // Implementation
};

// Bad
const getUsers = async (id, opts) => {
  // Implementation
};
```

#### Error Handling
```javascript
// Good - Consistent error handling
try {
  const user = await userService.createUser(userData);
  return res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: { user }
  });
} catch (error) {
  logger.error('User creation failed:', error);
  return res.status(400).json({
    success: false,
    message: error.message,
    error: {
      code: 'USER_CREATION_FAILED',
      details: error.details || []
    }
  });
}
```

#### Database Queries
```javascript
// Good - Use query builder and avoid SQL injection
const users = await knex('users')
  .where('branch_id', branchId)
  .where('status', 'active')
  .orderBy('created_at', 'desc')
  .limit(limit)
  .offset((page - 1) * limit);

// Bad - Direct SQL queries
const users = await knex.raw(`SELECT * FROM users WHERE branch_id = ${branchId}`);
```

### API Design Standards

#### RESTful Conventions
```http
# Resource naming (plural nouns)
GET    /api/v1/users           # List users
POST   /api/v1/users           # Create user
GET    /api/v1/users/:id       # Get specific user
PUT    /api/v1/users/:id       # Update user
DELETE /api/v1/users/:id       # Delete user

# Nested resources
GET    /api/v1/courses/:id/groups
POST   /api/v1/courses/:id/groups
```

#### Response Format
```javascript
// Success Response
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

// Error Response
{
  "success": false,
  "message": "Validation failed",
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

#### HTTP Status Codes
- `200` - OK (successful GET, PUT)
- `201` - Created (successful POST)
- `204` - No Content (successful DELETE)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `422` - Unprocessable Entity (business logic errors)
- `500` - Internal Server Error (server errors)

## 🧪 Testing Guidelines

### Test Structure
```
tests/
├── Unit/           # Isolated unit tests
│   ├── Models/     # Model validation and methods
│   ├── Services/   # Business logic services
│   └── Helpers/    # Utility functions
├── Feature/        # End-to-end API tests
│   ├── Auth/       # Authentication workflows
│   ├── Course/     # Course management
│   └── Leave/      # Leave system
├── Integration/    # Cross-system integration
│   ├── Database/   # Database operations
│   └── External/   # External service integration
├── Performance/    # Performance and load tests
└── Security/       # Security vulnerability tests
```

### Writing Good Tests
```javascript
// Good test structure
describe('User Authentication', () => {
  describe('POST /api/v1/auth/login', () => {
    test('should login with valid credentials', async () => {
      // Arrange
      const credentials = {
        username: 'testuser',
        password: 'password123'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(credentials);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
    });

    test('should fail with invalid credentials', async () => {
      // Test implementation
    });
  });
});
```

### Test Coverage Goals
- **Unit Tests**: 90%+ coverage for models and services
- **Feature Tests**: Cover all API endpoints
- **Integration Tests**: Test database operations and external integrations
- **Performance Tests**: Ensure response times under 200ms for most endpoints

## 🗄️ Database Guidelines

### Migration Standards
```javascript
// Good migration structure
exports.up = async function(knex) {
  return knex.schema.createTable('table_name', table => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.integer('branch_id').unsigned().references('branches.id');
    table.enum('status', ['active', 'inactive']).defaultTo('active');
    table.timestamps(true, true);
    
    // Indexes
    table.index(['branch_id', 'status']);
    table.index('name');
  });
};

exports.down = async function(knex) {
  return knex.schema.dropTable('table_name');
};
```

### Query Optimization
```javascript
// Good - Use proper indexing
const users = await knex('users')
  .select('id', 'username', 'email', 'role') // Select only needed fields
  .where('branch_id', branchId)             // Indexed field first
  .where('status', 'active')                // Additional filters
  .orderBy('created_at', 'desc')
  .limit(20);

// Good - Use joins instead of multiple queries
const usersWithProfiles = await knex('users')
  .join('user_profiles', 'users.id', 'user_profiles.user_id')
  .select('users.*', 'user_profiles.first_name', 'user_profiles.last_name')
  .where('users.branch_id', branchId);
```

## 🔒 Security Guidelines

### Authentication & Authorization
```javascript
// Good - Middleware for route protection
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: { code: 'AUTH_004' }
    });
  }
};

// Good - Role-based access control
const requireRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions',
      error: { code: 'AUTH_005' }
    });
  }
  next();
};
```

### Input Validation
```javascript
// Good - Use validation middleware
const { body, validationResult } = require('express-validator');

const validateUserCreation = [
  body('username').isLength({ min: 3, max: 50 }).isAlphanumeric(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('role').isIn(['student', 'teacher', 'admin', 'owner']),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: {
          code: 'VALIDATION_ERROR',
          details: errors.array()
        }
      });
    }
    next();
  }
];
```

## 🌊 Git Workflow

### Branch Strategy
```
main                    # Production-ready code
├── develop            # Integration branch
├── feature/user-auth  # Feature branches
├── feature/course-mgmt
├── hotfix/security-fix # Hotfix branches
└── release/v1.2.0     # Release branches
```

### Commit Messages
```bash
# Good commit messages
feat: add user authentication with JWT
fix: resolve database connection timeout issue
docs: update API documentation for course endpoints
test: add unit tests for user model validation
refactor: optimize database queries in user service
style: format code according to ESLint rules

# Include issue numbers
feat: add leave policy management (#123)
fix: resolve enrollment calculation bug (#456)
```

### Pull Request Process
1. **Create Feature Branch**: Branch from `develop`
2. **Implement Changes**: Follow coding standards
3. **Write Tests**: Ensure adequate test coverage
4. **Update Documentation**: Keep docs up-to-date
5. **Submit PR**: Include description and test results
6. **Code Review**: Address reviewer feedback
7. **Merge**: Squash and merge to `develop`

## 📝 Documentation Standards

### Code Documentation
```javascript
/**
 * Creates a new user account with the specified role and branch assignment
 * @param {Object} userData - User data object
 * @param {string} userData.username - Unique username (3-50 chars)
 * @param {string} userData.email - Valid email address
 * @param {string} userData.password - Password (min 8 chars)
 * @param {string} userData.role - User role (student/teacher/admin/owner)
 * @param {number} userData.branch_id - Branch ID for assignment
 * @returns {Promise<Object>} Created user object with generated ID
 * @throws {ValidationError} When user data is invalid
 * @throws {DuplicateError} When username or email already exists
 */
const createUser = async (userData) => {
  // Implementation
};
```

### API Documentation
- Use clear endpoint descriptions
- Include request/response examples
- Document all parameters and fields
- Provide error code references
- Include authentication requirements

## 🚀 Performance Best Practices

### Database Performance
- Use proper indexing on frequently queried fields
- Implement connection pooling
- Use pagination for large datasets
- Optimize N+1 query problems with joins
- Monitor slow queries and optimize them

### API Performance
- Implement response caching where appropriate
- Use compression middleware
- Minimize payload sizes
- Implement rate limiting
- Monitor response times

### Memory Management
- Avoid memory leaks in event listeners
- Use streams for large file operations
- Implement proper error handling
- Monitor memory usage in production

## 🔧 Development Tools

### Recommended VS Code Extensions
- ESLint
- Prettier
- REST Client
- GitLens
- Thunder Client (API testing)
- Auto Rename Tag
- Bracket Pair Colorizer

### NPM Scripts
```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest --runInBand",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "migrate": "knex migrate:latest",
    "migrate:rollback": "knex migrate:rollback",
    "seed": "knex seed:run"
  }
}
```

## 📊 Code Review Checklist

### Functionality
- [ ] Code meets the requirements
- [ ] Edge cases are handled
- [ ] Error handling is appropriate
- [ ] Business logic is correct

### Code Quality
- [ ] Code is readable and well-structured
- [ ] Functions are appropriately sized
- [ ] Variable names are descriptive
- [ ] No code duplication

### Testing
- [ ] Unit tests are included
- [ ] Tests cover edge cases
- [ ] All tests pass
- [ ] Coverage meets standards

### Security
- [ ] Input validation is implemented
- [ ] SQL injection prevention
- [ ] Authentication/authorization checks
- [ ] Sensitive data protection

### Performance
- [ ] Database queries are optimized
- [ ] No N+1 query problems
- [ ] Appropriate indexing
- [ ] Response times are acceptable

### Documentation
- [ ] Code is documented
- [ ] API documentation updated
- [ ] README updated if needed
- [ ] Change log updated