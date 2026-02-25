const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Express middleware that verifies a JWT access token.
 *
 * Expects the token in the `Authorization` header using the Bearer scheme:
 *   Authorization: Bearer <token>
 *
 * On success the decoded payload is attached to `req.user`.
 * On failure a 401 JSON response is returned.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please provide a valid Bearer token.',
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Token is missing.',
    });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please refresh your token.',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid token. Authentication failed.',
    });
  }
}

module.exports = authenticate;
