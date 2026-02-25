const prisma = require('../../config/database');

/**
 * Create a new income record for the given user.
 *
 * @param {string} userId - The ID of the authenticated user.
 * @param {object} data - Income data.
 * @param {number} data.amount - Positive income amount.
 * @param {string} data.source - Description of the income source.
 * @param {Date}   data.date   - Date of the income.
 * @param {string} [data.notes] - Optional notes.
 * @returns {Promise<object>} The created income record.
 */
async function createIncome(userId, data) {
  const income = await prisma.income.create({
    data: {
      userId,
      amount: data.amount,
      source: data.source,
      date: data.date,
      notes: data.notes || null,
    },
  });

  return income;
}

/**
 * Retrieve a paginated list of income records for a user, optionally
 * filtered by date range.
 *
 * @param {string} userId - The ID of the authenticated user.
 * @param {object} query - Query parameters.
 * @param {Date}   [query.startDate] - Start of date range (inclusive).
 * @param {Date}   [query.endDate]   - End of date range (inclusive).
 * @param {number} [query.page=1]    - Page number.
 * @param {number} [query.limit=10]  - Records per page.
 * @returns {Promise<{ incomes: object[], total: number, page: number, totalPages: number }>}
 */
async function getIncomes(userId, query) {
  const { startDate, endDate, page = 1, limit = 10 } = query;

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

  const skip = (page - 1) * limit;

  const [incomes, total] = await Promise.all([
    prisma.income.findMany({
      where,
      orderBy: { date: 'desc' },
      skip,
      take: limit,
    }),
    prisma.income.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    incomes,
    total,
    page,
    totalPages,
  };
}

/**
 * Get a single income record by ID, verifying that it belongs to the user.
 *
 * @param {string} userId   - The ID of the authenticated user.
 * @param {string} incomeId - The ID of the income record to retrieve.
 * @returns {Promise<object|null>} The income record or null if not found / not owned.
 */
async function getIncomeById(userId, incomeId) {
  const income = await prisma.income.findUnique({
    where: { id: incomeId },
  });

  if (!income || income.userId !== userId) {
    return null;
  }

  return income;
}

/**
 * Update an existing income record, verifying ownership.
 *
 * @param {string} userId   - The ID of the authenticated user.
 * @param {string} incomeId - The ID of the income record to update.
 * @param {object} data     - Fields to update.
 * @returns {Promise<object|null>} The updated income record or null if not found / not owned.
 */
async function updateIncome(userId, incomeId, data) {
  const existing = await prisma.income.findUnique({
    where: { id: incomeId },
  });

  if (!existing || existing.userId !== userId) {
    return null;
  }

  const updated = await prisma.income.update({
    where: { id: incomeId },
    data,
  });

  return updated;
}

/**
 * Delete an income record, verifying ownership.
 *
 * @param {string} userId   - The ID of the authenticated user.
 * @param {string} incomeId - The ID of the income record to delete.
 * @returns {Promise<object|null>} The deleted income record or null if not found / not owned.
 */
async function deleteIncome(userId, incomeId) {
  const existing = await prisma.income.findUnique({
    where: { id: incomeId },
  });

  if (!existing || existing.userId !== userId) {
    return null;
  }

  const deleted = await prisma.income.delete({
    where: { id: incomeId },
  });

  return deleted;
}

/**
 * Calculate the total income for a user within a date range.
 *
 * @param {string} userId    - The ID of the authenticated user.
 * @param {Date}   startDate - Start of the period (inclusive).
 * @param {Date}   endDate   - End of the period (inclusive).
 * @returns {Promise<number>} The sum of income amounts in the period.
 */
async function getTotalIncome(userId, startDate, endDate) {
  const result = await prisma.income.aggregate({
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
  createIncome,
  getIncomes,
  getIncomeById,
  updateIncome,
  deleteIncome,
  getTotalIncome,
};
