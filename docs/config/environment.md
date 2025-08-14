# Environment Configuration

Comprehensive guide for configuring the English Korat Language School Management System across different environments.

## 📋 Overview

The system supports multiple environments with different configurations for development, staging, and production deployments.

## 🔧 Environment Variables

### Database Configuration
```env
# Database Connection
DB_CLIENT=mysql2                    # Database client (mysql2 recommended)
DB_HOST=127.0.0.1                  # Database host
DB_PORT=3307                       # Database port
DB_USER=admin                      # Database username
DB_PASSWORD=adminEKLS1234          # Database password
DB_NAME=englishkorat               # Database name
DB_SSL=false                       # Enable SSL connection (true/false)

# Connection Pool Settings
DB_POOL_MIN=2                      # Minimum connections in pool
DB_POOL_MAX=10                     # Maximum connections in pool
DB_POOL_ACQUIRE_TIMEOUT=60000      # Connection acquire timeout (ms)
DB_POOL_IDLE_TIMEOUT=30000         # Idle connection timeout (ms)
```

### JWT Configuration
```env
# JWT Settings
JWT_SECRET=your-super-secret-jwt-key-here    # JWT signing secret (min 32 chars)
JWT_EXPIRES_IN=24h                           # Token expiration time
JWT_REFRESH_EXPIRES_IN=7d                    # Refresh token expiration
JWT_ISSUER=englishkorat-api                  # Token issuer
JWT_AUDIENCE=englishkorat-users              # Token audience
```

### Server Configuration
```env
# Server Settings
NODE_ENV=development               # Environment (development/staging/production)
PORT=3000                         # Server port
HOST=localhost                    # Server host
API_VERSION=v1                    # API version prefix

# CORS Settings
CORS_ORIGIN=http://localhost:3000  # Allowed origins (comma-separated)
CORS_METHODS=GET,POST,PUT,DELETE   # Allowed HTTP methods
CORS_CREDENTIALS=true              # Allow credentials in CORS
```

### Security Configuration
```env
# Security Settings
BCRYPT_ROUNDS=12                   # Password hashing rounds
SESSION_SECRET=your-session-secret # Session signing secret
RATE_LIMIT_WINDOW=900000          # Rate limit window (15 minutes)
RATE_LIMIT_MAX=100                # Max requests per window
HELMET_ENABLED=true               # Enable Helmet security headers
```

### Redis Configuration (Optional)
```env
# Redis Settings
REDIS_ENABLED=false               # Enable Redis for caching
REDIS_HOST=127.0.0.1             # Redis host
REDIS_PORT=6379                  # Redis port
REDIS_PASSWORD=                  # Redis password (if required)
REDIS_DB=0                       # Redis database number
REDIS_TTL=3600                   # Default TTL for cached items (seconds)
```

### File Upload Configuration
```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=englishkorat-files
AWS_S3_ACL=private               # S3 file ACL (private/public-read)

# Local File Storage (alternative to S3)
UPLOAD_ENABLED=true              # Enable file uploads
UPLOAD_DEST=uploads/             # Upload destination directory
UPLOAD_MAX_SIZE=10485760         # Max file size in bytes (10MB)
UPLOAD_ALLOWED_TYPES=jpg,jpeg,png,pdf,doc,docx
```

### Email Configuration
```env
# Email Settings (optional)
MAIL_ENABLED=false               # Enable email notifications
MAIL_HOST=smtp.gmail.com         # SMTP host
MAIL_PORT=587                    # SMTP port
MAIL_SECURE=false                # Use TLS (true/false)
MAIL_USER=your-email@gmail.com   # SMTP username
MAIL_PASS=your-app-password      # SMTP password
MAIL_FROM=noreply@englishkorat.com # Default sender address
```

### Logging Configuration
```env
# Logging Settings
LOG_LEVEL=info                   # Log level (error/warn/info/debug)
LOG_FILE=logs/app.log           # Log file path
LOG_MAX_SIZE=20m                # Max log file size
LOG_MAX_FILES=14                # Max number of log files to keep
LOG_DATE_PATTERN=YYYY-MM-DD     # Log file date pattern
```

## 🌍 Environment-Specific Configurations

