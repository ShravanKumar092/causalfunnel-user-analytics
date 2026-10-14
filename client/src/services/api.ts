import axios from 'axios';

export interface AnalyticsEvent {
  _id: string;
  session_id: string;
  event_type: 'page_view' | 'click';
  page_url: string;
  timestamp: string;
  page_title?: string | null;
  referrer?: string | null;
  element_type?: string | null;
  x?: number | null;
  y?: number | null;
  click_x?: number | null;
  click_y?: number | null;
  viewport_width?: number | null;
  viewport_height?: number | null;
}

export interface SessionSummary {
  session_id: string;
  total_events: number;
  page_views: number;
  clicks: number;
  distinct_pages: number;
  first_event_at: string;
  last_event_at: string;
}

export interface PaginationInfo {
  currentPage: number;
  limit: number;
  totalSessions?: number;
  totalEvents?: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface SessionListData {
  sessions: SessionSummary[];
  pagination: PaginationInfo & { totalSessions: number };
}

export interface SessionEventsData {
  session_id: string;
  total_events: number;
  events: AnalyticsEvent[];
  pagination: PaginationInfo;
}

export interface OverviewData {
  total_sessions: number;
  total_events: number;
  total_page_views: number;
  total_clicks: number;
  total_pages: number;
  event_distribution: Array<{ event_type: string; name: string; count: number }>;
  recent_sessions: SessionSummary[];
  activity_timeline: Array<{ time: string; page_views: number; clicks: number; total: number }>;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  message: string;
  database: { status: 'connected' | 'disconnected' };
}

type ApiResponse<T> = Promise<ApiEnvelope<T>>;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://qwewewqewqsqsasqsxqwqw.onrender.com/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response interceptor for consistent error extraction
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorMsg =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred while contacting FunnelTrack API.';
    return Promise.reject(new Error(errorMsg));
  }
);

export const api = {
  /**
   * Health Check
   */
  // /health returns a top-level health object rather than the standard API envelope.
  getHealth: (): Promise<HealthResponse> => apiClient.get('/health') as unknown as Promise<HealthResponse>,

  /**
   * Overview Analytics
   */
  getOverview: (): ApiResponse<OverviewData> => apiClient.get('/analytics/overview'),

  /**
   * Aggregated Sessions List with pagination
   */
  getSessions: (page = 1, limit = 10, search = ''): ApiResponse<SessionListData> =>
    apiClient.get('/sessions', {
      params: { page, limit, search: search || undefined }
    }),

  /**
   * Chronological Events for a specific session
   */
  getSessionEvents: (sessionId: string, page = 1, limit = 200): ApiResponse<SessionEventsData> =>
    apiClient.get(`/sessions/${encodeURIComponent(sessionId)}/events`, {
      params: { page, limit }
    }),

  /**
   * Distinct pages recorded with clicks
   */
  getHeatmapPages: (): ApiResponse<{ pages: string[] }> => apiClient.get('/heatmap/pages'),

  /**
   * Click coordinates for a specific page URL
   */
  getHeatmapClicks: (pageUrl: string, limit = 1000): ApiResponse<{ page_url: string; total_clicks: number; returned_clicks: number; clicks: AnalyticsEvent[] }> =>
    apiClient.get('/heatmap/clicks', {
      params: { url: pageUrl, limit }
    }),
  getPages: (): ApiResponse<{ pages: string[] }> => apiClient.get('/pages')
};

export default api;
