const knex = require('knex');

const {
  DB_CLIENT = 'mysql2',
  DB_HOST = '127.0.0.1',
  DB_PORT = 3307,
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_NAME = 'english_korat_school',
  DB_SSL = 'false', // 'true' เพื่อบังคับใช้ SSL
} = process.env;

const connection = {
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  charset: 'utf8mb4',
};

// เปิด/ปิด SSL ได้ผ่าน env
if (String(DB_SSL).toLowerCase() === 'true') {
  connection.ssl = { rejectUnauthorized: true };
}

const config = {
  client: DB_CLIENT,
  connection,
  pool: {
    min: 2,
    max: 10,
    // กันค้าง/หลุดเวลาว่างนาน ๆ
    idleTimeoutMillis: 10 * 60 * 1000,     // 10 นาที
    acquireTimeoutMillis: 30 * 1000,       // 30 วินาที
    createTimeoutMillis: 30 * 1000,
    reapIntervalMillis: 30 * 1000,
  },
  acquireConnectionTimeout: 30 * 1000,
  // debug: true, // เปิดตอนต้องการดู SQL
};

const db = knex(config);

// ตัวช่วยเล็ก ๆ สำหรับ health check แบบ query จริง
async function ping() {
  try {
    await db.raw('SELECT 1');
    return true;
  } catch (e) {
    console.error('DB ping error:', e && e.message); // eslint-disable-line no-console
    return false;
  }
}


module.exports = { db, ping };
