const express = require('express');
const router = express.Router();

const { eventIngestionLimiter, apiLimiter } = require('../middleware/rateLimiter');
const { validateEventPayload, validateHeatmapQuery } = require('../validators/eventValidator');

const eventController = require('../controllers/eventController');
const sessionController = require('../controllers/sessionController');
const heatmapController = require('../controllers/heatmapController');
const analyticsController = require('../controllers/analyticsController');
const healthController = require('../controllers/healthController');

/**
 * Health check endpoint
 * GET /api/health
 */
router.get('/health', healthController.getHealth);

/**
 * Ingestion endpoint for page views and clicks
 * POST /api/events
 */
router.post(
  '/events',
  eventIngestionLimiter,
  validateEventPayload,
  eventController.postEvent
);

/**
 * Session listing & aggregation
 * GET /api/sessions
 */
router.get(
  '/sessions',
  apiLimiter,
  sessionController.getSessions
);

/**
 * Chronological user journey for a specific session
 * GET /api/sessions/:sessionId/events
 */
router.get(
  '/sessions/:sessionId/events',
  apiLimiter,
  sessionController.getSessionEvents
);

/**
 * Heatmap distinct pages with click events
 * GET /api/heatmap/pages
 */
router.get(
  '/heatmap/pages',
  apiLimiter,
  heatmapController.getHeatmapPages
);
router.get('/pages', apiLimiter, heatmapController.getTrackedPages);

/**
 * Heatmap click coordinates for a specific page URL
 * GET /api/heatmap/clicks?pageUrl=...
 */
router.get(
  '/heatmap/clicks',
  apiLimiter,
  validateHeatmapQuery,
  heatmapController.getHeatmapClicks
);
router.get('/heatmap', apiLimiter, validateHeatmapQuery, heatmapController.getHeatmapClicks);

/**
 * Dashboard overview analytics
 * GET /api/analytics/overview
 */
router.get(
  '/analytics/overview',
  apiLimiter,
  analyticsController.getOverview
);

module.exports = router;
