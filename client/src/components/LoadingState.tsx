import React from 'react';
import { Loader2 } from 'lucide-react';
import './StatusStates.css';

export const LoadingState = ({ message = 'Loading analytics data...' }) => {
  return (
    <div className="state-container loading-state">
      <Loader2 size={32} className="spin text-primary" />
      <p className="state-message">{message}</p>
    </div>
  );
};

export default LoadingState;
