require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const mysql = require('mysql2/promise');

class DirectDatabase {
  constructor() {
    this.client = process.env.DB_CLIENT || 'sqlite3';
    this.connection = null;
    this.pool = null;
  }

  async connect() {
    if (this.client === 'sqlite3') {
      return new Promise((resolve, reject) => {
        this.connection = new sqlite3.Database(process.env.DB_NAME || './dev.db', (err) => {
          if (err) {
            console.error('SQLite connection error:', err);
            reject(err);
          } else {
            console.log('Connected to SQLite database');
            resolve();
          }
        });
      });
    } else if (this.client === 'mysql2') {
      this.pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        charset: 'utf8mb4'
      });
      console.log('Connected to MySQL database');
    }
  }

  async query(sql, params = []) {
    if (this.client === 'sqlite3') {
      return new Promise((resolve, reject) => {
        if (sql.toLowerCase().includes('select')) {
          this.connection.all(sql, params, (err, rows) => {
            if (err) {
              reject(err);
            } else {
              resolve(rows);
            }
          });
        } else {
          this.connection.run(sql, params, function(err) {
            if (err) {
              reject(err);
            } else {
              resolve({ insertId: this.lastID, changes: this.changes });
            }
          });
        }
      });
    } else if (this.client === 'mysql2') {
      const [rows] = await this.pool.execute(sql, params);
      return rows;
    }
  }

  async transaction(callback) {
    if (this.client === 'sqlite3') {
      return new Promise((resolve, reject) => {
        this.connection.serialize(async () => {
          this.connection.run('BEGIN TRANSACTION');
          try {
            const result = await callback(this);
            this.connection.run('COMMIT', (err) => {
              if (err) {
                reject(err);
              } else {
                resolve(result);
              }
            });
          } catch (error) {
            this.connection.run('ROLLBACK', () => {
              reject(error);
            });
          }
        });
      });
    } else if (this.client === 'mysql2') {
      const connection = await this.pool.getConnection();
      await connection.beginTransaction();
      try {
        const result = await callback({
          query: (sql, params) => connection.execute(sql, params).then(([rows]) => rows)
        });
        await connection.commit();
        connection.release();
        return result;
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    }
  }

  async ping() {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (e) {
      console.error('DB ping error:', e && e.message);
      return false;
    }
  }

  async close() {
    if (this.client === 'sqlite3' && this.connection) {
      this.connection.close();
    } else if (this.client === 'mysql2' && this.pool) {
      await this.pool.end();
    }
  }
}

const directDB = new DirectDatabase();

module.exports = { directDB };