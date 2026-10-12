const Event = require('../models/Event');

/**
 * Service for click heatmap queries
 */

/**
 * Get distinct page URLs that have recorded click events
 */
const getDistinctPagesWithClicks = async () => {
  const pages = await Event.distinct('page_url', { event_type: 'click' });
  return pages.sort();
};

const getDistinctPages = async () => {
  const pages = await Event.distinct('page_url');
  return pages.sort();
};

/**
 * Get click events for a specific page URL
 * Returns coordinates and viewport dimensions with safe pagination/limit
 */
const getClicksForPage = async (pageUrl, { limit = 1000 } = {}) => {
  const limitNum = Math.min(2000, Math.max(1, parseInt(String(limit), 10) || 1000));

  const totalClicks = await Event.countDocuments({
    event_type: 'click',
    page_url: pageUrl
  });

  const clicks = await Event.find({
    event_type: 'click',
    page_url: pageUrl
  })
    .sort({ timestamp: -1 })
    .limit(limitNum)
    .select('click_x click_y viewport_width viewport_height timestamp session_id x y')
    .lean();

  return {
    page_url: pageUrl,
    total_clicks: totalClicks,
    returned_clicks: clicks.length,
    clicks: clicks.map((click) => ({ ...click, x: click.x ?? click.click_x, y: click.y ?? click.click_y }))
  };
};

module.exports = {
  getDistinctPagesWithClicks,
  getDistinctPages,
  getClicksForPage
};
