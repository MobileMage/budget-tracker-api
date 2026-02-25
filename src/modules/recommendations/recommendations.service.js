const prisma = require('../../config/database');
const {
  getStartOfMonth,
  getEndOfMonth,
  getStartOfWeek,
  getEndOfWeek,
  isLateNight,
} = require('../../utils/dateHelpers');
const {
  calculateImpulseScore,
  detectSpendingSpike,
} = require('../../utils/financialHelpers');

/**
 * Rule definitions for the recommendation engine. Each rule has a condition
 * function that receives aggregated spending data and returns a boolean,
 * a human-readable tip, and an optional category tag.
 */
const rules = [
  {
    condition: (data) => data.foodPercent > 40,
    tip: 'Consider meal prepping to cut food costs by up to 30%.',
    category: 'FOOD',
  },
  {
    condition: (data) => data.impulseScore > 5,
    tip: "You're at high impulse risk. Try a 24-hour purchase delay rule.",
    category: null,
  },
  {
    condition: (data) => data.savingsRate < 10,
    tip: 'Aim to save at least 10% of your allowance each cycle.',
    category: null,
  },
  {
    condition: (data) => data.transportTotal > 5000,
    tip: 'A weekly transport pass could reduce your commute costs.',
    category: 'TRANSPORT',
  },
  {
    condition: (data) => data.entertainmentPercent > 25,
    tip: 'Look for free campus events to cut entertainment spending.',
    category: 'ENTERTAINMENT',
  },
  {
    condition: (data) => data.lateNightCount > 3,
    tip: 'Late-night purchases tend to be impulsive. Set a spending curfew.',
    category: null,
  },
  {
    condition: (data) => data.shoppingPercent > 20,
    tip: 'Try a no-spend challenge for shopping this week.',
    category: 'SHOPPING',
  },
  {
    condition: (data) => data.weeklySpike,
    tip: 'Your spending spiked this week. Review your recent transactions.',
    category: null,
  },
];

/**
 * Gathers the user's current spending data and evaluates all recommendation
 * rules. For each matching rule, a Recommendation record is created in the
 * database.
 *
 * @param {string} userId - The authenticated user's ID
 * @returns {Promise<Array<object>>} Array of newly created Recommendation records
 */
async function generateRecommendations(userId) {
  const now = new Date();
  const monthStart = getStartOfMonth(now);
  const monthEnd = getEndOfMonth(now);

  // This week and previous week boundaries
  const thisWeekStart = getStartOfWeek(now);
  const thisWeekEnd = getEndOfWeek(now);
  const prevWeekRef = new Date(thisWeekStart);
  prevWeekRef.setDate(prevWeekRef.getDate() - 1);
  const prevWeekStart = getStartOfWeek(prevWeekRef);
  const prevWeekEnd = getEndOfWeek(prevWeekRef);

  // Fetch all needed data in parallel
  const [
    incomeAgg,
    monthExpenses,
    thisWeekExpenses,
    prevWeekExpenses,
  ] = await Promise.all([
    prisma.income.aggregate({
      where: {
        userId,
        date: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.expense.findMany({
      where: {
        userId,
        date: { gte: monthStart, lte: monthEnd },
      },
      select: {
        amount: true,
        category: true,
        date: true,
        isImpulse: true,
      },
    }),
    prisma.expense.findMany({
      where: {
        userId,
        date: { gte: thisWeekStart, lte: thisWeekEnd },
      },
      select: { amount: true },
    }),
    prisma.expense.findMany({
      where: {
        userId,
        date: { gte: prevWeekStart, lte: prevWeekEnd },
      },
      select: { amount: true },
    }),
  ]);

  const totalIncome = incomeAgg._sum.amount || 0;
  const totalExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Category totals
  const categoryTotals = {};
  for (const exp of monthExpenses) {
    categoryTotals[exp.category] =
      (categoryTotals[exp.category] || 0) + exp.amount;
  }

  // Percentages
  const foodTotal = categoryTotals['FOOD'] || 0;
  const transportTotal = categoryTotals['TRANSPORT'] || 0;
  const entertainmentTotal = categoryTotals['ENTERTAINMENT'] || 0;
  const shoppingTotal = categoryTotals['SHOPPING'] || 0;

  const foodPercent = totalExpenses > 0 ? (foodTotal / totalExpenses) * 100 : 0;
  const entertainmentPercent =
    totalExpenses > 0 ? (entertainmentTotal / totalExpenses) * 100 : 0;
  const shoppingPercent =
    totalExpenses > 0 ? (shoppingTotal / totalExpenses) * 100 : 0;

  // Savings rate
  const savingsRate =
    totalIncome > 0
      ? ((totalIncome - totalExpenses) / totalIncome) * 100
      : 0;

  // Impulse score
  const impulseScore = calculateImpulseScore(monthExpenses);

  // Late night count
  const lateNightCount = monthExpenses.filter((e) =>
    isLateNight(new Date(e.date))
  ).length;

  // Weekly spike detection
  const thisWeekTotal = thisWeekExpenses.reduce((s, e) => s + e.amount, 0);
  const prevWeekTotal = prevWeekExpenses.reduce((s, e) => s + e.amount, 0);
  const spikeResult = detectSpendingSpike(thisWeekTotal, prevWeekTotal);

  // Build the data object used by rule conditions
  const data = {
    foodPercent,
    transportTotal,
    entertainmentPercent,
    shoppingPercent,
    impulseScore,
    savingsRate,
    lateNightCount,
    weeklySpike: spikeResult.spiked,
  };

  // Evaluate rules and collect matching tips
  const matchedRules = rules.filter((rule) => rule.condition(data));

  // Remove old recommendations for this user before generating new ones
  await prisma.recommendation.deleteMany({ where: { userId } });

  // Create new recommendation records
  const created = [];
  for (const rule of matchedRules) {
    const rec = await prisma.recommendation.create({
      data: {
        userId,
        tip: rule.tip,
        category: rule.category,
      },
    });
    created.push(rec);
  }

  return created;
}

/**
 * Retrieves a paginated list of recommendations for the user, optionally
 * filtered by expense category.
 *
 * @param {string} userId - The authenticated user's ID
 * @param {object} query - Query options
 * @param {string} [query.category] - Optional category filter
 * @param {number} [query.page=1] - Page number (1-indexed)
 * @param {number} [query.limit=10] - Items per page
 * @returns {Promise<{ recommendations: Array<object>, total: number, page: number, limit: number, totalPages: number }>}
 */
async function getRecommendations(userId, query = {}) {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const where = { userId };
  if (query.category) {
    where.category = query.category;
  }

  const [recommendations, total] = await Promise.all([
    prisma.recommendation.findMany({
      where,
      orderBy: { generatedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.recommendation.count({ where }),
  ]);

  return {
    recommendations,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Deletes (dismisses) a single recommendation belonging to the user.
 *
 * @param {string} userId - The authenticated user's ID
 * @param {string} recommendationId - The recommendation ID to dismiss
 * @returns {Promise<object>} The deleted recommendation record
 * @throws {Error} 404 if the recommendation does not exist or does not belong to the user
 */
async function dismissRecommendation(userId, recommendationId) {
  const recommendation = await prisma.recommendation.findUnique({
    where: { id: recommendationId },
  });

  if (!recommendation || recommendation.userId !== userId) {
    const err = new Error('Recommendation not found');
    err.statusCode = 404;
    throw err;
  }

  await prisma.recommendation.delete({
    where: { id: recommendationId },
  });

  return recommendation;
}

module.exports = {
  generateRecommendations,
  getRecommendations,
  dismissRecommendation,
  rules,
};
