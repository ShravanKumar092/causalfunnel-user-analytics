const eventService = require('../services/eventService');

/**
 * Controller to ingest page_view and click events
 * POST /api/events
 */
const postEvent = async (req, res, next) => {
  try {
    const createdEvent = await eventService.createEvent(req.body);

    res.status(201).json({
      success: true,
      message: 'Event stored successfully',
      data: {
        id: createdEvent._id
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  postEvent
};
