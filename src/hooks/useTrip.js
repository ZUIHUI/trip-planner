import { useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'trip_planner_data';

/**
 * useTrip Hook - 管理旅程狀態並使用 localStorage 自動儲存
 */
export const useTrip = (initialTripDetails, initialItinerary) => {
  const [isLoading, setIsLoading] = useState(true);
  const [tripDetails, setTripDetails] = useState(initialTripDetails);
  const [itinerary, setItinerary] = useState(initialItinerary);
  const [checklists, setChecklists] = useState({ preTrip: [], packing: [] });
  const autoSaveTimeoutRef = useRef(null);

  // 初始化：從 localStorage 載入資料
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        console.log('✅ 從 localStorage 載入資料成功');
        setTripDetails(parsed.tripDetails || initialTripDetails);
        setItinerary(parsed.itinerary || initialItinerary);
        setChecklists(parsed.checklists || { preTrip: [], packing: [] });
      } else {
        console.log('ℹ️ localStorage 無資料，使用預設值');
        setTripDetails(initialTripDetails);
        setItinerary(initialItinerary);
        setChecklists({ preTrip: [], packing: [] });
      }
    } catch (err) {
      console.error('❌ 從 localStorage 載入失敗:', err);
      setTripDetails(initialTripDetails);
      setItinerary(initialItinerary);
      setChecklists({ preTrip: [], packing: [] });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 自動儲存到 localStorage（防抖 1 秒）
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      try {
        const dataToSave = {
          tripDetails,
          itinerary,
          checklists,
          savedAt: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        console.log('💾 自動儲存到 localStorage 成功');
      } catch (err) {
        console.error('❌ 儲存到 localStorage 失敗:', err);
      }
    }, 1000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [tripDetails, itinerary, checklists]);

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
