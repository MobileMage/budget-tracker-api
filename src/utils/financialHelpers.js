const { isWithinMinutes } = require('./dateHelpers');
const { RISK_LEVELS, RISK_THRESHOLDS } = require('../constants/riskLevels');

/**
 * Calculate the average daily spend (burn rate) from an array of expenses
 * over a given number of days.
 *
 * Each expense object is expected to have a numeric `amount` property.
 *
 * @param {Array<{ amount: number }>} expenses - Array of expense objects
 * @param {number} days - Number of days the expenses span
 * @returns {number} Average daily spend rounded to two decimal places, or 0 if days <= 0
 *
 * @example
 *   const rate = calculateBurnRate([{ amount: 50 }, { amount: 30 }], 7);
 *   // rate === 11.43
 */
const calculateBurnRate = (expenses, days) => {
  if (!expenses || expenses.length === 0 || days <= 0) {
    return 0;
  }

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  return Math.round((total / days) * 100) / 100;
};

/**
 * Estimate the number of days until a balance reaches zero given a daily burn rate.
 *
 * @param {number} balance  - Current available balance
 * @param {number} burnRate - Average daily spend (positive number)
 * @returns {number} Estimated days remaining, or `Infinity` when burn rate is zero or negative
 *
 * @example
 *   const days = estimateSurvivalDays(500, 11.43);
 *   // days === 43
 */
const estimateSurvivalDays = (balance, burnRate) => {
  if (burnRate <= 0) {
    return Infinity;
  }

  if (balance <= 0) {
    return 0;
  }

  return Math.floor(balance / burnRate);
};

/**
 * Classify the financial risk level based on estimated days of runway left.
 *
 * Thresholds:
 *   - `SAFE`    : more than 30 days remaining
 *   - `WARNING` : 15 -- 30 days remaining (inclusive)
 *   - `DANGER`  : fewer than 15 days remaining
 *
 * @param {number} daysLeft - Estimated days of money remaining
 * @returns {'SAFE'|'WARNING'|'DANGER'} Risk level string
 *
 * @example
 *   getRiskLevel(45); // 'SAFE'
 *   getRiskLevel(20); // 'WARNING'
 *   getRiskLevel(7);  // 'DANGER'
 */
const getRiskLevel = (daysLeft) => {
  if (daysLeft > RISK_THRESHOLDS.SAFE_MIN_DAYS) {
    return RISK_LEVELS.SAFE;
  }
  if (daysLeft >= RISK_THRESHOLDS.WARNING_MIN_DAYS) {
    return RISK_LEVELS.WARNING;
  }
  return RISK_LEVELS.DANGER;
};

/**
 * Calculate an "impulse score" by counting clusters of purchases that occur
 * within a sliding time window.
 *
 * The function sorts expenses by date, then walks through them. Each time two
 * consecutive expenses fall within `windowMinutes` of each other, the score
 * increments. A higher score indicates more impulsive spending behaviour.
 *
 * Each expense object is expected to have a `date` property that is either a
 * `Date` instance or a value parseable by `new Date()`.
 *
 * @param {Array<{ date: Date|string, amount: number }>} expenses - Expense records with dates
 * @param {number} [windowMinutes=30] - Time window in minutes to consider as a "cluster"
 * @returns {number} Impulse score (count of clustered purchase pairs)
 *
 * @example
 *   const score = calculateImpulseScore([
 *     { date: '2024-01-15T10:00:00Z', amount: 5 },
 *     { date: '2024-01-15T10:10:00Z', amount: 12 },
 *     { date: '2024-01-15T10:20:00Z', amount: 8 },
 *     { date: '2024-01-15T18:00:00Z', amount: 40 },
 *   ], 30);
 *   // score === 2  (first three are clustered: pair 1-2 and pair 2-3)
 */
const calculateImpulseScore = (expenses, windowMinutes = 30) => {
  if (!expenses || expenses.length < 2) {
    return 0;
  }

  // Sort by date ascending
  const sorted = [...expenses].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let score = 0;

  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(sorted[i - 1].date);
    const currDate = new Date(sorted[i].date);

    if (isWithinMinutes(prevDate, currDate, windowMinutes)) {
      score++;
    }
  }

  return score;
};

/**
 * Detect whether spending has spiked compared to a previous period.
 *
 * A spike is defined as the current week's total exceeding the previous
 * week's total by more than 20 %.
 *
 * @param {number} currentWeekTotal  - Total spend for the current week
 * @param {number} previousWeekTotal - Total spend for the previous week
 * @returns {{ spiked: boolean, percentChange: number }}
 *   `spiked` is `true` when the percent increase exceeds 20 %.
 *   `percentChange` is the signed percent change rounded to two decimals.
 *
 * @example
 *   detectSpendingSpike(150, 100);
 *   // { spiked: true, percentChange: 50 }
 *
 *   detectSpendingSpike(90, 100);
 *   // { spiked: false, percentChange: -10 }
 */
const detectSpendingSpike = (currentWeekTotal, previousWeekTotal) => {
  if (previousWeekTotal === 0) {
    // If there was no prior spending, any current spending counts as a spike
    return {
      spiked: currentWeekTotal > 0,
      percentChange: currentWeekTotal > 0 ? 100 : 0,
    };
  }

  const change = currentWeekTotal - previousWeekTotal;
  const percentChange = Math.round((change / previousWeekTotal) * 10000) / 100;

  return {
    spiked: percentChange > 20,
    percentChange,
  };
};

module.exports = {
  calculateBurnRate,
  estimateSurvivalDays,
  getRiskLevel,
  calculateImpulseScore,
  detectSpendingSpike,
};
