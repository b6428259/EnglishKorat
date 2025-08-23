const { pool, ping, transaction } = require('./mysql');

// Export pool as db for backward compatibility
const db = pool;

module.exports = { db, ping, transaction };