### Development Environment
```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_NAME=englishkorat_dev
JWT_EXPIRES_IN=24h
LOG_LEVEL=debug
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
RATE_LIMIT_MAX=1000
```

### Staging Environment
```env
NODE_ENV=staging
PORT=3000
DB_HOST=staging-db.englishkorat.com
DB_NAME=englishkorat_staging
JWT_EXPIRES_IN=12h
LOG_LEVEL=info
CORS_ORIGIN=https://staging.englishkorat.com
RATE_LIMIT_MAX=500
HELMET_ENABLED=true
```

### Production Environment
```env
NODE_ENV=production
PORT=3000
DB_HOST=prod-db.englishkorat.com
DB_NAME=englishkorat_production
JWT_EXPIRES_IN=8h
LOG_LEVEL=warn
CORS_ORIGIN=https://api.englishkorat.com
RATE_LIMIT_MAX=100
HELMET_ENABLED=true
DB_SSL=true
REDIS_ENABLED=true
```

## 🔐 Security Best Practices

### JWT Secret Generation
```bash
# Generate secure JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter  
- At least one number
- Special characters recommended

### Environment File Security
```bash
# Set proper permissions on .env file
chmod 600 .env

# Never commit .env to version control
echo ".env" >> .gitignore
```

## 🔄 Configuration Validation

The system validates all configuration on startup:

```javascript
// Example validation
const requiredEnvVars = [
  'DB_HOST',
  'DB_USER', 
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});
```

## 📊 Performance Tuning

### Database Optimization
```env
# Optimize for high-load environments
DB_POOL_MIN=5
DB_POOL_MAX=20
DB_POOL_ACQUIRE_TIMEOUT=30000
DB_POOL_IDLE_TIMEOUT=10000
```

### Redis Optimization
```env
# Redis performance settings
REDIS_POOL_MIN=2
REDIS_POOL_MAX=10
REDIS_CONNECT_TIMEOUT=10000
REDIS_COMMAND_TIMEOUT=5000
```

### Rate Limiting Tuning
```env
# Adjust based on expected load
RATE_LIMIT_WINDOW=900000    # 15 minutes
RATE_LIMIT_MAX=1000         # Per user
RATE_LIMIT_GLOBAL=10000     # Global limit
```

## 🔍 Debugging Configuration

### Development Debugging
```env
DEBUG=true
LOG_LEVEL=debug
LOG_SQL_QUERIES=true
ENABLE_PLAYGROUND=true
```

### Performance Monitoring
```env
METRICS_ENABLED=true
METRICS_PORT=9090
HEALTH_CHECK_ENABLED=true
RESPONSE_TIME_TRACKING=true
```

## 📝 Configuration Examples

### Docker Environment
```env
# Docker-specific settings
DB_HOST=mysql_container
REDIS_HOST=redis_container
NODE_ENV=production
PORT=3000
```

### Kubernetes Environment
```env
# K8s ConfigMap and Secret references
DB_HOST=${DB_SERVICE_HOST}
DB_PASSWORD=${DB_PASSWORD_SECRET}
JWT_SECRET=${JWT_SECRET_FROM_SECRET}
```

## ⚠️ Common Configuration Issues

### Database Connection Issues
```bash
# Test database connection
npm run test:db

# Check database credentials
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME
```

### JWT Token Issues
```bash
# Verify JWT secret length
node -e "console.log(process.env.JWT_SECRET?.length || 'JWT_SECRET not set')"
```

### File Upload Issues
```bash
# Check upload directory permissions
ls -la uploads/
chmod 755 uploads/
```

## 🔧 Environment Management Tools

### Using dotenv-cli
```bash
npm install -g dotenv-cli

# Run with specific environment
dotenv -e .env.staging npm start
```

### Environment Validation Script
```javascript
// scripts/validate-env.js
const requiredVars = require('./required-env.json');
const errors = [];

requiredVars.forEach(varName => {
  if (!process.env[varName]) {
    errors.push(`Missing: ${varName}`);
  }
});

if (errors.length > 0) {
  console.error('Environment validation failed:');
  errors.forEach(error => console.error(error));
  process.exit(1);
}

console.log('Environment validation passed');
```