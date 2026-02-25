const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/database');
const env = require('../../config/env');

const SALT_ROUNDS = 10;

/**
 * Parses a duration string (e.g. "15m", "7d", "1h") into milliseconds.
 *
 * @param {string} duration - Duration string with suffix s/m/h/d.
 * @returns {number} Duration in milliseconds.
 */
function parseDuration(duration) {
  const match = duration.match(/^(\d+)(s|m|h|d)$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit];
}

/**
 * Generates a pair of JWT tokens (access + refresh) for the given user.
 *
 * @param {{ id: string, email: string }} user - User record.
 * @returns {{ accessToken: string, refreshToken: string }}
 */
function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    { id: user.id, email: user.email },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
  );

  return { accessToken, refreshToken };
}

/**
 * Registers a new user account.
 *
 * Hashes the password, creates the user record, generates JWT tokens, and
 * persists the refresh token in the database.
 *
 * @param {{ name: string, email: string, password: string }} data
 * @returns {Promise<{ user: object, accessToken: string, refreshToken: string }>}
 * @throws {Error} If the email is already registered (Prisma P2002).
 */
async function register({ name, email, password }) {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const err = new Error('A user with this email already exists');
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
    },
    select: {
      id: true,
      name: true,
      email: true,
      allowanceCycle: true,
      createdAt: true,
    },
  });

  const tokens = generateTokens(user);

  const refreshExpiresMs = parseDuration(env.JWT_REFRESH_EXPIRES_IN);

  await prisma.refreshToken.create({
    data: {
      token: tokens.refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + refreshExpiresMs),
    },
  });

  return {
    user,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

/**
 * Authenticates a user with email and password.
 *
 * Verifies the credentials, generates JWT tokens, and stores the refresh
 * token in the database.
 *
 * @param {{ email: string, password: string }} data
 * @returns {Promise<{ user: object, accessToken: string, refreshToken: string }>}
 * @throws {Error} 401 if credentials are invalid.
 */
async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  const tokens = generateTokens(user);

  const refreshExpiresMs = parseDuration(env.JWT_REFRESH_EXPIRES_IN);

  await prisma.refreshToken.create({
    data: {
      token: tokens.refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + refreshExpiresMs),
    },
  });

  const { passwordHash: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

/**
 * Refreshes an access token using a valid refresh token.
 *
 * Verifies the token signature, checks that it exists in the database and
 * has not expired, then issues a new access token.
 *
 * @param {string} token - The refresh token string.
 * @returns {Promise<{ accessToken: string }>}
 * @throws {Error} 401 if the token is invalid, expired, or not found.
 */
async function refreshToken(token) {
  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
  } catch {
    const err = new Error('Invalid or expired refresh token');
    err.statusCode = 401;
    throw err;
  }

  const storedToken = await prisma.refreshToken.findUnique({
    where: { token },
  });

  if (!storedToken) {
    const err = new Error('Refresh token not found. It may have been revoked.');
    err.statusCode = 401;
    throw err;
  }

  if (new Date() > storedToken.expiresAt) {
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    const err = new Error('Refresh token has expired');
    err.statusCode = 401;
    throw err;
  }

  const accessToken = jwt.sign(
    { id: decoded.id, email: decoded.email },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  return { accessToken };
}

/**
 * Logs out a user by deleting the specified refresh token from the database.
 *
 * @param {string} refreshTokenValue - The refresh token to revoke.
 * @returns {Promise<void>}
 */
async function logout(refreshTokenValue) {
  await prisma.refreshToken.deleteMany({
    where: { token: refreshTokenValue },
  });
}

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  generateTokens,
};
