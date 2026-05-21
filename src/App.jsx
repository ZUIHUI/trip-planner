import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import TripListPage from './pages/TripListPage';
import TripDetailPage from './pages/TripDetailPage';
import AppErrorBoundary from './components/AppErrorBoundary';
import { FeedbackProvider } from './contexts/FeedbackContext';

const App = () => {
  return (
    <FeedbackProvider>
      <AppErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<TripListPage />} />
            <Route path="/trip/:tripId" element={<TripDetailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AppErrorBoundary>
    </FeedbackProvider>
  );
};

export default App;
