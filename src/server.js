// src/server.js
const app = require('./app');
const logger = require('./utils/logger');
const { directDB } = require('./config/directDatabase');

const PORT = process.env.PORT || 3000;

// Initialize database connection
async function startServer() {
  try {
    await directDB.connect();
    logger.info('✅ Database connection established');
    
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📚 English Korat School API - Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // (optional) graceful shutdown
    process.on('SIGTERM', async () => {
      await directDB.close();
      server.close(() => process.exit(0));
    });
    process.on('SIGINT', async () => {
      await directDB.close();
      server.close(() => process.exit(0));
    });

    return server;
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// For testing and external usage
let server = null;
startServer().then(srv => { server = srv; });

module.exports = { server };
