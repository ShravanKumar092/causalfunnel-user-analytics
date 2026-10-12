const mongoose = require('mongoose');

/**
 * Event Schema for FunnelTrack Analytics
 * Represents single user interactions (page views and clicks)
 */
const eventSchema = new mongoose.Schema(
  {
    session_id: {
      type: String,
      required: [true, 'session_id is required'],
      trim: true,
      index: true
    },
    event_type: {
      type: String,
      required: [true, 'event_type is required'],
      enum: {
        values: ['page_view', 'click'],
        message: 'event_type must be either "page_view" or "click"'
      }
    },
    page_url: {
      type: String,
      required: [true, 'page_url is required'],
      trim: true
    },
    page_title: { type: String, trim: true, maxlength: 300, default: null },
    referrer: { type: String, trim: true, maxlength: 2048, default: null },
    element_type: { type: String, trim: true, maxlength: 40, default: null },
    timestamp: {
      type: Date,
      required: [true, 'timestamp is required'],
      default: Date.now
    },
    click_x: {
      type: Number,
      default: null,
      validate: {
        validator: function (value) {
          if (this.event_type === 'click') {
            return typeof value === 'number' && !isNaN(value) && value >= 0;
          }
          return value === null || value === undefined;
        },
        message: 'click_x must be a non-negative number for click events and null for page_view events'
      }
    },
    x: { type: Number, default: null, min: 0 },
    y: { type: Number, default: null, min: 0 },
    click_y: {
      type: Number,
      default: null,
      validate: {
        validator: function (value) {
          if (this.event_type === 'click') {
            return typeof value === 'number' && !isNaN(value) && value >= 0;
          }
          return value === null || value === undefined;
        },
        message: 'click_y must be a non-negative number for click events and null for page_view events'
      }
    },
    viewport_width: {
      type: Number,
      default: null,
      validate: {
        validator: function (value) {
          if (value !== null && value !== undefined) {
            return typeof value === 'number' && !isNaN(value) && value > 0;
          }
          return true;
        },
        message: 'viewport_width must be a positive number if provided'
      }
    },
    viewport_height: {
      type: Number,
      default: null,
      validate: {
        validator: function (value) {
          if (value !== null && value !== undefined) {
            return typeof value === 'number' && !isNaN(value) && value > 0;
          }
          return true;
        },
        message: 'viewport_height must be a positive number if provided'
      }
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false
  }
);

/**
 * INDEX DEFINITIONS & RATIONALE:
 * 1. { session_id: 1, timestamp: 1 }
 *    - Compound index supporting chronological retrieval of all events within a session.
 *    - Enables efficient sorting and filtering for GET /api/sessions/:sessionId/events.
 *
 * 2. { event_type: 1, page_url: 1 }
 *    - Compound index optimizing heatmap queries.
 *    - Allows instant retrieval of distinct pages with clicks and filtering clicks by specific page URL
 *      for GET /api/heatmap/pages and GET /api/heatmap/clicks?pageUrl=...
 *
 * 3. { timestamp: -1 }
 *    - Descending timestamp index optimizing recent event queries, dashboard overview timelines,
 *      and global chronological feeds.
 *
 * 4. { session_id: 1 }
 *    - Individual index to optimize session aggregation pipelines ($group by session_id).
 */
eventSchema.index({ session_id: 1, timestamp: 1 });
eventSchema.index({ session_id: 1, timestamp: 1, _id: 1 });
eventSchema.index({ event_type: 1, page_url: 1 });
eventSchema.index({ page_url: 1 });
eventSchema.index({ timestamp: -1 });

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
