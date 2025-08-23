// knexfile.js
require('dotenv').config();

module.exports = {
  development: {
    client: process.env.DB_CLIENT || 'mysql2',
    connection: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3307,
      user: process.env.DB_USER || 'admin',
      password: process.env.DB_PASSWORD || 'adminEKLS1234',
      database: process.env.DB_NAME || 'englishkorat',
      charset: 'utf8mb4',
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
  production: {
    client: process.env.DB_CLIENT || 'mysql2',
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
};