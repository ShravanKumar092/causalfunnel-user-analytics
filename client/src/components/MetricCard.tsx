import React from 'react';
import type { LucideIcon } from 'lucide-react';
import './MetricCard.css';

interface MetricCardProps {
  title: string;
  value: number | string;
  icon?: LucideIcon;
  variant?: string;
  helperText?: string;
  badge?: string;
}

export const MetricCard = ({
  title,
  value,
  icon: Icon,
  variant = 'primary',
  helperText,
  badge
}: MetricCardProps) => {
  return (
    <div className={`metric-card card variant-${variant}`}>
      <div className="metric-header">
        <span className="metric-title">{title}</span>
        {Icon && (
          <div className="metric-icon-wrap">
            <Icon size={18} />
          </div>
        )}
      </div>

      <div className="metric-body">
        <div className="metric-value">{value !== undefined && value !== null ? value.toLocaleString() : '0'}</div>
        {badge && <span className="metric-badge">{badge}</span>}
      </div>

      {helperText && <div className="metric-helper">{helperText}</div>}
    </div>
  );
};

export default MetricCard;
