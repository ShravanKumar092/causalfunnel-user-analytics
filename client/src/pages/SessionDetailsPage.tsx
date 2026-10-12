import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Eye, MousePointerClick, Activity, Copy, Check } from 'lucide-react';
import Header from '../components/Header';
import MetricCard from '../components/MetricCard';
import EventTimeline from '../components/EventTimeline';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import api from '../services/api';
import { formatDate, formatDuration } from '../utils/formatters';
import './SessionDetailsPage.css';

export const SessionDetailsPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchSessionEvents = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      setError(null);
      const res = await api.getSessionEvents(sessionId);
      setSessionData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch session journey');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchSessionEvents();
    }
  }, [sessionId]);

  const handleCopyId = () => {
    if (sessionId && navigator.clipboard) {
      navigator.clipboard.writeText(sessionId).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  // Compute breakdown stats from retrieved events
  const events = sessionData?.events || [];
  const pageViewsCount = events.filter((e) => e.event_type === 'page_view').length;
  const clicksCount = events.filter((e) => e.event_type === 'click').length;
  const firstEventAt = events[0]?.timestamp;
  const lastEventAt = events[events.length - 1]?.timestamp;
  const durationStr = formatDuration(firstEventAt, lastEventAt);

  return (
    <div className="session-details-page">
      <Header
        title="Session Journey"
        subtitle="Step-by-step chronological user interaction replay"
        onRefresh={() => fetchSessionEvents(true)}
        isRefreshing={refreshing}
      />

      <div className="page-content">
        {/* Navigation Breadcrumb / Back Button */}
        <div className="session-back-bar">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/sessions')}>
            <ArrowLeft size={14} />
            <span>Back to Sessions</span>
          </button>

          <div className="session-banner-pill card">
            <span className="banner-label">Session ID:</span>
            <span className="banner-id font-mono">{sessionId}</span>
            <button className="banner-copy-btn" onClick={handleCopyId} title="Copy Session ID">
              {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading chronological journey events from MongoDB..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => fetchSessionEvents(false)} />
        ) : (
          <div className="session-details-content">
            {/* Metric Summary Cards */}
            <div className="metrics-grid">
              <MetricCard
                title="Total Events"
                value={events.length}
                icon={Activity}
                variant="primary"
                helperText="Recorded in this session"
              />
              <MetricCard
                title="Page Views"
                value={pageViewsCount}
                icon={Eye}
                variant="success"
                helperText="Unique pages visited"
              />
              <MetricCard
                title="Clicks"
                value={clicksCount}
                icon={MousePointerClick}
                variant="accent"
                helperText="Interactive click points"
              />
              <MetricCard
                title="Session Duration"
                value={durationStr}
                icon={Clock}
                variant="warning"
                helperText={`From ${formatDate(firstEventAt)}`}
              />
            </div>

            {/* Journey Timeline Section */}
            <div className="timeline-section-card card">
              <div className="timeline-header">
                <div>
                  <h3>Chronological Interaction Journey</h3>
                  <p className="timeline-sub">
                    Strict ascending order based on client timestamps persisted in database
                  </p>
                </div>
                <span className="badge badge-neutral">{events.length} Interaction Steps</span>
              </div>

              <div className="timeline-body">
                <EventTimeline events={events} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionDetailsPage;
