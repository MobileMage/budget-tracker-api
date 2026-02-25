const { Router } = require('express');
const authenticate = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const { createIncomeSchema, updateIncomeSchema } = require('./income.validator');
const incomeController = require('./income.controller');

const router = Router();

// All income routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Income
 *   description: Income management endpoints
 */

/**
 * @swagger
 * /api/income:
 *   post:
 *     summary: Create a new income record
 *     tags: [Income]
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
 *               - source
 *               - date
 *             properties:
 *               amount:
 *                 type: number
 *                 format: float
 *                 description: Positive income amount
 *                 example: 2500.00
 *               source:
 *                 type: string
 *                 description: Description of the income source
 *                 example: "Part-time job"
 *               date:
 *                 type: string
 *                 format: date-time
 *                 description: ISO 8601 date of the income
 *                 example: "2026-02-01T00:00:00.000Z"
 *               notes:
 *                 type: string
 *                 description: Optional notes about the income
 *                 example: "February salary"
 *     responses:
 *       201:
 *         description: Income created successfully
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
 *                   example: Income created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Income'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 */
router.post('/', validate(createIncomeSchema), incomeController.create);

/**
 * @swagger
 * /api/income:
 *   get:
 *     summary: List income records with optional filtering and pagination
 *     tags: [Income]
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
 *     responses:
 *       200:
 *         description: Incomes retrieved successfully
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
 *                   example: Incomes retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     incomes:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Income'
 *                     total:
 *                       type: integer
 *                       example: 25
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *       401:
 *         description: Authentication required
 */
router.get('/', incomeController.list);

/**
 * @swagger
 * /api/income/total:
 *   get:
 *     summary: Get the total income for a date period
 *     tags: [Income]
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
 *         description: Total income retrieved successfully
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
 *                   example: Total income retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                       format: float
 *                       example: 5000.00
 *       400:
 *         description: Missing or invalid date parameters
 *       401:
 *         description: Authentication required
 */
router.get('/total', incomeController.getTotal);

/**
 * @swagger
 * /api/income/{id}:
 *   get:
 *     summary: Get a single income record by ID
 *     tags: [Income]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The income record ID
 *     responses:
 *       200:
 *         description: Income retrieved successfully
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
 *                   example: Income retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/Income'
 *       404:
 *         description: Income not found
 *       401:
 *         description: Authentication required
 */
router.get('/:id', incomeController.getById);

/**
 * @swagger
 * /api/income/{id}:
 *   patch:
 *     summary: Update an existing income record
 *     tags: [Income]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The income record ID
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
 *                 description: Positive income amount
 *                 example: 3000.00
 *               source:
 *                 type: string
 *                 description: Description of the income source
 *                 example: "Freelance project"
 *               date:
 *                 type: string
 *                 format: date-time
 *                 description: ISO 8601 date of the income
 *                 example: "2026-02-15T00:00:00.000Z"
 *               notes:
 *                 type: string
 *                 nullable: true
 *                 description: Optional notes about the income
 *                 example: "Updated notes"
 *     responses:
 *       200:
 *         description: Income updated successfully
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
 *                   example: Income updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Income'
 *       404:
 *         description: Income not found
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 */
router.patch('/:id', validate(updateIncomeSchema), incomeController.update);

/**
 * @swagger
 * /api/income/{id}:
 *   delete:
 *     summary: Delete an income record
 *     tags: [Income]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The income record ID
 *     responses:
 *       200:
 *         description: Income deleted successfully
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
 *                   example: Income deleted successfully
 *                 data:
 *                   $ref: '#/components/schemas/Income'
 *       404:
 *         description: Income not found
 *       401:
 *         description: Authentication required
 */
router.delete('/:id', incomeController.remove);

/**
 * @swagger
 * components:
 *   schemas:
 *     Income:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         userId:
 *           type: string
 *           format: uuid
 *           example: "u1v2w3x4-y5z6-7890-abcd-ef1234567890"
 *         amount:
 *           type: number
 *           format: float
 *           example: 2500.00
 *         source:
 *           type: string
 *           example: "Part-time job"
 *         date:
 *           type: string
 *           format: date-time
 *           example: "2026-02-01T00:00:00.000Z"
 *         notes:
 *           type: string
 *           nullable: true
 *           example: "February salary"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

module.exports = router;
