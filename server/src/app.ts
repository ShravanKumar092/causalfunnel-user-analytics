const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const apiRoutes = require('./routes/api');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// Configure CORS
// The SDK and dashboard are both governed by the configured origin allowlist in production.
const clientOrigin = [process.env.CLIENT_ORIGIN, process.env.DEMO_SITE_URL]
  .filter(Boolean)
  .join(',') || 'http://localhost:5173';

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }
    const allowedOrigins = clientOrigin.split(',').map((o) => o.trim());
    if (allowedOrigins.includes(origin) || (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false
};

app.use(cors(corsOptions));

// HTTP request logging (suppressed in test environment)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Request payload limit to safeguard against oversized payloads
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Mount API routes
app.use('/api', apiRoutes);
app.get('/tracker.js', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../../tracker/funneltrack.js'));
});

// Root route for quick verification
app.get('/', (req, res) => {
  res.json({
    name: 'FunnelTrack Analytics API',
    version: '1.0.0',
    documentation: '/api/health',
    status: 'online'
  });
});

// Centralized error handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
