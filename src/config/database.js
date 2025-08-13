const knex = require('knex');
const knexConfig = require('../../knexfile.js');

// Use the same configuration as knexfile
const config = knexConfig[process.env.NODE_ENV || 'development'];

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
