/**
 * Formatting helpers for FunnelTrack Dashboard
 */

export const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch (e) {
    return dateString;
  }
};

export const formatTimeOnly = (dateString) => {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch (e) {
    return dateString;
  }
};

export const formatDuration = (startDate, endDate) => {
  if (!startDate || !endDate) return '—';
  try {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const diffMs = Math.max(0, end - start);

    if (diffMs < 1000) return `${diffMs}ms`;
    const totalSecs = Math.floor(diffMs / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;

    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  } catch (e) {
    return '—';
  }
};

export const formatRelativeTime = (dateString) => {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    const now = new Date();
    const diffSecs = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffSecs < 5) return 'just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;
    const mins = Math.floor(diffSecs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch (e) {
    return dateString;
  }
};

export const formatShortId = (id, length = 12) => {
  if (!id) return '—';
  if (id.length <= length) return id;
  return `${id.substring(0, length)}...`;
};

export const formatUrl = (url) => {
  if (!url) return '—';
  try {
    const parsed = new URL(url);
    const pathAndQuery = parsed.pathname + (parsed.search || '');
    return pathAndQuery === '/' ? '/' : pathAndQuery;
  } catch (e) {
    return url;
  }
};
