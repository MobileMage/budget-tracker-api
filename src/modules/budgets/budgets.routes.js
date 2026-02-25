const { Router } = require('express');
const authenticate = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const { createBudgetSchema, updateBudgetSchema } = require('./budgets.validator');
const budgetController = require('./budgets.controller');

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Budgets
 *   description: Budget management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Budget:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         category:
 *           type: string
 *           enum: [FOOD, TRANSPORT, ENTERTAINMENT, SHOPPING, EDUCATION, HEALTH, UTILITIES, RENT, PERSONAL, OTHER]
 *         limit:
 *           type: number
 *           format: float
 *         period:
 *           type: string
 *           enum: [WEEKLY, MONTHLY]
 *         startDate:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     BudgetStatus:
 *       type: object
 *       properties:
 *         budget:
 *           $ref: '#/components/schemas/Budget'
 *         spent:
 *           type: number
 *           format: float
 *         remaining:
 *           type: number
 *           format: float
 *         percentUsed:
 *           type: number
 *           format: float
 */

/**
 * @swagger
 * /budgets:
 *   post:
 *     summary: Create a new budget
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *               - limit
 *               - period
 *               - startDate
 *             properties:
 *               category:
 *                 type: string
 *                 enum: [FOOD, TRANSPORT, ENTERTAINMENT, SHOPPING, EDUCATION, HEALTH, UTILITIES, RENT, PERSONAL, OTHER]
 *               limit:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 exclusiveMinimum: true
 *               period:
 *                 type: string
 *                 enum: [WEEKLY, MONTHLY]
 *               startDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Budget created successfully
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
 *                   $ref: '#/components/schemas/Budget'
 *       409:
 *         description: Budget already exists for this category and period
 *       401:
 *         description: Authentication required
 */
router.post('/', authenticate, validate(createBudgetSchema), budgetController.create);

/**
 * @swagger
 * /budgets:
 *   get:
 *     summary: List all budgets for the authenticated user
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [FOOD, TRANSPORT, ENTERTAINMENT, SHOPPING, EDUCATION, HEALTH, UTILITIES, RENT, PERSONAL, OTHER]
 *         description: Filter by expense category
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [WEEKLY, MONTHLY]
 *         description: Filter by budget period
 *     responses:
 *       200:
 *         description: Budgets retrieved successfully
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
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Budget'
 *       401:
 *         description: Authentication required
 */
router.get('/', authenticate, budgetController.list);

/**
 * @swagger
 * /budgets/status:
 *   get:
 *     summary: Get spending status for all budgets
 *     description: Returns each budget with the amount spent in the current period, remaining balance, and percentage used.
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Budget status retrieved successfully
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
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BudgetStatus'
 *       401:
 *         description: Authentication required
 */
router.get('/status', authenticate, budgetController.getStatus);

/**
 * @swagger
 * /budgets/{id}:
 *   get:
 *     summary: Get a single budget by ID
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Budget ID
 *     responses:
 *       200:
 *         description: Budget retrieved successfully
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
 *                   $ref: '#/components/schemas/Budget'
 *       404:
 *         description: Budget not found
 *       401:
 *         description: Authentication required
 */
router.get('/:id', authenticate, budgetController.getById);

/**
 * @swagger
 * /budgets/{id}:
 *   patch:
 *     summary: Update a budget's limit and/or period
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Budget ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               limit:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 exclusiveMinimum: true
 *               period:
 *                 type: string
 *                 enum: [WEEKLY, MONTHLY]
 *     responses:
 *       200:
 *         description: Budget updated successfully
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
 *                   $ref: '#/components/schemas/Budget'
 *       404:
 *         description: Budget not found
 *       401:
 *         description: Authentication required
 */
router.patch('/:id', authenticate, validate(updateBudgetSchema), budgetController.update);

/**
 * @swagger
 * /budgets/{id}:
 *   delete:
 *     summary: Delete a budget
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Budget ID
 *     responses:
 *       200:
 *         description: Budget deleted successfully
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
 *                   type: 'null'
 *       404:
 *         description: Budget not found
 *       401:
 *         description: Authentication required
 */
router.delete('/:id', authenticate, budgetController.remove);

module.exports = router;
