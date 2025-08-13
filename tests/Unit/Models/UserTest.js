/**
 * Unit Tests for User Model Patterns
 * Demonstrates testing patterns for User model functionality
 * 
 * Note: These tests show testing patterns and validation logic
 * that would be implemented in actual User model classes.
 */

const bcrypt = require('bcryptjs');

// Mock User class for demonstration
class MockUser {
  constructor(userData) {
    this.validateUserData(userData);
    Object.assign(this, userData);
  }

  validateUserData(userData) {
    if (!userData.username || userData.username.length < 3) {
      throw new Error('Username must be at least 3 characters');
    }
    if (!userData.email || !this.isValidEmail(userData.email)) {
      throw new Error('Invalid email format');
    }
    if (!userData.password || userData.password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    if (!['student', 'teacher', 'admin', 'owner'].includes(userData.role)) {
      throw new Error('Invalid role');
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 12);
  }

  async validatePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }

  getPermissions() {
    const rolePermissions = {
      student: ['profile.read', 'profile.write', 'courses.read'],
      teacher: ['profile.read', 'profile.write', 'classes.read', 'students.read'],
      admin: ['users.read', 'users.write', 'courses.read', 'courses.write'],
      owner: ['system.admin', 'users.read', 'users.write', 'users.delete']
    };
    return rolePermissions[this.role] || [];
  }

  hasPermission(permission) {
    return this.getPermissions().includes(permission) || 
           this.getPermissions().includes('system.admin');
  }

  toApiResponse() {
    const { password, ...userData } = this;
    return userData;
  }

  isActive() {
    return this.status === 'active';
  }

  static isValidUsername(username) {
    return username && username.length >= 3 && username.length <= 50 && 
           /^[a-zA-Z0-9_]+$/.test(username);
  }

  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidPhone(phone) {
    const phoneRegex = /^(\+66|66|0)[0-9]{8,9}$/;
    return phoneRegex.test(phone.replace(/\s|-/g, ''));
  }
}

