const rateLimit = require('express-rate-limit');

/**
 * Default rate limiter for general API routes.
 *
 * Allows a maximum of 100 requests per 15-minute window per IP address.
 * When the limit is exceeded a 429 response with a JSON body is returned.
 *
 * @type {import('express-rate-limit').RateLimitRequestHandler}
 */
const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again after 15 minutes.',
  },
});

/**
 * Stricter rate limiter for authentication routes (login, register, refresh).
 *
 * Allows a maximum of 20 requests per 15-minute window per IP address.
 * When the limit is exceeded a 429 response with a JSON body is returned.
 *
 * @type {import('express-rate-limit').RateLimitRequestHandler}
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

module.exports = { defaultLimiter, authLimiter };
