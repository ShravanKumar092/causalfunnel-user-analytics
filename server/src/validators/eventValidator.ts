/**
 * Validates incoming event payloads for POST /api/events
 */
const validateEventPayload = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ success: false, message: 'Request body must be a JSON object.', errors: ['Invalid event payload'] });
  }
  const {
    session_id,
    event_type,
    page_url,
    timestamp,
    click_x,
    click_y,
    x,
    y,
    viewport_width,
    viewport_height
  } = req.body;

  const errors = [];
  const coordinateX = x ?? click_x;
  const coordinateY = y ?? click_y;

  // Validate session_id
  if (!session_id || typeof session_id !== 'string' || session_id.trim().length === 0 || session_id.length > 200) {
    errors.push('session_id is required and must be a non-empty string no longer than 200 characters');
  }
  const boundedFields: Array<[string, number]> = [['page_title', 300], ['referrer', 2048], ['element_type', 40]];
  for (const [field, maxLength] of boundedFields) {
    if (req.body[field] !== undefined && req.body[field] !== null && typeof req.body[field] !== 'string') {
      errors.push(`${field} must be a string`);
    } else if (typeof req.body[field] === 'string' && req.body[field].length > maxLength) {
      errors.push(`${field} must be no longer than ${maxLength} characters`);
    }
  }
  if (typeof req.body.referrer === 'string' && req.body.referrer.length) {
    try {
      const referrerUrl = new URL(req.body.referrer);
      if (!['http:', 'https:'].includes(referrerUrl.protocol)) throw new Error('invalid');
    } catch {
      errors.push('referrer must be a valid HTTP or HTTPS URL');
    }
  }

  // Validate event_type
  if (!event_type || !['page_view', 'click'].includes(event_type)) {
    errors.push('event_type is required and must be either "page_view" or "click"');
  }

  // Validate page_url
  try {
    const parsedUrl = new URL(page_url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol) || page_url.length > 2048) throw new Error('invalid');
  } catch {
    errors.push('page_url must be a valid HTTP or HTTPS URL (maximum 2048 characters)');
  }

  // Validate timestamp if provided
  if (timestamp !== undefined && timestamp !== null) {
    const parsedDate = new Date(timestamp);
    if (isNaN(parsedDate.getTime())) {
      errors.push('timestamp must be a valid ISO 8601 date string or timestamp');
    }
  }

  // Validate viewport dimensions if provided
  if (viewport_width !== undefined && viewport_width !== null) {
    if (typeof viewport_width !== 'number' || isNaN(viewport_width) || viewport_width <= 0) {
      errors.push('viewport_width must be a positive number');
    }
  }

  if (viewport_height !== undefined && viewport_height !== null) {
    if (typeof viewport_height !== 'number' || isNaN(viewport_height) || viewport_height <= 0) {
      errors.push('viewport_height must be a positive number');
    }
  }

  // Specific validations for event_type
  if (event_type === 'click') {
    if (typeof coordinateX !== 'number' || !Number.isFinite(coordinateX) || coordinateX < 0) {
      errors.push('click_x must be a non-negative number for click events (x is also accepted)');
    }
    if (typeof coordinateY !== 'number' || !Number.isFinite(coordinateY) || coordinateY < 0) {
      errors.push('click_y must be a non-negative number for click events (y is also accepted)');
    }

    // Coordinate sanity check against viewport if viewport is provided
    if (typeof viewport_width === 'number' && typeof coordinateX === 'number') {
      // Allow a reasonable 50px buffer for edge clicks or scrollbars
      if (coordinateX > viewport_width + 100) {
        errors.push(`x (${coordinateX}) exceeds reasonable viewport width bounds (${viewport_width})`);
      }
    }
    if (typeof viewport_height === 'number' && typeof coordinateY === 'number') {
      if (coordinateY > viewport_height + 100) {
        errors.push(`y (${coordinateY}) exceeds reasonable viewport height bounds (${viewport_height})`);
      }
    }
  } else if (event_type === 'page_view') {
    if (click_x !== null && click_x !== undefined) {
      errors.push('click_x must be null for page_view events');
    }
    if (click_y !== null && click_y !== undefined) {
      errors.push('click_y must be null for page_view events');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

/**
 * Validates heatmap click query parameters
 */
const validateHeatmapQuery = (req, res, next) => {
  const pageUrl = req.query.pageUrl || req.query.url;

  if (!pageUrl || typeof pageUrl !== 'string' || pageUrl.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Query parameter "pageUrl" is required and cannot be empty.'
    });
  }

  try {
    const parsedUrl = new URL(pageUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol) || pageUrl.length > 2048) throw new Error('invalid');
  } catch {
    return res.status(400).json({ success: false, message: 'Page URL must be a valid HTTP or HTTPS URL.' });
  }

  next();
};

module.exports = {
  validateEventPayload,
  validateHeatmapQuery
};
