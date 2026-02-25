const { Router } = require('express');
const controller = require('./forecast.controller');
const authenticate = require('../../middleware/authenticate');

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Forecast
 *   description: Financial forecasting and health analysis
 */

/**
 * @swagger
 * /api/forecast/generate:
 *   post:
 *     summary: Generate a new financial forecast snapshot
 *     description: >
 *       Calculates the user's current balance, burn rate, estimated days of
 *       runway, and risk level, then persists a ForecastSnapshot record.
 *     tags: [Forecast]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Forecast snapshot created
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
 *                   example: Forecast generated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     userId:
 *                       type: string
 *                       format: uuid
 *                     balance:
 *                       type: number
 *                       example: 1250.00
 *                     burnRate:
 *                       type: number
 *                       example: 42.86
 *                     estimatedDaysLeft:
 *                       type: integer
 *                       example: 29
 *                     riskLevel:
 *                       type: string
 *                       enum: [SAFE, WARNING, DANGER]
 *                       example: WARNING
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.post('/generate', authenticate, controller.generateForecast);

/**
 * @swagger
 * /api/forecast/latest:
 *   get:
 *     summary: Get the most recent forecast snapshot
 *     tags: [Forecast]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Latest forecast snapshot
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
 *                   example: Latest forecast retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     userId:
 *                       type: string
 *                       format: uuid
 *                     balance:
 *                       type: number
 *                     burnRate:
 *                       type: number
 *                     estimatedDaysLeft:
 *                       type: integer
 *                     riskLevel:
 *                       type: string
 *                       enum: [SAFE, WARNING, DANGER]
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Authentication required
 *       404:
 *         description: No forecast found
 *       500:
 *         description: Internal server error
 */
router.get('/latest', authenticate, controller.getLatestForecast);

/**
 * @swagger
 * /api/forecast/history:
 *   get:
 *     summary: Get forecast snapshot history
 *     tags: [Forecast]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 30
 *         description: Maximum number of snapshots to return
 *     responses:
 *       200:
 *         description: Forecast history list
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
 *                   example: Forecast history retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       userId:
 *                         type: string
 *                         format: uuid
 *                       balance:
 *                         type: number
 *                       burnRate:
 *                         type: number
 *                       estimatedDaysLeft:
 *                         type: integer
 *                       riskLevel:
 *                         type: string
 *                         enum: [SAFE, WARNING, DANGER]
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Invalid limit parameter
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/history', authenticate, controller.getForecastHistory);

/**
 * @swagger
 * /api/forecast/health:
 *   get:
 *     summary: Get comprehensive financial health report
 *     description: >
 *       Returns the user's current balance, daily/weekly/monthly burn rate
 *       projections, estimated days of runway, risk level with description,
 *       month-over-month spending change, and a suggested daily budget.
 *     tags: [Forecast]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Financial health report
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
 *                   example: Financial health retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     balance:
 *                       type: number
 *                       example: 1250.00
 *                     burnRate:
 *                       type: object
 *                       properties:
 *                         daily:
 *                           type: number
 *                           example: 42.86
 *                         weekly:
 *                           type: number
 *                           example: 300.02
 *                         monthly:
 *                           type: number
 *                           example: 1285.80
 *                     estimatedDaysLeft:
 *                       type: integer
 *                       nullable: true
 *                       example: 29
 *                     riskLevel:
 *                       type: string
 *                       enum: [SAFE, WARNING, DANGER]
 *                       example: WARNING
 *                     riskDescription:
 *                       type: string
 *                       example: Spending is elevated. Consider reviewing your budget.
 *                     monthOverMonthChange:
 *                       type: number
 *                       description: Percentage change from previous month's spending
 *                       example: 15.25
 *                     suggestedDailyBudget:
 *                       type: number
 *                       example: 41.67
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/health', authenticate, controller.getFinancialHealth);

module.exports = router;
