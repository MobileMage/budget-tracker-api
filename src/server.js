const app = require('./app');
const { env } = require('./config/env');
const logger = require('./utils/logger');
const { startWeeklyDigest } = require('./modules/notifications/jobs/weeklyDigest.cron');

const PORT = env.PORT;

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${env.NODE_ENV} mode`);
  logger.info(`API docs available at http://localhost:${PORT}/api/docs`);
  logger.info(`Health check at http://localhost:${PORT}/api/health`);

  // Start scheduled jobs
  startWeeklyDigest();
  logger.info('Scheduled jobs initialized');
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

module.exports = server;
