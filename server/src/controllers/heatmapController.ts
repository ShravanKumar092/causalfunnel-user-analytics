const heatmapService = require('../services/heatmapService');

/**
 * Controller to get distinct pages with recorded clicks
 * GET /api/heatmap/pages
 */
const getHeatmapPages = async (req, res, next) => {
  try {
    const pages = await heatmapService.getDistinctPagesWithClicks();

    res.status(200).json({
      success: true,
      data: {
        pages
      }
    });
  } catch (error) {
    next(error);
  }
};

const getTrackedPages = async (req, res, next) => {
  try {
    const pages = await heatmapService.getDistinctPages();
    res.status(200).json({ success: true, data: { pages } });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to get click events for a specific page URL
 * GET /api/heatmap/clicks?pageUrl=...
 */
const getHeatmapClicks = async (req, res, next) => {
  try {
    const pageUrl = req.query.pageUrl || req.query.url;
    const { limit } = req.query;

    const normalized = new URL(pageUrl).toString();
    const result = await heatmapService.getClicksForPage(normalized, { limit });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHeatmapPages,
  getTrackedPages,
  getHeatmapClicks
};
