const notificationsService = require('./notifications.service');
const { success, error } = require('../../utils/apiResponse');

/**
 * GET / - List notifications with optional filters and pagination.
 */
async function list(req, res) {
  try {
    const page = req.query.page ? parseInt(req.query.page, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;

    let isRead;
    if (req.query.isRead === 'true') {
      isRead = true;
    } else if (req.query.isRead === 'false') {
      isRead = false;
    }

    const result = await notificationsService.getNotifications(req.user.id, {
      page,
      limit,
      isRead,
    });

    return success(res, result, 'Notifications retrieved successfully');
  } catch (err) {
    return error(res, 'Failed to retrieve notifications', 500);
  }
}

/**
 * GET /unread-count - Get the count of unread notifications.
 */
async function getUnreadCount(req, res) {
  try {
    const count = await notificationsService.getUnreadCount(req.user.id);
    return success(res, { count }, 'Unread count retrieved successfully');
  } catch (err) {
    return error(res, 'Failed to retrieve unread count', 500);
  }
}

/**
 * PATCH /:id/read - Mark a single notification as read.
 */
async function markAsRead(req, res) {
  try {
    const notification = await notificationsService.markAsRead(
      req.user.id,
      req.params.id
    );

    if (!notification) {
      return error(res, 'Notification not found', 404);
    }

    return success(res, notification, 'Notification marked as read');
  } catch (err) {
    return error(res, 'Failed to mark notification as read', 500);
  }
}

/**
 * PATCH /read-all - Mark all notifications as read.
 */
async function markAllAsRead(req, res) {
  try {
    const result = await notificationsService.markAllAsRead(req.user.id);
    return success(res, result, 'All notifications marked as read');
  } catch (err) {
    return error(res, 'Failed to mark all notifications as read', 500);
  }
}

/**
 * DELETE /:id - Delete a single notification.
 */
async function remove(req, res) {
  try {
    const notification = await notificationsService.deleteNotification(
      req.user.id,
      req.params.id
    );

    if (!notification) {
      return error(res, 'Notification not found', 404);
    }

    return success(res, notification, 'Notification deleted successfully');
  } catch (err) {
    return error(res, 'Failed to delete notification', 500);
  }
}

/**
 * DELETE /read - Delete all read notifications.
 */
async function deleteAllRead(req, res) {
  try {
    const result = await notificationsService.deleteAllRead(req.user.id);
    return success(res, result, 'Read notifications deleted successfully');
  } catch (err) {
    return error(res, 'Failed to delete read notifications', 500);
  }
}

module.exports = {
  list,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  remove,
  deleteAllRead,
};
