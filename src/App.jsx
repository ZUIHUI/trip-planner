import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppErrorBoundary from './components/AppErrorBoundary';
import { FeedbackProvider } from './contexts/FeedbackContext';
import { AuthProvider } from './contexts/AuthContext';
import { LoadingState } from './components/ui';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const TripListPage = lazy(() => import('./pages/TripListPage'));
const TripDetailPage = lazy(() => import('./pages/TripDetailPage'));

const RouteFallback = () => (
  <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <LoadingState label="載入頁面中..." />
  </main>
);

const App = () => {
  return (
    <FeedbackProvider>
      <AuthProvider>
        <AppErrorBoundary>
          <BrowserRouter>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<ProtectedRoute><TripListPage /></ProtectedRoute>} />
                <Route path="/trip/:tripId" element={<ProtectedRoute><TripDetailPage /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AppErrorBoundary>
      </AuthProvider>
    </FeedbackProvider>
  );
};

export default App;