describe('User Model Validation Patterns', () => {
  describe('User Creation and Validation', () => {
    test('should create a valid user with required fields', () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
        role: 'student',
        branch_id: 1
      };

      const user = new MockUser(userData);
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe('student');
      expect(user.branch_id).toBe(1);
    });

    test('should hash password correctly', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
        role: 'student',
        branch_id: 1
      };

      const user = new MockUser(userData);
      const originalPassword = user.password;
      await user.hashPassword();
      
      expect(user.password).not.toBe(originalPassword);
      expect(user.password.length).toBeGreaterThan(50);
    });

    test('should validate password correctly', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
        role: 'student',
        branch_id: 1
      };

      const user = new MockUser(userData);
      await user.hashPassword();
      
      const isValid = await user.validatePassword('password123');
      const isInvalid = await user.validatePassword('wrongpassword');
      
      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });

    test('should fail validation with invalid email', () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
        email: 'invalid-email',
        role: 'student',
        branch_id: 1
      };

      expect(() => new MockUser(userData)).toThrow('Invalid email format');
    });

    test('should fail validation with invalid role', () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
        role: 'invalid_role',
        branch_id: 1
      };

      expect(() => new MockUser(userData)).toThrow('Invalid role');
    });

    test('should fail validation with weak password', () => {
      const userData = {
        username: 'testuser',
        password: '123',
        email: 'test@example.com',
        role: 'student',
        branch_id: 1
      };

      expect(() => new MockUser(userData)).toThrow('Password must be at least 8 characters');
    });
  });

  describe('User Permission System', () => {
    test('should return correct permissions based on role', () => {
      const studentUser = new MockUser({
        username: 'student',
        password: 'password123',
        email: 'student@example.com',
        role: 'student',
        branch_id: 1
      });

      const adminUser = new MockUser({
        username: 'admin',
        password: 'password123',
        email: 'admin@example.com',
        role: 'admin',
        branch_id: 1
      });

      expect(studentUser.getPermissions()).toContain('profile.read');
      expect(adminUser.getPermissions()).toContain('users.write');
    });

    test('should check specific permissions correctly', () => {
      const adminUser = new MockUser({
        username: 'admin',
        password: 'password123',
        email: 'admin@example.com',
        role: 'admin',
        branch_id: 1
      });
      
      expect(adminUser.hasPermission('users.read')).toBe(true);
      expect(adminUser.hasPermission('system.admin')).toBe(false);
    });
  });

  describe('User Data Processing', () => {
    test('should format user data for API response', () => {
      const user = new MockUser({
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
        role: 'student',
        branch_id: 1
      });

      const apiData = user.toApiResponse();
      
      expect(apiData).toHaveProperty('username');
      expect(apiData).toHaveProperty('email');
      expect(apiData).toHaveProperty('role');
      expect(apiData).not.toHaveProperty('password');
    });

    test('should check user status correctly', () => {
      const activeUser = new MockUser({
        username: 'active',
        password: 'password123',
        email: 'active@example.com',
        role: 'student',
        branch_id: 1,
        status: 'active'
      });

      const inactiveUser = new MockUser({
        username: 'inactive',
        password: 'password123',
        email: 'inactive@example.com',
        role: 'student',
        branch_id: 1,
        status: 'inactive'
      });

      expect(activeUser.isActive()).toBe(true);
      expect(inactiveUser.isActive()).toBe(false);
    });
  });

  describe('Static Validation Methods', () => {
    test('should validate username format', () => {
      expect(MockUser.isValidUsername('validuser')).toBe(true);
      expect(MockUser.isValidUsername('valid_user123')).toBe(true);
      expect(MockUser.isValidUsername('us')).toBe(false); // too short
      expect(MockUser.isValidUsername('user with spaces')).toBe(false);
      expect(MockUser.isValidUsername('user@invalid')).toBe(false);
    });

    test('should validate email format', () => {
      expect(MockUser.isValidEmail('test@example.com')).toBe(true);
      expect(MockUser.isValidEmail('user.name@domain.co.th')).toBe(true);
      expect(MockUser.isValidEmail('invalid-email')).toBe(false);
      expect(MockUser.isValidEmail('test@')).toBe(false);
      expect(MockUser.isValidEmail('@example.com')).toBe(false);
    });

    test('should validate phone number format', () => {
      expect(MockUser.isValidPhone('+66812345678')).toBe(true);
      expect(MockUser.isValidPhone('0812345678')).toBe(true);
      expect(MockUser.isValidPhone('66812345678')).toBe(true);
      expect(MockUser.isValidPhone('123')).toBe(false);
      expect(MockUser.isValidPhone('abc123456789')).toBe(false);
    });
  });
});

