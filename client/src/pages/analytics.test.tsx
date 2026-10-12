import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SessionsPage from './SessionsPage';
import SessionDetailsPage from './SessionDetailsPage';
import HeatmapPage from './HeatmapPage';
import api from '../services/api';

vi.mock('../services/api', () => ({
  default: {
    getHealth: vi.fn(),
    getSessions: vi.fn(),
    getSessionEvents: vi.fn(),
    getPages: vi.fn(),
    getHeatmapClicks: vi.fn(),
  },
}));

vi.mock('../components/HeatmapCanvas', () => ({
  default: () => 'Normalized click heatmap canvas',
}));

const mockedApi = vi.mocked(api);
const session = {
  session_id: 'session-test-123456789',
  total_events: 3,
  page_views: 1,
  clicks: 2,
  distinct_pages: 1,
  first_event_at: '2026-10-12T10:00:00.000Z',
  last_event_at: '2026-10-12T10:05:00.000Z',
};

describe('analytics dashboard pages', () => {
  beforeEach(() => {
    mockedApi.getHealth.mockResolvedValue({ status: 'ok', message: 'healthy', database: { status: 'connected' } } as never);
  });

  it('loads real session summaries and displays event counts', async () => {
    mockedApi.getSessions.mockResolvedValue({
      data: { success: true,
        sessions: [session],
        pagination: { currentPage: 1, limit: 10, totalSessions: 1, totalPages: 1 },
      },
    } as never);

    render(<MemoryRouter><SessionsPage /></MemoryRouter>);

    expect(await screen.findByTitle('session-test-123456789')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('View Journey')).toBeInTheDocument();
    expect(mockedApi.getSessions).toHaveBeenCalled();
  });

  it('shows a session user journey in chronological event form', async () => {
    mockedApi.getSessionEvents.mockResolvedValue({
      data: { success: true,
        session_id: session.session_id,
        total_events: 2,
        events: [
          { _id: 'evt-1', session_id: session.session_id, event_type: 'page_view', page_url: 'https://shop.test/products', timestamp: '2026-10-12T10:00:00.000Z' },
          { _id: 'evt-2', session_id: session.session_id, event_type: 'click', page_url: 'https://shop.test/products', timestamp: '2026-10-12T10:00:05.000Z', x: 20, y: 40 },
        ],
        pagination: { currentPage: 1, limit: 200, totalEvents: 2, totalPages: 1 },
      },
    } as never);

    render(
      <MemoryRouter initialEntries={[`/sessions/${session.session_id}`]}>
        <Routes><Route path="/sessions/:sessionId" element={<SessionDetailsPage />} /></Routes>
      </MemoryRouter>,
    );

    expect((await screen.findAllByText('https://shop.test/products')).length).toBeGreaterThan(0);
    expect(screen.getByText(/^CLICK$/i)).toBeInTheDocument();
    expect(mockedApi.getSessionEvents).toHaveBeenCalledWith(session.session_id);
  });

  it('loads page choices and click coordinates for the selected heatmap page', async () => {
    mockedApi.getPages.mockResolvedValue({ data: { pages: ['https://shop.test/products'] } } as never);
    mockedApi.getHeatmapClicks.mockResolvedValue({
      data: { success: true,
        page_url: 'https://shop.test/products',
        total_clicks: 1,
        returned_clicks: 1,
        clicks: [{ _id: 'evt-click', session_id: session.session_id, event_type: 'click', page_url: 'https://shop.test/products', timestamp: '2026-10-12T10:00:05.000Z', x: 20, y: 40, viewport_width: 100, viewport_height: 200 }],
      },
    } as never);

    render(<MemoryRouter><HeatmapPage /></MemoryRouter>);

    expect(await screen.findByRole('option', { name: 'https://shop.test/products' })).toBeInTheDocument();
    await waitFor(() => expect(mockedApi.getHeatmapClicks).toHaveBeenCalledWith('https://shop.test/products'));
    expect(await screen.findByText('Normalized click heatmap canvas')).toBeInTheDocument();
    expect(screen.getByText('Total Clicks on Page')).toBeInTheDocument();
  });

  it('shows a recoverable error when session API fails', async () => {
    mockedApi.getSessions.mockRejectedValue(new Error('API offline'));

    render(<MemoryRouter><SessionsPage /></MemoryRouter>);

    expect(await screen.findByText('API offline')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
