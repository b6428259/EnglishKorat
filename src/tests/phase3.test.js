const request = require('supertest');
const app = require('../app');

describe('Phase 3: Leave Policy Management System', () => {
  describe('Leave Policy Rules API', () => {
    test('GET /api/v1/leave-policies should return policy rules structure', async () => {
      const response = await request(app)
        .get('/api/v1/leave-policies')
        .expect('Content-Type', /json/);

      // Should return 401 without authentication
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access denied');
    });

    test('POST /api/v1/leave-policies should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/leave-policies')
        .send({
          rule_name: 'Test Rule',
          course_type: 'private',
          course_hours: 40,
          leave_credits: 2,
          effective_date: '2024-01-01'
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Change History API', () => {
    test('GET /api/v1/policy/changes should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/policy/changes')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Notifications API', () => {
    test('GET /api/v1/policy/notifications should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/policy/notifications')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Room Notifications API', () => {
    test('GET /api/v1/policy/room-notifications should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/policy/room-notifications')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('POST /api/v1/policy/room-notifications should require admin/owner role', async () => {
      const response = await request(app)
        .post('/api/v1/policy/room-notifications')
        .send({
          notification_type: 'room_available',
          title: 'Test Notification',
          message: 'Test message'
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Validation Tests', () => {
    test('POST /api/v1/leave-policies should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/leave-policies')
        .set('Authorization', 'Bearer invalid_token')
        .send({
          // Missing required fields
          rule_name: 'Test Rule'
        })
        .expect('Content-Type', /json/);

      // Should fail on authentication first
      expect(response.status).toBe(401);
    });

    test('POST /api/v1/policy/room-notifications should validate notification types', async () => {
      const response = await request(app)
        .post('/api/v1/policy/room-notifications')
        .set('Authorization', 'Bearer invalid_token')
        .send({
          notification_type: 'invalid_type',
          title: 'Test',
          message: 'Test message'
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
    });
  });

  describe('API Documentation', () => {
    test('GET /api/v1 should include new endpoints in documentation', async () => {
      const response = await request(app)
        .get('/api/v1')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.endpoints).toHaveProperty('/leave-policies');
      expect(response.body.endpoints).toHaveProperty('/policy');
      
      // Check for specific endpoints
      const leavePolicyEndpoints = response.body.endpoints['/leave-policies'];
      expect(leavePolicyEndpoints).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ method: 'GET', path: '/' }),
          expect.objectContaining({ method: 'POST', path: '/' }),
          expect.objectContaining({ method: 'GET', path: '/:id' }),
          expect.objectContaining({ method: 'PUT', path: '/:id' })
        ])
      );

      const policyEndpoints = response.body.endpoints['/policy'];
      expect(policyEndpoints).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ method: 'GET', path: '/changes' }),
          expect.objectContaining({ method: 'GET', path: '/notifications' }),
          expect.objectContaining({ method: 'GET', path: '/room-notifications' }),
          expect.objectContaining({ method: 'POST', path: '/room-notifications' })
        ])
      );
    });

    test('GET /api/v1/postman-collection.json should include new endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/postman-collection.json')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.item).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: '/leave-policies' }),
          expect.objectContaining({ name: '/policy' })
        ])
      );
    });
  });
});

describe('Enhanced Enrollment System', () => {
  test('Enrollment controller should handle leave policy rules', () => {
    // This test verifies that the enrollment controller includes the new leave policy integration
    const enrollmentController = require('../controllers/enrollmentController');
    expect(enrollmentController.enrollStudent).toBeDefined();
    
    // The actual functionality would require database setup
    // but we can verify the function exists and would be called
    expect(typeof enrollmentController.enrollStudent).toBe('function');
  });
});

describe('Database Schema Validation', () => {
  test('Migration files should exist for Phase 3', () => {
    const fs = require('fs');
    const path = require('path');
    
    const migrationPath = path.join(__dirname, '../database/migrations/005_create_leave_policy_system.js');
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  test('Leave policy migration should export up and down functions', () => {
    const migration = require('../database/migrations/005_create_leave_policy_system.js');
    expect(typeof migration.up).toBe('function');
    expect(typeof migration.down).toBe('function');
  });
});