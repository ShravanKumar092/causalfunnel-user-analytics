const sessionService = require('../services/sessionService');

/**
 * Controller to list aggregated sessions
 * GET /api/sessions
 */
const getSessions = async (req, res, next) => {
  try {
    const { page, limit, search } = req.query;
    const result = await sessionService.getSessions({ page, limit, search });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to get chronological events for a specific session
 * GET /api/sessions/:sessionId/events
 */
const getSessionEvents = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { page, limit } = req.query;

    if (!sessionId || sessionId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid sessionId parameter is required'
      });
    }

    const result = await sessionService.getSessionEvents(sessionId, { page, limit });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSessions,
  getSessionEvents
};
