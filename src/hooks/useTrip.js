import { useState, useEffect, useRef } from 'react';
import { saveTrip, loadTrip } from '../services/tripService';

/**
 * useTrip Hook - 管理旅程狀態和與 Firebase 同步
 */
export const useTrip = (tripId, initialTripDetails, initialItinerary) => {
  const [isLoading, setIsLoading] = useState(true);
  const [tripDetails, setTripDetails] = useState(initialTripDetails);
  const [itinerary, setItinerary] = useState(initialItinerary);
  const [checklists, setChecklists] = useState({ preTrip: [], packing: [] });
  const autoSaveTimeoutRef = useRef(null);

  // 初始化旅程資料
  useEffect(() => {
    const initializeTrip = async () => {
      try {
        setIsLoading(true);
        console.log('📝 開始載入旅程:', tripId);

        const tripData = await loadTrip(tripId);
        if (tripData) {
          console.log('✅ 旅程資料已載入:', tripData);
          setTripDetails(tripData.tripDetails || initialTripDetails);
          setItinerary(tripData.itinerary || initialItinerary);
          setChecklists(tripData.checklists || { preTrip: [], packing: [] });
        } else {
          console.log('⚠️ 旅程不存在，使用預設資料');
          setTripDetails(initialTripDetails);
          setItinerary(initialItinerary);
          setChecklists({ preTrip: [], packing: [] });
        }
      } catch (err) {
        console.error('❌ 初始化旅程失敗:', err);
        // 故障恢復：使用本地預設資料
        setTripDetails(initialTripDetails);
        setItinerary(initialItinerary);
        setChecklists({ preTrip: [], packing: [] });
      } finally {
        setIsLoading(false);
      }
    };

    initializeTrip();
  }, [tripId]);

  // 自動儲存（防抖 1 秒）
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveTrip(tripId, {
          tripDetails,
          itinerary,
          checklists
        });
        console.log('✅ 自動儲存成功');
      } catch (err) {
        console.error('❌ 自動儲存失敗:', err);
      }
    }, 1000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [itinerary, tripDetails, checklists, tripId]);

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
