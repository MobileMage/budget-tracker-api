const expensesService = require('./expenses.service');
const { success, error } = require('../../utils/apiResponse');
const { queryExpenseSchema } = require('./expenses.validator');

/**
 * POST / - Create a new expense record.
 */
async function create(req, res) {
  try {
    const expense = await expensesService.createExpense(req.user.id, req.body);
    return success(res, expense, 'Expense created successfully', 201);
  } catch (err) {
    return error(res, 'Failed to create expense', 500);
  }
}

/**
 * GET / - List expense records with optional filtering, sorting, and pagination.
 */
async function list(req, res) {
  try {
    const parsed = queryExpenseSchema.safeParse(req.query);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return error(res, 'Validation failed', 400, errors);
    }

    const result = await expensesService.getExpenses(req.user.id, parsed.data);
    return success(res, result, 'Expenses retrieved successfully');
  } catch (err) {
    return error(res, 'Failed to retrieve expenses', 500);
  }
}

/**
 * GET /:id - Get a single expense record by ID.
 */
async function getById(req, res) {
  try {
    const expense = await expensesService.getExpenseById(req.user.id, req.params.id);

    if (!expense) {
      return error(res, 'Expense not found', 404);
    }

    return success(res, expense, 'Expense retrieved successfully');
  } catch (err) {
    return error(res, 'Failed to retrieve expense', 500);
  }
}

/**
 * PATCH /:id - Update an existing expense record.
 */
async function update(req, res) {
  try {
    const expense = await expensesService.updateExpense(req.user.id, req.params.id, req.body);

    if (!expense) {
      return error(res, 'Expense not found', 404);
    }

    return success(res, expense, 'Expense updated successfully');
  } catch (err) {
    return error(res, 'Failed to update expense', 500);
  }
}

/**
 * DELETE /:id - Delete an expense record.
 */
async function remove(req, res) {
  try {
    const expense = await expensesService.deleteExpense(req.user.id, req.params.id);

    if (!expense) {
      return error(res, 'Expense not found', 404);
    }

    return success(res, expense, 'Expense deleted successfully');
  } catch (err) {
    return error(res, 'Failed to delete expense', 500);
  }
}

/**
 * GET /by-category - Get expense totals grouped by category for a date period.
 */
async function byCategory(req, res) {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return error(res, 'startDate and endDate query parameters are required', 400);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return error(res, 'startDate and endDate must be valid ISO date strings', 400);
    }

    const categories = await expensesService.getExpensesByCategory(req.user.id, start, end);
    return success(res, categories, 'Expenses by category retrieved successfully');
  } catch (err) {
    return error(res, 'Failed to retrieve expenses by category', 500);
  }
}

/**
 * GET /total - Get total expenses for a date period.
 */
async function getTotal(req, res) {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return error(res, 'startDate and endDate query parameters are required', 400);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return error(res, 'startDate and endDate must be valid ISO date strings', 400);
    }

    const total = await expensesService.getTotalExpenses(req.user.id, start, end);
    return success(res, { total }, 'Total expenses retrieved successfully');
  } catch (err) {
    return error(res, 'Failed to retrieve total expenses', 500);
  }
}

module.exports = {
  create,
  list,
  getById,
  update,
  remove,
  byCategory,
  getTotal,
};
