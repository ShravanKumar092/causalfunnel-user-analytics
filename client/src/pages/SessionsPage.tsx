import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, Copy, Check } from 'lucide-react';
import Header from '../components/Header';
import DataTable from '../components/DataTable';
import Pagination from '../components/Pagination';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import api from '../services/api';
import { formatDate, formatDuration, formatShortId } from '../utils/formatters';
import './SessionsPage.css';

export const SessionsPage = () => {
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    limit: 10,
    totalSessions: 0,
    totalPages: 1
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const fetchSessions = async (page = pagination.currentPage, limit = pagination.limit, isManual = false, search = searchTerm) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      setError(null);
      const res = await api.getSessions(page, limit, search);
      setSessions(res.data.sessions || []);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.message || 'Failed to load user sessions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchSessions(1, pagination.limit, false, searchTerm), 250);
    return () => clearTimeout(timer);
  }, [searchTerm, pagination.limit]);

  const handleCopyId = (e, id) => {
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(id).then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      });
    }
  };

  const columns = [
    {
      title: 'Session ID',
      key: 'session_id',
      render: (val) => (
        <div className="session-id-wrapper">
          <span className="session-id-text font-mono" title={val}>
            {formatShortId(val, 18)}
          </span>
          <button
            className="copy-id-btn"
            onClick={(e) => handleCopyId(e, val)}
            title="Copy full Session ID"
          >
            {copiedId === val ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
          </button>
        </div>
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
    { title: 'Pages', key: 'distinct_pages', align: 'center' },
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
      title: 'First Event',
      key: 'first_event_at',
      render: (val) => formatDate(val)
    },
    {
      title: 'Last Event',
      key: 'last_event_at',
      render: (val) => formatDate(val)
    },
    {
      title: '',
      key: 'action',
      align: 'right',
      render: (_, row) => (
        <button
          className="btn btn-secondary btn-sm journey-link-btn"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/sessions/${encodeURIComponent(row.session_id)}`);
          }}
        >
          <span>View Journey</span>
          <ArrowRight size={13} />
        </button>
      )
    }
  ];

  return (
    <div className="sessions-page">
      <Header
        title="User Sessions"
        subtitle="Aggregated browser interactions, event counts, and navigation timelines"
        onRefresh={() => fetchSessions(pagination.currentPage, pagination.limit, true)}
        isRefreshing={refreshing}
      />

      <div className="page-content">
        {loading ? (
          <LoadingState message="Aggregating user sessions from MongoDB..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => fetchSessions(1, pagination.limit)} />
        ) : sessions.length === 0 ? (
          <EmptyState
            title="No User Sessions Recorded"
            description="Open the demo store in your browser to generate session journeys."
          />
        ) : (
          <div className="sessions-content card">
            {/* Table Search & Filter Bar */}
            <div className="sessions-toolbar">
              <div className="search-box">
                <Search size={16} className="search-icon text-muted" />
                <input
                  type="text"
                  placeholder="Filter sessions by ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input-field"
                />
              </div>

              <div className="session-count-indicator">
                Showing {sessions.length} sessions
              </div>
            </div>

            {/* Main Table */}
            <DataTable
              columns={columns}
              data={sessions}
              keyField="session_id"
              onRowClick={(row) => navigate(`/sessions/${encodeURIComponent(row.session_id)}`)}
              emptyMessage={
                searchTerm
                  ? `No sessions matched "${searchTerm}"`
                  : 'No sessions found on this page'
              }
            />

            {/* Pagination Controls */}
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalSessions}
              limit={pagination.limit}
              onPageChange={(newPage) => fetchSessions(newPage, pagination.limit)}
              onLimitChange={(newLimit) => fetchSessions(1, newLimit)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionsPage;
