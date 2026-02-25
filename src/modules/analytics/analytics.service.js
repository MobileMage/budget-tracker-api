const prisma = require('../../config/database');
const {
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth,
  isLateNight,
} = require('../../utils/dateHelpers');
const {
  calculateImpulseScore,
  detectSpendingSpike,
} = require('../../utils/financialHelpers');

/**
 * Returns spending data grouped by day-of-week (0-6, Sunday-Saturday) and
 * hour-of-day (0-23) for the given date range.
 *
 * Each entry contains the total amount spent and the number of transactions
 * that occurred in that day/hour slot.
 *
 * @param {string} userId - The authenticated user's ID
 * @param {Date} startDate - Start of the date range (inclusive)
 * @param {Date} endDate - End of the date range (inclusive)
 * @returns {Promise<Array<{ dayOfWeek: number, hour: number, total: number, count: number }>>}
 */
async function getSpendingHeatmap(userId, startDate, endDate) {
  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: endDate },
    },
    select: {
      amount: true,
      date: true,
    },
  });

  // Build a map keyed by "dayOfWeek-hour"
  const map = {};

  for (const expense of expenses) {
    const d = new Date(expense.date);
    const dayOfWeek = d.getDay(); // 0 = Sunday
    const hour = d.getHours();
    const key = `${dayOfWeek}-${hour}`;

    if (!map[key]) {
      map[key] = { dayOfWeek, hour, total: 0, count: 0 };
    }

    map[key].total += expense.amount;
    map[key].count += 1;
  }

  // Round totals to two decimal places
  const heatmap = Object.values(map).map((entry) => ({
    ...entry,
    total: Math.round(entry.total * 100) / 100,
  }));

  // Sort by dayOfWeek ascending, then hour ascending
  heatmap.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.hour - b.hour);

  return heatmap;
}

/**
 * Returns spending breakdown by category with totals, percentages, and counts
 * for the given date range. Results are sorted by total descending.
 *
 * @param {string} userId - The authenticated user's ID
 * @param {Date} startDate - Start of the date range (inclusive)
 * @param {Date} endDate - End of the date range (inclusive)
 * @returns {Promise<Array<{ category: string, total: number, percentage: number, count: number }>>}
 */
async function getCategoryDominance(userId, startDate, endDate) {
  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: endDate },
    },
    select: {
      amount: true,
      category: true,
    },
  });

  // Aggregate by category
  const categoryMap = {};
  let grandTotal = 0;

  for (const expense of expenses) {
    if (!categoryMap[expense.category]) {
      categoryMap[expense.category] = { total: 0, count: 0 };
    }
    categoryMap[expense.category].total += expense.amount;
    categoryMap[expense.category].count += 1;
    grandTotal += expense.amount;
  }

  const dominance = Object.entries(categoryMap).map(([category, data]) => ({
    category,
    total: Math.round(data.total * 100) / 100,
    percentage:
      grandTotal > 0
        ? Math.round((data.total / grandTotal) * 10000) / 100
        : 0,
    count: data.count,
  }));

  // Sort by total descending
  dominance.sort((a, b) => b.total - a.total);

  return dominance;
}

/**
 * Returns monthly spending totals for the last N months.
 *
 * @param {string} userId - The authenticated user's ID
 * @param {number} months - Number of past months to include
 * @returns {Promise<Array<{ month: string, total: number }>>}
 */
