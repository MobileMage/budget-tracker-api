const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Validates that a required environment variable is set.
 * @param {string} name - The name of the environment variable.
 * @returns {string} The value of the environment variable.
 * @throws {Error} If the environment variable is not set.
 */
function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Validated environment variables for the application.
 *
 * @typedef {Object} EnvConfig
 * @property {number} PORT - The port the server listens on (default: 3000).
 * @property {string} NODE_ENV - The current environment (default: "development").
 * @property {string} DATABASE_URL - The database connection string.
 * @property {string} JWT_SECRET - Secret key used to sign access tokens.
 * @property {string} JWT_REFRESH_SECRET - Secret key used to sign refresh tokens.
 * @property {string} JWT_EXPIRES_IN - Access token expiration duration (default: "15m").
 * @property {string} JWT_REFRESH_EXPIRES_IN - Refresh token expiration duration (default: "7d").
 */

/** @type {EnvConfig} */
const env = {
  PORT: parseInt(process.env.PORT, 10) || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: requireEnv('DATABASE_URL'),
  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_REFRESH_SECRET: requireEnv('JWT_REFRESH_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
};

module.exports = env;
