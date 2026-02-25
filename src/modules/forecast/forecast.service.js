const prisma = require('../../config/database');
const {
  getStartOfMonth,
  getEndOfMonth,
  getDaysBetween,
} = require('../../utils/dateHelpers');
const {
  calculateBurnRate,
  estimateSurvivalDays,
  getRiskLevel,
} = require('../../utils/financialHelpers');
const { RISK_LEVEL_DESCRIPTIONS } = require('../../constants/riskLevels');

/**
 * Generate a financial forecast snapshot for the current month.
 *
 * Steps:
 *  1. Sum all income for the current month
 *  2. Sum all expenses for the current month
 *  3. Derive current balance (income - expenses)
 *  4. Retrieve expenses from the last 7 days
 *  5. Calculate daily burn rate from the last 7 days
 *  6. Estimate days until balance reaches zero
 *  7. Classify risk level
 *  8. Persist a ForecastSnapshot record
 *
 * @param {string} userId - Authenticated user ID
 * @returns {Promise<object>} The created ForecastSnapshot record
 */
async function generateForecast(userId) {
  const now = new Date();
  const monthStart = getStartOfMonth(now);
  const monthEnd = getEndOfMonth(now);

  // 1. Total income for the current month
  const incomeAgg = await prisma.income.aggregate({
    where: {
      userId,
      date: { gte: monthStart, lte: monthEnd },
    },
    _sum: { amount: true },
  });
  const totalIncome = incomeAgg._sum.amount || 0;

  // 2. Total expenses for the current month
  const expenseAgg = await prisma.expense.aggregate({
    where: {
      userId,
      date: { gte: monthStart, lte: monthEnd },
    },
    _sum: { amount: true },
  });
  const totalExpenses = expenseAgg._sum.amount || 0;

  // 3. Current balance
  const balance = totalIncome - totalExpenses;

  // 4. Expenses from last 7 days
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const last7DaysExpenses = await prisma.expense.findMany({
    where: {
      userId,
      date: { gte: sevenDaysAgo, lte: now },
    },
  });

  // 5. Burn rate
  const burnRate = calculateBurnRate(last7DaysExpenses, 7);

  // 6. Estimated days left
  const estimatedDaysLeft = estimateSurvivalDays(balance, burnRate);

  // 7. Risk level
  const riskLevel = getRiskLevel(estimatedDaysLeft);

  // 8. Persist snapshot
  const snapshot = await prisma.forecastSnapshot.create({
    data: {
      userId,
      balance,
      burnRate,
      estimatedDaysLeft: estimatedDaysLeft === Infinity ? 9999 : estimatedDaysLeft,
      riskLevel,
    },
  });

  return snapshot;
}

/**
 * Get the most recent ForecastSnapshot for a user.
 *
 * @param {string} userId - Authenticated user ID
 * @returns {Promise<object|null>} Latest snapshot or null if none exists
 */
async function getLatestForecast(userId) {
  const snapshot = await prisma.forecastSnapshot.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return snapshot;
}

/**
 * Get the last N forecast snapshots for a user.
 *
 * @param {string} userId        - Authenticated user ID
 * @param {number} [limit=30]    - Maximum number of snapshots to return
 * @returns {Promise<object[]>} Array of ForecastSnapshot records, newest first
 */
async function getForecastHistory(userId, limit = 30) {
  const snapshots = await prisma.forecastSnapshot.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return snapshots;
}

/**
 * Build a comprehensive financial health report for a user.
 *
 * Includes:
 *  - Current balance
 *  - Daily, weekly, and monthly burn rate projections
 *  - Estimated days until balance reaches zero
 *  - Risk level with a human-readable description
 *  - Month-over-month spending change (percent)
 *  - Suggested daily budget to last until end of month
 *
 * @param {string} userId - Authenticated user ID
 * @returns {Promise<object>} Financial health report
 */
async function getFinancialHealth(userId) {
  const now = new Date();
  const monthStart = getStartOfMonth(now);
  const monthEnd = getEndOfMonth(now);

  // Current month income
  const incomeAgg = await prisma.income.aggregate({
    where: {
      userId,
      date: { gte: monthStart, lte: monthEnd },
    },
    _sum: { amount: true },
  });
  const totalIncome = incomeAgg._sum.amount || 0;

  // Current month expenses
  const expenseAgg = await prisma.expense.aggregate({
    where: {
      userId,
      date: { gte: monthStart, lte: monthEnd },
    },
    _sum: { amount: true },
  });
  const totalExpenses = expenseAgg._sum.amount || 0;

  const balance = totalIncome - totalExpenses;

  // Last 7 days expenses for burn rate
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const last7DaysExpenses = await prisma.expense.findMany({
    where: {
      userId,
      date: { gte: sevenDaysAgo, lte: now },
    },
  });

  const dailyBurnRate = calculateBurnRate(last7DaysExpenses, 7);
  const weeklyBurnRate = Math.round(dailyBurnRate * 7 * 100) / 100;
  const monthlyBurnRate = Math.round(dailyBurnRate * 30 * 100) / 100;

  const estimatedDaysLeft = estimateSurvivalDays(balance, dailyBurnRate);
  const riskLevel = getRiskLevel(estimatedDaysLeft);
  const riskDescription = RISK_LEVEL_DESCRIPTIONS[riskLevel];

  // Previous month expenses for month-over-month comparison
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthStart = getStartOfMonth(prevMonthDate);
  const prevMonthEnd = getEndOfMonth(prevMonthDate);

  const prevExpenseAgg = await prisma.expense.aggregate({
    where: {
      userId,
      date: { gte: prevMonthStart, lte: prevMonthEnd },
    },
    _sum: { amount: true },
  });
  const prevMonthExpenses = prevExpenseAgg._sum.amount || 0;

  let monthOverMonthChange = 0;
  if (prevMonthExpenses > 0) {
    monthOverMonthChange =
      Math.round(((totalExpenses - prevMonthExpenses) / prevMonthExpenses) * 10000) / 100;
  } else if (totalExpenses > 0) {
    monthOverMonthChange = 100;
  }

  // Suggested daily budget to last until end of month
  const daysUntilEndOfMonth = getDaysBetween(now, monthEnd) || 1;
  const suggestedDailyBudget =
    balance > 0 ? Math.round((balance / daysUntilEndOfMonth) * 100) / 100 : 0;

  return {
    balance,
    burnRate: {
      daily: dailyBurnRate,
      weekly: weeklyBurnRate,
      monthly: monthlyBurnRate,
    },
    estimatedDaysLeft: estimatedDaysLeft === Infinity ? null : estimatedDaysLeft,
    riskLevel,
    riskDescription,
    monthOverMonthChange,
    suggestedDailyBudget,
  };
}

module.exports = {
  generateForecast,
  getLatestForecast,
  getForecastHistory,
  getFinancialHealth,
};
