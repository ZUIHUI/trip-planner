import { useState, useEffect, useRef } from 'react';

/**
 * useTrip Hook - 管理旅程狀態（本地狀態管理）
 */
export const useTrip = (initialTripDetails, initialItinerary) => {
  const [isLoading, setIsLoading] = useState(false);
  const [tripDetails, setTripDetails] = useState(initialTripDetails);
  const [itinerary, setItinerary] = useState(initialItinerary);
  const [checklists, setChecklists] = useState({ preTrip: [], packing: [] });

  return {
    isLoading,
    tripDetails,
    setTripDetails,
    itinerary,
    setItinerary,
    checklists,
    setChecklists
  };
};
