const analyticsService = require('../services/analyticsService');

/**
 * Controller for dashboard overview analytics
 * GET /api/analytics/overview
 */
const getOverview = async (req, res, next) => {
  try {
    const overview = await analyticsService.getOverviewAnalytics();

    res.status(200).json({
      success: true,
      data: overview
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOverview
};
