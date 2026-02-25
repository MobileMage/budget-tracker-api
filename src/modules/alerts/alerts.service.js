const prisma = require('../../config/database');
const {
  getStartOfPeriod,
  getStartOfWeek,
  isLateNight,
} = require('../../utils/dateHelpers');

/**
 * Check if an expense triggers overspending or spike alerts.
 *
 * Called after every expense creation. Performs two checks:
 * 1. If the category has a budget, checks whether total spending exceeds the
 *    budget limit by more than 10% and creates an OVERSPENDING alert.
 * 2. Compares this week's total spending to last week's. If this week is more
 *    than 40% higher, creates a SPIKE alert.
 *
 * @param {string} userId - The user who created the expense.
 * @param {{ id: string, category: string, amount: number, date: Date }} expense
 * @returns {Promise<object[]>} Array of created alert records (may be empty).
 */
async function checkOverspending(userId, expense) {
  const alerts = [];

  // --- 1. Budget overspending check ---
  const budget = await prisma.budget.findFirst({
    where: {
      userId,
      category: expense.category,
    },
  });

  if (budget) {
    const periodStart = getStartOfPeriod(new Date(), budget.period);

    const aggregation = await prisma.expense.aggregate({
      where: {
        userId,
        category: expense.category,
        date: { gte: periodStart },
      },
      _sum: { amount: true },
    });

    const totalSpent = aggregation._sum.amount || 0;
    const overspendThreshold = budget.limit * 1.1;

    if (totalSpent > overspendThreshold) {
      const percentOver = Math.round(((totalSpent - budget.limit) / budget.limit) * 100);
      const alert = await prisma.alert.create({
        data: {
          userId,
          type: 'OVERSPENDING',
          message: `You have exceeded your ${budget.period.toLowerCase()} ${expense.category} budget of $${budget.limit} by ${percentOver}%. Total spent: $${totalSpent.toFixed(2)}.`,
        },
      });
      alerts.push(alert);
    }
  }

  // --- 2. Weekly spending spike check ---
  const now = new Date();
  const thisWeekStart = getStartOfWeek(now);

  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeekStart.getTime() - 1);

  const [thisWeekAgg, lastWeekAgg] = await Promise.all([
    prisma.expense.aggregate({
      where: {
        userId,
        date: { gte: thisWeekStart },
      },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: {
        userId,
        date: {
          gte: lastWeekStart,
          lte: lastWeekEnd,
        },
      },
      _sum: { amount: true },
    }),
  ]);

  const thisWeekTotal = thisWeekAgg._sum.amount || 0;
  const lastWeekTotal = lastWeekAgg._sum.amount || 0;

  if (lastWeekTotal > 0) {
    const percentIncrease = ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100;

    if (percentIncrease > 40) {
      const alert = await prisma.alert.create({
        data: {
          userId,
          type: 'SPIKE',
          message: `Your spending this week ($${thisWeekTotal.toFixed(2)}) is ${Math.round(percentIncrease)}% higher than last week ($${lastWeekTotal.toFixed(2)}).`,
        },
      });
      alerts.push(alert);
    }
  } else if (thisWeekTotal > 0 && lastWeekTotal === 0) {
    // No spending last week but spending this week counts as a spike
    const alert = await prisma.alert.create({
      data: {
        userId,
        type: 'SPIKE',
        message: `Spending spike detected. You spent $${thisWeekTotal.toFixed(2)} this week with no recorded spending last week.`,
      },
    });
    alerts.push(alert);
  }

  return alerts;
}

/**
 * Check if an expense shows impulse spending patterns.
 *
 * Called after every expense creation. Performs three checks:
 * 1. If the user made 3+ purchases in the last 60 minutes, flags the expense
 *    as impulse and creates an IMPULSE alert.
 * 2. If the expense was made between 11 PM and 2 AM, creates a LATE_NIGHT alert.
 * 3. If the user received income in the last 24 hours, creates a POST_INCOME alert.
 *
 * @param {string} userId - The user who created the expense.
 * @param {{ id: string, category: string, amount: number, date: Date, createdAt: Date }} expense
 * @returns {Promise<object[]>} Array of created alert records (may be empty).
 */
