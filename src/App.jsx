import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import TripListPage from './pages/TripListPage';
import TripDetailPage from './pages/TripDetailPage';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TripListPage />} />
        <Route path="/trip/:tripId" element={<TripDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
