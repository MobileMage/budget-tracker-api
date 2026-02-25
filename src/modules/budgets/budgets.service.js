const prisma = require('../../config/database');
const { getStartOfPeriod } = require('../../utils/dateHelpers');

/**
 * Create a new budget for a user.
 *
 * Enforces the unique constraint on (userId, category, period). If a budget
 * already exists for that combination a 409 error is thrown.
 *
 * @param {string} userId - The authenticated user's ID.
 * @param {{ category: string, limit: number, period: string, startDate: Date }} data
 * @returns {Promise<object>} The newly created budget record.
 * @throws {Error} 409 if a budget already exists for this user/category/period.
 */
async function createBudget(userId, data) {
  const existing = await prisma.budget.findUnique({
    where: {
      userId_category_period: {
        userId,
        category: data.category,
        period: data.period,
      },
    },
  });

  if (existing) {
    const err = new Error(
      `A ${data.period} budget for ${data.category} already exists`
    );
    err.statusCode = 409;
    throw err;
  }

  const budget = await prisma.budget.create({
    data: {
      userId,
      category: data.category,
      limit: data.limit,
      period: data.period,
      startDate: data.startDate,
    },
  });

  return budget;
}

/**
 * List all budgets for a user with optional filtering.
 *
 * @param {string} userId - The authenticated user's ID.
 * @param {{ category?: string, period?: string }} query - Optional filters.
 * @returns {Promise<object[]>} Array of budget records.
 */
async function getBudgets(userId, query = {}) {
  const where = { userId };

  if (query.category) {
    where.category = query.category;
  }

  if (query.period) {
    where.period = query.period;
  }

  const budgets = await prisma.budget.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return budgets;
}

/**
 * Get a single budget by ID, verifying ownership.
 *
 * @param {string} userId   - The authenticated user's ID.
 * @param {string} budgetId - The budget record's ID.
 * @returns {Promise<object>} The budget record.
 * @throws {Error} 404 if not found or not owned by the user.
 */
async function getBudgetById(userId, budgetId) {
  const budget = await prisma.budget.findUnique({
    where: { id: budgetId },
  });

  if (!budget || budget.userId !== userId) {
    const err = new Error('Budget not found');
    err.statusCode = 404;
    throw err;
  }

  return budget;
}

/**
 * Update an existing budget's limit and/or period, verifying ownership.
 *
 * @param {string} userId   - The authenticated user's ID.
 * @param {string} budgetId - The budget record's ID.
 * @param {{ limit?: number, period?: string }} data - Fields to update.
 * @returns {Promise<object>} The updated budget record.
 * @throws {Error} 404 if not found or not owned by the user.
 */
async function updateBudget(userId, budgetId, data) {
  const budget = await prisma.budget.findUnique({
    where: { id: budgetId },
  });

  if (!budget || budget.userId !== userId) {
    const err = new Error('Budget not found');
    err.statusCode = 404;
    throw err;
  }

  const updateData = {};
  if (data.limit !== undefined) {
    updateData.limit = data.limit;
  }
  if (data.period !== undefined) {
    updateData.period = data.period;
  }

  const updated = await prisma.budget.update({
    where: { id: budgetId },
    data: updateData,
  });

  return updated;
}

/**
 * Delete a budget, verifying ownership.
 *
 * @param {string} userId   - The authenticated user's ID.
 * @param {string} budgetId - The budget record's ID.
 * @returns {Promise<object>} The deleted budget record.
 * @throws {Error} 404 if not found or not owned by the user.
 */
async function deleteBudget(userId, budgetId) {
  const budget = await prisma.budget.findUnique({
    where: { id: budgetId },
  });

  if (!budget || budget.userId !== userId) {
    const err = new Error('Budget not found');
    err.statusCode = 404;
    throw err;
  }

  const deleted = await prisma.budget.delete({
    where: { id: budgetId },
  });

  return deleted;
}

/**
 * Get budget status for all of a user's budgets.
 *
 * For each budget, calculates the total spending in its category during the
 * current active period (week or month) and returns how much has been spent,
 * how much remains, and the percentage used.
 *
 * @param {string} userId - The authenticated user's ID.
 * @returns {Promise<Array<{ budget: object, spent: number, remaining: number, percentUsed: number }>>}
 */
async function getBudgetStatus(userId) {
  const budgets = await prisma.budget.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  const statuses = await Promise.all(
    budgets.map(async (budget) => {
      const periodStart = getStartOfPeriod(new Date(), budget.period);

      const aggregation = await prisma.expense.aggregate({
        where: {
          userId,
          category: budget.category,
          date: {
            gte: periodStart,
          },
        },
        _sum: {
          amount: true,
        },
      });

      const spent = aggregation._sum.amount || 0;
      const remaining = Math.max(budget.limit - spent, 0);
      const percentUsed =
        budget.limit > 0
          ? Math.round((spent / budget.limit) * 10000) / 100
          : 0;

      return {
        budget,
        spent,
        remaining,
        percentUsed,
      };
    })
  );

  return statuses;
}

module.exports = {
  createBudget,
  getBudgets,
  getBudgetById,
  updateBudget,
  deleteBudget,
  getBudgetStatus,
};
