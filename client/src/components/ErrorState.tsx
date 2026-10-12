import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import './StatusStates.css';

export const ErrorState = ({
  title = 'Failed to load data',
  message = 'There was an issue communicating with the FunnelTrack backend.',
  onRetry
}) => {
  return (
    <div className="state-container error-state card">
      <div className="error-icon-box">
        <AlertCircle size={28} />
      </div>
      <h3 className="state-title">{title}</h3>
      <p className="state-message">{message}</p>
      {onRetry && (
        <button className="btn btn-secondary btn-sm" onClick={onRetry}>
          <RefreshCw size={14} />
          <span>Try Again</span>
        </button>
      )}
    </div>
  );
};

export default ErrorState;
