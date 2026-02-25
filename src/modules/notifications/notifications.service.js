const prisma = require('../../config/database');

/**
 * Create a new notification record for a user.
 *
 * @param {string} userId - The ID of the user to notify.
 * @param {object} data - Notification data.
 * @param {string} data.title - Short notification title.
 * @param {string} data.body  - Notification body text.
 * @returns {Promise<object>} The created notification record.
 */
async function createNotification(userId, { title, body }) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      body,
    },
  });

  return notification;
}

/**
 * Retrieve a paginated list of notifications for a user, optionally filtered
 * by read status, ordered by createdAt descending.
 *
 * @param {string} userId - The ID of the authenticated user.
 * @param {object} query - Query parameters.
 * @param {number} [query.page=1]    - Page number (1-indexed).
 * @param {number} [query.limit=20]  - Records per page.
 * @param {boolean} [query.isRead]   - Optional filter by read status.
 * @returns {Promise<{ notifications: object[], total: number, page: number, totalPages: number }>}
 */
async function getNotifications(userId, query) {
  const { page = 1, limit = 20, isRead } = query;

  const where = { userId };

  if (typeof isRead === 'boolean') {
    where.isRead = isRead;
  }

  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    notifications,
    total,
    page,
    totalPages,
  };
}

/**
 * Mark a single notification as read, verifying ownership.
 *
 * @param {string} userId         - The ID of the authenticated user.
 * @param {string} notificationId - The ID of the notification to mark.
 * @returns {Promise<object|null>} The updated notification or null if not found / not owned.
 */
async function markAsRead(userId, notificationId) {
  const existing = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!existing || existing.userId !== userId) {
    return null;
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  return updated;
}

/**
 * Mark all of a user's notifications as read.
 *
 * @param {string} userId - The ID of the authenticated user.
 * @returns {Promise<{ count: number }>} The number of notifications updated.
 */
async function markAllAsRead(userId) {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return { count: result.count };
}

/**
 * Get the count of unread notifications for a user.
 *
 * @param {string} userId - The ID of the authenticated user.
 * @returns {Promise<number>} Count of unread notifications.
 */
async function getUnreadCount(userId) {
  const count = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  return count;
}

/**
 * Delete a single notification, verifying ownership.
 *
 * @param {string} userId         - The ID of the authenticated user.
 * @param {string} notificationId - The ID of the notification to delete.
 * @returns {Promise<object|null>} The deleted notification or null if not found / not owned.
 */
async function deleteNotification(userId, notificationId) {
  const existing = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!existing || existing.userId !== userId) {
    return null;
  }

  const deleted = await prisma.notification.delete({
    where: { id: notificationId },
  });

  return deleted;
}

/**
 * Delete all read notifications for a user.
 *
 * @param {string} userId - The ID of the authenticated user.
 * @returns {Promise<{ count: number }>} The number of notifications deleted.
 */
async function deleteAllRead(userId) {
  const result = await prisma.notification.deleteMany({
    where: { userId, isRead: true },
  });

  return { count: result.count };
}

module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  deleteAllRead,
};
