const { Router } = require('express');
const controller = require('./recommendations.controller');
const authenticate = require('../../middleware/authenticate');

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Recommendations
 *   description: Personalized saving tips and recommendation engine
 */

/**
 * @swagger
 * /api/recommendations/generate:
 *   post:
 *     summary: Generate personalized recommendations based on spending patterns
 *     description: >
 *       Evaluates the user's current month spending data against a set of
 *       behavioral rules and creates recommendation records for each matching
 *       rule. Previous recommendations are replaced.
 *     tags: [Recommendations]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Recommendations generated successfully
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
 *                   example: Recommendations generated successfully
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
 *                       tip:
 *                         type: string
 *                         example: Consider meal prepping to cut food costs by up to 30%.
 *                       category:
 *                         type: string
 *                         nullable: true
 *                         enum: [FOOD, TRANSPORT, ENTERTAINMENT, SHOPPING, EDUCATION, HEALTH, UTILITIES, RENT, PERSONAL, OTHER, null]
 *                       generatedAt:
 *                         type: string
 *                         format: date-time
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
router.post('/generate', authenticate, controller.generateRecommendations);

/**
 * @swagger
 * /api/recommendations:
 *   get:
 *     summary: List recommendations with optional category filter and pagination
 *     tags: [Recommendations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         required: false
 *         schema:
 *           type: string
 *           enum: [FOOD, TRANSPORT, ENTERTAINMENT, SHOPPING, EDUCATION, HEALTH, UTILITIES, RENT, PERSONAL, OTHER]
 *         description: Filter recommendations by expense category
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number (1-indexed)
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Recommendations retrieved successfully
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
 *                   example: Recommendations retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     recommendations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           userId:
 *                             type: string
 *                             format: uuid
 *                           tip:
 *                             type: string
 *                           category:
 *                             type: string
 *                             nullable: true
 *                           generatedAt:
 *                             type: string
 *                             format: date-time
 *                     total:
 *                       type: integer
 *                       example: 5
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     totalPages:
 *                       type: integer
 *                       example: 1
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
router.get('/', authenticate, controller.getRecommendations);

/**
 * @swagger
 * /api/recommendations/{id}:
 *   delete:
 *     summary: Dismiss (delete) a recommendation
 *     tags: [Recommendations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The recommendation ID to dismiss
 *     responses:
 *       200:
 *         description: Recommendation dismissed successfully
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
 *                   example: Recommendation dismissed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     userId:
 *                       type: string
 *                       format: uuid
 *                     tip:
 *                       type: string
 *                     category:
 *                       type: string
 *                       nullable: true
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Recommendation not found
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
 *                   example: Recommendation not found
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
router.delete('/:id', authenticate, controller.dismissRecommendation);

module.exports = router;
