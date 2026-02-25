const alertService = require('./alerts.service');
const { success, error } = require('../../utils/apiResponse');

/**
 * GET /alerts
 * Get a paginated list of alerts with optional filters.
 */
async function getAlerts(req, res) {
  try {
    const result = await alertService.getAlerts(req.user.id, req.query);
    return success(res, result, 'Alerts retrieved successfully');
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
}

/**
 * PATCH /alerts/:id/read
 * Mark a single alert as read.
 */
async function markAsRead(req, res) {
  try {
    const alert = await alertService.markAsRead(req.user.id, req.params.id);
    return success(res, alert, 'Alert marked as read');
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
}

/**
 * PATCH /alerts/read-all
 * Mark all alerts as read for the authenticated user.
 */
async function markAllAsRead(req, res) {
  try {
    const result = await alertService.markAllAsRead(req.user.id);
    return success(res, result, 'All alerts marked as read');
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
}

/**
 * GET /alerts/unread-count
 * Get the count of unread alerts for the authenticated user.
 */
async function getUnreadCount(req, res) {
  try {
    const result = await alertService.getUnreadCount(req.user.id);
    return success(res, result, 'Unread count retrieved successfully');
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
}

module.exports = {
  getAlerts,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};
