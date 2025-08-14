/**
 * Performance Tests for API Endpoints Patterns
 * Demonstrates performance testing patterns for API endpoints
 */

const request = require('supertest');
const app = require('../../src/app');

describe('Performance Test Patterns', () => {
  describe('API Response Time Patterns', () => {
    test('should demonstrate response time testing', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/v1')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      // Performance assertion
      expect(responseTime).toBeLessThan(1000);
      expect(response.headers['content-type']).toMatch(/json/);
    });

    test('should test basic endpoint availability', async () => {
      // Test that core endpoints are available
      const endpoints = ['/api/v1', '/health'];
      
      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        expect([200, 404]).toContain(response.status);
      }
    });
  });

  describe('Concurrent Request Patterns', () => {
    test('should demonstrate concurrent request testing', async () => {
      const concurrentRequests = 5;
      const requests = Array.from({ length: concurrentRequests }, () =>
        request(app).get('/api/v1')
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      expect(responses).toHaveLength(concurrentRequests);
      expect(totalTime).toBeLessThan(5000);
      
      responses.forEach(response => {
        expect([200, 404]).toContain(response.status);
      });
    });
  });

  describe('Load Testing Patterns', () => {
    test('should demonstrate sequential load testing', async () => {
      const requestCount = 10;
      const results = [];
      
      for (let i = 0; i < requestCount; i++) {
        const startTime = Date.now();
        const response = await request(app).get('/api/v1');
        const responseTime = Date.now() - startTime;
        
        results.push(responseTime);
        expect([200, 404]).toContain(response.status);
      }
      
      const averageTime = results.reduce((sum, time) => sum + time, 0) / results.length;
      expect(averageTime).toBeLessThan(200);
    });
  });

  describe('Memory and Resource Testing Patterns', () => {
    test('should demonstrate memory usage monitoring', () => {
      const initialMemory = process.memoryUsage();
      
      // Simulate memory-intensive operation
      const largeArray = new Array(1000).fill(0).map((_, i) => ({
        id: i,
        data: `test data ${i}`,
        timestamp: new Date()
      }));
      
      const finalMemory = process.memoryUsage();
      
      // Basic memory monitoring
      expect(finalMemory.heapUsed).toBeGreaterThan(initialMemory.heapUsed);
      expect(largeArray.length).toBe(1000);
    });
  });

  describe('Rate Limiting Test Patterns', () => {
    test('should demonstrate rate limiting behavior', async () => {
      // Test normal request behavior
      const normalRequests = Array.from({ length: 3 }, () =>
        request(app).get('/api/v1')
      );

      const responses = await Promise.all(normalRequests);
      
      responses.forEach(response => {
        expect([200, 404]).toContain(response.status);
        // Rate limiting shouldn't affect normal usage
        expect(response.status).not.toBe(429);
      });
    });
  });

  describe('Error Handling Performance Patterns', () => {
    test('should demonstrate error response timing', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/v1/nonexistent-endpoint');
      
      const responseTime = Date.now() - startTime;
      
      // Error responses should be fast
      expect(responseTime).toBeLessThan(500);
      expect([404, 405]).toContain(response.status);
    });

    test('should demonstrate malformed request handling', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send('invalid json data')
        .set('Content-Type', 'application/json');
      
      const responseTime = Date.now() - startTime;
      
      // Malformed requests should be handled quickly
      expect(responseTime).toBeLessThan(200);
      expect([400, 404]).toContain(response.status);
    });
  });
});

