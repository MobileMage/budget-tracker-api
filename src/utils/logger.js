const winston = require('winston');
const path = require('path');

const { combine, timestamp, printf, colorize, errors } = winston.format;

const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), 'logs');

/**
 * Custom log format that outputs a human-readable string.
 * Format: "YYYY-MM-DD HH:mm:ss [LEVEL]: message"
 */
const logFormat = printf(({ level, message, timestamp: ts, stack }) => {
  const text = stack || message;
  return `${ts} [${level}]: ${text}`;
});

/**
 * Build the array of transports based on the current environment.
 *
 * Development:
 *   - Console at "debug" level with colorized output
 *   - Combined file at "debug" level
 *   - Error file at "error" level
 *
 * Production:
 *   - Console at "warn" level (no colors for structured log collectors)
 *   - Combined file at "info" level
 *   - Error file at "error" level
 */
const buildTransports = () => {
  const transports = [];

  if (NODE_ENV === 'production') {
    transports.push(
      new winston.transports.Console({
        level: 'warn',
        format: combine(timestamp(), logFormat),
      })
    );

    transports.push(
      new winston.transports.File({
        filename: path.join(LOG_DIR, 'combined.log'),
        level: 'info',
        maxsize: 5 * 1024 * 1024, // 5 MB
        maxFiles: 5,
        format: combine(timestamp(), logFormat),
      })
    );
  } else {
    transports.push(
      new winston.transports.Console({
        level: 'debug',
        format: combine(colorize(), timestamp(), logFormat),
      })
    );

    transports.push(
      new winston.transports.File({
        filename: path.join(LOG_DIR, 'combined.log'),
        level: 'debug',
        maxsize: 5 * 1024 * 1024,
        maxFiles: 3,
        format: combine(timestamp(), logFormat),
      })
    );
  }

  // Both environments get a dedicated error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
      format: combine(timestamp(), logFormat),
    })
  );

  return transports;
};

/**
 * Application-wide Winston logger instance.
 *
 * Levels follow Winston defaults (npm levels):
 *   error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6
 *
 * @example
 *   const logger = require('./utils/logger');
 *   logger.info('Server started on port 3000');
 *   logger.error('Unhandled rejection', { error: err });
 */
const logger = winston.createLogger({
  level: NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
  ),
  defaultMeta: { env: NODE_ENV },
  transports: buildTransports(),
  exitOnError: false,
});

module.exports = logger;
