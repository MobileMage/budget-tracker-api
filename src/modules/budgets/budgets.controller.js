const budgetService = require('./budgets.service');
const { success, error } = require('../../utils/apiResponse');

/**
 * POST /budgets
 * Create a new budget for the authenticated user.
 */
async function create(req, res) {
  try {
    const budget = await budgetService.createBudget(req.user.id, req.body);
    return success(res, budget, 'Budget created successfully', 201);
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
}

/**
 * GET /budgets
 * List all budgets for the authenticated user, with optional query filters.
 */
async function list(req, res) {
  try {
    const budgets = await budgetService.getBudgets(req.user.id, req.query);
    return success(res, budgets, 'Budgets retrieved successfully');
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
}

/**
 * GET /budgets/:id
 * Get a single budget by ID for the authenticated user.
 */
async function getById(req, res) {
  try {
    const budget = await budgetService.getBudgetById(req.user.id, req.params.id);
    return success(res, budget, 'Budget retrieved successfully');
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
}

/**
 * PATCH /budgets/:id
 * Update a budget's limit and/or period.
 */
async function update(req, res) {
  try {
    const budget = await budgetService.updateBudget(
      req.user.id,
      req.params.id,
      req.body
    );
    return success(res, budget, 'Budget updated successfully');
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
}

/**
 * DELETE /budgets/:id
 * Delete a budget owned by the authenticated user.
 */
async function remove(req, res) {
  try {
    await budgetService.deleteBudget(req.user.id, req.params.id);
    return success(res, null, 'Budget deleted successfully');
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
}

/**
 * GET /budgets/status
 * Get spending status for every budget the authenticated user owns.
 */
async function getStatus(req, res) {
  try {
    const statuses = await budgetService.getBudgetStatus(req.user.id);
    return success(res, statuses, 'Budget status retrieved successfully');
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
}

module.exports = {
  create,
  list,
  getById,
  update,
  remove,
  getStatus,
};
