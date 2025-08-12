// Mock database for testing
jest.mock('../config/database', () => ({
  db: {
    transaction: jest.fn(),
    raw: jest.fn().mockResolvedValue([]),
  },
  ping: jest.fn().mockResolvedValue(true)
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.DB_NAME = 'test_db';