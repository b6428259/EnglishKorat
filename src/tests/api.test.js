const request = require('supertest');
const app = require('../app');

describe('API Health Check', () => {
  test('GET /health should return 200', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.body.status).toBe('OK');
  });
});

describe('API Routes Index', () => {
  test('GET /api/v1 should return API information', async () => {
    const response = await request(app)
      .get('/api/v1')
      .expect(200);
    
    expect(response.body.message).toContain('English Korat');
    expect(response.body.endpoints).toBeDefined();
  });
});

describe('Authentication Routes', () => {
  test('POST /api/v1/auth/login should require username and password', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({})
      .expect(400);
    
    expect(response.body.success).toBe(false);
    expect(response.body.errors).toBeDefined();
  });
});

describe('Protected Routes', () => {
  test('GET /api/v1/students should require authentication', async () => {
    const response = await request(app)
      .get('/api/v1/students')
      .expect(401);
    
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('token');
  });

  test('GET /api/v1/courses should require authentication', async () => {
    const response = await request(app)
      .get('/api/v1/courses')
      .expect(401);
    
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('token');
  });
});