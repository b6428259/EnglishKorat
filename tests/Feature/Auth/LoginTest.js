/**
 * Feature Tests for Authentication API
 * Tests complete authentication workflows including registration, login, and authorization
 */

const request = require('supertest');
const app = require('../../../app');

describe('Authentication API', () => {
  describe('POST /api/v1/auth/register', () => {
    test('should register a new student successfully', async () => {
      const userData = {
        username: 'newstudent',
        password: 'password123',
        email: 'student@test.com',
        phone: '+66812345678',
        role: 'student',
        branch_id: 1,
        profile: {
          first_name: 'John',
          last_name: 'Doe',
          birth_date: '1995-06-15',
          gender: 'male'
        }
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.username).toBe('newstudent');
      expect(response.body.data.user.email).toBe('student@test.com');
      expect(response.body.data.user.role).toBe('student');
      expect(response.body.data.user).not.toHaveProperty('password');
      expect(response.body.data).toHaveProperty('token');
    });

    test('should register a new teacher successfully', async () => {
      const teacherData = {
        username: 'newteacher',
        password: 'teacher123',
        email: 'teacher@test.com',
        phone: '+66812345679',
        role: 'teacher',
        branch_id: 1,
        profile: {
          first_name: 'Jane',
          last_name: 'Smith',
          birth_date: '1988-03-20',
          gender: 'female'
        },
        teacher_info: {
          hourly_rate: 500,
          max_students_per_class: 8,
          specializations: ['IELTS', 'Conversation']
        }
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(teacherData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('teacher');
      expect(response.body.data.user.username).toBe('newteacher');
    });

    test('should fail registration with duplicate username', async () => {
      const userData = {
        username: 'admin', // Existing username from seed data
        password: 'password123',
        email: 'unique@test.com',
        role: 'student',
        branch_id: 1
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_007');
      expect(response.body.message).toContain('Username already exists');
    });

    test('should fail registration with invalid email', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
        email: 'invalid-email',
        role: 'student',
        branch_id: 1
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: expect.stringContaining('Invalid email format')
          })
        ])
      );
    });

    test('should fail registration with weak password', async () => {
      const userData = {
        username: 'testuser',
        password: '123',
        email: 'test@example.com',
        role: 'student',
        branch_id: 1
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_006');
    });

    test('should fail registration with invalid role', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
        role: 'superuser',
        branch_id: 1
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'role',
            message: expect.stringContaining('Invalid role')
          })
        ])
      );
    });
  });

  describe('POST /api/v1/auth/login', () => {
    test('should login admin user successfully', async () => {
      const loginData = {
        username: 'admin',
        password: 'admin123'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.username).toBe('admin');
      expect(response.body.data.user.role).toBe('admin');
      expect(response.body.data.user).not.toHaveProperty('password');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('expires_in');
      expect(response.body.data.user).toHaveProperty('permissions');
    });

    test('should login owner user successfully', async () => {
      const loginData = {
        username: 'owner',
        password: 'admin123'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('owner');
      expect(response.body.data.user.permissions).toContain('system.admin');
    });

    test('should fail login with incorrect password', async () => {
      const loginData = {
        username: 'admin',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_001');
      expect(response.body.message).toContain('Invalid username or password');
    });

    test('should fail login with non-existent username', async () => {
      const loginData = {
        username: 'nonexistent',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_001');
    });

    test('should fail login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'username' }),
          expect.objectContaining({ field: 'password' })
        ])
      );
    });
  });

  describe('GET /api/v1/auth/profile', () => {
    let adminToken;

    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'admin123' });
      
      adminToken = loginResponse.body.data.token;
    });

    test('should get user profile successfully with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user).toHaveProperty('username');
      expect(response.body.data.user).toHaveProperty('email');
      expect(response.body.data.user).toHaveProperty('role');
      expect(response.body.data.user).toHaveProperty('branch');
      expect(response.body.data.user).toHaveProperty('permissions');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    test('should fail to get profile without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_004');
    });

    test('should fail to get profile with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_004');
    });

    test('should fail to get profile with expired token', async () => {
      // This would require a token with very short expiry time
      // Implementation depends on test setup
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired.token';
      
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_003');
    });
  });

  describe('PUT /api/v1/auth/profile', () => {
    let adminToken;

    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'admin123' });
      
      adminToken = loginResponse.body.data.token;
    });

    test('should update profile successfully', async () => {
      const updateData = {
        email: 'admin_updated@englishkorat.com',
        phone: '+66812345679',
        profile: {
          first_name: 'Updated',
          last_name: 'Admin',
          address: 'Updated Address'
        }
      };

      const response = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('admin_updated@englishkorat.com');
      expect(response.body.data.user.phone).toBe('+66812345679');
    });

    test('should fail to update profile with invalid email', async () => {
      const updateData = {
        email: 'invalid-email-format'
      };

      const response = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: expect.stringContaining('Invalid email format')
          })
        ])
      );
    });
  });

  describe('PUT /api/v1/auth/change-password', () => {
    let adminToken;

    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'admin123' });
      
      adminToken = loginResponse.body.data.token;
    });

    test('should change password successfully', async () => {
      const passwordData = {
        current_password: 'admin123',
        new_password: 'newpassword123',
        confirm_password: 'newpassword123'
      };

      const response = await request(app)
        .put('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(passwordData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Password changed successfully');
    });

    test('should fail to change password with incorrect current password', async () => {
      const passwordData = {
        current_password: 'wrongpassword',
        new_password: 'newpassword123',
        confirm_password: 'newpassword123'
      };

      const response = await request(app)
        .put('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(passwordData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Current password is incorrect');
    });

    test('should fail to change password when confirmation does not match', async () => {
      const passwordData = {
        current_password: 'admin123',
        new_password: 'newpassword123',
        confirm_password: 'differentpassword'
      };

      const response = await request(app)
        .put('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(passwordData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Password confirmation does not match');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let adminToken;

    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'admin123' });
      
      adminToken = loginResponse.body.data.token;
    });

    test('should refresh token successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('expires_in');
      expect(response.body.data.token).not.toBe(adminToken); // New token should be different
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let adminToken;

    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'admin123' });
      
      adminToken = loginResponse.body.data.token;
    });

    test('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logout successful');
    });

    test('should invalidate token after logout', async () => {
      // First logout
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Then try to use the token - should fail
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});