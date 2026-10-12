import React, { useState, useEffect } from 'react';
import { Globe, MousePointerClick, Users, Sliders, ExternalLink } from 'lucide-react';
import Header from '../components/Header';
import MetricCard from '../components/MetricCard';
import HeatmapCanvas from '../components/HeatmapCanvas';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import api from '../services/api';
import './HeatmapPage.css';

export const HeatmapPage = () => {
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState('');
  const [clicksData, setClicksData] = useState(null);

  const [loadingPages, setLoadingPages] = useState(true);
  const [loadingClicks, setLoadingClicks] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Fetch available pages with recorded clicks
  const fetchPages = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoadingPages(true);

      setError(null);
      const res = await api.getPages();
      const pageList = res.data.pages || [];
      setPages(pageList);

      // Default to first page if current selection is not set or not in list
      if (pageList.length > 0 && (!selectedPage || !pageList.includes(selectedPage))) {
        setSelectedPage(pageList[0]);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch pages with click activity');
    } finally {
      setLoadingPages(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  // Fetch click events whenever selected page changes
  useEffect(() => {
    if (!selectedPage) {
      setClicksData(null);
      return;
    }

    const fetchClicks = async () => {
      try {
        setLoadingClicks(true);
        setError(null);
        const res = await api.getHeatmapClicks(selectedPage);
        setClicksData(res.data);
      } catch (err) {
        setError(err.message || `Failed to fetch clicks for ${selectedPage}`);
      } finally {
        setLoadingClicks(false);
      }
    };

    fetchClicks();
  }, [selectedPage]);

  // Compute metrics for the active page
  const clicksList = clicksData?.clicks || [];
  const totalClicksCount = clicksData?.total_clicks || 0;
  const uniqueSessionsOnPage = new Set(clicksList.map((c) => c.session_id)).size;

  return (
    <div className="heatmap-page">
      <Header
        title="Click Heatmap"
        subtitle="Viewport-normalized spatial density and interaction coordinates"
        onRefresh={() => fetchPages(true)}
        isRefreshing={refreshing}
      />

      <div className="page-content">
        {loadingPages ? (
          <LoadingState message="Discovering pages with recorded click events..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => fetchPages(false)} />
        ) : pages.length === 0 ? (
          <EmptyState
            title="No Click Heatmap Data Yet"
            description="Open the demo storefront, click buttons and links across pages, then return here to visualize interaction coordinates."
          />
        ) : (
          <div className="heatmap-content">
            {/* Page Selector Bar */}
            <div className="page-selector-card card">
              <div className="selector-field">
                <label htmlFor="heatmap-page-select" className="selector-label">
                  <Globe size={16} />
                  <span>Select Page URL:</span>
                </label>
                <select
                  id="heatmap-page-select"
                  value={selectedPage}
                  onChange={(e) => setSelectedPage(e.target.value)}
                  className="page-select-dropdown"
                >
                  {pages.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {selectedPage && (
                <a
                  href={selectedPage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  title="Open live page in new tab"
                >
                  <span>Visit Page</span>
                  <ExternalLink size={13} />
                </a>
              )}
            </div>

            {/* Metrics Bar for Selected Page */}
            <div className="metrics-grid">
              <MetricCard
                title="Total Clicks on Page"
                value={totalClicksCount}
                icon={MousePointerClick}
                variant="primary"
                helperText="Stored click events in MongoDB"
              />

              <MetricCard
                title="Unique Sessions"
                value={uniqueSessionsOnPage}
                icon={Users}
                variant="accent"
                helperText="Distinct sessions clicking this URL"
              />

              <MetricCard
                title="Coord Method"
                value="Normalized"
                icon={Sliders}
                variant="secondary"
                helperText="clientX / innerWidth (Responsive)"
              />
            </div>

            {/* Canvas Section */}
            {loadingClicks ? (
              <LoadingState message={`Loading click coordinates for ${selectedPage}...`} />
            ) : clicksList.length === 0 ? (
              <div className="card empty-page-clicks">
                <MousePointerClick size={32} className="text-muted" />
                <h3>No click events recorded for this URL</h3>
                <p>Try selecting another page or interact with the demo store.</p>
              </div>
            ) : (
              <div className="heatmap-canvas-container">
                <HeatmapCanvas clicks={clicksList} pageUrl={selectedPage} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HeatmapPage;
