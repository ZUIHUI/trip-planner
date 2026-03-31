import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, ChevronDown, ChevronUp, Save, ChevronRight } from 'lucide-react';
import Header from '../components/Header';
import Modal from '../components/Modal';
import EditEventForm from '../components/EditEventForm';
import EventCard from '../components/EventCard';
import Checklist from '../components/Checklist';
import DaySelector from '../components/DaySelector';
import SettingsPanel from '../components/SettingsPanel';
import ShoppingListContent from '../components/ShoppingListContent';
import PackingListContent from '../components/PackingListContent';
import ExpenseTracker from '../components/ExpenseTracker';
import BottomNavigation from '../components/BottomNavigation';
import WeatherWidget from '../components/WeatherWidget';
import { useTrip } from '../hooks/useTrip';
import { useBudget } from '../hooks/useBudget';
import { useDeviceLocation } from '../hooks/useDeviceLocation';
import { fetchJPYRate } from '../services/currencyService';
import { getTripDisplayDates, normalizeTripDateFields, formatDateRangeText } from '../utils/tripDates';
import { normalizeCoverImageUrl } from '../utils/coverImage';

const TRIP_INDEX_KEY = 'trip_planner_trip_index';
const LAST_OPENED_TRIP_KEY = 'trip_planner_last_opened_trip_id';
const RATE_CACHE_KEY = 'trip_planner_jpy_rate_cache';
const RATE_REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 小時
const RATE_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 小時

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('trip_planner_theme') || 'light');
  const [interfaceSize, setInterfaceSize] = useState(() => localStorage.getItem('trip_planner_interface_size') || 'medium');
  const [enableGPS, setEnableGPS] = useState(false);
  const [selectedEventLocation, setSelectedEventLocation] = useState(null);
  const [isEditingDayMeta, setIsEditingDayMeta] = useState(false);
  const [dayMetaDraft, setDayMetaDraft] = useState({ title: '', date: '' });
  const [coverImageLoadFailed, setCoverImageLoadFailed] = useState(false);
  const [showSecondaryModules, setShowSecondaryModules] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(0.215);
  const [lastUpdateDate, setLastUpdateDate] = useState('');
  const [isRateUpdating, setIsRateUpdating] = useState(false);
  const [rateUpdateError, setRateUpdateError] = useState('');

  // 初始旅程資料結構
  const defaultTripDetails = useMemo(() => ({
    title: '',
    dates: '',
    dateRange: { start: '', end: '' },
    status: 'planning',
    coverImage: '',
    accommodation: {},
    flights: {},
    travelers: []
  }), []);

  const defaultItinerary = useMemo(
    () => Array.from({ length: 6 }, (_, i) => ({
      day: i + 1,
      date: `Day ${i + 1}`,
      title: `Day ${i + 1}`,
      events: []
    })),
    []
  );

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

  const budgetInfo = useBudget(itinerary);
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

  const coverImageUrl = useMemo(
    () => normalizeCoverImageUrl(tripDetails?.coverImage),
    [tripDetails?.coverImage]
  );
  const shouldShowCoverBackground = Boolean(coverImageUrl && !coverImageLoadFailed);
  const eventsToDisplay = showAllEvents
    ? currentDayData?.events || []
    : (currentDayData?.events || []).slice(0, 2);
  const hiddenEventsCount = Math.max((currentDayData?.events?.length || 0) - eventsToDisplay.length, 0);

  useEffect(() => {
    setSelectedEventLocation(null);
    setShowAllEvents(false);
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

  const handleUpdateMemos = (eventId, newMemos) => {
    setItinerary(prev => prev.map(day => {
      if (day.day === selectedDay) {
        return {
          ...day,
          events: day.events.map(e => e.id === eventId ? { ...e, memos: newMemos } : e)
        };
      }
      return day;
    }));
  };

  const handleUpdateDayMeta = (dayNumber, patch) => {
    setItinerary(prev => prev.map(day => (
      day.day === dayNumber ? { ...day, ...patch } : day
    )));
  };

  const openAddModal = () => {
    setEditingEvent(null);
    setIsEditModalOpen(true);
  };

  const openEditModal = (event) => {
    setEditingEvent(event);
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

  return (
    <div
      className={`relative min-h-screen font-sans interface-size-${interfaceSize} ${shouldShowCoverBackground ? '' : 'bg-gray-50'}`}
      style={
        shouldShowCoverBackground
          ? {
              backgroundImage: `url(${coverImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }
          : undefined
      }
    >
      <div
        className={`pointer-events-none absolute inset-0 transition-colors ${
          shouldShowCoverBackground
            ? currentTheme === 'dark'
              ? 'bg-black/60'
              : 'bg-white/55'
            : currentTheme === 'dark'
              ? 'bg-slate-900/25'
              : 'bg-transparent'
        }`}
      />
      <div className="relative z-10">
        <Header 
          details={tripDetails} 
          onGoToTrips={handleBackToTrips}
          onSettingsOpen={() => setIsSettingsOpen(true)}
          isSaving={isSaving}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="pt-4 rounded-2xl bg-white/80 supports-[backdrop-filter]:bg-white/70 backdrop-blur-sm shadow-sm">
          {activeTab === 'summary' && (
            <div className="px-4 sm:px-6 space-y-4 pb-10">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">旅程概覽</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="text-center">
                    <p className="text-gray-500 text-xs mb-1">旅程期間</p>
                    <p className="text-lg font-bold text-gray-800">{tripDisplayDates || '未設定'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500 text-xs mb-1">天數</p>
                    <p className="text-lg font-bold text-gray-800">{itinerary.length} 天</p>
                  </div>
                </div>
              </div>

              {budgetInfo.totalCost > 0 && (
                <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-4 rounded-xl border border-blue-200">
                  <h3 className="text-lg font-bold text-blue-800 mb-3">💰 旅程預算概覽</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">總花費</span>
                      <span className="text-2xl font-bold text-blue-600">{budgetInfo.totalCost.toLocaleString()} 元</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">每日平均</span>
                      <span className="text-lg font-bold text-indigo-600">
                        {Math.round(budgetInfo.averageDailyCost).toLocaleString()} 元
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">共 {budgetInfo.totalEvents} 個活動記錄花費</p>
                  </div>
                </div>
              )}

              {tripDetails?.accommodation && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="font-bold text-gray-800 mb-3">🏨 住宿</h3>
                  <p className="font-bold text-gray-800">{tripDetails.accommodation.name || '未設定'}</p>
                  <p className="text-sm text-gray-500 mb-2">{tripDetails.accommodation.address || '未設定地址'}</p>
                  <div className="text-xs text-gray-600 space-y-1 mb-3">
                    <p>✓ 入住：{tripDetails.accommodation.checkIn || '未設定'}</p>
                    <p>✓ 退住：{tripDetails.accommodation.checkOut || '未設定'}</p>
                  </div>
                </div>
              )}

              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-3">✈️ 航班</h3>

                {tripDetails?.flights?.outbound?.code ? (
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-blue-600">去程</span>
                      <span className="font-mono text-gray-800 text-sm">
                        {tripDetails.flights.outbound.code}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{tripDetails.flights.outbound.airline}</p>
                    <p className="text-xs text-gray-500">
                      {tripDetails.flights.outbound.date}
                      {tripDetails.flights.outbound.departureTime && ` 起飛: ${tripDetails.flights.outbound.departureTime}`}
                      {tripDetails.flights.outbound.arrivalTime && ` 抵達: ${tripDetails.flights.outbound.arrivalTime}`}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 mb-3">未設定去程</p>
                )}

                <div className="border-t border-gray-100 my-3"></div>

                {tripDetails?.flights?.inbound?.code ? (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-indigo-600">回程</span>
                      <span className="font-mono text-gray-800 text-sm">
                        {tripDetails.flights.inbound.code}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{tripDetails.flights.inbound.airline}</p>
                    <p className="text-xs text-gray-500">
                      {tripDetails.flights.inbound.date}
                      {tripDetails.flights.inbound.departureTime && ` 起飛: ${tripDetails.flights.inbound.departureTime}`}
                      {tripDetails.flights.inbound.arrivalTime && ` 抵達: ${tripDetails.flights.inbound.arrivalTime}`}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">未設定回程</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'itinerary' && (
            <>
              <DaySelector
                itinerary={itinerary}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
              />

              <div className="px-6 mt-2 pb-20">
                <button
                  onClick={() => setShowSecondaryModules((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-sm font-medium text-gray-600"
                >
                  {showSecondaryModules ? '收合次要資訊' : '查看更多次要資訊'}
                  {showSecondaryModules ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showSecondaryModules && (
                  <div className="mt-3">
                    <WeatherWidget
                      date={currentDayDate}
                      currentLocation={currentLocation}
                      accommodation={tripDetails?.accommodation?.address || tripDetails?.accommodation?.name || '東京'}
                      firstEventLocation={currentDayData?.events?.[0]?.location || null}
                      selectedEventLocation={selectedEventLocation}
                    />
                  </div>
                )}

                <div className="flex justify-between items-end mb-4 border-b border-gray-200 pb-2 gap-3">
                  <div className="flex-1">
                    {currentDayData ? (
                      isEditingDayMeta ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={dayMetaDraft.title}
                            onChange={(e) => setDayMetaDraft((prev) => ({ ...prev, title: e.target.value }))}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-base font-bold text-gray-800"
                            placeholder={`Day ${selectedDay}`}
                          />
                          <input
                            type="text"
                            value={dayMetaDraft.date}
                            onChange={(e) => setDayMetaDraft((prev) => ({ ...prev, date: e.target.value }))}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600"
                            placeholder={`Day ${selectedDay}`}
                          />
                          <div className="flex gap-2 touch-row">
                            <button
                              onClick={() => {
                                handleUpdateDayMeta(selectedDay, {
                                  title: dayMetaDraft.title.trim() || `Day ${selectedDay}`,
                                  date: dayMetaDraft.date.trim() || `Day ${selectedDay}`
                                });
                                setIsEditingDayMeta(false);
                              }}
                              className="touch-target text-sm px-3 py-1 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
                            >
                              儲存
                            </button>
                            <button
                              onClick={() => {
                                setDayMetaDraft({ title: currentDayTitle, date: currentDayDate });
                                setIsEditingDayMeta(false);
                              }}
                              className="touch-target text-sm px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h2 className="text-xl font-bold text-gray-800">{currentDayTitle}</h2>
                          <p className="tp-caption-text text-gray-500">{currentDayDate}</p>
                        </>
                      )
                    ) : (
                      <p className="text-gray-500">載入中...</p>
                    )}
                  </div>

                  {currentDayData && !isEditingDayMeta && (
                    <button
                      onClick={() => {
                        setDayMetaDraft({ title: currentDayTitle, date: currentDayDate });
                        setIsEditingDayMeta(true);
                      }}
                      className="text-sm px-2 py-1 text-gray-500 underline underline-offset-2"
                    >
                      編輯 Day
                    </button>
                  )}
                </div>

                <div className="mt-4">
                  {currentDayData && currentDayData.events.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                      <p>尚無行程</p>
                      <button
                        onClick={openAddModal}
                        className="touch-target mt-2 text-blue-500 font-bold text-sm px-2"
                      >
                        + 新增第一個行程
                      </button>
                    </div>
                  ) : (
                    eventsToDisplay.map((event, index) => {
                      const prevEvent = index > 0 ? currentDayData.events[index - 1] : null;
                      const prevLocation = prevEvent
                        ? prevEvent.location
                        : tripDetails?.accommodation?.address || '';

                      return (
                        <EventCard
                          key={event.id}
                          event={event}
                          prevLocation={prevLocation}
                          onEdit={openEditModal}
                          onDelete={handleDeleteEvent}
                          onUpdateMemos={handleUpdateMemos}
                          onViewDetails={(selectedEvent) => setSelectedEventLocation(selectedEvent?.location || null)}
                        />
                      );
                    })
                  )}
                </div>

                {hiddenEventsCount > 0 && (
                  <button
                    onClick={() => setShowAllEvents(true)}
                    className="mt-3 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    查看更多行程（+{hiddenEventsCount}）
                  </button>
                )}
                {showAllEvents && (currentDayData?.events?.length || 0) > 2 && (
                  <button
                    onClick={() => setShowAllEvents(false)}
                    className="mt-3 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    收合行程列表
                  </button>
                )}

                {showSecondaryModules && currentDayData && currentDayData.events.length > 0 && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-orange-100 to-yellow-100 rounded-xl border border-orange-200">
                    <h3 className="font-bold text-orange-800 mb-2">💰 今日預估花費</h3>
                    <div className="text-2xl font-bold text-orange-600">
                      {currentDayData.events
                        .filter(e => e.cost)
                        .reduce((sum, e) => sum + (parseInt(e.cost) || 0), 0)
                        .toLocaleString()} 元
                    </div>
                    <p className="text-xs text-orange-700 mt-2">
                      共 {currentDayData.events.filter(e => e.cost).length} 個項目有記錄花費
                    </p>
                  </div>
                )}

                
              </div>
            </>
          )}

          {activeTab === 'preTrip' && (
            <div className="px-4 sm:px-6 mt-6 space-y-4 pb-10">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">📋 出國前待辦</h3>
                <Checklist
                  items={checklists.preTrip}
                  onUpdate={(newItems) =>
                    setChecklists(prev => ({ ...prev, preTrip: newItems }))
                  }
                />
              </div>
            </div>
          )}

          {activeTab === 'packing' && (
            <div className="px-4 sm:px-6 mt-6 space-y-4 pb-10">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">🎒 打包清單</h3>
                <PackingListContent
                  items={checklists.packing}
                  onUpdate={(newItems) =>
                    setChecklists(prev => ({ ...prev, packing: newItems }))
                  }
                  travelers={tripDetails?.travelers || []}
                  itinerary={itinerary}
                />
              </div>
            </div>
          )}

          {activeTab === 'flights' && (
            <div className="px-4 sm:px-6 mt-6 pb-10">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
                <h3 className="text-lg font-bold text-gray-800 mb-4">🧭 旅程資訊</h3>
                <input
                  type="text"
                  placeholder="旅程名稱"
                  value={tripDetails?.title || ''}
                  onChange={(e) =>
                    setTripDetails((prev) => ({
                      ...prev,
                      title: e.target.value
                    }))
                  }
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg tp-form-control mb-2"
                />
                <label className="block tp-caption-text text-gray-500 mb-1">旅程期間</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-1">
                  <div>
                    <label className="block tp-caption-text text-gray-400 mb-1">開始日期</label>
                    <input
                      type="date"
                      value={tripDetails?.dateRange?.start || ''}
                      onChange={(e) =>
                        setTripDetails((prev) => {
                          const start = e.target.value;
                          const end = prev?.dateRange?.end || '';
                          return normalizeTripDateFields({
                            ...prev,
                            dateRange: { ...(prev?.dateRange || {}), start },
                            dates: formatDateRangeText(start, end)
                          });
                        })
                      }
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg tp-form-control"
                    />
                  </div>
                  <div>
                    <label className="block tp-caption-text text-gray-400 mb-1">結束日期</label>
                    <input
                      type="date"
                      value={tripDetails?.dateRange?.end || ''}
                      onChange={(e) =>
                        setTripDetails((prev) => {
                          const end = e.target.value;
                          const start = prev?.dateRange?.start || '';
                          return normalizeTripDateFields({
                            ...prev,
                            dateRange: { ...(prev?.dateRange || {}), end },
                            dates: formatDateRangeText(start, end)
                          });
                        })
                      }
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg tp-form-control"
                    />
                  </div>
                </div>
                <p className="tp-caption-text text-gray-500 mb-2">儲存時會同步寫入新欄位與舊版 dates 字串</p>
                <p className="tp-caption-text text-gray-500 mb-2">
                  背景圖片請至右上角「設定」面板中的「背景圖片」區塊調整，避免重複設定入口造成混淆。
                </p>
                <label className="block tp-caption-text text-gray-500 mb-1">旅行狀態</label>
                <select
                  value={tripDetails?.status || 'planning'}
                  onChange={(e) =>
                    setTripDetails((prev) => ({
                      ...prev,
                      status: e.target.value
                    }))
                  }
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg tp-form-control"
                >
                  <option value="planning">planning</option>
                  <option value="ongoing">ongoing</option>
                  <option value="done">done</option>
                </select>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
                <h3 className="text-lg font-bold text-gray-800 mb-4">🏨 住宿資訊</h3>
                <input
                  type="text"
                  placeholder="飯店名稱"
                  value={tripDetails?.accommodation?.name || ''}
                  onChange={(e) =>
                    setTripDetails(prev => ({
                      ...prev,
                      accommodation: { ...(prev?.accommodation || {}), name: e.target.value }
                    }))
                  }
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg tp-form-control mb-2"
                />
                <input
                  type="text"
                  placeholder="地址"
                  value={tripDetails?.accommodation?.address || ''}
                  onChange={(e) =>
                    setTripDetails(prev => ({
                      ...prev,
                      accommodation: { ...(prev?.accommodation || {}), address: e.target.value }
                    }))
                  }
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg tp-form-control"
                />
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">✈️ 航班資訊</h3>
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <h4 className="font-bold text-blue-600 mb-2">去程</h4>
                  <input
                    type="text"
                    placeholder="航班代號"
                    value={tripDetails?.flights?.outbound?.code || ''}
                    onChange={(e) =>
                      setTripDetails(prev => ({
                        ...prev,
                        flights: {
                          ...(prev?.flights || {}),
                          outbound: {
                            ...((prev?.flights && prev.flights.outbound) || {}),
                            code: e.target.value
                          }
                        }
                      }))
                    }
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg tp-form-control mb-2"
                  />
                </div>

                <div>
                  <h4 className="font-bold text-indigo-600 mb-2">回程</h4>
                  <input
                    type="text"
                    placeholder="航班代號"
                    value={tripDetails?.flights?.inbound?.code || ''}
                    onChange={(e) =>
                      setTripDetails(prev => ({
                        ...prev,
                        flights: {
                          ...(prev?.flights || {}),
                          inbound: {
                            ...((prev?.flights && prev.flights.inbound) || {}),
                            code: e.target.value
                          }
                        }
                      }))
                    }
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg tp-form-control"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shopping' && (
            <div className="mt-4 pb-10">
              <ShoppingListContent tripId={tripId} />
            </div>
          )}

          {activeTab === 'expenses' && (
            <div className="px-4 sm:px-6 mt-6 pb-10">
              <ExpenseTracker
                itinerary={itinerary}
                expenses={expenses}
                setExpenses={setExpenses}
                travelers={tripDetails?.travelers || []}
                exchangeRate={exchangeRate}
              />
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingEvent(null);
        }}
        title={editingEvent ? '編輯行程' : '新增行程'}
      >
        <EditEventForm
          event={editingEvent}
          onSave={handleSaveEvent}
          onCancel={() => {
            setIsEditModalOpen(false);
            setEditingEvent(null);
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
        coverImage={tripDetails?.coverImage || ''}
        onCoverImageChange={(nextCoverImage) =>
          setTripDetails((prev) => ({
            ...prev,
            coverImage: nextCoverImage
          }))
        }
      />

      {activeTab === 'itinerary' && (
        <div className="fixed bottom-[72px] left-0 right-0 z-40 px-4 pb-2">
          <div className="mx-auto max-w-3xl bg-white/95 backdrop-blur border border-gray-200 rounded-2xl shadow-lg p-2">
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

      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* GPS 位置監視 - 當啟用 GPS 時顯示狀態 */}
      {enableGPS && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 text-sm z-40 max-w-xs">
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
  );
};

export default TripDetailPage;