async function checkImpulseSpending(userId, expense) {
  const alerts = [];
  const expenseTime = new Date(expense.createdAt || expense.date);

  // --- 1. Rapid purchase detection (3+ in 60 minutes) ---
  const sixtyMinutesAgo = new Date(expenseTime.getTime() - 60 * 60 * 1000);

  const recentExpenses = await prisma.expense.findMany({
    where: {
      userId,
      createdAt: {
        gte: sixtyMinutesAgo,
        lte: expenseTime,
      },
    },
  });

  if (recentExpenses.length >= 3) {
    await prisma.expense.update({
      where: { id: expense.id },
      data: { isImpulse: true },
    });

    const alert = await prisma.alert.create({
      data: {
        userId,
        type: 'IMPULSE',
        message: `Impulse spending detected: ${recentExpenses.length} purchases made within the last 60 minutes totaling $${recentExpenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}.`,
      },
    });
    alerts.push(alert);
  }

  // --- 2. Late night spending check (11 PM - 2 AM) ---
  const expenseDate = new Date(expense.date);
  if (isLateNight(expenseDate)) {
    const alert = await prisma.alert.create({
      data: {
        userId,
        type: 'LATE_NIGHT',
        message: `Late night spending detected: $${expense.amount.toFixed(2)} on ${expense.category} at ${expenseDate.toLocaleTimeString()}.`,
      },
    });
    alerts.push(alert);
  }

  // --- 3. Post-income spending check (income in last 24 hours) ---
  const twentyFourHoursAgo = new Date(expenseTime.getTime() - 24 * 60 * 60 * 1000);

  const recentIncome = await prisma.income.findFirst({
    where: {
      userId,
      date: {
        gte: twentyFourHoursAgo,
        lte: expenseTime,
      },
    },
  });

  if (recentIncome) {
    const alert = await prisma.alert.create({
      data: {
        userId,
        type: 'POST_INCOME',
        message: `Post-income spending detected: $${expense.amount.toFixed(2)} spent on ${expense.category} within 24 hours of receiving $${recentIncome.amount.toFixed(2)} from ${recentIncome.source}.`,
      },
    });
    alerts.push(alert);
  }

  return alerts;
}

/**
 * Get a paginated list of alerts for a user with optional filters.
 *
 * @param {string} userId - The authenticated user's ID.
 * @param {{ type?: string, isRead?: string, page?: string, limit?: string }} query
 * @returns {Promise<{ alerts: object[], total: number, page: number, limit: number, totalPages: number }>}
 */
async function getAlerts(userId, query = {}) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const where = { userId };

  if (query.type) {
    where.type = query.type;
  }

  if (query.isRead !== undefined && query.isRead !== '') {
    where.isRead = query.isRead === 'true';
  }

  const [alerts, total] = await Promise.all([
    prisma.alert.findMany({
      where,
      orderBy: { triggeredAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.alert.count({ where }),
  ]);

  return {
    alerts,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Mark a single alert as read, verifying ownership.
 *
 * @param {string} userId  - The authenticated user's ID.
 * @param {string} alertId - The alert record's ID.
 * @returns {Promise<object>} The updated alert record.
 * @throws {Error} 404 if not found or not owned by the user.
 */
async function markAsRead(userId, alertId) {
  const alert = await prisma.alert.findUnique({
    where: { id: alertId },
  });

  if (!alert || alert.userId !== userId) {
    const err = new Error('Alert not found');
    err.statusCode = 404;
    throw err;
  }

  const updated = await prisma.alert.update({
    where: { id: alertId },
    data: { isRead: true },
  });

  return updated;
}

/**
 * Mark all alerts as read for a user.
 *
 * @param {string} userId - The authenticated user's ID.
 * @returns {Promise<{ count: number }>} The number of alerts updated.
 */
async function markAllAsRead(userId) {
  const result = await prisma.alert.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return { count: result.count };
}

/**
 * Count unread alerts for a user.
 *
 * @param {string} userId - The authenticated user's ID.
 * @returns {Promise<{ count: number }>}
 */
async function getUnreadCount(userId) {
  const count = await prisma.alert.count({
    where: { userId, isRead: false },
  });

  return { count };
}

module.exports = {
  checkOverspending,
  checkImpulseSpending,
  getAlerts,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};
