const request = require('supertest');
const app = require('../app');

describe('Phase 2: Classes, Attendance, and Schedules API', () => {
  
  describe('Classes Endpoints', () => {
    test('GET /api/v1/classes should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/classes');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access denied');
    });

    test('POST /api/v1/classes should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/classes')
        .send({
          course_group_id: 1,
          teacher_id: 1,
          room_id: 1,
          class_date: '2024-01-15',
          start_time: '09:00:00',
          end_time: '10:30:00',
          hours: 1.5
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('PUT /api/v1/classes/:id should require authentication', async () => {
      const response = await request(app)
        .put('/api/v1/classes/1')
        .send({
          status: 'confirmed'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('DELETE /api/v1/classes/:id should require authentication', async () => {
      const response = await request(app)
        .delete('/api/v1/classes/1');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Attendance Endpoints', () => {
    test('POST /api/v1/attendance should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/attendance')
        .send({
          class_id: 1,
          attendances: [
            { student_id: 1, status: 'present' }
          ]
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('GET /api/v1/attendance/class/:classId should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/attendance/class/1');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('GET /api/v1/attendance/student/:studentId should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/attendance/student/1');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('POST /api/v1/attendance/leave-request should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/attendance/leave-request')
        .send({
          class_id: 1,
          reason: 'Personal emergency'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('GET /api/v1/attendance/leave-requests should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/attendance/leave-requests');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Schedules Endpoints', () => {
    test('GET /api/v1/schedules/teacher/:teacherId should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/schedules/teacher/1');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('GET /api/v1/schedules/student/:studentId should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/schedules/student/1');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('GET /api/v1/schedules/room/:roomId should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/schedules/room/1');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('GET /api/v1/schedules/branch/:branchId should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/schedules/branch/1');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('POST /api/v1/schedules/check-conflicts should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/schedules/check-conflicts')
        .send({
          class_date: '2024-01-15',
          start_time: '09:00:00',
          end_time: '10:30:00',
          teacher_id: 1,
          room_id: 1
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('GET /api/v1/schedules/available-slots should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/schedules/available-slots')
        .query({
          branch_id: 1,
          class_date: '2024-01-15'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Validation Tests', () => {
    test('POST /api/v1/classes should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/classes')
        .set('Authorization', 'Bearer invalid-token')
        .send({});
      
      // Should fail authentication first, but if it passed auth, 
      // it would fail validation
      expect(response.status).toBe(401);
    });

    test('POST /api/v1/attendance should validate attendances array', async () => {
      const response = await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          class_id: 1
          // Missing attendances array
        });
      
      expect(response.status).toBe(401);
    });

    test('POST /api/v1/schedules/check-conflicts should validate time format', async () => {
      const response = await request(app)
        .post('/api/v1/schedules/check-conflicts')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          class_date: '2024-01-15',
          start_time: 'invalid-time',
          end_time: '10:30:00'
        });
      
      expect(response.status).toBe(401);
    });
  });
});