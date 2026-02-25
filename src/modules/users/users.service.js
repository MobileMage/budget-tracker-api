const bcrypt = require('bcrypt');
const prisma = require('../../config/database');

const SALT_ROUNDS = 10;

/**
 * Retrieves the user profile by ID, excluding the passwordHash field.
 *
 * @param {string} userId - The user's UUID.
 * @returns {Promise<object>} The user profile without sensitive fields.
 * @throws {Error} 404 if user is not found.
 */
async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      allowanceCycle: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  return user;
}

/**
 * Updates the user's profile fields (name and/or allowanceCycle).
 *
 * @param {string} userId - The user's UUID.
 * @param {{ name?: string, allowanceCycle?: string }} data - Fields to update.
 * @returns {Promise<object>} The updated user profile without sensitive fields.
 * @throws {Error} 404 if user is not found.
 */
async function updateProfile(userId, data) {
  const updateData = {};
  if (data.name !== undefined) {
    updateData.name = data.name;
  }
  if (data.allowanceCycle !== undefined) {
    updateData.allowanceCycle = data.allowanceCycle;
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      allowanceCycle: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

/**
 * Changes the user's password after verifying the current password.
 *
 * @param {string} userId          - The user's UUID.
 * @param {string} currentPassword - The current plaintext password for verification.
 * @param {string} newPassword     - The new plaintext password to set.
 * @returns {Promise<void>}
 * @throws {Error} 404 if user is not found, 401 if current password is incorrect.
 */
async function changePassword(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isPasswordValid) {
    const err = new Error('Current password is incorrect');
    err.statusCode = 401;
    throw err;
  }

  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });
}

/**
 * Deletes a user account and all related data.
 *
 * Because Prisma cascade deletes are configured on the schema relations,
 * deleting the user will automatically remove all associated records
 * (incomes, expenses, budgets, alerts, recommendations, forecasts,
 * notifications, and refresh tokens).
 *
 * @param {string} userId - The user's UUID.
 * @returns {Promise<void>}
 * @throws {Error} 404 if user is not found.
 */
async function deleteAccount(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  await prisma.user.delete({
    where: { id: userId },
  });
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
};
