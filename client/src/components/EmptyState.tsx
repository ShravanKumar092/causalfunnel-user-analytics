import React from 'react';
import { MousePointerClick, ExternalLink, type LucideIcon } from 'lucide-react';
import './StatusStates.css';

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  actionLabel?: string;
  actionUrl?: string | null;
  onAction?: () => void;
}

export const EmptyState = ({
  icon: Icon = MousePointerClick,
  title = 'No Tracking Events Recorded Yet',
  description = 'Open the demo store in your browser, browse products, and click around to generate user sessions and heatmaps in real-time.',
  actionLabel = 'Launch Demo Store',
  actionUrl = 'http://localhost:5500/demo.html',
  onAction
}: EmptyStateProps) => {
  return (
    <div className="state-container empty-state card">
      <div className="empty-icon-box">
        <Icon size={32} />
      </div>
      <h3 className="state-title">{title}</h3>
      <p className="state-message">{description}</p>
      
      <div className="empty-actions">
        {onAction ? (
          <button className="btn btn-primary" onClick={onAction}>
            {actionLabel}
          </button>
        ) : actionUrl ? (
          <a
            href={actionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            <span>{actionLabel}</span>
            <ExternalLink size={15} />
          </a>
        ) : null}
      </div>

      <div className="demo-instruction-steps">
        <div className="step-item">
          <span className="step-num">1</span>
          <span>Ensure backend is running (<code>npm start</code> on port 5000)</span>
        </div>
        <div className="step-item">
          <span className="step-num">2</span>
          <span>Open <code>demo.html</code> in a browser</span>
        </div>
        <div className="step-item">
          <span className="step-num">3</span>
          <span>Click products or add to cart, then refresh this dashboard!</span>
        </div>
      </div>
    </div>
  );
};

export default EmptyState;
