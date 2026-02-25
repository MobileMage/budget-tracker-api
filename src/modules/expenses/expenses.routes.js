const { Router } = require('express');
const authenticate = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const { createExpenseSchema, updateExpenseSchema } = require('./expenses.validator');
const expensesController = require('./expenses.controller');

const router = Router();

// All expense routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Expenses
 *   description: Expense management endpoints
 */

/**
 * @swagger
 * /api/expenses:
 *   post:
 *     summary: Create a new expense record
 *     tags: [Expenses]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - category
 *               - date
 *             properties:
 *               amount:
 *                 type: number
 *                 format: float
 *                 description: Positive expense amount
 *                 example: 45.50
 *               category:
 *                 type: string
 *                 enum: [FOOD, TRANSPORT, ENTERTAINMENT, SHOPPING, EDUCATION, HEALTH, UTILITIES, RENT, PERSONAL, OTHER]
 *                 description: Expense category
 *                 example: "FOOD"
 *               date:
 *                 type: string
 *                 format: date-time
 *                 description: ISO 8601 date of the expense
 *                 example: "2026-02-20T12:30:00.000Z"
 *               notes:
 *                 type: string
 *                 description: Optional notes about the expense
 *                 example: "Lunch at the cafeteria"
 *     responses:
 *       201:
 *         description: Expense created successfully
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
 *                   example: Expense created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Expense'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 */
router.post('/', validate(createExpenseSchema), expensesController.create);

/**
 * @swagger
 * /api/expenses:
 *   get:
 *     summary: List expenses with optional filtering, sorting, and pagination
 *     tags: [Expenses]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start of date range filter (inclusive)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End of date range filter (inclusive)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [FOOD, TRANSPORT, ENTERTAINMENT, SHOPPING, EDUCATION, HEALTH, UTILITIES, RENT, PERSONAL, OTHER]
 *         description: Filter by expense category
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
 *           default: 10
 *         description: Number of records per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [date, amount, category]
 *           default: date
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort direction
 *     responses:
 *       200:
 *         description: Expenses retrieved successfully
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
 *                   example: Expenses retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     expenses:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Expense'
 *                     total:
 *                       type: integer
 *                       example: 50
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *       401:
 *         description: Authentication required
 */
router.get('/', expensesController.list);

/**
 * @swagger
 * /api/expenses/by-category:
 *   get:
 *     summary: Get expense totals grouped by category for a date period
 *     tags: [Expenses]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start of the period (inclusive)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End of the period (inclusive)
 *     responses:
 *       200:
 *         description: Expenses by category retrieved successfully
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
 *                   example: Expenses by category retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       category:
 *                         type: string
 *                         enum: [FOOD, TRANSPORT, ENTERTAINMENT, SHOPPING, EDUCATION, HEALTH, UTILITIES, RENT, PERSONAL, OTHER]
 *                         example: FOOD
 *                       total:
 *                         type: number
 *                         format: float
 *                         example: 350.00
 *       400:
 *         description: Missing or invalid date parameters
 *       401:
 *         description: Authentication required
 */
router.get('/by-category', expensesController.byCategory);

/**
 * @swagger
 * /api/expenses/total:
 *   get:
 *     summary: Get the total expenses for a date period
 *     tags: [Expenses]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start of the period (inclusive)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End of the period (inclusive)
 *     responses:
 *       200:
 *         description: Total expenses retrieved successfully
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
 *                   example: Total expenses retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                       format: float
 *                       example: 1250.75
 *       400:
 *         description: Missing or invalid date parameters
 *       401:
 *         description: Authentication required
 */
router.get('/total', expensesController.getTotal);

/**
 * @swagger
 * /api/expenses/{id}:
 *   get:
 *     summary: Get a single expense record by ID
 *     tags: [Expenses]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The expense record ID
 *     responses:
 *       200:
 *         description: Expense retrieved successfully
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
 *                   example: Expense retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/Expense'
 *       404:
 *         description: Expense not found
 *       401:
 *         description: Authentication required
 */
router.get('/:id', expensesController.getById);

/**
 * @swagger
 * /api/expenses/{id}:
 *   patch:
 *     summary: Update an existing expense record
 *     tags: [Expenses]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The expense record ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 format: float
 *                 description: Positive expense amount
 *                 example: 55.00
 *               category:
 *                 type: string
 *                 enum: [FOOD, TRANSPORT, ENTERTAINMENT, SHOPPING, EDUCATION, HEALTH, UTILITIES, RENT, PERSONAL, OTHER]
 *                 description: Expense category
 *                 example: "TRANSPORT"
 *               date:
 *                 type: string
 *                 format: date-time
 *                 description: ISO 8601 date of the expense
 *                 example: "2026-02-21T09:00:00.000Z"
 *               notes:
 *                 type: string
 *                 nullable: true
 *                 description: Optional notes about the expense
 *                 example: "Updated notes"
 *     responses:
 *       200:
 *         description: Expense updated successfully
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
 *                   example: Expense updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Expense'
 *       404:
 *         description: Expense not found
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 */
router.patch('/:id', validate(updateExpenseSchema), expensesController.update);

/**
 * @swagger
 * /api/expenses/{id}:
 *   delete:
 *     summary: Delete an expense record
 *     tags: [Expenses]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The expense record ID
 *     responses:
 *       200:
 *         description: Expense deleted successfully
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
 *                   example: Expense deleted successfully
 *                 data:
 *                   $ref: '#/components/schemas/Expense'
 *       404:
 *         description: Expense not found
 *       401:
 *         description: Authentication required
 */
router.delete('/:id', expensesController.remove);

/**
 * @swagger
 * components:
 *   schemas:
 *     Expense:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "e1f2a3b4-c5d6-7890-abcd-ef1234567890"
 *         userId:
 *           type: string
 *           format: uuid
 *           example: "u1v2w3x4-y5z6-7890-abcd-ef1234567890"
 *         amount:
 *           type: number
 *           format: float
 *           example: 45.50
 *         category:
 *           type: string
 *           enum: [FOOD, TRANSPORT, ENTERTAINMENT, SHOPPING, EDUCATION, HEALTH, UTILITIES, RENT, PERSONAL, OTHER]
 *           example: "FOOD"
 *         date:
 *           type: string
 *           format: date-time
 *           example: "2026-02-20T12:30:00.000Z"
 *         notes:
 *           type: string
 *           nullable: true
 *           example: "Lunch at the cafeteria"
 *         isImpulse:
 *           type: boolean
 *           example: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

module.exports = router;
