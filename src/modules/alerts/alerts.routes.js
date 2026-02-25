const { Router } = require('express');
const authenticate = require('../../middleware/authenticate');
const alertController = require('./alerts.controller');

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Alerts
 *   description: Intelligent spending alerts and notifications
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Alert:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         type:
 *           type: string
 *           enum: [OVERSPENDING, SPIKE, IMPULSE, LATE_NIGHT, POST_INCOME, LOW_BALANCE]
 *         message:
 *           type: string
 *         isRead:
 *           type: boolean
 *         triggeredAt:
 *           type: string
 *           format: date-time
 *     AlertListResponse:
 *       type: object
 *       properties:
 *         alerts:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Alert'
 *         total:
 *           type: integer
 *         page:
 *           type: integer
 *         limit:
 *           type: integer
 *         totalPages:
 *           type: integer
 */

/**
 * @swagger
 * /alerts:
 *   get:
 *     summary: List alerts with optional filters and pagination
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [OVERSPENDING, SPIKE, IMPULSE, LATE_NIGHT, POST_INCOME, LOW_BALANCE]
 *         description: Filter by alert type
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: Filter by read status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of alerts per page
 *     responses:
 *       200:
 *         description: Alerts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/AlertListResponse'
 *       401:
 *         description: Authentication required
 */
router.get('/', authenticate, alertController.getAlerts);

/**
 * @swagger
 * /alerts/unread-count:
 *   get:
 *     summary: Get the count of unread alerts
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                       example: 5
 *       401:
 *         description: Authentication required
 */
router.get('/unread-count', authenticate, alertController.getUnreadCount);

/**
 * @swagger
 * /alerts/{id}/read:
 *   patch:
 *     summary: Mark a single alert as read
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Alert ID
 *     responses:
 *       200:
 *         description: Alert marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Alert'
 *       404:
 *         description: Alert not found
 *       401:
 *         description: Authentication required
 */
router.patch('/:id/read', authenticate, alertController.markAsRead);

/**
 * @swagger
 * /alerts/read-all:
 *   patch:
 *     summary: Mark all alerts as read
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All alerts marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                       description: Number of alerts marked as read
 *       401:
 *         description: Authentication required
 */
router.patch('/read-all', authenticate, alertController.markAllAsRead);

module.exports = router;
