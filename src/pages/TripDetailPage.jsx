import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Save, ChevronRight } from 'lucide-react';
import Header from '../components/Header';
import Modal from '../components/Modal';
import EditEventForm from '../components/EditEventForm';
import SettingsPanel from '../components/SettingsPanel';
import BottomNavigation from '../components/BottomNavigation';
import SummaryTab from '../components/trip/SummaryTab';
import ItineraryTab from '../components/trip/ItineraryTab';
import LogisticsTab from '../components/trip/LogisticsTab';
import PreTripTab from '../components/trip/PreTripTab';
import PackingTab from '../components/trip/PackingTab';
import ShoppingTab from '../components/trip/ShoppingTab';
import ExpensesTab from '../components/trip/ExpensesTab';
import { TripWorkspaceProvider } from '../contexts/TripWorkspaceContext';
import { useTrip } from '../hooks/useTrip';
import { useBudget } from '../hooks/useBudget';
import { useDeviceLocation } from '../hooks/useDeviceLocation';
import { fetchJPYRate } from '../services/currencyService';
import { lookupFlightByCode } from '../services/flightService';
import { buildGoogleMapsDirectionsUrl, buildGoogleMapsSearchUrl } from '../services/googleMapsService';
import { createEmptyItinerary } from '../domain/tripSchema';
import { getTripDisplayDates } from '../utils/tripDates';
import { normalizeCoverImageUrl } from '../utils/coverImage';

const TRIP_INDEX_KEY = 'trip_planner_trip_index';
const LAST_OPENED_TRIP_KEY = 'trip_planner_last_opened_trip_id';
const RATE_CACHE_KEY = 'trip_planner_jpy_rate_cache';
const RATE_REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 小時
const RATE_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 小時
const MAX_AUTO_GENERATED_DAYS = 30;

const getDateRangeDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
};

const buildAutoItineraryFromDateRange = (existingItinerary, startDate, endDate) => {
  const dayCount = Math.min(getDateRangeDays(startDate, endDate), MAX_AUTO_GENERATED_DAYS);
  if (dayCount <= 0) return existingItinerary;

  const start = new Date(`${startDate}T00:00:00`);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return Array.from({ length: dayCount }, (_, index) => {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + index);
    const legacyDay = existingItinerary[index];

    return {
      day: index + 1,
      date: `${currentDate.getMonth() + 1}/${currentDate.getDate()}`,
      weekday: weekdays[currentDate.getDay()],
      title: legacyDay?.title || `Day ${index + 1}`,
      events: legacyDay?.events || []
    };
  });
};

