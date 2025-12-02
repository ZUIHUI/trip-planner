import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TripListPage from './pages/TripListPage';
import TripDetailPage from './pages/TripDetailPage';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TripListPage />} />
        <Route path="/trip/:tripId" element={<TripDetailPage />} />
      </Routes>
    </Router>
  );
};

export default App;