async function getSpendingTrend(userId, months) {
  const now = new Date();
  const results = [];

  for (let i = months - 1; i >= 0; i--) {
    const refDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = getStartOfMonth(refDate);
    const end = getEndOfMonth(refDate);

    const aggregation = await prisma.expense.aggregate({
      where: {
        userId,
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
    });

    const year = start.getFullYear();
    const month = String(start.getMonth() + 1).padStart(2, '0');

    results.push({
      month: `${year}-${month}`,
      total: Math.round((aggregation._sum.amount || 0) * 100) / 100,
    });
  }

  return results;
}

/**
 * Returns a comprehensive behavioral spending summary for the current month.
 *
 * Includes total income, total expenses, net savings, savings rate, top
 * spending category, average daily spend, impulse spend count/total, and
 * percentage change compared to the previous month.
 *
 * @param {string} userId - The authenticated user's ID
 * @returns {Promise<object>} Behavioral summary object
 */
async function getBehavioralSummary(userId) {
  const now = new Date();
  const thisMonthStart = getStartOfMonth(now);
  const thisMonthEnd = getEndOfMonth(now);

  // Previous month boundaries
  const prevMonthRef = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthStart = getStartOfMonth(prevMonthRef);
  const prevMonthEnd = getEndOfMonth(prevMonthRef);

  // Fetch all data in parallel
  const [
    incomeAgg,
    thisMonthExpenses,
    prevMonthExpenseAgg,
  ] = await Promise.all([
    prisma.income.aggregate({
      where: {
        userId,
        date: { gte: thisMonthStart, lte: thisMonthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.expense.findMany({
      where: {
        userId,
        date: { gte: thisMonthStart, lte: thisMonthEnd },
      },
      select: {
        amount: true,
        category: true,
        date: true,
        isImpulse: true,
      },
    }),
    prisma.expense.aggregate({
      where: {
        userId,
        date: { gte: prevMonthStart, lte: prevMonthEnd },
      },
      _sum: { amount: true },
    }),
  ]);

  const totalIncome = incomeAgg._sum.amount || 0;

  // Current month expense total
  const totalExpenses = thisMonthExpenses.reduce(
    (sum, e) => sum + e.amount,
    0
  );

  const netSavings = totalIncome - totalExpenses;
  const savingsRate =
    totalIncome > 0
      ? Math.round((netSavings / totalIncome) * 10000) / 100
      : 0;

  // Top spending category
  const categoryTotals = {};
  for (const exp of thisMonthExpenses) {
    categoryTotals[exp.category] =
      (categoryTotals[exp.category] || 0) + exp.amount;
  }

  let topCategory = null;
  let topCategoryTotal = 0;
  for (const [cat, total] of Object.entries(categoryTotals)) {
    if (total > topCategoryTotal) {
      topCategory = cat;
      topCategoryTotal = total;
    }
  }

  // Average daily spend (days elapsed so far this month)
  const dayOfMonth = now.getDate();
  const averageDailySpend =
    dayOfMonth > 0
      ? Math.round((totalExpenses / dayOfMonth) * 100) / 100
      : 0;

  // Impulse spending
  const impulseExpenses = thisMonthExpenses.filter((e) => e.isImpulse);
  const impulseCount = impulseExpenses.length;
  const impulseTotal = Math.round(
    impulseExpenses.reduce((sum, e) => sum + e.amount, 0) * 100
  ) / 100;

  // Comparison to last month
  const prevMonthTotal = prevMonthExpenseAgg._sum.amount || 0;
  let spendingChangePercent = 0;
  if (prevMonthTotal > 0) {
    spendingChangePercent =
      Math.round(
        ((totalExpenses - prevMonthTotal) / prevMonthTotal) * 10000
      ) / 100;
  } else if (totalExpenses > 0) {
    spendingChangePercent = 100;
  }

  return {
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    netSavings: Math.round(netSavings * 100) / 100,
    savingsRate,
    topCategory,
    topCategoryTotal: Math.round(topCategoryTotal * 100) / 100,
    averageDailySpend,
    impulseCount,
    impulseTotal,
    spendingChangePercent,
  };
}

/**
 * Compares spending by category between the current week and the previous week.
 *
 * @param {string} userId - The authenticated user's ID
 * @returns {Promise<object>} Weekly comparison object with per-category breakdowns
 */
async function getWeeklyComparison(userId) {
  const now = new Date();
  const thisWeekStart = getStartOfWeek(now);
  const thisWeekEnd = getEndOfWeek(now);

  // Previous week boundaries
  const prevWeekRef = new Date(thisWeekStart);
  prevWeekRef.setDate(prevWeekRef.getDate() - 1);
  const prevWeekStart = getStartOfWeek(prevWeekRef);
  const prevWeekEnd = getEndOfWeek(prevWeekRef);

  const [thisWeekExpenses, prevWeekExpenses] = await Promise.all([
    prisma.expense.findMany({
      where: {
        userId,
        date: { gte: thisWeekStart, lte: thisWeekEnd },
      },
      select: { amount: true, category: true },
    }),
    prisma.expense.findMany({
      where: {
        userId,
        date: { gte: prevWeekStart, lte: prevWeekEnd },
      },
      select: { amount: true, category: true },
    }),
  ]);

  // Aggregate each week by category
  const aggregateByCategory = (expenses) => {
    const map = {};
    let total = 0;
    for (const exp of expenses) {
      map[exp.category] = (map[exp.category] || 0) + exp.amount;
      total += exp.amount;
    }
    return { map, total };
  };

  const thisWeek = aggregateByCategory(thisWeekExpenses);
  const prevWeek = aggregateByCategory(prevWeekExpenses);

  // Collect all categories seen in either week
  const allCategories = new Set([
    ...Object.keys(thisWeek.map),
    ...Object.keys(prevWeek.map),
  ]);

  const categories = [];
  for (const category of allCategories) {
    const current = Math.round((thisWeek.map[category] || 0) * 100) / 100;
    const previous = Math.round((prevWeek.map[category] || 0) * 100) / 100;
    let changePercent = 0;

    if (previous > 0) {
      changePercent =
        Math.round(((current - previous) / previous) * 10000) / 100;
    } else if (current > 0) {
      changePercent = 100;
    }

    categories.push({ category, current, previous, changePercent });
  }

  // Sort by current week total descending
  categories.sort((a, b) => b.current - a.current);

  const spike = detectSpendingSpike(thisWeek.total, prevWeek.total);

  return {
    thisWeekTotal: Math.round(thisWeek.total * 100) / 100,
    prevWeekTotal: Math.round(prevWeek.total * 100) / 100,
    percentChange: spike.percentChange,
    spiked: spike.spiked,
    categories,
  };
}

module.exports = {
  getSpendingHeatmap,
  getCategoryDominance,
  getSpendingTrend,
  getBehavioralSummary,
  getWeeklyComparison,
};
