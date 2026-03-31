import { useState, useEffect, useRef } from 'react';
import { loadTrip, saveTrip } from '../services/tripService';
import { normalizeTripDateFields } from '../utils/tripDates';

const LEGACY_STORAGE_KEY = 'trip_planner_data';
const STORAGE_KEY_PREFIX = 'trip_planner_data_';
const FIREBASE_TIMEOUT = 3000; // 3 秒超時

const getStorageKey = (tripId) => `${STORAGE_KEY_PREFIX}${tripId}`;

const extractTripYear = (tripDetails) => {
  const rangeStart = tripDetails?.dateRange?.start;
  if (typeof rangeStart === 'string' && rangeStart.trim()) {
    const matchedStartYear = rangeStart.match(/\b(19|20)\d{2}\b/);
    if (matchedStartYear) return Number(matchedStartYear[0]);
  }

  const datesText = tripDetails?.dates;
  if (typeof datesText !== 'string') return null;
  const matchedYear = datesText.match(/\b(19|20)\d{2}\b/);
  return matchedYear ? Number(matchedYear[0]) : null;
};

const parseMonthDay = (dateText) => {
  if (typeof dateText !== 'string') return null;
  const matchedDate = dateText.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!matchedDate) return null;

  const month = Number(matchedDate[1]);
  const day = Number(matchedDate[2]);
  const isValidMonth = Number.isInteger(month) && month >= 1 && month <= 12;
  const isValidDay = Number.isInteger(day) && day >= 1 && day <= 31;

  if (!isValidMonth || !isValidDay) return null;
  return { month, day };
};

// 確保 itinerary 有完整的日期資訊
const ensureItineraryComplete = (itinerary, tripDetails) => {
  if (!itinerary || itinerary.length === 0) return itinerary;

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const tripYear = extractTripYear(tripDetails) || new Date().getFullYear();

  return itinerary.map((day, index) => {
    // 如果缺少 weekday，從 date 計算
    if (!day.weekday && day.date) {
      const parsedMonthDay = parseMonthDay(day.date);
      if (!parsedMonthDay) {
        return {
          ...day,
          day: day.day || index + 1
        };
      }

      const date = new Date(tripYear, parsedMonthDay.month - 1, parsedMonthDay.day);
      return {
        ...day,
        day: day.day || index + 1,
        weekday: weekdays[date.getDay()]
      };
    }
    return {
      ...day,
      day: day.day || index + 1
    };
  });
};

const buildFallbackData = (initialTripDetails, initialItinerary) => ({
  tripDetails: initialTripDetails,
  itinerary: initialItinerary,
  checklists: { preTrip: [], packing: [] },
  expenses: []
});

const migrateLegacyDataIfNeeded = (tripId) => {
  const currentKey = getStorageKey(tripId);

  try {
    if (localStorage.getItem(currentKey)) {
      return;
    }

    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacyRaw) {
      return;
    }

    localStorage.setItem(currentKey, legacyRaw);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    console.log(`✅ 已將舊資料遷移至 ${currentKey}`);
  } catch (error) {
    console.warn('⚠️ 舊資料遷移失敗：', error);
  }
};

/**
 * useTrip Hook - 管理旅程狀態，支持 Firebase 和 localStorage 同步，協作編輯
 */
