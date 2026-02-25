const prisma = require('../../config/database');
const alertsService = require('../alerts/alerts.service');

/**
 * Create a new expense record for the given user.
 *
 * After successful creation the alert detection routines are triggered
 * (overspending and impulse-spending checks). Alert failures are caught
 * and logged so they never prevent the expense from being saved.
 *
 * @param {string} userId - The ID of the authenticated user.
 * @param {object} data - Expense data.
 * @param {number} data.amount          - Positive expense amount.
 * @param {string} data.category        - One of the ExpenseCategory enum values.
 * @param {Date}   data.date            - Date of the expense.
 * @param {string} [data.notes]         - Optional notes.
 * @returns {Promise<object>} The created expense record.
 */
async function createExpense(userId, data) {
  const expense = await prisma.expense.create({
    data: {
      userId,
      amount: data.amount,
      category: data.category,
      date: data.date,
      notes: data.notes || null,
    },
  });

  // Trigger alert checks asynchronously — failures must not break expense creation
  try {
    await Promise.all([
      alertsService.checkOverspending(userId, expense),
      alertsService.checkImpulseSpending(userId, expense),
    ]);
  } catch (err) {
    // Log but do not propagate — expense creation should still succeed
    console.error('Alert check failed after expense creation:', err.message);
  }

  return expense;
}

/**
 * Retrieve a paginated list of expenses for a user, optionally filtered
 * by date range and category.
 *
 * @param {string} userId - The ID of the authenticated user.
 * @param {object} query - Query parameters.
 * @param {Date}   [query.startDate]    - Start of date range (inclusive).
 * @param {Date}   [query.endDate]      - End of date range (inclusive).
 * @param {string} [query.category]     - Filter by expense category.
 * @param {number} [query.page=1]       - Page number.
 * @param {number} [query.limit=10]     - Records per page.
 * @param {string} [query.sortBy='date']    - Field to sort by.
 * @param {string} [query.sortOrder='desc'] - Sort direction.
 * @returns {Promise<{ expenses: object[], total: number, page: number, totalPages: number }>}
 */
async function getExpenses(userId, query) {
  const {
    startDate,
    endDate,
    category,
    page = 1,
    limit = 10,
    sortBy = 'date',
    sortOrder = 'desc',
  } = query;

  const where = { userId };

  if (startDate || endDate) {
    where.date = {};
    if (startDate) {
      where.date.gte = startDate;
    }
    if (endDate) {
      where.date.lte = endDate;
    }
  }

  if (category) {
    where.category = category;
  }

  const skip = (page - 1) * limit;

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.expense.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    expenses,
    total,
    page,
    totalPages,
  };
}

/**
 * Get a single expense record by ID, verifying that it belongs to the user.
 *
 * @param {string} userId    - The ID of the authenticated user.
 * @param {string} expenseId - The ID of the expense record to retrieve.
 * @returns {Promise<object|null>} The expense record or null if not found / not owned.
 */
async function getExpenseById(userId, expenseId) {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
  });

  if (!expense || expense.userId !== userId) {
    return null;
  }

  return expense;
}

/**
 * Update an existing expense record, verifying ownership.
 *
 * @param {string} userId    - The ID of the authenticated user.
 * @param {string} expenseId - The ID of the expense record to update.
 * @param {object} data      - Fields to update.
 * @returns {Promise<object|null>} The updated expense record or null if not found / not owned.
 */
async function updateExpense(userId, expenseId, data) {
  const existing = await prisma.expense.findUnique({
    where: { id: expenseId },
  });

  if (!existing || existing.userId !== userId) {
    return null;
  }

  const updated = await prisma.expense.update({
    where: { id: expenseId },
    data,
  });

  return updated;
}

/**
 * Delete an expense record, verifying ownership.
 *
 * @param {string} userId    - The ID of the authenticated user.
 * @param {string} expenseId - The ID of the expense record to delete.
 * @returns {Promise<object|null>} The deleted expense record or null if not found / not owned.
 */
async function deleteExpense(userId, expenseId) {
  const existing = await prisma.expense.findUnique({
    where: { id: expenseId },
  });

  if (!existing || existing.userId !== userId) {
    return null;
  }

  const deleted = await prisma.expense.delete({
    where: { id: expenseId },
  });

  return deleted;
}

/**
 * Get expense totals grouped by category for a user within a date range.
 *
 * @param {string} userId    - The ID of the authenticated user.
 * @param {Date}   startDate - Start of the period (inclusive).
 * @param {Date}   endDate   - End of the period (inclusive).
 * @returns {Promise<Array<{ category: string, total: number }>>}
 *   Array of objects with category name and total amount.
 */
async function getExpensesByCategory(userId, startDate, endDate) {
  const results = await prisma.expense.groupBy({
    by: ['category'],
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    _sum: {
      amount: true,
    },
    orderBy: {
      _sum: {
        amount: 'desc',
      },
    },
  });

  return results.map((r) => ({
    category: r.category,
    total: r._sum.amount || 0,
  }));
}

/**
 * Calculate the total expenses for a user within a date range.
 *
 * @param {string} userId    - The ID of the authenticated user.
 * @param {Date}   startDate - Start of the period (inclusive).
 * @param {Date}   endDate   - End of the period (inclusive).
 * @returns {Promise<number>} The sum of expense amounts in the period.
 */
async function getTotalExpenses(userId, startDate, endDate) {
  const result = await prisma.expense.aggregate({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    _sum: {
      amount: true,
    },
  });

  return result._sum.amount || 0;
}

module.exports = {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpensesByCategory,
  getTotalExpenses,
};
