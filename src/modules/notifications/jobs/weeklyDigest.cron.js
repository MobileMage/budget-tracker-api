const cron = require('node-cron');
const prisma = require('../../../config/database');
const logger = require('../../../utils/logger');
const { getStartOfWeek, getEndOfWeek } = require('../../../utils/dateHelpers');
const notificationsService = require('../notifications.service');

/**
 * Generate a spending tip based on the user's weekly spending pattern.
 *
 * @param {number} totalSpent   - Total amount spent last week.
 * @param {number} totalIncome  - Total income received last week.
 * @param {string|null} topCategory - The category with the highest spend.
 * @param {string} riskLevel    - Current risk level (SAFE, WARNING, DANGER).
 * @returns {string} A brief actionable tip.
 */
function generateTip(totalSpent, totalIncome, topCategory, riskLevel) {
  if (riskLevel === 'DANGER') {
    return 'Your funds are critically low. Consider pausing non-essential spending and reviewing upcoming bills.';
  }

  if (riskLevel === 'WARNING') {
    return 'Your spending is elevated. Try setting a daily spending cap to stay on track this week.';
  }

  if (totalIncome > 0 && totalSpent > totalIncome * 0.9) {
    return 'You spent nearly all of last week\'s income. Building a buffer of at least 10% can help avoid shortfalls.';
  }

  if (topCategory) {
    return `Your top spending category was ${topCategory}. Look for small savings there to make a big difference over time.`;
  }

  return 'Great job keeping spending in check! Consider putting any surplus toward savings or an emergency fund.';
}

/**
 * Generate a weekly digest notification for a single user.
 *
 * This function is exported separately so it can be called directly in tests
 * without running the full cron scheduler.
 *
 * @param {string} userId - The ID of the user to generate the digest for.
 * @returns {Promise<object>} The created notification record.
 */
async function generateDigestForUser(userId) {
  const now = new Date();

  // Calculate last week's boundaries (Monday-Sunday of the previous week)
  const thisWeekStart = getStartOfWeek(now);
  const lastWeekEnd = new Date(thisWeekStart.getTime() - 1); // Sunday 23:59:59.999
  const lastWeekStart = getStartOfWeek(lastWeekEnd);

  // Total expenses last week
  const expenseAggregate = await prisma.expense.aggregate({
    where: {
      userId,
      date: { gte: lastWeekStart, lte: lastWeekEnd },
    },
    _sum: { amount: true },
  });
  const totalSpent = expenseAggregate._sum.amount || 0;

  // Total income last week
  const incomeAggregate = await prisma.income.aggregate({
    where: {
      userId,
      date: { gte: lastWeekStart, lte: lastWeekEnd },
    },
    _sum: { amount: true },
  });
  const totalIncome = incomeAggregate._sum.amount || 0;

  // Top spending category last week
  const categoryBreakdown = await prisma.expense.groupBy({
    by: ['category'],
    where: {
      userId,
      date: { gte: lastWeekStart, lte: lastWeekEnd },
    },
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
    take: 1,
  });
  const topCategory =
    categoryBreakdown.length > 0 ? categoryBreakdown[0].category : null;

  // Alerts triggered last week
  const alertCount = await prisma.alert.count({
    where: {
      userId,
      triggeredAt: { gte: lastWeekStart, lte: lastWeekEnd },
    },
  });

  // Current forecast / risk level (latest snapshot)
  const latestForecast = await prisma.forecastSnapshot.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  const riskLevel = latestForecast ? latestForecast.riskLevel : 'SAFE';

  // Generate a tip based on spending pattern
  const tip = generateTip(totalSpent, totalIncome, topCategory, riskLevel);

  // Compose the digest body
  const bodyLines = [
    `Total spent last week: $${totalSpent.toFixed(2)}`,
    topCategory
      ? `Top spending category: ${topCategory}`
      : 'No expenses recorded last week',
    `Alerts triggered: ${alertCount}`,
    `Current risk level: ${riskLevel}`,
    '',
    `Tip: ${tip}`,
  ];

  const notification = await notificationsService.createNotification(userId, {
    title: 'Weekly Financial Digest',
    body: bodyLines.join('\n'),
  });

  return notification;
}

/**
 * Register the weekly digest cron job.
 *
 * Runs every Monday at 8:00 AM. Iterates over all users and generates a
 * digest notification for each one. Failures for individual users are caught
 * and logged so that one user's error does not prevent others from receiving
 * their digest.
 */
function startWeeklyDigest() {
  cron.schedule('0 8 * * 1', async () => {
    logger.info('Weekly digest cron job started');

    try {
      const users = await prisma.user.findMany({
        select: { id: true },
      });

      logger.info(`Generating weekly digest for ${users.length} user(s)`);

      for (const user of users) {
        try {
          await generateDigestForUser(user.id);
          logger.info(`Weekly digest generated for user ${user.id}`);
        } catch (userErr) {
          logger.error(
            `Failed to generate weekly digest for user ${user.id}: ${userErr.message}`
          );
        }
      }

      logger.info('Weekly digest cron job completed');
    } catch (err) {
      logger.error(`Weekly digest cron job failed: ${err.message}`);
    }
  });

  logger.info('Weekly digest cron job registered (schedule: 0 8 * * 1)');
}

module.exports = {
  startWeeklyDigest,
  generateDigestForUser,
};
