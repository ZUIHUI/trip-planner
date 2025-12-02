import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TripDetailPage from './pages/TripDetailPage';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TripDetailPage />} />
        <Route path="/trip/:tripId" element={<TripDetailPage />} />
      </Routes>
    </Router>
  );
};

export default App;

