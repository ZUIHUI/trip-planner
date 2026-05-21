import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Plus, Save, ChevronRight } from 'lucide-react';
import Header from '../components/Header';
import Modal from '../components/Modal';
import EditEventForm from '../components/EditEventForm';
import EventDetailView from '../components/EventDetailView';
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
import { useTripPresence } from '../hooks/useTripPresence';
import { useBudget } from '../hooks/useBudget';
import { useDeviceLocation } from '../hooks/useDeviceLocation';
import { fetchJPYRate } from '../services/currencyService';
import { getFlightLookupAvailability, lookupFlightByCode, mergeFlightLookupResult } from '../services/flightService';
import { buildGoogleMapsDirectionsUrl, buildGoogleMapsSearchUrl } from '../services/googleMapsService';
import { createEmptyItinerary } from '../domain/tripSchema';
import { getTripDisplayDates } from '../utils/tripDates';
import { normalizeCoverImageUrl } from '../utils/coverImage';
import { Button, ErrorState, LoadingState, PageContainer } from '../components/ui';
import { useFeedback } from '../contexts/FeedbackContext';
import { useAuth } from '../contexts/AuthContext';

const LAST_OPENED_TRIP_KEY = 'trip_planner_last_opened_trip_id';
const RATE_CACHE_KEY = 'trip_planner_jpy_rate_cache';
const RATE_REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 小時
const RATE_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 小時
const MAX_AUTO_GENERATED_DAYS = 30;
const getTripIndexKey = (uid) => `trip_planner_trip_index_${uid || 'guest'}`;

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

const syncTripMetaToLocalIndex = (tripId, patch, uid) => {
  try {
    const storageKey = getTripIndexKey(uid);
    const raw = localStorage.getItem(storageKey);
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

    localStorage.setItem(storageKey, JSON.stringify(safeList));
  } catch (error) {
    console.warn('⚠️ 更新旅程索引失敗:', error);
  }
};