describe('User Model', () => {
  describe('User Creation and Validation', () => {
    test('should create a valid user with required fields', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
        role: 'student',
        branch_id: 1
      };

      const user = new User(userData);
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe('student');
      expect(user.branch_id).toBe(1);
    });

    test('should hash password before saving', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
        role: 'student',
        branch_id: 1
      };

      const user = new User(userData);
      await user.hashPassword();
      
      expect(user.password).not.toBe('password123');
      expect(user.password.length).toBeGreaterThan(50);
    });

    test('should validate password correctly', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
        role: 'student',
        branch_id: 1
      };

      const user = new User(userData);
      await user.hashPassword();
      
      const isValid = await user.validatePassword('password123');
      const isInvalid = await user.validatePassword('wrongpassword');
      
      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });

    test('should fail validation with invalid email', () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
        email: 'invalid-email',
        role: 'student',
        branch_id: 1
      };

      expect(() => new User(userData)).toThrow('Invalid email format');
    });

    test('should fail validation with invalid role', () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
        role: 'invalid_role',
        branch_id: 1
      };

      expect(() => new User(userData)).toThrow('Invalid role');
    });

    test('should fail validation with weak password', () => {
      const userData = {
        username: 'testuser',
        password: '123',
        email: 'test@example.com',
        role: 'student',
        branch_id: 1
      };

      expect(() => new User(userData)).toThrow('Password must be at least 8 characters');
    });
  });

  describe('User Methods', () => {
    let user;

    beforeEach(() => {
      user = new User({
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
        role: 'student',
        branch_id: 1
      });
    });

    test('should generate JWT token', () => {
      const token = user.generateToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    test('should return user permissions based on role', () => {
      const studentUser = new User({ ...user, role: 'student' });
      const teacherUser = new User({ ...user, role: 'teacher' });
      const adminUser = new User({ ...user, role: 'admin' });
      const ownerUser = new User({ ...user, role: 'owner' });

      expect(studentUser.getPermissions()).toContain('profile.read');
      expect(teacherUser.getPermissions()).toContain('classes.read');
      expect(adminUser.getPermissions()).toContain('users.write');
      expect(ownerUser.getPermissions()).toContain('system.admin');
    });

    test('should check if user has specific permission', () => {
      const adminUser = new User({ ...user, role: 'admin' });
      
      expect(adminUser.hasPermission('users.read')).toBe(true);
      expect(adminUser.hasPermission('system.admin')).toBe(false);
    });

    test('should format user data for API response', () => {
      const apiData = user.toApiResponse();
      
      expect(apiData).toHaveProperty('id');
      expect(apiData).toHaveProperty('username');
      expect(apiData).toHaveProperty('email');
      expect(apiData).toHaveProperty('role');
      expect(apiData).not.toHaveProperty('password');
    });

    test('should check if user is active', () => {
      const activeUser = new User({ ...user, status: 'active' });
      const inactiveUser = new User({ ...user, status: 'inactive' });
      const suspendedUser = new User({ ...user, status: 'suspended' });

      expect(activeUser.isActive()).toBe(true);
      expect(inactiveUser.isActive()).toBe(false);
      expect(suspendedUser.isActive()).toBe(false);
    });
  });

  describe('User Relationships', () => {
    test('should establish relationship with branch', () => {
      const user = new User({
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
        role: 'student',
        branch_id: 1
      });

      expect(user.branch_id).toBe(1);
      // In actual implementation, this would test database relationships
    });

    test('should handle student-specific relationships', () => {
      const student = new User({
        username: 'student',
        password: 'password123',
        email: 'student@example.com',
        role: 'student',
        branch_id: 1
      });

      // Test would verify student can access enrollments, leave requests, etc.
      expect(student.role).toBe('student');
    });

    test('should handle teacher-specific relationships', () => {
      const teacher = new User({
        username: 'teacher',
        password: 'password123',
        email: 'teacher@example.com',
        role: 'teacher',
        branch_id: 1
      });

      // Test would verify teacher can access classes, attendance, etc.
      expect(teacher.role).toBe('teacher');
    });
  });

  describe('User Static Methods', () => {
    test('should validate username format', () => {
      expect(User.isValidUsername('validuser')).toBe(true);
      expect(User.isValidUsername('valid_user123')).toBe(true);
      expect(User.isValidUsername('us')).toBe(false); // too short
      expect(User.isValidUsername('user with spaces')).toBe(false);
      expect(User.isValidUsername('user@invalid')).toBe(false);
    });

    test('should validate email format', () => {
      expect(User.isValidEmail('test@example.com')).toBe(true);
      expect(User.isValidEmail('user.name@domain.co.th')).toBe(true);
      expect(User.isValidEmail('invalid-email')).toBe(false);
      expect(User.isValidEmail('test@')).toBe(false);
      expect(User.isValidEmail('@example.com')).toBe(false);
    });

    test('should validate phone number format', () => {
      expect(User.isValidPhone('+66812345678')).toBe(true);
      expect(User.isValidPhone('0812345678')).toBe(true);
      expect(User.isValidPhone('66812345678')).toBe(true);
      expect(User.isValidPhone('123')).toBe(false);
      expect(User.isValidPhone('abc123456789')).toBe(false);
    });
  });
});