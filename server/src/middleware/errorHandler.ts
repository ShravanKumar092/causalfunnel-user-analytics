/**
 * Centralized error handling middleware.
 * Formats errors consistently, maps status codes, and prevents leaking sensitive stack traces.
 */
const errorHandler = (err: any, req: any, res: any, next: any) => {
  let statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message || 'Internal Server Error';
  let errors = null;

  if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
    message = 'Internal Server Error';
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e: any) => e.message);
  }

  // Handle Mongoose Cast Error (invalid ObjectId or format)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for parameter: ${err.path}`;
  }

  // Handle JSON Syntax Error
  if (err instanceof SyntaxError && (err as any).status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Malformed JSON payload in request body';
  }

  // Response payload
  const response: any = {
    success: false,
    message,
    ...(errors && { errors })
  };

  // Only attach stack trace in non-production environments
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

/**
 * 404 Route Not Found middleware
 */
const notFoundHandler = (req: any, res: any, next: any) => {
  res.status(404).json({
    success: false,
    message: `Endpoint not found: ${req.method} ${req.originalUrl}`
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};