const TripDetailPage = () => {
  const { tripId: paramTripId } = useParams();
  const tripId = typeof paramTripId === 'string' ? paramTripId.trim() : '';
  const navigate = useNavigate();
  const location = useLocation();
  const { confirm, toast } = useFeedback();
  const { currentUser, userProfile, updateDisplayName, logout } = useAuth();
  const shareToken = useMemo(
    () => new URLSearchParams(location.search).get('share') || '',
    [location.search]
  );
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
    placePool,
    setPlacePool,
    collaboration,
    setCollaboration,
    accessError,
    accessRole,
    canEdit,
    isReadOnly,
    members,
    syncConflict,
    resolveConflict,
    isSaving,
    saveError,
    saveNow
  } = useTrip(tripId, defaultTripDetails, defaultItinerary, {
    currentUser,
    userProfile,
    shareToken
  });
  const {
    onlineMembers,
    presenceByUid,
    presenceError,
    updatePresenceEditingTarget
  } = useTripPresence({
    tripId,
    currentUser,
    userProfile,
    accessRole,
    activeTab,
    enabled: !isLoading && !accessError
  });

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
    }, currentUser?.uid);
  }, [tripId, currentUser?.uid]);

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
    }, currentUser?.uid);
  }, [tripId, tripDetails?.title, tripDetails?.status, tripDetails?.coverImage, totalEvents, currentUser?.uid]);

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

  useEffect(() => {
    if (!isEditModalOpen || isEventViewMode) {
      updatePresenceEditingTarget('');
      return undefined;
    }

    const target = editingEvent?.id ? `event:${editingEvent.id}` : 'event:new';
    updatePresenceEditingTarget(target);
    return () => updatePresenceEditingTarget('');
  }, [isEditModalOpen, isEventViewMode, editingEvent?.id, updatePresenceEditingTarget]);

  const handleSaveEvent = (eventData) => {
    if (!canEdit) {
      toast({ variant: 'warning', title: '唯讀模式', description: '你目前沒有編輯這趟旅程的權限。' });
      return;
    }

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

  const handleDeleteEvent = async (id) => {
    if (!canEdit) {
      toast({ variant: 'warning', title: '唯讀模式', description: '你目前沒有刪除行程的權限。' });
      return;
    }

    const targetDay = itinerary.find((day) => day.day === selectedDay);
    const targetEvent = targetDay?.events?.find((event) => event.id === id);
    if (!targetEvent) return;

    const shouldDelete = await confirm({
      title: '刪除行程？',
      description: `「${targetEvent.title || '未命名行程'}」會從 Day ${selectedDay} 移除。`,
      confirmLabel: '刪除行程',
      variant: 'danger'
    });

    if (!shouldDelete) return;

    setItinerary(prev => prev.map(day => {
      if (day.day === selectedDay) {
        return { ...day, events: day.events.filter(e => e.id !== id) };
      }
      return day;
    }));

    toast({
      variant: 'info',
      title: '已刪除行程',
      description: targetEvent.title || '未命名行程',
      actionLabel: '復原',
      duration: 7000,
      onAction: () => {
        setItinerary(prev => prev.map(day => {
          if (day.day !== selectedDay) return day;
          const exists = day.events.some((event) => event.id === targetEvent.id);
          if (exists) return day;
          return {
            ...day,
            events: [...day.events, targetEvent].sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')))
          };
        }));
      }
    });
  };

  const handleUpdateDayMeta = (dayNumber, patch) => {
    if (!canEdit) return;
    setItinerary(prev => prev.map(day => (
      day.day === dayNumber ? { ...day, ...patch } : day
    )));
  };

  const startDayMetaEdit = () => {
    if (!canEdit) return;
    setDayMetaDraft({ title: currentDayTitle, date: currentDayDate });
    setIsEditingDayMeta(true);
  };

  const cancelDayMetaEdit = () => {
    setDayMetaDraft({ title: currentDayTitle, date: currentDayDate });
    setIsEditingDayMeta(false);
  };

  const saveDayMeta = () => {
    if (!canEdit) return;
    handleUpdateDayMeta(selectedDay, {
      title: dayMetaDraft.title.trim() || `Day ${selectedDay}`,
      date: dayMetaDraft.date.trim() || `Day ${selectedDay}`
    });
    setIsEditingDayMeta(false);
  };

  const openAddModal = () => {
    if (!canEdit) {
      toast({ variant: 'warning', title: '唯讀模式', description: '你目前只能查看這趟旅程。' });
      return;
    }

    setEditingEvent(null);
    setIsEventViewMode(false);
    setIsEditModalOpen(true);
  };

  const openEditModal = (event, viewMode = false) => {
    if (!canEdit && !viewMode) {
      toast({ variant: 'warning', title: '唯讀模式', description: '你目前只能查看行程詳情。' });
      return;
    }

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
    const openedWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (!openedWindow) {
      window.location.href = url;
    }
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
    if (!canEdit) {
      setFlightLookupError((prev) => ({
        ...prev,
        [direction]: '唯讀模式不能更新航班資料'
      }));
      return;
    }

    const currentFlight = tripDetails?.flights?.[direction] || {};
    const code = currentFlight.code || '';
    const departureDate = direction === 'outbound'
      ? (tripDetails?.dateRange?.start || '')
      : (tripDetails?.dateRange?.end || '');
    const availability = getFlightLookupAvailability(departureDate);

    if (!availability.canLookup) {
      setFlightLookupError((prev) => ({
        ...prev,
        [direction]: availability.message
      }));
      return;
    }

    setFlightLookupError((prev) => ({ ...prev, [direction]: '' }));
    setIsLookingUpFlight((prev) => ({ ...prev, [direction]: true }));

    try {
      const flightInfo = await lookupFlightByCode(code, departureDate, {
        departureAirport: currentFlight.dep,
        arrivalAirport: currentFlight.arr
      });
      setTripDetails((prev) => ({
        ...prev,
        flights: {
          ...(prev?.flights || {}),
          [direction]: {
            ...mergeFlightLookupResult((prev?.flights && prev.flights[direction]) || {}, flightInfo)
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

  const editingEventPrevLocation = useMemo(() => {
    if (!editingEvent || !currentDayData?.events?.length) {
      return tripDetails?.accommodation?.address || tripDetails?.accommodation?.name || '';
    }

    const eventIndex = currentDayData.events.findIndex((event) => event.id === editingEvent.id);
    if (eventIndex > 0) {
      const prevEvent = currentDayData.events[eventIndex - 1];
      return prevEvent?.locationPlace || prevEvent?.location || '';
    }

    return tripDetails?.accommodation?.address || tripDetails?.accommodation?.name || '';
  }, [currentDayData, editingEvent, tripDetails]);

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
    placePool,
    setPlacePool,
    collaboration,
    setCollaboration,
    currentUser,
    userProfile,
    updateDisplayName,
    logout,
    isSharedSession: Boolean(shareToken),
    accessRole,
    canEdit,
    isReadOnly,
    members,
    onlineMembers,
    presenceByUid,
    presenceError,
    updatePresenceEditingTarget,
    syncConflict,
    resolveConflict,
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
    placePool,
    collaboration,
    currentUser,
    userProfile,
    updateDisplayName,
    logout,
    shareToken,
    accessRole,
    canEdit,
    isReadOnly,
    members,
    onlineMembers,
    presenceByUid,
    presenceError,
    updatePresenceEditingTarget,
    syncConflict,
    resolveConflict,
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
      <div className="tp-page-shell flex min-h-screen items-center justify-center p-4 font-sans">
        <LoadingState label="讀取旅程中..." className="w-full max-w-sm" />
      </div>
    );
  }

  if (accessError) {
    return (
      <div className="tp-page-shell flex min-h-screen items-center justify-center p-4 font-sans">
        <ErrorState
          title="無法開啟旅程"
          description={accessError}
          actionLabel="回旅程列表"
          onAction={() => navigate('/')}
          className="w-full max-w-md"
        />
      </div>
    );
  }

  const isAnyModalOpen = isEditModalOpen || isSettingsOpen || isExpenseModalOpen || isShoppingModalOpen;

  return (
    <TripWorkspaceProvider value={tripWorkspaceValue}>
    <div className={`tp-page-shell min-h-screen font-sans interface-size-${interfaceSize} transition-colors`} style={{ "--footer-nav-height": "72px" }}>
      <Header 
        details={tripDetails}
        onGoToTrips={handleBackToTrips}
        onSettingsOpen={() => setIsSettingsOpen(true)}
        isSaving={isSaving}
        coverImageUrl={coverImageUrl}
        shouldShowCoverBackground={shouldShowCoverBackground}
      />

      <PageContainer className="pb-24 lg:pb-36">
        <div className="pt-4">
          <div className={`mb-4 rounded-lg border px-3 py-2 text-sm font-semibold ${
            isReadOnly
              ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200'
          }`}>
            {isReadOnly ? '唯讀模式：你可以查看這趟旅程，但不能修改。' : `協作權限：${accessRole === 'owner' ? 'Owner' : (accessRole === 'editor' || accessRole === 'edit') ? 'Editor' : '可編輯'}`}
          </div>

          {(saveError || syncConflict) && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
              <p>{syncConflict ? '偵測到遠端已有新版本，請選擇要保留哪一版。' : saveError}</p>
              {syncConflict && (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button size="sm" variant="secondary" onClick={() => resolveConflict('remote')}>
                    套用遠端版本
                  </Button>
                  <Button size="sm" onClick={() => resolveConflict('local')}>
                    保留我的版本並覆蓋
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'summary' && (
            <SummaryTab onTabChange={setActiveTab} onAddEvent={openAddModal} />
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
      </PageContainer>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingEvent(null);
          setIsEventViewMode(false);
        }}
        title={editingEvent ? (isEventViewMode ? '行程詳情' : '編輯行程') : '新增行程'}
        size="lg"
      >
        {isEventViewMode && editingEvent ? (
          <EventDetailView
            event={editingEvent}
            prevLocation={editingEventPrevLocation}
            onEdit={canEdit ? () => setIsEventViewMode(false) : undefined}
            onClose={() => {
              setIsEditModalOpen(false);
              setEditingEvent(null);
              setIsEventViewMode(false);
            }}
            onOpenGoogleMaps={handleOpenGoogleMaps}
          />
        ) : (
          <EditEventForm
            event={editingEvent}
            onSave={handleSaveEvent}
            readOnly={isReadOnly}
            onRequestEdit={canEdit ? () => setIsEventViewMode(false) : undefined}
            onCancel={() => {
              setIsEditModalOpen(false);
              setEditingEvent(null);
              setIsEventViewMode(false);
            }}
          />
        )}
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
        <div className={`fixed bottom-[var(--footer-nav-height)] left-0 right-0 z-40 px-4 pb-2 transition-all duration-200 sm:left-auto sm:right-6 sm:w-[min(430px,calc(100vw-3rem))] sm:px-0 lg:bottom-28 ${isAnyModalOpen ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}>
          <div className="mx-auto max-w-3xl rounded-lg border border-slate-200/80 bg-white/[0.88] p-2 shadow-lg supports-[backdrop-filter]:bg-white/[0.72] supports-[backdrop-filter]:backdrop-blur sm:max-w-none dark:border-slate-800 dark:bg-slate-900/[0.88]">
            <div className="sm:hidden">
              <Button
                onClick={openAddModal}
                disabled={!canEdit}
                className="w-full"
              >
                <Plus size={17} />
                新增行程
              </Button>
            </div>
            <div className="hidden grid-cols-3 gap-2 sm:grid">
              <Button
                onClick={openAddModal}
                disabled={!canEdit}
                className="w-full min-w-0 whitespace-nowrap !px-1 text-xs sm:!px-2"
              >
                <Plus size={16} />
                新增
              </Button>
              <Button
                variant="secondary"
                onClick={saveNow}
                disabled={!canEdit}
                className="w-full min-w-0 whitespace-nowrap !px-1 text-xs sm:!px-2"
              >
                <Save size={16} />
                儲存
              </Button>
              <Button
                variant="secondary"
                onClick={goToNextDay}
                className="w-full min-w-0 whitespace-nowrap !px-1 text-xs sm:!px-2"
                aria-label="前往下一天"
                title="前往下一天"
              >
                <span className="hidden sm:inline">下一天</span>
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'shopping' && (
        <div className={`fixed bottom-[var(--footer-nav-height)] left-0 right-0 z-40 px-4 pb-2 transition-all duration-200 sm:left-auto sm:right-6 sm:w-[min(430px,calc(100vw-3rem))] sm:px-0 lg:bottom-28 ${isAnyModalOpen ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}>
          <div className="mx-auto max-w-3xl rounded-lg border border-slate-200/80 bg-white/[0.88] p-2 shadow-lg supports-[backdrop-filter]:bg-white/[0.72] supports-[backdrop-filter]:backdrop-blur sm:max-w-none dark:border-slate-800 dark:bg-slate-900/[0.88]">
            <Button
              onClick={() => shoppingListRef.current?.openAddForm?.()}
              disabled={!canEdit}
              className="w-full"
            >
              <Plus size={16} />
              新增購物項目
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className={`fixed bottom-[var(--footer-nav-height)] left-0 right-0 z-40 px-4 pb-2 transition-all duration-200 sm:left-auto sm:right-6 sm:w-[min(430px,calc(100vw-3rem))] sm:px-0 lg:bottom-28 ${isAnyModalOpen ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}>
          <div className="mx-auto max-w-3xl rounded-lg border border-slate-200/80 bg-white/[0.88] p-2 shadow-lg supports-[backdrop-filter]:bg-white/[0.72] supports-[backdrop-filter]:backdrop-blur sm:max-w-none dark:border-slate-800 dark:bg-slate-900/[0.88]">
            <Button
              onClick={() => expenseTrackerRef.current?.openAddForm?.()}
              disabled={!canEdit}
              className="w-full"
            >
              <Plus size={16} />
              新增支出
            </Button>
          </div>
        </div>
      )}

      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} isModalOpen={isAnyModalOpen} />

      {/* GPS 位置監視 - 當啟用 GPS 時顯示狀態 */}
      {enableGPS && (
        <div className="fixed bottom-4 right-4 z-30 max-w-xs rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-lg dark:border-slate-800 dark:bg-slate-900">
          {isLocating ? (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-brand-500"></div>
              <span className="text-slate-600 dark:text-slate-300">定位中...</span>
            </div>
          ) : locationError ? (
            <div className="flex items-center gap-2">
              <span className="text-red-600">定位失敗：{locationError}</span>
            </div>
          ) : currentLocation ? (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">GPS</span>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{currentLocation.locationName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">精準度：{Math.round(currentLocation.accuracy)}m</p>
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
