import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import TripListPage from './pages/TripListPage';
import TripDetailPage from './pages/TripDetailPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import AppErrorBoundary from './components/AppErrorBoundary';
import { FeedbackProvider } from './contexts/FeedbackContext';
import { AuthProvider } from './contexts/AuthContext';

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
