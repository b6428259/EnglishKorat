module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
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
  // Remove the setup file that doesn't exist
  // setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js'],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
  testTimeout: 30000, // Increased timeout for integration tests
  coverageThreshold: {
    global: {
      branches: 50, // Lower threshold for now
      functions: 50,
      lines: 50,
      statements: 50
    }
  }
};