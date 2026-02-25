const incomeService = require('./income.service');
const { success, error } = require('../../utils/apiResponse');
const { queryIncomeSchema } = require('./income.validator');

/**
 * POST / - Create a new income record.
 */
async function create(req, res) {
  try {
    const income = await incomeService.createIncome(req.user.id, req.body);
    return success(res, income, 'Income created successfully', 201);
  } catch (err) {
    return error(res, 'Failed to create income', 500);
  }
}

/**
 * GET / - List income records with optional date filtering and pagination.
 */
async function list(req, res) {
  try {
    const parsed = queryIncomeSchema.safeParse(req.query);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return error(res, 'Validation failed', 400, errors);
    }

    const result = await incomeService.getIncomes(req.user.id, parsed.data);
    return success(res, result, 'Incomes retrieved successfully');
  } catch (err) {
    return error(res, 'Failed to retrieve incomes', 500);
  }
}

/**
 * GET /:id - Get a single income record by ID.
 */
async function getById(req, res) {
  try {
    const income = await incomeService.getIncomeById(req.user.id, req.params.id);

    if (!income) {
      return error(res, 'Income not found', 404);
    }

    return success(res, income, 'Income retrieved successfully');
  } catch (err) {
    return error(res, 'Failed to retrieve income', 500);
  }
}

/**
 * PATCH /:id - Update an existing income record.
 */
async function update(req, res) {
  try {
    const income = await incomeService.updateIncome(req.user.id, req.params.id, req.body);

    if (!income) {
      return error(res, 'Income not found', 404);
    }

    return success(res, income, 'Income updated successfully');
  } catch (err) {
    return error(res, 'Failed to update income', 500);
  }
}

/**
 * DELETE /:id - Delete an income record.
 */
async function remove(req, res) {
  try {
    const income = await incomeService.deleteIncome(req.user.id, req.params.id);

    if (!income) {
      return error(res, 'Income not found', 404);
    }

    return success(res, income, 'Income deleted successfully');
  } catch (err) {
    return error(res, 'Failed to delete income', 500);
  }
}

/**
 * GET /total - Get total income for a date period.
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

    const total = await incomeService.getTotalIncome(req.user.id, start, end);
    return success(res, { total }, 'Total income retrieved successfully');
  } catch (err) {
    return error(res, 'Failed to retrieve total income', 500);
  }
}

module.exports = {
  create,
  list,
  getById,
  update,
  remove,
  getTotal,
};
