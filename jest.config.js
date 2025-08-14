module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/src/tests/**/*.js', // Original tests
    '**/tests/**/*.test.js',
    '**/tests/**/*Test.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/tests/**',
    '!src/database/**',
    '!src/app.js',
    '!**/node_modules/**'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js'],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
  testTimeout: 30000, // Increased timeout for integration tests
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/tests/**',
    '!src/database/migrations/**',
    '!src/database/seeds/**',
    '!src/app.js',
    '!src/server.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};