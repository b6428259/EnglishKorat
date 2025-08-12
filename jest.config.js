module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/tests/**',
    '!src/database/**',
    '!src/app.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js']
};