// knexfile.js
require('dotenv').config();

module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: './dev.db'
    },
    useNullAsDefault: true,
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: './src/database/migrations',
    },
    seeds: {
      directory: './src/database/seeds',
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
    migrations: {
      directory: './src/database/migrations',
    },
    seeds: {
      directory: './src/database/seeds',
    },
  },
};