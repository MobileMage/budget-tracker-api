const { Router } = require('express');
const controller = require('./analytics.controller');
const authenticate = require('../../middleware/authenticate');

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Behavioral spending analytics and insights
 */

/**
 * @swagger
 * /api/analytics/heatmap:
 *   get:
 *     summary: Get spending heatmap grouped by day-of-week and hour
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date of the range (inclusive)
 *         example: "2026-01-01"
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date of the range (inclusive)
 *         example: "2026-01-31"
 *     responses:
 *       200:
 *         description: Spending heatmap retrieved successfully
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
 *                   example: Spending heatmap retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       dayOfWeek:
 *                         type: integer
 *                         minimum: 0
 *                         maximum: 6
 *                         description: "0 = Sunday, 6 = Saturday"
 *                       hour:
 *                         type: integer
 *                         minimum: 0
 *                         maximum: 23
 *                       total:
 *                         type: number
 *                         format: float
 *                       count:
 *                         type: integer
 *       400:
 *         description: Missing or invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: startDate and endDate query parameters are required
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Authentication required. Please provide a valid Bearer token.
 */
router.get('/heatmap', authenticate, controller.getSpendingHeatmap);

/**
 * @swagger
 * /api/analytics/category-dominance:
 *   get:
 *     summary: Get spending breakdown by category with percentages
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date of the range (inclusive)
 *         example: "2026-01-01"
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date of the range (inclusive)
 *         example: "2026-01-31"
 *     responses:
 *       200:
 *         description: Category dominance retrieved successfully
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
 *                   example: Category dominance retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       category:
 *                         type: string
 *                         enum: [FOOD, TRANSPORT, ENTERTAINMENT, SHOPPING, EDUCATION, HEALTH, UTILITIES, RENT, PERSONAL, OTHER]
 *                       total:
 *                         type: number
 *                         format: float
 *                       percentage:
 *                         type: number
 *                         format: float
 *                         description: Percentage of total spending
 *                       count:
 *                         type: integer
 *       400:
 *         description: Missing or invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: startDate and endDate query parameters are required
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Authentication required. Please provide a valid Bearer token.
 */
router.get('/category-dominance', authenticate, controller.getCategoryDominance);

/**
 * @swagger
 * /api/analytics/spending-trend:
 *   get:
 *     summary: Get monthly spending totals for the last N months
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: months
 *         required: false
 *         schema:
 *           type: integer
 *           default: 6
 *           minimum: 1
 *           maximum: 24
 *         description: Number of past months to include (default 6)
 *     responses:
 *       200:
 *         description: Spending trend retrieved successfully
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
 *                   example: Spending trend retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       month:
 *                         type: string
 *                         example: "2026-01"
 *                       total:
 *                         type: number
 *                         format: float
 *       400:
 *         description: Invalid months parameter
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: months must be between 1 and 24
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Authentication required. Please provide a valid Bearer token.
 */
router.get('/spending-trend', authenticate, controller.getSpendingTrend);

/**
 * @swagger
 * /api/analytics/summary:
 *   get:
 *     summary: Get comprehensive behavioral spending summary for the current month
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Behavioral summary retrieved successfully
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
 *                   example: Behavioral summary retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalIncome:
 *                       type: number
 *                       format: float
 *                       example: 50000
 *                     totalExpenses:
 *                       type: number
 *                       format: float
 *                       example: 32000
 *                     netSavings:
 *                       type: number
 *                       format: float
 *                       example: 18000
 *                     savingsRate:
 *                       type: number
 *                       format: float
 *                       description: Percentage of income saved
 *                       example: 36
 *                     topCategory:
 *                       type: string
 *                       nullable: true
 *                       example: FOOD
 *                     topCategoryTotal:
 *                       type: number
 *                       format: float
 *                       example: 12000
 *                     averageDailySpend:
 *                       type: number
 *                       format: float
 *                       example: 1280
 *                     impulseCount:
 *                       type: integer
 *                       example: 3
 *                     impulseTotal:
 *                       type: number
 *                       format: float
 *                       example: 4500
 *                     spendingChangePercent:
 *                       type: number
 *                       format: float
 *                       description: Percentage change compared to last month
 *                       example: -12.5
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Authentication required. Please provide a valid Bearer token.
 */
router.get('/summary', authenticate, controller.getBehavioralSummary);

/**
 * @swagger
 * /api/analytics/weekly-comparison:
 *   get:
 *     summary: Compare spending between this week and last week by category
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Weekly comparison retrieved successfully
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
 *                   example: Weekly comparison retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     thisWeekTotal:
 *                       type: number
 *                       format: float
 *                       example: 8500
 *                     prevWeekTotal:
 *                       type: number
 *                       format: float
 *                       example: 7200
 *                     percentChange:
 *                       type: number
 *                       format: float
 *                       example: 18.06
 *                     spiked:
 *                       type: boolean
 *                       example: false
 *                     categories:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           category:
 *                             type: string
 *                             enum: [FOOD, TRANSPORT, ENTERTAINMENT, SHOPPING, EDUCATION, HEALTH, UTILITIES, RENT, PERSONAL, OTHER]
 *                           current:
 *                             type: number
 *                             format: float
 *                           previous:
 *                             type: number
 *                             format: float
 *                           changePercent:
 *                             type: number
 *                             format: float
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Authentication required. Please provide a valid Bearer token.
 */
router.get('/weekly-comparison', authenticate, controller.getWeeklyComparison);

module.exports = router;
