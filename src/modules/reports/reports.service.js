const prisma = require('../../config/database');
const {
  getStartOfMonth,
  getEndOfMonth,
  getStartOfWeek,
  getEndOfWeek,
} = require('../../utils/dateHelpers');

/**
 * Generate a comprehensive monthly report for a user.
 *
 * @param {string} userId - Authenticated user ID
 * @param {number} year   - Report year (e.g. 2026)
 * @param {number} month  - Report month (1-12)
 * @returns {Promise<object>} Monthly report data
 */
async function getMonthlyReport(userId, year, month) {
  const refDate = new Date(year, month - 1, 1);
  const start = getStartOfMonth(refDate);
  const end = getEndOfMonth(refDate);

  // Income
  const incomes = await prisma.income.findMany({
    where: { userId, date: { gte: start, lte: end } },
    orderBy: { date: 'asc' },
  });

  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);

  const sourceMap = {};
  for (const inc of incomes) {
    sourceMap[inc.source] = (sourceMap[inc.source] || 0) + inc.amount;
  }
  const incomeSources = Object.entries(sourceMap).map(([source, amount]) => ({
    source,
    amount: Math.round(amount * 100) / 100,
  }));

  // Expenses
  const expenses = await prisma.expense.findMany({
    where: { userId, date: { gte: start, lte: end } },
    orderBy: { date: 'asc' },
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // By category
  const categoryMap = {};
  for (const exp of expenses) {
    categoryMap[exp.category] = (categoryMap[exp.category] || 0) + exp.amount;
  }
  const byCategory = Object.entries(categoryMap).map(([category, total]) => ({
    category,
    total: Math.round(total * 100) / 100,
    percentage: totalExpenses > 0 ? Math.round((total / totalExpenses) * 10000) / 100 : 0,
  }));

  // Daily breakdown
  const dailyMap = {};
  for (const exp of expenses) {
    const dayKey = exp.date.toISOString().split('T')[0];
    dailyMap[dayKey] = (dailyMap[dayKey] || 0) + exp.amount;
  }
  const dailyBreakdown = Object.entries(dailyMap)
    .map(([date, total]) => ({
      date,
      total: Math.round(total * 100) / 100,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Budget compliance
  const budgets = await prisma.budget.findMany({
    where: { userId, period: 'MONTHLY' },
  });

  const budgetCompliance = budgets.map((b) => {
    const spent = categoryMap[b.category] || 0;
    return {
      category: b.category,
      budgetLimit: b.limit,
      spent: Math.round(spent * 100) / 100,
      status: spent <= b.limit ? 'under' : 'over',
    };
  });

  // Savings
  const savingsAmount = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.round((savingsAmount / totalIncome) * 10000) / 100 : 0;

  // Alerts summary
  const alerts = await prisma.alert.findMany({
    where: {
      userId,
      triggeredAt: { gte: start, lte: end },
    },
  });

  const alertTypeMap = {};
  for (const alert of alerts) {
    alertTypeMap[alert.type] = (alertTypeMap[alert.type] || 0) + 1;
  }
  const alertsByType = Object.entries(alertTypeMap).map(([type, count]) => ({
    type,
    count,
  }));

  // Comparison to previous month
  const prevRefDate = new Date(year, month - 2, 1);
  const prevStart = getStartOfMonth(prevRefDate);
  const prevEnd = getEndOfMonth(prevRefDate);

  const prevIncomeAgg = await prisma.income.aggregate({
    where: { userId, date: { gte: prevStart, lte: prevEnd } },
    _sum: { amount: true },
  });
  const prevTotalIncome = prevIncomeAgg._sum.amount || 0;

  const prevExpenseAgg = await prisma.expense.aggregate({
    where: { userId, date: { gte: prevStart, lte: prevEnd } },
    _sum: { amount: true },
  });
  const prevTotalExpenses = prevExpenseAgg._sum.amount || 0;

  let incomeChange = 0;
  if (prevTotalIncome > 0) {
    incomeChange = Math.round(((totalIncome - prevTotalIncome) / prevTotalIncome) * 10000) / 100;
  } else if (totalIncome > 0) {
    incomeChange = 100;
  }

  let expenseChange = 0;
  if (prevTotalExpenses > 0) {
    expenseChange =
      Math.round(((totalExpenses - prevTotalExpenses) / prevTotalExpenses) * 10000) / 100;
  } else if (totalExpenses > 0) {
    expenseChange = 100;
  }

  return {
    period: { start, end },
    income: {
      total: Math.round(totalIncome * 100) / 100,
      sources: incomeSources,
    },
    expenses: {
      total: Math.round(totalExpenses * 100) / 100,
      byCategory,
      dailyBreakdown,
    },
    budgetCompliance,
    savings: {
      amount: Math.round(savingsAmount * 100) / 100,
      rate: savingsRate,
    },
    alerts: {
      total: alerts.length,
      byType: alertsByType,
    },
    comparison: {
      previousMonth: {
        income: Math.round(prevTotalIncome * 100) / 100,
        expenses: Math.round(prevTotalExpenses * 100) / 100,
      },
      incomeChange,
      expenseChange,
    },
  };
}

/**
 * Generate a weekly summary report.
 *
 * @param {string} userId        - Authenticated user ID
 * @param {Date}   weekStartDate - Any date within the target week (will be
 *                                  normalized to the ISO week start)
 * @returns {Promise<object>} Weekly report data
 */
async function getWeeklyReport(userId, weekStartDate) {
  const start = getStartOfWeek(weekStartDate);
  const end = getEndOfWeek(weekStartDate);

  // Income
  const incomeAgg = await prisma.income.aggregate({
    where: { userId, date: { gte: start, lte: end } },
    _sum: { amount: true },
  });
  const totalIncome = incomeAgg._sum.amount || 0;

  // Expenses
  const expenses = await prisma.expense.findMany({
    where: { userId, date: { gte: start, lte: end } },
    orderBy: { date: 'asc' },
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // By category
  const categoryMap = {};
  for (const exp of expenses) {
    categoryMap[exp.category] = (categoryMap[exp.category] || 0) + exp.amount;
  }
  const byCategory = Object.entries(categoryMap).map(([category, total]) => ({
    category,
    total: Math.round(total * 100) / 100,
    percentage: totalExpenses > 0 ? Math.round((total / totalExpenses) * 10000) / 100 : 0,
  }));

  // Daily breakdown
  const dailyMap = {};
  for (const exp of expenses) {
    const dayKey = exp.date.toISOString().split('T')[0];
    dailyMap[dayKey] = (dailyMap[dayKey] || 0) + exp.amount;
  }
  const dailyBreakdown = Object.entries(dailyMap)
    .map(([date, total]) => ({
      date,
      total: Math.round(total * 100) / 100,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Top 5 largest expenses
  const top5 = [...expenses]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((e) => ({
      id: e.id,
      amount: e.amount,
      category: e.category,
      date: e.date,
      notes: e.notes,
    }));

  // Impulse spending
  const impulseExpenses = expenses.filter((e) => e.isImpulse);
  const impulseCount = impulseExpenses.length;
  const impulseTotal = impulseExpenses.reduce((sum, e) => sum + e.amount, 0);

  return {
    period: { start, end },
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    byCategory,
    dailyBreakdown,
    top5Expenses: top5,
    impulseSpending: {
      count: impulseCount,
      total: Math.round(impulseTotal * 100) / 100,
    },
  };
}

/**
 * Generate a custom date-range report with the same structure as the monthly
 * report.
 *
 * @param {string} userId    - Authenticated user ID
 * @param {Date}   startDate - Start of the report period (inclusive)
 * @param {Date}   endDate   - End of the report period (inclusive)
 * @returns {Promise<object>} Custom range report data
 */
async function getCustomReport(userId, startDate, endDate) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Income
  const incomes = await prisma.income.findMany({
    where: { userId, date: { gte: start, lte: end } },
    orderBy: { date: 'asc' },
  });

  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);

  const sourceMap = {};
  for (const inc of incomes) {
    sourceMap[inc.source] = (sourceMap[inc.source] || 0) + inc.amount;
  }
  const incomeSources = Object.entries(sourceMap).map(([source, amount]) => ({
    source,
    amount: Math.round(amount * 100) / 100,
  }));

  // Expenses
  const expenses = await prisma.expense.findMany({
    where: { userId, date: { gte: start, lte: end } },
    orderBy: { date: 'asc' },
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // By category
  const categoryMap = {};
  for (const exp of expenses) {
    categoryMap[exp.category] = (categoryMap[exp.category] || 0) + exp.amount;
  }
  const byCategory = Object.entries(categoryMap).map(([category, total]) => ({
    category,
    total: Math.round(total * 100) / 100,
    percentage: totalExpenses > 0 ? Math.round((total / totalExpenses) * 10000) / 100 : 0,
  }));

  // Daily breakdown
  const dailyMap = {};
  for (const exp of expenses) {
    const dayKey = exp.date.toISOString().split('T')[0];
    dailyMap[dayKey] = (dailyMap[dayKey] || 0) + exp.amount;
  }
  const dailyBreakdown = Object.entries(dailyMap)
    .map(([date, total]) => ({
      date,
      total: Math.round(total * 100) / 100,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Budget compliance (monthly budgets applicable within the range)
  const budgets = await prisma.budget.findMany({
    where: { userId },
  });

  const budgetCompliance = budgets.map((b) => {
    const spent = categoryMap[b.category] || 0;
    return {
      category: b.category,
      budgetLimit: b.limit,
      spent: Math.round(spent * 100) / 100,
      status: spent <= b.limit ? 'under' : 'over',
    };
  });

  // Savings
  const savingsAmount = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.round((savingsAmount / totalIncome) * 10000) / 100 : 0;

  // Alerts
  const alerts = await prisma.alert.findMany({
    where: {
      userId,
      triggeredAt: { gte: start, lte: end },
    },
  });

  const alertTypeMap = {};
  for (const alert of alerts) {
    alertTypeMap[alert.type] = (alertTypeMap[alert.type] || 0) + 1;
  }
  const alertsByType = Object.entries(alertTypeMap).map(([type, count]) => ({
    type,
    count,
  }));

  return {
    period: { start, end },
    income: {
      total: Math.round(totalIncome * 100) / 100,
      sources: incomeSources,
    },
    expenses: {
      total: Math.round(totalExpenses * 100) / 100,
      byCategory,
      dailyBreakdown,
    },
    budgetCompliance,
    savings: {
      amount: Math.round(savingsAmount * 100) / 100,
      rate: savingsRate,
    },
    alerts: {
      total: alerts.length,
      byType: alertsByType,
    },
  };
}

/**
 * Return an array of expense objects formatted for CSV export.
 *
 * @param {string} userId    - Authenticated user ID
 * @param {Date}   startDate - Start of the export period (inclusive)
 * @param {Date}   endDate   - End of the export period (inclusive)
 * @param {string} [format='csv'] - Export format hint ('csv' or 'json')
 * @returns {Promise<object[]>} Array of flattened expense objects
 */
async function getExpenseExportData(userId, startDate, endDate, format = 'csv') {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const expenses = await prisma.expense.findMany({
    where: { userId, date: { gte: start, lte: end } },
    orderBy: { date: 'asc' },
  });

  const rows = expenses.map((e) => ({
    date: e.date.toISOString().split('T')[0],
    category: e.category,
    amount: e.amount,
    notes: e.notes || '',
    isImpulse: e.isImpulse,
  }));

  return rows;
}

module.exports = {
  getMonthlyReport,
  getWeeklyReport,
  getCustomReport,
  getExpenseExportData,
};
