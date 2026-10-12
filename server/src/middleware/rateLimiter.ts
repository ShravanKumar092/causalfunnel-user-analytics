const rateLimit = require('express-rate-limit');

/**
 * Ingestion rate limiter
 * Allows up to 600 requests per 1-minute window per IP to comfortably
 * support rapid clicks and route changes in real tracking sessions.
 */
const eventIngestionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many event submissions from this IP, please try again shortly.'
  }
});

/**
 * General API rate limiter for query endpoints
 */
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Rate limit exceeded for API endpoints. Please slow down.'
  }
});

module.exports = {
  eventIngestionLimiter,
  apiLimiter
};
