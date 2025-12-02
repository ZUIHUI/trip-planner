import { useState, useEffect, useRef } from 'react';
import { loadTrip, saveTrip } from '../services/tripService';

const STORAGE_KEY = 'trip_planner_data';

/**
 * useTrip Hook - 管理旅程狀態，支持 Firebase 和 localStorage 同步
 */
export const useTrip = (tripId, initialTripDetails, initialItinerary) => {
  const [isLoading, setIsLoading] = useState(true);
  const [tripDetails, setTripDetails] = useState(initialTripDetails);
  const [itinerary, setItinerary] = useState(initialItinerary);
  const [checklists, setChecklists] = useState({ preTrip: [], packing: [] });
  const autoSaveTimeoutRef = useRef(null);

  // 初始化：先嘗試從 Firebase 載入，失敗則從 localStorage 載入
  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);
        console.log('📝 開始從 Firebase 載入旅程:', tripId);

        // 嘗試從 Firebase 載入
        const firebaseData = await loadTrip(tripId);
        if (firebaseData) {
          console.log('✅ 從 Firebase 載入資料成功:', firebaseData);
          setTripDetails(firebaseData.tripDetails || initialTripDetails);
          setItinerary(firebaseData.itinerary || initialItinerary);
          setChecklists(firebaseData.checklists || { preTrip: [], packing: [] });
          return;
        }
      } catch (firebaseErr) {
        console.warn('⚠️ Firebase 載入失敗，嘗試從 localStorage 載入:', firebaseErr.message);
      }

      // Firebase 失敗或無資料，嘗試從 localStorage 載入
      try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
          const parsed = JSON.parse(savedData);
          console.log('✅ 從 localStorage 載入資料成功');
          setTripDetails(parsed.tripDetails || initialTripDetails);
          setItinerary(parsed.itinerary || initialItinerary);
          setChecklists(parsed.checklists || { preTrip: [], packing: [] });
        } else {
          console.log('ℹ️ 無任何儲存資料，使用預設值');
          setTripDetails(initialTripDetails);
          setItinerary(initialItinerary);
          setChecklists({ preTrip: [], packing: [] });
        }
      } catch (localErr) {
        console.error('❌ localStorage 載入失敗:', localErr);
        setTripDetails(initialTripDetails);
        setItinerary(initialItinerary);
        setChecklists({ preTrip: [], packing: [] });
      }

      setIsLoading(false);
    };

    initializeData();
  }, [tripId]);

  // 自動儲存到 localStorage 和 Firebase（防抖 1 秒）
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        const dataToSave = {
          tripDetails,
          itinerary,
          checklists,
          savedAt: new Date().toISOString()
        };

        // 儲存到 localStorage
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
          console.log('💾 自動儲存到 localStorage 成功');
        } catch (localErr) {
          console.error('❌ localStorage 儲存失敗:', localErr);
        }

        // 儲存到 Firebase
        try {
          await saveTrip(tripId, dataToSave);
          console.log('🔥 自動儲存到 Firebase 成功');
        } catch (firebaseErr) {
          console.warn('⚠️ Firebase 儲存失敗:', firebaseErr.message);
        }
      } catch (err) {
        console.error('❌ 自動儲存失敗:', err);
      }
    }, 1000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [tripDetails, itinerary, checklists, tripId]);

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