export const useTrip = (tripId, initialTripDetails, initialItinerary) => {
  const safeTripId = typeof tripId === 'string' ? tripId.trim() : '';
  const storageKey = safeTripId ? getStorageKey(safeTripId) : null;
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [tripDetails, setTripDetails] = useState(initialTripDetails);
  const [itinerary, setItinerary] = useState(initialItinerary);
  const [checklists, setChecklists] = useState({ preTrip: [], packing: [] });
  const [expenses, setExpenses] = useState([]);
  const autoSaveTimeoutRef = useRef(null);
  const loadingTimeoutRef = useRef(null);

  const persistTripData = async (payload) => {
    if (!safeTripId || !storageKey) {
      throw new Error('無效的旅程 ID');
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
      console.log('💾 手動儲存到 localStorage 成功');
    } catch (localErr) {
      console.error('❌ localStorage 儲存失敗:', localErr);
      throw localErr;
    }

    await saveTrip(safeTripId, payload);
    console.log('🔥 手動儲存到 Firebase 成功');
  };

  // 初始化：優先使用 localStorage，背景嘗試更新 Firebase 資料
  useEffect(() => {
    if (!safeTripId || !storageKey) {
      setTripDetails(initialTripDetails);
      setItinerary(initialItinerary);
      setChecklists({ preTrip: [], packing: [] });
      setExpenses([]);
      setSaveError('無效的旅程 ID');
      setIsLoading(false);
      return;
    }

    const initializeData = async () => {
      try {
        setIsLoading(true);
        setSaveError(null);

        migrateLegacyDataIfNeeded(safeTripId);

        // 第一步：立即從 localStorage 載入（快速）
        let localData = null;
        try {
          const savedData = localStorage.getItem(storageKey);
          if (savedData) {
            localData = JSON.parse(savedData);
            console.log('✅ 從 localStorage 載入資料成功');
          }
        } catch (err) {
          console.error('❌ localStorage 載入失敗:', err);
        }

        const fallbackData = buildFallbackData(initialTripDetails, initialItinerary);
        const localOrFallback = localData || fallbackData;
        const normalizedLocalTripDetails = normalizeTripDateFields(localOrFallback.tripDetails || initialTripDetails);
        setTripDetails(normalizedLocalTripDetails);
        setItinerary(
          ensureItineraryComplete(
            localOrFallback.itinerary || initialItinerary,
            normalizedLocalTripDetails
          )
        );
        setChecklists(localOrFallback.checklists || { preTrip: [], packing: [] });
        setExpenses(localOrFallback.expenses || []);

        // 標記初始加載完成
        setIsLoading(false);

        // 第二步：背景嘗試從 Firebase 載入（含超時）
        console.log('📝 背景從 Firebase 載入旅程:', safeTripId);
        const firebasePromise = (async () => {
          try {
            const firebaseData = await loadTrip(safeTripId);
            if (firebaseData) {
              console.log('✅ 從 Firebase 載入資料成功');
              const normalizedFirebaseTripDetails = normalizeTripDateFields(firebaseData.tripDetails || initialTripDetails);
              setTripDetails(normalizedFirebaseTripDetails);
              setItinerary(
                ensureItineraryComplete(
                  firebaseData.itinerary || initialItinerary,
                  normalizedFirebaseTripDetails
                )
              );
              setChecklists(firebaseData.checklists || { preTrip: [], packing: [] });
              setExpenses(firebaseData.expenses || []);
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
  }, [safeTripId, storageKey, initialTripDetails, initialItinerary]);

  // 自動儲存到 localStorage 和 Firebase（防抖 1 秒）
  useEffect(() => {
    if (!safeTripId || !storageKey || isLoading) {
      return;
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSaving(true);
        setSaveError(null);

        const normalizedTripDetails = normalizeTripDateFields(tripDetails);

        const dataToSave = {
          tripDetails: normalizedTripDetails,
          itinerary,
          checklists,
          expenses,
          savedAt: new Date().toISOString()
        };

        // 優先儲存到 localStorage（立即）
        try {
          localStorage.setItem(storageKey, JSON.stringify(dataToSave));
          console.log('💾 自動儲存到 localStorage 成功');
        } catch (localErr) {
          console.error('❌ localStorage 儲存失敗:', localErr);
          setSaveError('本地儲存失敗');
        }

        // 背景儲存到 Firebase（含超時）
        try {
          const savePromise = saveTrip(safeTripId, dataToSave);
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Firebase 儲存超時')), FIREBASE_TIMEOUT);
          });

          await Promise.race([savePromise, timeoutPromise]);
          console.log('🔥 自動儲存到 Firebase 成功');
          setSaveError(null);
        } catch (firebaseErr) {
          console.warn('⚠️ Firebase 儲存失敗:', firebaseErr.message);
          setSaveError('雲端同步失敗，但本地已儲存');
        }
      } catch (err) {
        console.error('❌ 自動儲存失敗:', err);
        setSaveError('儲存失敗');
      } finally {
        setIsSaving(false);
      }
    }, 1000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [tripDetails, itinerary, checklists, expenses, safeTripId, storageKey, isLoading]);

  // 手動從 Firebase 更新資料
  const manualRefresh = async () => {
    if (!safeTripId) {
      setSaveError('無效的旅程 ID');
      return false;
    }

    try {
      setIsLoading(true);
      console.log('🔄 手動從 Firebase 更新資料...');
      const firebaseData = await loadTrip(safeTripId);
      if (firebaseData) {
        console.log('✅ 手動更新成功');
        const normalizedFirebaseTripDetails = normalizeTripDateFields(firebaseData.tripDetails || initialTripDetails);
        setTripDetails(normalizedFirebaseTripDetails);
        setItinerary(
          ensureItineraryComplete(
            firebaseData.itinerary || initialItinerary,
            normalizedFirebaseTripDetails
          )
        );
        setChecklists(firebaseData.checklists || { preTrip: [], packing: [] });
        setExpenses(firebaseData.expenses || []);
        return true;
      }
    } catch (err) {
      console.error('❌ 手動更新失敗:', err);
      setSaveError('無法連接伺服器');
      return false;
    } finally {
      setIsLoading(false);
    }

    return false;
  };

  const saveNow = async () => {
    if (!safeTripId || !storageKey) {
      setSaveError('無效的旅程 ID');
      return false;
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      const normalizedTripDetails = normalizeTripDateFields(tripDetails);
      const dataToSave = {
        tripDetails: normalizedTripDetails,
        itinerary,
        checklists,
        expenses,
        savedAt: new Date().toISOString()
      };
      await persistTripData(dataToSave);
      return true;
    } catch (err) {
      console.error('❌ 手動儲存失敗:', err);
      setSaveError('手動儲存失敗');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isLoading,
    isSaving,
    saveError,
    tripDetails,
    setTripDetails,
    itinerary,
    setItinerary,
    checklists,
    setChecklists,
    expenses,
    setExpenses,
    manualRefresh,
    saveNow
  };
};
