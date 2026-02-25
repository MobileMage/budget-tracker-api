const { z } = require('zod');

/**
 * Schema for user registration request body.
 *
 * @property {string} name     - Required, 1-100 characters.
 * @property {string} email    - Required, valid email format.
 * @property {string} password - Required, minimum 8 characters.
 */
const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(1, 'Name cannot be empty')
    .max(100, 'Name must be at most 100 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email address')
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters'),
});

/**
 * Schema for user login request body.
 *
 * @property {string} email    - Required, valid email format.
 * @property {string} password - Required.
 */
const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email address')
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

/**
 * Schema for refreshing an access token request body.
 *
 * @property {string} refreshToken - Required, the refresh token string.
 */
const refreshSchema = z.object({
  refreshToken: z
    .string({ required_error: 'Refresh token is required' })
    .min(1, 'Refresh token is required'),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
};
