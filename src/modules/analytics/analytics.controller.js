const analyticsService = require('./analytics.service');
const { success, error } = require('../../utils/apiResponse');

/**
 * Handles GET /heatmap
 *
 * Returns spending data grouped by day-of-week and hour-of-day.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function getSpendingHeatmap(req, res, next) {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return error(res, 'startDate and endDate query parameters are required', 400);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return error(res, 'startDate and endDate must be valid date strings', 400);
    }

    if (start > end) {
      return error(res, 'startDate must be before or equal to endDate', 400);
    }

    const heatmap = await analyticsService.getSpendingHeatmap(
      req.user.id,
      start,
      end
    );

    return success(res, heatmap, 'Spending heatmap retrieved successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * Handles GET /category-dominance
 *
 * Returns spending breakdown by category with percentages.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function getCategoryDominance(req, res, next) {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return error(res, 'startDate and endDate query parameters are required', 400);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return error(res, 'startDate and endDate must be valid date strings', 400);
    }

    if (start > end) {
      return error(res, 'startDate must be before or equal to endDate', 400);
    }

    const dominance = await analyticsService.getCategoryDominance(
      req.user.id,
      start,
      end
    );

    return success(res, dominance, 'Category dominance retrieved successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * Handles GET /spending-trend
 *
 * Returns monthly spending totals for the last N months.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function getSpendingTrend(req, res, next) {
  try {
    const months = parseInt(req.query.months, 10) || 6;

    if (months < 1 || months > 24) {
      return error(res, 'months must be between 1 and 24', 400);
    }

    const trend = await analyticsService.getSpendingTrend(req.user.id, months);

    return success(res, trend, 'Spending trend retrieved successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * Handles GET /summary
 *
 * Returns a comprehensive behavioral spending summary for the current month.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function getBehavioralSummary(req, res, next) {
  try {
    const summary = await analyticsService.getBehavioralSummary(req.user.id);

    return success(res, summary, 'Behavioral summary retrieved successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * Handles GET /weekly-comparison
 *
 * Compares spending between the current week and the previous week.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function getWeeklyComparison(req, res, next) {
  try {
    const comparison = await analyticsService.getWeeklyComparison(req.user.id);

    return success(res, comparison, 'Weekly comparison retrieved successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSpendingHeatmap,
  getCategoryDominance,
  getSpendingTrend,
  getBehavioralSummary,
  getWeeklyComparison,
};
