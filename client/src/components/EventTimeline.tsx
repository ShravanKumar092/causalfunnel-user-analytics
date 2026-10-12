import React from 'react';
import { Eye, MousePointerClick, Clock, ExternalLink, Compass } from 'lucide-react';
import { formatDate, formatTimeOnly } from '../utils/formatters';
import './EventTimeline.css';

export const EventTimeline = ({ events = [] }) => {
  if (!events || events.length === 0) {
    return (
      <div className="timeline-empty card">
        <Compass size={32} className="text-muted" />
        <p>No events recorded in this session journey.</p>
      </div>
    );
  }

  return (
    <div className="timeline-container">
      {events.map((event, index) => {
        const isPageView = event.event_type === 'page_view';
        const prevEvent = index > 0 ? events[index - 1] : null;

        // Calculate delta time from previous step
        let deltaMs = null;
        if (prevEvent && event.timestamp && prevEvent.timestamp) {
          deltaMs = new Date(event.timestamp).getTime() - new Date(prevEvent.timestamp).getTime();
        }

        return (
          <div key={event._id || index} className={`timeline-node ${isPageView ? 'node-pageview' : 'node-click'}`}>
            {/* Step Counter Indicator */}
            <div className="timeline-marker">
              <div className="marker-icon">
                {isPageView ? <Eye size={15} /> : <MousePointerClick size={15} />}
              </div>
              {index < events.length - 1 && <div className="timeline-line"></div>}
            </div>

            {/* Event Details Card */}
            <div className="timeline-card card">
              <div className="timeline-card-header">
                <div className="header-meta">
                  <span className={`badge ${isPageView ? 'badge-pageview' : 'badge-click'}`}>
                    {isPageView ? 'PAGE VIEW' : 'CLICK'}
                  </span>
                  <span className="step-tag">Step #{index + 1}</span>
                </div>

                <div className="timeline-time">
                  <Clock size={13} />
                  <span title={formatDate(event.timestamp)}>
                    {formatTimeOnly(event.timestamp)}
                  </span>
                  {deltaMs !== null && deltaMs >= 0 && (
                    <span className="delta-badge" title="Time elapsed since previous interaction">
                      +{deltaMs < 1000 ? `${deltaMs}ms` : `${(deltaMs / 1000).toFixed(1)}s`}
                    </span>
                  )}
                </div>
              </div>

              <div className="timeline-card-body">
                {event.page_title && <div className="url-row"><span className="url-label">Title:</span><span>{event.page_title}</span></div>}
                <div className="url-row">
                  <span className="url-label">Page:</span>
                  <a
                    href={event.page_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="url-link"
                    title={event.page_url}
                  >
                    <span>{event.page_url}</span>
                    <ExternalLink size={12} />
                  </a>
                </div>

                {event.referrer && (
                  <div className="url-row">
                    <span className="url-label">Referrer:</span>
                    <a href={event.referrer} target="_blank" rel="noopener noreferrer" className="url-link">
                      <span>{event.referrer}</span><ExternalLink size={12} />
                    </a>
                  </div>
                )}

                {!isPageView && (
                  <div className="coords-row">
                    {event.element_type && <div className="coord-chip"><span className="coord-label">Element:</span><span className="coord-val">{event.element_type}</span></div>}
                    <div className="coord-chip">
                      <span className="coord-label">Coordinates:</span>
                      <span className="coord-val">
                        X: {event.click_x}px, Y: {event.click_y}px
                      </span>
                    </div>

                    {event.viewport_width && event.viewport_height && (
                      <div className="coord-chip">
                        <span className="coord-label">Viewport:</span>
                        <span className="coord-val">
                          {event.viewport_width} × {event.viewport_height}
                        </span>
                      </div>
                    )}

                    {event.viewport_width && event.click_x !== null && (
                      <div className="coord-chip">
                        <span className="coord-label">Normalized:</span>
                        <span className="coord-val">
                          {((event.click_x / event.viewport_width) * 100).toFixed(1)}% X,{' '}
                          {((event.click_y / event.viewport_height) * 100).toFixed(1)}% Y
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default EventTimeline;
