import { useState, useEffect, useRef } from 'react';
import { loadTrip, saveTrip } from '../services/tripService';

const STORAGE_KEY = 'trip_planner_data';
const FIREBASE_TIMEOUT = 3000; // 3 秒超時

/**
 * useTrip Hook - 管理旅程狀態，支持 Firebase 和 localStorage 同步
 */
export const useTrip = (tripId, initialTripDetails, initialItinerary) => {
  const [isLoading, setIsLoading] = useState(true);
  const [tripDetails, setTripDetails] = useState(initialTripDetails);
  const [itinerary, setItinerary] = useState(initialItinerary);
  const [checklists, setChecklists] = useState({ preTrip: [], packing: [] });
  const autoSaveTimeoutRef = useRef(null);
  const loadingTimeoutRef = useRef(null);

  // 初始化：優先使用 localStorage，背景嘗試更新 Firebase 資料
  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);

        // 第一步：立即從 localStorage 載入（快速）
        let localData = null;
        try {
          const savedData = localStorage.getItem(STORAGE_KEY);
          if (savedData) {
            localData = JSON.parse(savedData);
            console.log('✅ 從 localStorage 載入資料成功');
            setTripDetails(localData.tripDetails || initialTripDetails);
            setItinerary(localData.itinerary || initialItinerary);
            setChecklists(localData.checklists || { preTrip: [], packing: [] });
          }
        } catch (err) {
          console.error('❌ localStorage 載入失敗:', err);
        }

        // 標記初始加載完成
        setIsLoading(false);

        // 第二步：背景嘗試從 Firebase 載入（含超時）
        console.log('📝 背景從 Firebase 載入旅程:', tripId);
        const firebasePromise = (async () => {
          try {
            const firebaseData = await loadTrip(tripId);
            if (firebaseData) {
              console.log('✅ 從 Firebase 載入資料成功');
              setTripDetails(firebaseData.tripDetails || initialTripDetails);
              setItinerary(firebaseData.itinerary || initialItinerary);
              setChecklists(firebaseData.checklists || { preTrip: [], packing: [] });
            }
          } catch (err) {
            console.warn('⚠️ Firebase 載入失敗:', err.message);
          }
        })();

        // 3 秒超時
        const timeoutPromise = new Promise((_, reject) => {
          loadingTimeoutRef.current = setTimeout(
            () => reject(new Error('Firebase 加載超時')),
            FIREBASE_TIMEOUT
          );
        });

        try {
          await Promise.race([firebasePromise, timeoutPromise]);
          clearTimeout(loadingTimeoutRef.current);
        } catch (timeoutErr) {
          console.warn('⏱️ Firebase 加載超時，使用 localStorage 資料');
          clearTimeout(loadingTimeoutRef.current);
        }
      } catch (err) {
        console.error('❌ 初始化失敗:', err);
        setIsLoading(false);
      }
    };

    initializeData();

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
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

        // 優先儲存到 localStorage（立即）
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
          console.log('💾 自動儲存到 localStorage 成功');
        } catch (localErr) {
          console.error('❌ localStorage 儲存失敗:', localErr);
        }

        // 背景儲存到 Firebase（含超時）
        try {
          const savePromise = saveTrip(tripId, dataToSave);
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Firebase 儲存超時')), FIREBASE_TIMEOUT);
          });

          await Promise.race([savePromise, timeoutPromise]);
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
