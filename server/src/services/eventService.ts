const Event = require('../models/Event');

/**
 * Service to handle single event persistence
 */
const createEvent = async (eventData) => {
  const {
    session_id,
    event_type,
    page_url,
    timestamp,
    click_x,
    click_y,
    x,
    y,
    page_title,
    referrer,
    element_type,
    viewport_width,
    viewport_height
  } = eventData;

  const normalizedUrl = new URL(page_url).toString();
  let safeReferrer = null;
  if (typeof referrer === 'string' && referrer.trim()) {
    const referrerUrl = new URL(referrer);
    safeReferrer = referrerUrl.origin + referrerUrl.pathname;
  }
  const coordinateX = x ?? click_x;
  const coordinateY = y ?? click_y;
  const eventPayload = {
    session_id,
    event_type,
    page_url: normalizedUrl,
    timestamp: timestamp ? new Date(timestamp) : new Date(),
    click_x: event_type === 'click' ? coordinateX : null,
    click_y: event_type === 'click' ? coordinateY : null,
    x: event_type === 'click' ? coordinateX : null,
    y: event_type === 'click' ? coordinateY : null,
    page_title: typeof page_title === 'string' ? page_title.slice(0, 300) : null,
    referrer: safeReferrer ? safeReferrer.slice(0, 2048) : null,
    element_type: typeof element_type === 'string' ? element_type.slice(0, 40) : null,
    viewport_width: viewport_width || null,
    viewport_height: viewport_height || null
  };

  const newEvent = await Event.create(eventPayload);
  return newEvent;
};

module.exports = {
  createEvent
};
