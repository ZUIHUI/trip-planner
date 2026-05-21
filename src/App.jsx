import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import TripListPage from './pages/TripListPage';
import TripDetailPage from './pages/TripDetailPage';
import LoginPage from './pages/LoginPage';
import AppErrorBoundary from './components/AppErrorBoundary';
import { FeedbackProvider } from './contexts/FeedbackContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoadingState } from './components/ui';

const ProtectedRoute = ({ children }) => {
  const { currentUser, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return (
      <div className="tp-page-shell flex min-h-screen items-center justify-center p-4">
        <LoadingState label="正在確認登入狀態..." />
      </div>
    );
  }

  if (!currentUser) {
    const redirect = `${window.location.pathname}${window.location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  return children;
};

const App = () => {
  return (
    <FeedbackProvider>
      <AuthProvider>
        <AppErrorBoundary>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<ProtectedRoute><TripListPage /></ProtectedRoute>} />
              <Route path="/trip/:tripId" element={<ProtectedRoute><TripDetailPage /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AppErrorBoundary>
      </AuthProvider>
    </FeedbackProvider>
  );
};

export default App;
