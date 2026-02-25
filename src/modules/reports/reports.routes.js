const { Router } = require('express');
const controller = require('./reports.controller');
const authenticate = require('../../middleware/authenticate');

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Financial report generation and data export
 */

/**
 * @swagger
 * /api/reports/monthly:
 *   get:
 *     summary: Get a comprehensive monthly financial report
 *     description: >
 *       Returns income breakdown, expense breakdown by category and day,
 *       budget compliance, savings rate, alerts summary, and comparison
 *       to the previous month.
 *     tags: [Reports]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *           example: 2026
 *         description: Report year
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *           example: 2
 *         description: Report month (1-12)
 *     responses:
 *       200:
 *         description: Monthly report data
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
 *                   example: Monthly report generated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     period:
 *                       type: object
 *                       properties:
 *                         start:
 *                           type: string
 *                           format: date-time
 *                         end:
 *                           type: string
 *                           format: date-time
 *                     income:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         sources:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               source:
 *                                 type: string
 *                               amount:
 *                                 type: number
 *                     expenses:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         byCategory:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               category:
 *                                 type: string
 *                               total:
 *                                 type: number
 *                               percentage:
 *                                 type: number
 *                         dailyBreakdown:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               date:
 *                                 type: string
 *                                 format: date
 *                               total:
 *                                 type: number
 *                     budgetCompliance:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           category:
 *                             type: string
 *                           budgetLimit:
 *                             type: number
 *                           spent:
 *                             type: number
 *                           status:
 *                             type: string
 *                             enum: [under, over]
 *                     savings:
 *                       type: object
 *                       properties:
 *                         amount:
 *                           type: number
 *                         rate:
 *                           type: number
 *                     alerts:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         byType:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               type:
 *                                 type: string
 *                               count:
 *                                 type: integer
 *                     comparison:
 *                       type: object
 *                       properties:
 *                         previousMonth:
 *                           type: object
 *                           properties:
 *                             income:
 *                               type: number
 *                             expenses:
 *                               type: number
 *                         incomeChange:
 *                           type: number
 *                         expenseChange:
 *                           type: number
 *       400:
 *         description: Missing or invalid query parameters
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/monthly', authenticate, controller.getMonthlyReport);

/**
 * @swagger
 * /api/reports/weekly:
 *   get:
 *     summary: Get a weekly summary report
 *     description: >
 *       Returns total income and expenses, category breakdown, daily totals,
 *       top 5 largest expenses, and impulse spending summary for the week.
 *     tags: [Reports]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: weekStartDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-02-23"
 *         description: Any date within the target week (normalizes to ISO week start)
 *     responses:
 *       200:
 *         description: Weekly report data
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
 *                   example: Weekly report generated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     period:
 *                       type: object
 *                       properties:
 *                         start:
 *                           type: string
 *                           format: date-time
 *                         end:
 *                           type: string
 *                           format: date-time
 *                     totalIncome:
 *                       type: number
 *                     totalExpenses:
 *                       type: number
 *                     byCategory:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           category:
 *                             type: string
 *                           total:
 *                             type: number
 *                           percentage:
 *                             type: number
 *                     dailyBreakdown:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                           total:
 *                             type: number
 *                     top5Expenses:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           amount:
 *                             type: number
 *                           category:
 *                             type: string
 *                           date:
 *                             type: string
 *                             format: date-time
 *                           notes:
 *                             type: string
 *                             nullable: true
 *                     impulseSpending:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: integer
 *                         total:
 *                           type: number
 *       400:
 *         description: Missing or invalid weekStartDate
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/weekly', authenticate, controller.getWeeklyReport);

/**
 * @swagger
 * /api/reports/custom:
 *   get:
 *     summary: Get a custom date range report
 *     description: >
 *       Returns a full financial report (income, expenses, budget compliance,
 *       savings, alerts) for an arbitrary date range.
 *     tags: [Reports]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-01-01"
 *         description: Start of the report period (inclusive)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-02-28"
 *         description: End of the report period (inclusive)
 *     responses:
 *       200:
 *         description: Custom range report data
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
 *                   example: Custom report generated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     period:
 *                       type: object
 *                       properties:
 *                         start:
 *                           type: string
 *                           format: date-time
 *                         end:
 *                           type: string
 *                           format: date-time
 *                     income:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         sources:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               source:
 *                                 type: string
 *                               amount:
 *                                 type: number
 *                     expenses:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         byCategory:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               category:
 *                                 type: string
 *                               total:
 *                                 type: number
 *                               percentage:
 *                                 type: number
 *                         dailyBreakdown:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               date:
 *                                 type: string
 *                                 format: date
 *                               total:
 *                                 type: number
 *                     budgetCompliance:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           category:
 *                             type: string
 *                           budgetLimit:
 *                             type: number
 *                           spent:
 *                             type: number
 *                           status:
 *                             type: string
 *                             enum: [under, over]
 *                     savings:
 *                       type: object
 *                       properties:
 *                         amount:
 *                           type: number
 *                         rate:
 *                           type: number
 *                     alerts:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         byType:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               type:
 *                                 type: string
 *                               count:
 *                                 type: integer
 *       400:
 *         description: Missing or invalid date parameters
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/custom', authenticate, controller.getCustomReport);

/**
 * @swagger
 * /api/reports/export:
 *   get:
 *     summary: Export expense data for a date range
 *     description: >
 *       Returns expense records as either CSV text or a JSON array,
 *       suitable for downloading or further processing.
 *     tags: [Reports]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-02-01"
 *         description: Start of the export period (inclusive)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-02-28"
 *         description: End of the export period (inclusive)
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, json]
 *           default: csv
 *         description: Export format
 *     responses:
 *       200:
 *         description: Exported expense data
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               example: "date,category,amount,notes,isImpulse\n2026-02-10,FOOD,12.50,Lunch,false"
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Expense data exported successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                       category:
 *                         type: string
 *                       amount:
 *                         type: number
 *                       notes:
 *                         type: string
 *                       isImpulse:
 *                         type: boolean
 *       400:
 *         description: Missing or invalid parameters
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/export', authenticate, controller.getExpenseExportData);

module.exports = router;