const syncTripMetaToLocalIndex = (tripId, patch) => {
  try {
    const raw = localStorage.getItem(TRIP_INDEX_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const safeList = Array.isArray(list) ? list : [];
    const targetIndex = safeList.findIndex((trip) => trip.id === tripId);

    if (targetIndex >= 0) {
      safeList[targetIndex] = {
        ...safeList[targetIndex],
        ...patch,
        updatedAt: new Date().toISOString()
      };
    } else {
      safeList.push({
        id: tripId,
        title: patch.title || '未命名旅程',
        status: patch.status || 'planning',
        coverImage: patch.coverImage || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    localStorage.setItem(TRIP_INDEX_KEY, JSON.stringify(safeList));
  } catch (error) {
    console.warn('⚠️ 更新旅程索引失敗:', error);
  }
};

const TripDetailPage = () => {
  const { tripId: paramTripId } = useParams();
  const tripId = typeof paramTripId === 'string' ? paramTripId.trim() : '';
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('itinerary');
  const [selectedDay, setSelectedDay] = useState(1);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isEventViewMode, setIsEventViewMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isShoppingModalOpen, setIsShoppingModalOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('trip_planner_theme') || 'light');
  const [interfaceSize, setInterfaceSize] = useState(() => localStorage.getItem('trip_planner_interface_size') || 'medium');
  const [enableGPS, setEnableGPS] = useState(false);
  const [selectedEventLocation, setSelectedEventLocation] = useState(null);
  const [isEditingDayMeta, setIsEditingDayMeta] = useState(false);
  const [dayMetaDraft, setDayMetaDraft] = useState({ title: '', date: '' });
  const [coverImageLoadFailed, setCoverImageLoadFailed] = useState(false);
  const [showSecondaryModules, setShowSecondaryModules] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(0.215);
  const [lastUpdateDate, setLastUpdateDate] = useState('');
  const [isRateUpdating, setIsRateUpdating] = useState(false);
  const [rateUpdateError, setRateUpdateError] = useState('');
  const [isLookingUpFlight, setIsLookingUpFlight] = useState({ outbound: false, inbound: false });
  const [flightLookupError, setFlightLookupError] = useState({ outbound: '', inbound: '' });
  const shoppingListRef = useRef(null);
  const expenseTrackerRef = useRef(null);

  // 初始旅程資料結構
  const defaultTripDetails = useMemo(() => ({
    title: '',
    dates: '',
    dateRange: { start: '', end: '' },
    status: 'planning',
    coverImage: '',
    budget: {
      total: ''
    },
    accommodation: {},
    flights: {},
    travelers: []
  }), []);

  const defaultItinerary = useMemo(() => createEmptyItinerary(), []);

  const { 
    isLoading, 
    tripDetails, 
    setTripDetails, 
    itinerary, 
    setItinerary, 
    checklists, 
    setChecklists,
    expenses,
    setExpenses,
    isSaving,
    saveNow
  } = useTrip(tripId, defaultTripDetails, defaultItinerary);

  const budgetInfo = useBudget(itinerary, expenses, exchangeRate);
  const totalEvents = useMemo(
    () => itinerary.reduce((acc, day) => acc + day.events.length, 0),
    [itinerary]
  );

  // 使用 GPS Hook 獲取設備位置
  const { currentLocation, isLocating, locationError } = useDeviceLocation(enableGPS);

  useEffect(() => {
    if (!tripId) {
      navigate('/', { replace: true });
    }
  }, [tripId, navigate]);

  useEffect(() => {
    if (!tripId) return;

    syncTripMetaToLocalIndex(tripId, {
      title: tripDetails?.title || '未命名旅程',
      status: tripDetails?.status || 'planning',
      coverImage: tripDetails?.coverImage || ''
    });
  }, [tripId]);

  useEffect(() => {
    if (!tripId) return;
    localStorage.setItem(LAST_OPENED_TRIP_KEY, tripId);
  }, [tripId]);

  useEffect(() => {
    if (!tripId) return;
    syncTripMetaToLocalIndex(tripId, {
      title: tripDetails?.title || '未命名旅程',
      status: tripDetails?.status || 'planning',
      coverImage: tripDetails?.coverImage || '',
      eventCount: totalEvents
    });
  }, [tripId, tripDetails?.title, tripDetails?.status, tripDetails?.coverImage, totalEvents]);

  useEffect(() => {
    if (isLoading) return;

    const startDate = tripDetails?.dateRange?.start || '';
    const endDate = tripDetails?.dateRange?.end || '';
    const computedDays = getDateRangeDays(startDate, endDate);

    if (!computedDays) return;

    setItinerary((prev) => {
      if (!Array.isArray(prev)) return prev;

      const next = buildAutoItineraryFromDateRange(prev, startDate, endDate);
      if (next.length === prev.length) {
        const hasAnyDateMismatch = next.some((day, index) => day.date !== prev[index]?.date || day.weekday !== prev[index]?.weekday);
        if (!hasAnyDateMismatch) return prev;
      }
      return next;
    });

    setSelectedDay((prevSelectedDay) => Math.min(Math.max(prevSelectedDay, 1), computedDays));
  }, [tripDetails?.dateRange?.start, tripDetails?.dateRange?.end, isLoading, setItinerary]);


  useEffect(() => {
    document.documentElement.classList.toggle('dark', currentTheme === 'dark');
    localStorage.setItem('trip_planner_theme', currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    localStorage.setItem('trip_planner_interface_size', interfaceSize);
  }, [interfaceSize]);

  useEffect(() => {
    const readRateCache = () => {
      try {
        const raw = localStorage.getItem(RATE_CACHE_KEY);
        if (!raw) return null;
        const cache = JSON.parse(raw);

        if (!cache || typeof cache.rate !== 'number' || !cache.updatedAt) {
          return null;
        }

        return cache;
      } catch (error) {
        console.warn('⚠️ 讀取匯率快取失敗:', error);
        return null;
      }
    };

    const persistRateCache = (rate, updatedAt) => {
      try {
        localStorage.setItem(
          RATE_CACHE_KEY,
          JSON.stringify({
            rate,
            updatedAt
          })
        );
      } catch (error) {
        console.warn('⚠️ 寫入匯率快取失敗:', error);
      }
    };

    const syncRate = async ({ silent = false } = {}) => {
      if (!silent) {
        setIsRateUpdating(true);
      }
      setRateUpdateError('');

      const result = await fetchJPYRate();
      if (result?.success && typeof result.rate === 'number') {
        const updatedAt = new Date().toISOString();
        setExchangeRate(result.rate);
        setLastUpdateDate(updatedAt);
        persistRateCache(result.rate, updatedAt);
      } else {
        setRateUpdateError('匯率更新失敗，已保留上次成功資料。');
      }

      if (!silent) {
        setIsRateUpdating(false);
      }
    };

    const cached = readRateCache();
    let shouldRefresh = true;

    if (cached) {
      setExchangeRate(cached.rate);
      setLastUpdateDate(cached.updatedAt);
      shouldRefresh = Date.now() - new Date(cached.updatedAt).getTime() > RATE_CACHE_TTL_MS;
    }

    if (!cached || shouldRefresh) {
      void syncRate({ silent: true });
    }

    const intervalId = window.setInterval(() => {
      void syncRate({ silent: true });
    }, RATE_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const handleManualRateUpdate = async () => {
    setIsRateUpdating(true);
    setRateUpdateError('');

    const result = await fetchJPYRate();
    if (result?.success && typeof result.rate === 'number') {
      const updatedAt = new Date().toISOString();
      setExchangeRate(result.rate);
      setLastUpdateDate(updatedAt);
      localStorage.setItem(
        RATE_CACHE_KEY,
        JSON.stringify({
          rate: result.rate,
          updatedAt
        })
      );
    } else {
      setRateUpdateError('匯率更新失敗，已保留上次成功資料。');
    }

    setIsRateUpdating(false);
  };

  const currentDayData = itinerary.find(d => d.day === selectedDay);
  const currentDayTitle = currentDayData?.title?.trim() || `Day ${selectedDay}`;
  const currentDayDate = currentDayData?.date?.trim() || `Day ${selectedDay}`;
  const tripDisplayDates = getTripDisplayDates(tripDetails);
  const budgetTarget = Number(tripDetails?.budget?.total || 0);
  const remainingBudget = budgetTarget - budgetInfo.totalCost;
  const budgetProgress = budgetTarget > 0
    ? Math.min(100, Math.round((budgetInfo.totalCost / budgetTarget) * 100))
    : 0;

  const coverImageUrl = useMemo(
    () => normalizeCoverImageUrl(tripDetails?.coverImage),
    [tripDetails?.coverImage]
  );
  const shouldShowCoverBackground = Boolean(coverImageUrl && !coverImageLoadFailed);

  useEffect(() => {
    setSelectedEventLocation(null);
  }, [selectedDay]);

  useEffect(() => {
    setIsEditingDayMeta(false);
    setDayMetaDraft({
      title: currentDayTitle,
      date: currentDayDate
    });
  }, [selectedDay, currentDayTitle, currentDayDate]);

  useEffect(() => {
    setCoverImageLoadFailed(false);

    if (!coverImageUrl) return;

    let cancelled = false;
    const image = new Image();

    image.onload = () => {
      if (!cancelled) {
        setCoverImageLoadFailed(false);
      }
    };

    image.onerror = () => {
      if (!cancelled) {
        setCoverImageLoadFailed(true);
      }
    };

    image.src = coverImageUrl;

    return () => {
      cancelled = true;
    };
  }, [coverImageUrl]);

  const handleSaveEvent = (eventData) => {
    if (editingEvent) {
      setItinerary(prev => prev.map(day => {
        if (day.day === selectedDay) {
          return {
            ...day,
            events: day.events
              .map(e => e.id === eventData.id ? eventData : e)
              .sort((a, b) => a.time.localeCompare(b.time))
          };
        }
        return day;
      }));
    } else {
      const newEvent = { ...eventData, id: Date.now(), memos: [] };
      setItinerary(prev => prev.map(day => {
        if (day.day === selectedDay) {
          return {
            ...day,
            events: [...day.events, newEvent].sort((a, b) => a.time.localeCompare(b.time))
          };
        }
        return day;
      }));
    }
    setIsEditModalOpen(false);
    setEditingEvent(null);
  };

  const handleDeleteEvent = (id) => {
    if (window.confirm('確定要刪除這個行程嗎？')) {
      setItinerary(prev => prev.map(day => {
        if (day.day === selectedDay) {
          return { ...day, events: day.events.filter(e => e.id !== id) };
        }
        return day;
      }));
    }
  };

  const handleUpdateDayMeta = (dayNumber, patch) => {
    setItinerary(prev => prev.map(day => (
      day.day === dayNumber ? { ...day, ...patch } : day
    )));
  };

  const startDayMetaEdit = () => {
    setDayMetaDraft({ title: currentDayTitle, date: currentDayDate });
    setIsEditingDayMeta(true);
  };

  const cancelDayMetaEdit = () => {
    setDayMetaDraft({ title: currentDayTitle, date: currentDayDate });
    setIsEditingDayMeta(false);
  };

  const saveDayMeta = () => {
    handleUpdateDayMeta(selectedDay, {
      title: dayMetaDraft.title.trim() || `Day ${selectedDay}`,
      date: dayMetaDraft.date.trim() || `Day ${selectedDay}`
    });
    setIsEditingDayMeta(false);
  };

  const openAddModal = () => {
    setEditingEvent(null);
    setIsEventViewMode(false);
    setIsEditModalOpen(true);
  };

  const openEditModal = (event, viewMode = false) => {
    setEditingEvent(event);
    setIsEventViewMode(viewMode);
    setSelectedEventLocation(event?.location || null);
    setIsEditModalOpen(true);
  };

  const goToNextDay = () => {
    if (!itinerary.length) return;
    const nextDay = selectedDay >= itinerary.length ? 1 : selectedDay + 1;
    setSelectedDay(nextDay);
  };

  const handleBackToTrips = () => {
    const hasHistory =
      typeof window !== 'undefined' &&
      window.history &&
      window.history.length > 1 &&
      (typeof window.history.state?.idx !== 'number' || window.history.state.idx > 0);

    if (hasHistory) {
      navigate(-1);
      return;
    }

    navigate('/');
  };

  const openMapsUrl = (url) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleOpenGoogleMaps = (origin, destination) => {
    const url = origin
      ? buildGoogleMapsDirectionsUrl(origin, destination)
      : buildGoogleMapsSearchUrl(destination);
    openMapsUrl(url);
  };

  const toggleSecondaryModules = () => {
    setShowSecondaryModules((prev) => !prev);
  };

  const handleLookupFlight = async (direction) => {
    const code = tripDetails?.flights?.[direction]?.code || '';
    const departureDate = direction === 'outbound'
      ? (tripDetails?.dateRange?.start || '')
      : (tripDetails?.dateRange?.end || '');

    if (!departureDate) {
      setFlightLookupError((prev) => ({
        ...prev,
        [direction]: direction === 'outbound' ? '請先設定出發日期' : '請先設定結束日期'
      }));
      return;
    }

    setFlightLookupError((prev) => ({ ...prev, [direction]: '' }));
    setIsLookingUpFlight((prev) => ({ ...prev, [direction]: true }));

    try {
      const flightInfo = await lookupFlightByCode(code, departureDate);
      setTripDetails((prev) => ({
        ...prev,
        flights: {
          ...(prev?.flights || {}),
          [direction]: {
            ...((prev?.flights && prev.flights[direction]) || {}),
            ...flightInfo
          }
        }
      }));
    } catch (error) {
      setFlightLookupError((prev) => ({
        ...prev,
        [direction]: error.message || '查詢失敗'
      }));
    } finally {
      setIsLookingUpFlight((prev) => ({ ...prev, [direction]: false }));
    }
  };

  const tripWorkspaceValue = useMemo(() => ({
    tripId,
    tripDetails,
    setTripDetails,
    itinerary,
    setItinerary,
    checklists,
    setChecklists,
    expenses,
    setExpenses,
    exchangeRate,
    shoppingListRef,
    expenseTrackerRef,
    setIsShoppingModalOpen,
    setIsExpenseModalOpen,
    selectedDay,
    setSelectedDay,
    currentDayData,
    currentDayTitle,
    currentDayDate,
    tripDisplayDates,
    budgetInfo,
    budgetTarget,
    remainingBudget,
    budgetProgress,
    enableGPS,
    currentLocation,
    selectedEventLocation,
    showSecondaryModules,
    toggleSecondaryModules,
    isEditingDayMeta,
    dayMetaDraft,
    setDayMetaDraft,
    startDayMetaEdit,
    cancelDayMetaEdit,
    saveDayMeta,
    openAddModal,
    openEditModal,
    handleDeleteEvent,
    handleOpenGoogleMaps,
    handleLookupFlight,
    isLookingUpFlight,
    flightLookupError
  }), [
    tripId,
    tripDetails,
    itinerary,
    checklists,
    expenses,
    selectedDay,
    currentDayData,
    currentDayTitle,
    currentDayDate,
    tripDisplayDates,
    budgetInfo,
    budgetTarget,
    remainingBudget,
    budgetProgress,
    exchangeRate,
    enableGPS,
    currentLocation,
    selectedEventLocation,
    showSecondaryModules,
    isEditingDayMeta,
    dayMetaDraft,
    isLookingUpFlight,
    flightLookupError
  ]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
          <p className="text-gray-600 font-medium">正在載入旅程...</p>
        </div>
      </div>
    );
  }

  const isAnyModalOpen = isEditModalOpen || isSettingsOpen || isExpenseModalOpen || isShoppingModalOpen;

  return (
    <TripWorkspaceProvider value={tripWorkspaceValue}>
    <div className={`min-h-screen font-sans interface-size-${interfaceSize} bg-gray-50 dark:bg-slate-950 transition-colors`} style={{ "--footer-nav-height": "72px" }}>
      <Header 
        details={tripDetails}
        onGoToTrips={handleBackToTrips}
        onSettingsOpen={() => setIsSettingsOpen(true)}
        isSaving={isSaving}
        coverImageUrl={coverImageUrl}
        shouldShowCoverBackground={shouldShowCoverBackground}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="pt-4 rounded-2xl bg-white/80 supports-[backdrop-filter]:bg-white/70 backdrop-blur-sm shadow-sm">
          {activeTab === 'summary' && (
            <SummaryTab />
          )}

          {activeTab === 'itinerary' && (
            <ItineraryTab />
          )}

          {activeTab === 'preTrip' && (
            <PreTripTab />
          )}

          {activeTab === 'packing' && (
            <PackingTab />
          )}

          {activeTab === 'flights' && (
            <LogisticsTab />
          )}

          {activeTab === 'shopping' && (
            <ShoppingTab />
          )}

          {activeTab === 'expenses' && (
            <ExpensesTab />
          )}
        </div>
      </div>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingEvent(null);
          setIsEventViewMode(false);
        }}
        title={editingEvent ? (isEventViewMode ? '行程詳情' : '編輯行程') : '新增行程'}
      >
        <EditEventForm
          event={editingEvent}
          readOnly={isEventViewMode}
          onRequestEdit={() => setIsEventViewMode(false)}
          onSave={handleSaveEvent}
          onCancel={() => {
            setIsEditModalOpen(false);
            setEditingEvent(null);
            setIsEventViewMode(false);
          }}
        />
      </Modal>

      {/* 設定面板 */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        enableGPS={enableGPS}
        onGPSToggle={() => setEnableGPS(!enableGPS)}
        travelers={tripDetails?.travelers || []}
        onUpdateTravelers={(next) => setTripDetails((prev) => ({ ...prev, travelers: next }))}
        currentTheme={currentTheme}
        onThemeChange={setCurrentTheme}
        interfaceSize={interfaceSize}
        onInterfaceSizeChange={setInterfaceSize}
        exchangeRate={exchangeRate}
        onExchangeRateChange={setExchangeRate}
        onUpdateRate={handleManualRateUpdate}
        lastUpdateDate={lastUpdateDate}
        isRateUpdating={isRateUpdating}
        rateUpdateError={rateUpdateError}
        coverImage={tripDetails?.coverImage || ''}
        onCoverImageChange={(nextCoverImage) =>
          setTripDetails((prev) => ({
            ...prev,
            coverImage: nextCoverImage
          }))
        }
      />

      {activeTab === 'itinerary' && (
        <div className={`fixed bottom-[var(--footer-nav-height)] left-0 right-0 z-40 px-4 pb-2 transition-all duration-200 ${isAnyModalOpen ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}>
          <div className="mx-auto max-w-3xl bg-white/70 supports-[backdrop-filter]:bg-white/60 backdrop-blur border border-gray-200/80 rounded-2xl shadow-lg p-2">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={openAddModal}
                className="touch-target inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 text-white text-sm font-semibold"
              >
                <Plus size={16} />
                新增景點
              </button>
              <button
                onClick={saveNow}
                className="touch-target inline-flex items-center justify-center gap-1.5 rounded-xl border border-brand-200 text-brand-700 text-sm font-semibold bg-brand-50"
              >
                <Save size={16} />
                儲存
              </button>
              <button
                onClick={goToNextDay}
                className="touch-target inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold"
              >
                下一步
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'shopping' && (
        <div className={`fixed bottom-[var(--footer-nav-height)] left-0 right-0 z-40 px-4 pb-2 transition-all duration-200 ${isAnyModalOpen ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}>
          <div className="mx-auto max-w-3xl bg-white/70 supports-[backdrop-filter]:bg-white/60 backdrop-blur border border-gray-200/80 rounded-2xl shadow-lg p-2">
            <button
              onClick={() => shoppingListRef.current?.openAddForm?.()}
              className="touch-target w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 text-white text-sm font-semibold"
            >
              <Plus size={16} />
              新增購物項目
            </button>
          </div>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className={`fixed bottom-[var(--footer-nav-height)] left-0 right-0 z-40 px-4 pb-2 transition-all duration-200 ${isAnyModalOpen ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}>
          <div className="mx-auto max-w-3xl bg-white/70 supports-[backdrop-filter]:bg-white/60 backdrop-blur border border-gray-200/80 rounded-2xl shadow-lg p-2">
            <button
              onClick={() => expenseTrackerRef.current?.openAddForm?.()}
              className="touch-target w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 text-white text-sm font-semibold"
            >
              <Plus size={16} />
              新增支出
            </button>
          </div>
        </div>
      )}

      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} isModalOpen={isAnyModalOpen} />

      {/* GPS 位置監視 - 當啟用 GPS 時顯示狀態 */}
      {enableGPS && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 text-sm z-30 max-w-xs">
          {isLocating ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-gray-600">正在定位中...</span>
            </div>
          ) : locationError ? (
            <div className="flex items-center gap-2">
              <span className="text-red-600">❌ {locationError}</span>
            </div>
          ) : currentLocation ? (
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <div>
                <p className="font-bold text-gray-900">{currentLocation.locationName}</p>
                <p className="text-xs text-gray-500">精度: {Math.round(currentLocation.accuracy)}m</p>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
    </TripWorkspaceProvider>
  );
};

export default TripDetailPage;
