const Event = require('../models/Event');

/**
 * Service for computing analytics overview metrics derived directly from MongoDB records
 */
const getOverviewAnalytics = async () => {
  // Aggregate basic counts in parallel
  const [totalEvents, totalPageViews, totalClicks, uniqueSessionIds, distinctPages] = await Promise.all([
    Event.countDocuments(),
    Event.countDocuments({ event_type: 'page_view' }),
    Event.countDocuments({ event_type: 'click' }),
    Event.distinct('session_id'),
    Event.distinct('page_url')
  ]);

  const totalSessions = uniqueSessionIds.length;

  // Event distribution grouped by event type
  const eventDistribution = [
    { event_type: 'page_view', name: 'Page Views', count: totalPageViews },
    { event_type: 'click', name: 'Clicks', count: totalClicks }
  ];

  // Recent 5 active sessions with their metrics
  const recentSessionsPipeline = [
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
        first_event_at: { $min: '$timestamp' },
        last_event_at: { $max: '$timestamp' }
      }
    },
    { $sort: { last_event_at: -1 } },
    { $limit: 5 }
  ];

  const recentSessionsRaw = await Event.aggregate(recentSessionsPipeline);
  const recentSessions = recentSessionsRaw.map((s) => ({
    session_id: s._id,
    total_events: s.total_events,
    page_views: s.page_views,
    clicks: s.clicks,
    first_event_at: s.first_event_at,
    last_event_at: s.last_event_at
  }));

  // Time-based aggregation: activity by day/hour for charts
  const timelinePipeline = [
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' }
        },
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
        total: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    { $limit: 24 }
  ];

  const timelineRaw = await Event.aggregate(timelinePipeline);
  const activityTimeline = timelineRaw.map((t) => ({
    time: t._id,
    page_views: t.page_views,
    clicks: t.clicks,
    total: t.total
  }));

  return {
    total_sessions: totalSessions,
    total_events: totalEvents,
    total_page_views: totalPageViews,
    total_clicks: totalClicks,
    total_pages: distinctPages.length,
    event_distribution: eventDistribution,
    recent_sessions: recentSessions,
    activity_timeline: activityTimeline
  };
};

module.exports = {
  getOverviewAnalytics
};
