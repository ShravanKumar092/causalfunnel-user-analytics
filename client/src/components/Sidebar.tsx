import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Flame, ExternalLink, Activity } from 'lucide-react';
import './Sidebar.css';

export const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="brand-badge">
            <Activity size={20} color="#fff" />
          </div>
          <div className="brand-info">
            <span className="brand-name">FunnelTrack</span>
            <span className="brand-sub">Behavior Analytics</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-group-label">ANALYTICS</div>
        <NavLink
          to="/"
          end
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={18} className="link-icon" />
          <span>Overview</span>
        </NavLink>

        <NavLink
          to="/sessions"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <Users size={18} className="link-icon" />
          <span>Sessions</span>
        </NavLink>

        <NavLink
          to="/heatmap"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <Flame size={18} className="link-icon" />
          <span>Click Heatmap</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="demo-launcher-box">
          <div className="demo-launcher-title">
            <span className="pulse-dot"></span>
            <span>Demo Store</span>
          </div>
          <p className="demo-launcher-desc">
            Interact with the store to generate real-time analytics events.
          </p>
          <a
            href="http://localhost:5500/demo.html"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-sm launcher-btn"
          >
            <span>Launch Store</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
