const Event = require('../models/Event');

/**
 * Service to aggregate and query user sessions
 */

/**
 * Aggregate sessions with pagination, event counts, and timestamps.
 * Uses MongoDB aggregation pipeline for high performance.
 */
const getSessions = async ({ page = 1, limit = 10, search = '' } = {}) => {
  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const pipeline = [
    ...(search ? [{ $match: { session_id: { $regex: String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } } }] : []),
    {
      $group: {
        _id: '$session_id',
        total_events: { $sum: 1 },
        page_views: {
          $sum: {
            $cond: [{ $eq: ['$event_type', 'page_view'] }, 1, 0]
          }
        },
        clicks: {
          $sum: {
            $cond: [{ $eq: ['$event_type', 'click'] }, 1, 0]
          }
        },
        distinct_pages: { $addToSet: '$page_url' },
        first_event_at: { $min: '$timestamp' },
        last_event_at: { $max: '$timestamp' }
      }
    },
    {
      $sort: { last_event_at: -1, _id: 1 }
    },
    {
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [{ $skip: skip }, { $limit: limitNum }]
      }
    }
  ];

  const [result] = await Event.aggregate(pipeline);

  const totalSessions = result.metadata[0] ? result.metadata[0].total : 0;
  const totalPages = Math.ceil(totalSessions / limitNum) || 1;

  const sessions = result.data.map((item) => ({
    session_id: item._id,
    total_events: item.total_events,
    page_views: item.page_views,
    clicks: item.clicks,
    distinct_pages: item.distinct_pages.length,
    first_event_at: item.first_event_at,
    last_event_at: item.last_event_at
  }));

  return {
    sessions,
    pagination: {
      currentPage: pageNum,
      limit: limitNum,
      totalSessions,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1
    }
  };
};

/**
 * Retrieve chronological events for a single session
 */
const getSessionEvents = async (sessionId, { page = 1, limit = 200 } = {}) => {
  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.min(500, Math.max(1, parseInt(String(limit), 10) || 200));
  const skip = (pageNum - 1) * limitNum;

  const totalEvents = await Event.countDocuments({ session_id: sessionId });

  const events = await Event.find({ session_id: sessionId })
    .sort({ timestamp: 1, _id: 1 })
    .skip(skip)
    .limit(limitNum)
    .select('session_id event_type page_url timestamp click_x click_y x y viewport_width viewport_height page_title referrer element_type createdAt')
    .lean();

  return {
    session_id: sessionId,
    total_events: totalEvents,
    events,
    pagination: {
      currentPage: pageNum,
      limit: limitNum,
      totalEvents,
      totalPages: Math.ceil(totalEvents / limitNum) || 1
    }
  };
};

module.exports = {
  getSessions,
  getSessionEvents
};
