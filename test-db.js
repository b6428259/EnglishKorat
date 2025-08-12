// test-db.js
const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3307,
      user: 'admin',
      password: 'adminEKLS1234'
    });
    console.log('✅ Connected to MySQL');
    const [rows] = await conn.query('SHOW DATABASES');
    console.log(rows);
    await conn.end();
  } catch (err) {
    console.error('❌ DB Connection Error:', err.message);
  }
})();
