import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import LoadingState from './components/LoadingState';

const OverviewPage = lazy(() => import('./pages/OverviewPage'));
const SessionsPage = lazy(() => import('./pages/SessionsPage'));
const SessionDetailsPage = lazy(() => import('./pages/SessionDetailsPage'));
const HeatmapPage = lazy(() => import('./pages/HeatmapPage'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="grid min-h-screen place-items-center bg-canvas"><LoadingState message="Loading dashboard…" /></div>}>
        <Routes>
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<OverviewPage />} />
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="sessions/:sessionId" element={<SessionDetailsPage />} />
            <Route path="heatmap" element={<HeatmapPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
