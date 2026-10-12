const mongoose = require('mongoose');

/**
 * Controller for system health check
 * GET /api/health
 */
const getHealth = (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;

  res.status(isDbConnected ? 200 : 503).json({
    status: isDbConnected ? 'ok' : 'degraded',
    message: isDbConnected ? 'FunnelTrack API is operational' : 'Database disconnected',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: {
      status: isDbConnected ? 'connected' : 'disconnected'
    }
  });
};

module.exports = {
  getHealth
};
