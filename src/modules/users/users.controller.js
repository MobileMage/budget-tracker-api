const usersService = require('./users.service');
const { success } = require('../../utils/apiResponse');

/**
 * Returns the authenticated user's profile.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function getProfile(req, res, next) {
  try {
    const user = await usersService.getProfile(req.user.id);
    return success(res, { user }, 'Profile retrieved successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * Updates the authenticated user's profile fields.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function updateProfile(req, res, next) {
  try {
    const { name, allowanceCycle } = req.body;
    const user = await usersService.updateProfile(req.user.id, {
      name,
      allowanceCycle,
    });
    return success(res, { user }, 'Profile updated successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * Changes the authenticated user's password.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    await usersService.changePassword(req.user.id, currentPassword, newPassword);
    return success(res, null, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * Deletes the authenticated user's account and all associated data.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function deleteAccount(req, res, next) {
  try {
    await usersService.deleteAccount(req.user.id);
    return success(res, null, 'Account deleted successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
};
