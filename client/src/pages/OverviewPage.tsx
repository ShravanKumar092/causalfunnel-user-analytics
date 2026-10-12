import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Activity, Eye, MousePointerClick, ArrowRight, Globe } from 'lucide-react';
import Header from '../components/Header';
import MetricCard from '../components/MetricCard';
import DataTable from '../components/DataTable';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { EventDistributionDonut, ActivityTimelineChart } from '../components/ChartComponents';
import api from '../services/api';
import { formatDate, formatDuration, formatShortId } from '../utils/formatters';
import './OverviewPage.css';

export const OverviewPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchOverview = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      setError(null);
      const res = await api.getOverview();
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to retrieve overview metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const recentSessionsColumns = [
    {
      title: 'Session ID',
      key: 'session_id',
      render: (val) => (
        <span className="session-id-cell font-mono" title={val}>
          {formatShortId(val, 16)}
        </span>
      )
    },
    {
      title: 'Total Events',
      key: 'total_events',
      align: 'center',
      render: (val) => <span className="badge badge-neutral">{val}</span>
    },
    {
      title: 'Page Views',
      key: 'page_views',
      align: 'center',
      render: (val) => <span className="badge badge-pageview">{val}</span>
    },
    {
      title: 'Clicks',
      key: 'clicks',
      align: 'center',
      render: (val) => <span className="badge badge-click">{val}</span>
    },
    {
      title: 'Session Duration',
      key: 'duration',
      render: (_, row) => (
        <span className="duration-text">
          {formatDuration(row.first_event_at, row.last_event_at)}
        </span>
      )
    },
    {
      title: 'Last Active',
      key: 'last_event_at',
      render: (val) => formatDate(val)
    },
    {
      title: 'Action',
      key: 'action',
      align: 'right',
      render: (_, row) => (
        <span className="view-journey-btn">
          <span>Journey</span>
          <ArrowRight size={13} />
        </span>
      )
    }
  ];

  return (
    <div className="overview-page">
      <Header
        title="Analytics Overview"
        subtitle="Global behavioral metrics, session distribution, and activity timelines"
        onRefresh={() => fetchOverview(true)}
        isRefreshing={refreshing}
      />

      <div className="page-content">
        {loading ? (
          <LoadingState message="Fetching live FunnelTrack overview metrics..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => fetchOverview(false)} />
        ) : !data || data.total_events === 0 ? (
          <EmptyState />
        ) : (
          <div className="overview-content">
            {/* 4 Core Metric Cards */}
            <div className="metrics-grid">
              <MetricCard
                title="Total Sessions"
                value={data.total_sessions}
                icon={Users}
                variant="primary"
                helperText="Unique browser sessions recorded"
              />

              <MetricCard
                title="Total Events"
                value={data.total_events}
                icon={Activity}
                variant="secondary"
                helperText="All interactions tracked in MongoDB"
              />

              <MetricCard
                title="Page Views"
                value={data.total_page_views}
                icon={Eye}
                variant="success"
                helperText="Initial loads & SPA navigations"
              />

              <MetricCard
                title="Click Events"
                value={data.total_clicks}
                icon={MousePointerClick}
                variant="accent"
                helperText="Interactive button & link clicks"
              />

              <MetricCard
                title="Tracked Pages"
                value={data.total_pages || 0}
                icon={Globe}
                variant="secondary"
                helperText="Distinct URLs with recorded activity"
              />
            </div>

            {/* Charts Section */}
            <div className="charts-grid">
              <div className="chart-card card">
                <div className="card-header">
                  <h3>Event Distribution</h3>
                  <span className="card-sub">Ratio of page views vs clicks</span>
                </div>
                <div className="card-body">
                  <EventDistributionDonut data={data.event_distribution} />
                </div>
              </div>

              <div className="chart-card card">
                <div className="card-header">
                  <h3>Interaction Timeline</h3>
                  <span className="card-sub">Event volume trends over time</span>
                </div>
                <div className="card-body">
                  <ActivityTimelineChart data={data.activity_timeline} />
                </div>
              </div>
            </div>

            {/* Recent Sessions Table */}
            <div className="recent-sessions-card card">
              <div className="card-header sessions-card-header">
                <div>
                  <h3>Recent Active Sessions</h3>
                  <span className="card-sub">Latest user interaction sessions</span>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate('/sessions')}
                >
                  <span>View All Sessions</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              <div className="card-body p-0">
                <DataTable
                  columns={recentSessionsColumns}
                  data={data.recent_sessions || []}
                  keyField="session_id"
                  onRowClick={(row) => navigate(`/sessions/${encodeURIComponent(row.session_id)}`)}
                  emptyMessage="No recent sessions found"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OverviewPage;
