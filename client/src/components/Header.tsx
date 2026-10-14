import React, { useState, useEffect } from 'react';
import { RefreshCw, ExternalLink, Database } from 'lucide-react';
import api from '../services/api';
import './Header.css';

export const Header = ({ title, subtitle, onRefresh, isRefreshing }) => {
  const [dbStatus, setDbStatus] = useState('checking');

  useEffect(() => {
    let active = true;
    const checkHealth = async () => {
      try {
        const health = await api.getHealth();
        if (active) {
          setDbStatus(health.database?.status === 'connected' ? 'connected' : 'degraded');
        }
      } catch {
        if (active) setDbStatus('offline');
      }
    };

    checkHealth();
    const intervalId = window.setInterval(checkHealth, 10000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <h1 className="header-title">{title}</h1>
        {subtitle && <p className="header-subtitle">{subtitle}</p>}
      </div>

      <div className="header-right">
        {/* Live System Indicator */}
        <div className={`status-pill ${dbStatus}`} title="FunnelTrack API & Database Connection">
          <span className="pulse-dot"></span>
          <Database size={13} />
          <span>
            {dbStatus === 'connected'
              ? 'MongoDB Live'
              : dbStatus === 'checking'
              ? 'Connecting...'
              : dbStatus === 'degraded'
              ? 'Database unavailable'
              : 'API Offline'}
          </span>
        </div>

        {/* Refresh Action Button */}
        {onRefresh && (
          <button
            className={`btn btn-secondary btn-sm refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh analytics data"
          >
            <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        )}

        {/* Demo Link */}
        <a
          href="https://causalfunnel-user-analytics-tracker.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary btn-sm store-link-btn"
          title="Open tracking demo store"
        >
          <span>Open Demo Store</span>
          <ExternalLink size={13} />
        </a>
      </div>
    </header>
  );
};

export default Header;
