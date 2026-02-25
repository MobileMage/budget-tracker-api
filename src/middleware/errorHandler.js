const { Prisma } = require('@prisma/client');
const { ZodError } = require('zod');
const { JsonWebTokenError, TokenExpiredError } = require('jsonwebtoken');
const winston = require('winston');

const nodeEnv = process.env.NODE_ENV || 'development';

/**
 * Application-wide Winston logger instance.
 * Logs to the console with timestamps. In production the level is "error";
 * in development it is "debug".
 * @type {winston.Logger}
 */
const logger = winston.createLogger({
  level: nodeEnv === 'production' ? 'error' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    nodeEnv === 'production'
      ? winston.format.json()
      : winston.format.combine(winston.format.colorize(), winston.format.simple())
  ),
  transports: [new winston.transports.Console()],
});

/**
 * Builds a standardised error response body.
 *
 * @param {number} statusCode - HTTP status code.
 * @param {string} message - Human-readable error message.
 * @param {Array|undefined} [errors] - Optional array of detailed error items.
 * @returns {{ success: boolean, message: string, errors?: Array }}
 */
function buildErrorResponse(statusCode, message, errors) {
  const body = { success: false, message };
  if (errors) {
    body.errors = errors;
  }
  return { statusCode, body };
}

/**
 * Global Express error-handling middleware.
 *
 * Catches errors thrown or forwarded via `next(err)` and returns a
 * standardised JSON response. Handles the following error types:
 *
 * - **Prisma P2002** (unique constraint violation) -> 409 Conflict
 * - **Prisma P2025** (record not found) -> 404 Not Found
 * - **ZodError** (request validation failure) -> 400 Bad Request
 * - **JsonWebTokenError / TokenExpiredError** -> 401 Unauthorized
 * - **All other errors** -> 500 Internal Server Error
 *
 * @param {Error} err - The error object.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
function errorHandler(err, req, res, _next) {
  logger.error(`${req.method} ${req.originalUrl} — ${err.message}`, {
    stack: err.stack,
  });

  let statusCode = 500;
  let body = { success: false, message: 'Internal server error' };

  // --- Prisma known request errors ---
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const fields = err.meta && err.meta.target ? err.meta.target : [];
      const result = buildErrorResponse(
        409,
        `A record with that ${Array.isArray(fields) ? fields.join(', ') : 'value'} already exists.`
      );
      statusCode = result.statusCode;
      body = result.body;
    } else if (err.code === 'P2025') {
      const result = buildErrorResponse(
        404,
        err.meta && err.meta.cause ? err.meta.cause : 'The requested record was not found.'
      );
      statusCode = result.statusCode;
      body = result.body;
    } else {
      const result = buildErrorResponse(400, `Database error: ${err.message}`);
      statusCode = result.statusCode;
      body = result.body;
    }

  // --- Zod validation errors ---
  } else if (err instanceof ZodError) {
    const formatted = err.errors.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    const result = buildErrorResponse(400, 'Validation failed', formatted);
    statusCode = result.statusCode;
    body = result.body;

  // --- JWT errors ---
  } else if (err instanceof TokenExpiredError) {
    const result = buildErrorResponse(
      401,
      'Token has expired. Please refresh your token.'
    );
    statusCode = result.statusCode;
    body = result.body;
  } else if (err instanceof JsonWebTokenError) {
    const result = buildErrorResponse(401, 'Invalid or malformed token.');
    statusCode = result.statusCode;
    body = result.body;

  // --- Generic errors with a status code ---
  } else if (err.statusCode || err.status) {
    statusCode = err.statusCode || err.status;
    body = { success: false, message: err.message || 'An error occurred' };
  }

  // In development include the stack trace for unhandled 500s
  if (statusCode === 500 && nodeEnv === 'development') {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
}

module.exports = errorHandler;
