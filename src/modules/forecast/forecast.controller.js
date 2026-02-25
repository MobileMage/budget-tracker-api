const forecastService = require('./forecast.service');
const { success, error } = require('../../utils/apiResponse');

/**
 * POST /generate - Generate a new financial forecast snapshot.
 */
async function generateForecast(req, res) {
  try {
    const snapshot = await forecastService.generateForecast(req.user.id);
    return success(res, snapshot, 'Forecast generated successfully', 201);
  } catch (err) {
    return error(res, 'Failed to generate forecast', 500);
  }
}

/**
 * GET /latest - Get the most recent forecast snapshot.
 */
async function getLatestForecast(req, res) {
  try {
    const snapshot = await forecastService.getLatestForecast(req.user.id);

    if (!snapshot) {
      return error(res, 'No forecast found. Generate one first.', 404);
    }

    return success(res, snapshot, 'Latest forecast retrieved successfully');
  } catch (err) {
    return error(res, 'Failed to retrieve latest forecast', 500);
  }
}

/**
 * GET /history - Get forecast snapshot history.
 * Query: limit (optional, default 30)
 */
async function getForecastHistory(req, res) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 30;

    if (isNaN(limit) || limit < 1) {
      return error(res, 'limit must be a positive integer', 400);
    }

    const snapshots = await forecastService.getForecastHistory(req.user.id, limit);
    return success(res, snapshots, 'Forecast history retrieved successfully');
  } catch (err) {
    return error(res, 'Failed to retrieve forecast history', 500);
  }
}

/**
 * GET /health - Get comprehensive financial health report.
 */
async function getFinancialHealth(req, res) {
  try {
    const health = await forecastService.getFinancialHealth(req.user.id);
    return success(res, health, 'Financial health retrieved successfully');
  } catch (err) {
    return error(res, 'Failed to retrieve financial health', 500);
  }
}

module.exports = {
  generateForecast,
  getLatestForecast,
  getForecastHistory,
  getFinancialHealth,
};
