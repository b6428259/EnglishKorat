// src/server.js
const app = require('./app');
const logger = require('./utils/logger');
const NotificationSchedulerService = require('./services/NotificationSchedulerService');

const PORT = process.env.PORT || 3000;

// Initialize notification scheduler
const notificationScheduler = new NotificationSchedulerService();

const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📚 English Korat School API - Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Start notification scheduler
  try {
    notificationScheduler.initialize();
    logger.info('📲 Notification scheduler initialized');
  } catch (error) {
    logger.error('Failed to initialize notification scheduler:', error);
  }
});

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('🔄 Gracefully shutting down...');
  
  try {
    // Stop notification scheduler
    await notificationScheduler.close();
    logger.info('📲 Notification scheduler stopped');
    
    // Close server
    server.close(() => {
      logger.info('🛑 Server stopped');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = server;