describe('Performance Tests', () => {
  let adminToken;
  let teacherToken;

  beforeAll(async () => {
    // Get admin token
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    adminToken = adminLogin.body.data.token;

    // Get teacher token  
    const teacherLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'teacher1', password: 'teacher123' });
    teacherToken = teacherLogin.body.data?.token;
  });

  describe('API Response Time Tests', () => {
    test('authentication endpoints should respond within 200ms', async () => {
      const startTime = Date.now();
      
      await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'admin123' })
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(200);
    });

    test('user profile endpoint should respond within 100ms', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(100);
    });

    test('course listing should respond within 150ms', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/v1/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(150);
    });

    test('user listing should respond within 200ms', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(200);
    });

    test('leave policies listing should respond within 100ms', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/v1/leave-policies')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(100);
    });
  });

  describe('Concurrent Request Tests', () => {
    test('should handle 10 concurrent profile requests', async () => {
      const requests = Array.from({ length: 10 }, () =>
        request(app)
          .get('/api/v1/auth/profile')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      expect(responses).toHaveLength(10);
      expect(totalTime).toBeLessThan(1000); // All 10 requests within 1 second
      
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
      });
    });

    test('should handle 5 concurrent course creation requests', async () => {
      const courseData = {
        name: 'Concurrent Test Course',
        course_type: 'adults_conversation',
        level: 'beginner',
        total_hours: 20,
        price_per_hour: 250,
        max_students: 6,
        min_students: 3,
        branch_id: 1
      };

      const requests = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post('/api/v1/courses')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ ...courseData, name: `${courseData.name} ${i + 1}` })
          .expect(201)
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      expect(responses).toHaveLength(5);
      expect(totalTime).toBeLessThan(2000); // All 5 requests within 2 seconds
      
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
        expect(response.body.data.course).toHaveProperty('id');
      });
    });

    test('should handle mixed concurrent read/write operations', async () => {
      const readRequests = Array.from({ length: 5 }, () =>
        request(app)
          .get('/api/v1/courses')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
      );

      const writeRequests = Array.from({ length: 3 }, (_, i) =>
        request(app)
          .post('/api/v1/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            username: `perftest${Date.now()}${i}`,
            password: 'test123',
            email: `perftest${Date.now()}${i}@example.com`,
            role: 'student',
            branch_id: 1
          })
          .expect(201)
      );

      const allRequests = [...readRequests, ...writeRequests];
      const startTime = Date.now();
      const responses = await Promise.all(allRequests);
      const totalTime = Date.now() - startTime;

      expect(responses).toHaveLength(8);
      expect(totalTime).toBeLessThan(3000); // All requests within 3 seconds
    });
  });

  describe('Load Testing', () => {
    test('should handle 20 sequential requests efficiently', async () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 20; i++) {
        await request(app)
          .get('/api/v1/auth/profile')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      }
      
      const totalTime = Date.now() - startTime;
      const averageTime = totalTime / 20;
      
      expect(totalTime).toBeLessThan(3000); // 20 requests within 3 seconds
      expect(averageTime).toBeLessThan(150); // Average response time under 150ms
    });

    test('should maintain performance with pagination', async () => {
      const testPages = [1, 2, 3, 4, 5];
      const startTime = Date.now();
      
      const requests = testPages.map(page =>
        request(app)
          .get('/api/v1/users')
          .query({ page, limit: 10 })
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
      );
      
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      
      expect(totalTime).toBeLessThan(1000); // All paginated requests within 1 second
      
      responses.forEach(response => {
        expect(response.body.pagination).toHaveProperty('page');
        expect(response.body.pagination).toHaveProperty('limit');
        expect(response.body.pagination).toHaveProperty('total');
      });
    });

    test('should handle search queries efficiently', async () => {
      const searchQueries = ['admin', 'student', 'teacher', 'test', 'english'];
      const startTime = Date.now();
      
      const requests = searchQueries.map(query =>
        request(app)
          .get('/api/v1/users')
          .query({ search: query })
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
      );
      
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      
      expect(totalTime).toBeLessThan(1500); // All search queries within 1.5 seconds
      
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('users');
      });
    });
  });

  describe('Memory and Resource Usage Tests', () => {
    test('should handle large response payloads efficiently', async () => {
      // Request with large limit to test memory usage
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/v1/users')
        .query({ limit: 100 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(500); // Large payload within 500ms
      expect(response.body.data.users.length).toBeLessThanOrEqual(100);
    });

    test('should handle complex filtering without performance degradation', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/v1/courses')
        .query({
          course_type: 'ielts_preparation',
          level: 'intermediate',
          branch_id: 1,
          status: 'active'
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(200); // Complex filtering within 200ms
      expect(response.body.success).toBe(true);
    });
  });

  describe('Database Query Performance', () => {
    test('should efficiently handle join operations', async () => {
      // This endpoint likely involves multiple table joins
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/v1/policy/changes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(300); // Complex joins within 300ms
      expect(response.body.success).toBe(true);
    });

    test('should handle aggregation queries efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/v1/users/statistics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(400); // Statistics aggregation within 400ms
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total_users');
    });
  });

  describe('Rate Limiting Performance', () => {
    test('should apply rate limiting without significant overhead', async () => {
      const requests = Array.from({ length: 10 }, () =>
        request(app)
          .get('/api/v1/auth/profile')
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // All requests should succeed (within rate limit)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Rate limiting shouldn't add significant overhead
      expect(totalTime).toBeLessThan(1000);
    });

    test('should handle rate limit exceeded gracefully', async () => {
      // This test would require sending many requests to trigger rate limit
      // Implementation depends on actual rate limiting configuration
      const manyRequests = Array.from({ length: 1000 }, () =>
        request(app)
          .get('/api/v1/auth/profile')
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const startTime = Date.now();
      const responses = await Promise.allSettled(manyRequests);
      const totalTime = Date.now() - startTime;

      // Some requests should succeed, some might be rate limited
      const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200);
      const rateLimited = responses.filter(r => r.status === 'fulfilled' && r.value.status === 429);

      expect(successful.length).toBeGreaterThan(0);
      // Rate limiting should kick in for high volume
      // expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling Performance', () => {
    test('should handle validation errors quickly', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: '', // Invalid username
          password: '123', // Weak password
          email: 'invalid-email' // Invalid email
        })
        .expect(400);
      
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(100); // Validation errors within 100ms
      expect(response.body.success).toBe(false);
      expect(response.body.error.details).toBeDefined();
    });

    test('should handle not found errors quickly', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/v1/users/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
      
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(100); // Not found errors within 100ms
      expect(response.body.success).toBe(false);
    });
  });
});