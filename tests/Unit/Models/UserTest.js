/**
 * Unit Tests for User Model
 * Tests the User model functionality including validation, relationships, and methods
 */

const User = require('../../../models/User');
const bcrypt = require('bcryptjs');

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