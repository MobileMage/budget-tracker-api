const recommendationsService = require('./recommendations.service');
const { success, error } = require('../../utils/apiResponse');

/**
 * Handles POST /generate
 *
 * Evaluates spending patterns and generates personalized recommendations.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function generateRecommendations(req, res, next) {
  try {
    const recommendations = await recommendationsService.generateRecommendations(
      req.user.id
    );

    return success(
      res,
      recommendations,
      'Recommendations generated successfully',
      201
    );
  } catch (err) {
    next(err);
  }
}

/**
 * Handles GET /
 *
 * Returns a paginated list of recommendations, optionally filtered by category.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function getRecommendations(req, res, next) {
  try {
    const result = await recommendationsService.getRecommendations(
      req.user.id,
      req.query
    );

    return success(res, result, 'Recommendations retrieved successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * Handles DELETE /:id
 *
 * Dismisses (deletes) a recommendation by its ID.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function dismissRecommendation(req, res, next) {
  try {
    const recommendation = await recommendationsService.dismissRecommendation(
      req.user.id,
      req.params.id
    );

    return success(res, recommendation, 'Recommendation dismissed successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  generateRecommendations,
  getRecommendations,
  dismissRecommendation,
};
