import React, { useState, useCallback, useEffect, useRef } from 'react';
import Header from './components/Header';
import Modal from './components/Modal';
import EditEventForm from './components/EditEventForm';
import EditDetailsForm from './components/EditDetailsForm';
import EventCard from './components/EventCard';
import Checklist from './components/Checklist';
import DaySelector from './components/DaySelector';
import WeatherWidget from './components/WeatherWidget';
import SettingsPanel from './components/SettingsPanel';
import ShoppingListContent from './components/ShoppingListContent';
import PackingListContent from './components/PackingListContent';
import ExpenseTracker from './components/ExpenseTracker';
import { useTrip } from './hooks/useTrip';
import { useBudget } from './hooks/useBudget';
import { useDeviceLocation } from './hooks/useDeviceLocation';
import { fetchJPYRate } from './services/currencyService';
import { Plus, Edit2, GripVertical, Clock, MapPin, Users, Wallet, PlaneTakeoff, PlaneLanding, Copy, ExternalLink, CalendarDays, Home } from 'lucide-react';

// 預設資料
const initialTripDetails = {
  title: "東京六天五夜自由行",
  dates: "2026/02/23 - 02/28",
  accommodation: {
    name: "新大久保 / 新宿御苑 V",
    address: "新大久保站",
    checkIn: "2/23 16:00",
    checkOut: "2/28 10:00"
  },
  flights: {
    outbound: { code: "JX802", airline: "星宇航空", date: "2/23", departureTime: "14:40", arrivalTime: "", dep: "TPE", arr: "NRT" },
    inbound: { code: "CX451", airline: "國泰航空", date: "2/28", departureTime: "15:25", arrivalTime: "", dep: "NRT", arr: "TPE" }
  }
};

// 根據起始日期計算每天的正確日期
const calculateItinerary = (startDateStr = "2026/02/23") => {
  const [year, month, day] = startDateStr.split('/').map(Number);
  const startDate = new Date(year, month - 1, day);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return Array.from({ length: 6 }, (_, i) => {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);
    
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const date = String(currentDate.getDate()).padStart(2, '0');
    const weekday = weekdays[currentDate.getDay()];
    
    return {
      day: i + 1,
      date: `${month}/${date}`,
      weekday: weekday,
      title: `Day ${i + 1}`,
      events: []
    };
  });
};

const initialItinerary = calculateItinerary("2026/02/23");

const App = () => {
  const TRIP_ID = 'default-trip';
  const { isLoading, isSaving, saveError, tripDetails, setTripDetails, itinerary, setItinerary, checklists, setChecklists, expenses, setExpenses, manualRefresh } = 
    useTrip(TRIP_ID, initialTripDetails, initialItinerary);

  const [activeTab, setActiveTab] = useState('itinerary');
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedEventId, setSelectedEventId] = useState(null); // 追踪選中的行程
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isEditDetailsModalOpen, setIsEditDetailsModalOpen] = useState(false);
  const [editingDetailsType, setEditingDetailsType] = useState(null); // 'accommodation', 'outbound', 'inbound'
  const [enableGPS, setEnableGPS] = useState(false); // GPS 開關狀態
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false); // 設定面板開啟狀態
  const [draggedEventId, setDraggedEventId] = useState(null);
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('theme_mode') || 'light');
  const [interfaceSize, setInterfaceSize] = useState(() => localStorage.getItem('interface_size') || 'medium');
  const [exchangeRate, setExchangeRate] = useState(() => parseFloat(localStorage.getItem('exchange_rate')) || 0.215);
  const [lastRateUpdate, setLastRateUpdate] = useState(() => localStorage.getItem('last_rate_update') || null);
  const [isScrolled, setIsScrolled] = useState(false);

  const handleScroll = (e) => {
    setIsScrolled(e.target.scrollTop > 20);
  };

  useEffect(() => {
    localStorage.setItem('theme_mode', themeMode);
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [themeMode]);

  useEffect(() => {
    localStorage.setItem('interface_size', interfaceSize);
    const sizes = {
      small: '14px',
      medium: '16px',
      large: '18px'
    };
    document.documentElement.style.fontSize = sizes[interfaceSize];
  }, [interfaceSize]);

  useEffect(() => {
    localStorage.setItem('exchange_rate', exchangeRate);
  }, [exchangeRate]);

  useEffect(() => {
    if (lastRateUpdate) {
      localStorage.setItem('last_rate_update', lastRateUpdate);
    }
  }, [lastRateUpdate]);

  // 自動更新匯率
  useEffect(() => {
    const updateRate = async () => {
      const result = await fetchJPYRate();
      if (result.success) {
        setExchangeRate(result.rate);
        setLastRateUpdate(new Date().toLocaleString());
        console.log('匯率已自動更新:', result.rate);
      }
    };
    updateRate();
  }, []);

  const handleManualRateUpdate = async () => {
    const result = await fetchJPYRate();
    if (result.success) {
      setExchangeRate(result.rate);
      setLastRateUpdate(new Date().toLocaleString());
      alert(`匯率已更新: 1 JPY = ${result.rate} TWD`);
    } else {
      alert('匯率更新失敗，請檢查網路連線');
    }
  };

  // 取得設備GPS位置（受 enableGPS 控制）
  const { currentLocation, isLocating, locationError } = useDeviceLocation(enableGPS);

  const currentDayData = itinerary.find(d => d.day === selectedDay);
  const budgetSummary = useBudget(itinerary);
  
  // 找到選中行程的地點（點擊行程卡時使用）
  const selectedEventLocation = currentDayData?.events?.find(e => e.id === selectedEventId)?.location;

  console.log('App.jsx State:', {
    selectedDay,
    selectedEventId,
    currentDayData: currentDayData ? {
      day: currentDayData.day,
      eventsCount: currentDayData.events?.length,
      events: currentDayData.events?.map(e => ({ 
        id: e.id, 
        title: e.title, 
        location: e.location,
        hasLocation: !!e.location
      }))
    } : null,
    selectedEventLocation,
    timestamp: new Date().toLocaleTimeString()
  });

  // 當日期改變時，重置選中的行程狀態
  useEffect(() => {
    setSelectedEventId(null);
  }, [selectedDay]);

  // 事件處理函數
  const handleSaveEvent = useCallback((eventData) => {
    setItinerary(prev => prev.map(day => {
      if (day.day === selectedDay) {
        let newEvents;
        if (editingEvent) {
          // 編輯現有事件
          newEvents = day.events.map(e => e.id === editingEvent.id ? { ...eventData, id: e.id, memos: e.memos } : e);
        } else {
          // 新增事件
          newEvents = [...(day.events || []), { ...eventData, id: Date.now(), memos: [] }];
        }

        // 根據時間排序
        newEvents.sort((a, b) => {
          const timeA = a.time || '';
          const timeB = b.time || '';
          return timeA.localeCompare(timeB);
        });

        return {
          ...day,
          events: newEvents
        };
      }
      return day;
    }));
    setIsEditModalOpen(false);
    setEditingEvent(null);
  }, [selectedDay, editingEvent, setItinerary]);

  const handleDeleteEvent = useCallback((eventId) => {
    if (window.confirm('確認刪除此行程?')) {
      setItinerary(prev => prev.map(day => {
        if (day.day === selectedDay) {
          return {
            ...day,
            events: day.events.filter(e => e.id !== eventId)
          };
        }
        return day;
      }));
    }
  }, [selectedDay, setItinerary]);

  const handleUpdateMemos = useCallback((eventId, newMemos) => {
    setItinerary(prev => prev.map(day => {
      if (day.day === selectedDay) {
        return {
          ...day,
          events: day.events.map(e => e.id === eventId ? { ...e, memos: newMemos } : e)
        };
      }
      return day;
    }));
  }, [selectedDay, setItinerary]);

  const handleOpenGoogleMaps = (origin, destination) => {
    let startPoint = origin;

    // 如果有啟用 GPS 且有獲取到位置，優先使用當前 GPS 位置作為起點
    if (enableGPS && currentLocation) {
      if (currentLocation.latitude && currentLocation.longitude) {
        startPoint = `${currentLocation.latitude},${currentLocation.longitude}`;
      } else if (currentLocation.locationName) {
        startPoint = currentLocation.locationName;
      }
    }

    if (destination) {
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(startPoint || '')}&destination=${encodeURIComponent(destination)}`;
      window.open(mapsUrl, '_blank');
    }
  };

  // 編輯詳情處理
  const handleSaveDetails = useCallback((updatedData) => {
    setTripDetails(prev => ({
      ...prev,
      ...updatedData
    }));
    setIsEditDetailsModalOpen(false);
    setEditingDetailsType(null);
  }, [setTripDetails]);

  // 待辦清單處理
  const handleAddChecklistItem = (type, text) => {
    setChecklists(prev => ({
      ...prev,
      [type]: [...(prev[type] || []), { id: Date.now(), text, done: false }]
    }));
  };

  const handleToggleChecklistItem = (type, id) => {
    setChecklists(prev => ({
      ...prev,
      [type]: prev[type].map(item => item.id === id ? { ...item, done: !item.done } : item)
    }));
  };

  const handleDeleteChecklistItem = (type, id) => {
    setChecklists(prev => ({
      ...prev,
      [type]: prev[type].filter(item => item.id !== id)
    }));
  };

  // Drag and Drop Handlers for Itinerary
  const handleDragStart = (e, id) => {
    setDraggedEventId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (!draggedEventId || draggedEventId === targetId) return;

    setItinerary(prev => prev.map(day => {
      if (day.day === selectedDay) {
        const events = [...day.events];
        const sourceIndex = events.findIndex(e => e.id === draggedEventId);
        const targetIndex = events.findIndex(e => e.id === targetId);

        if (sourceIndex !== -1 && targetIndex !== -1) {
          const [movedEvent] = events.splice(sourceIndex, 1);
          events.splice(targetIndex, 0, movedEvent);
          return { ...day, events };
        }
      }
      return day;
    }));
    setDraggedEventId(null);
  };

  // Touch Support for Mobile Drag and Drop
  const handleTouchStart = (e, id) => {
    setDraggedEventId(id);
  };

  const handleTouchMove = (e) => {
    if (!draggedEventId) return;
    if (e.cancelable && e.target.closest('.touch-none')) {
      e.preventDefault();
    }

    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!target) return;

    const targetRow = target.closest('[data-event-id]');
    if (targetRow) {
      const targetId = parseInt(targetRow.getAttribute('data-event-id'));
      
      if (targetId && targetId !== draggedEventId) {
        setItinerary(prev => prev.map(day => {
          if (day.day === selectedDay) {
            const events = [...day.events];
            const sourceIndex = events.findIndex(e => e.id === draggedEventId);
            const targetIndex = events.findIndex(e => e.id === targetId);

            if (sourceIndex !== -1 && targetIndex !== -1) {
              const [movedEvent] = events.splice(sourceIndex, 1);
              events.splice(targetIndex, 0, movedEvent);
              return { ...day, events };
            }
          }
          return day;
        }));
      }
    }
  };

  const handleTouchEnd = () => {
    setDraggedEventId(null);
  };

  const headerRef = useRef(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="text-center space-y-4">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 font-medium">正在載入旅程...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-screen overflow-y-auto bg-gray-50 dark:bg-slate-950 font-sans pb-20" 
      data-theme={themeMode}
      onScroll={handleScroll}
    >
      <Header 
        ref={headerRef}
        details={tripDetails} 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSettingsOpen={() => setIsSettingsPanelOpen(true)}
        isSaving={isSaving}
        isScrolled={isScrolled}
      >
        {activeTab === 'itinerary' && (
          <div className="px-4 pb-2">
            <DaySelector 
              itinerary={itinerary}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
            />
          </div>
        )}
      </Header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pt-2">
          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <div className="px-4 sm:px-6 lg:px-8 space-y-6 pb-20 mt-4">
              {/* Countdown / Status Card */}
              <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                  <Clock size={150} />
                </div>
                <div className="relative z-10">
                  <p className="text-indigo-100 text-sm font-medium mb-1">旅程狀態</p>
                  {(() => {
                    const startDateStr = tripDetails?.dates?.split(' - ')[0];
                    if (!startDateStr) return <h2 className="text-3xl font-bold">未設定日期</h2>;
                    
                    const [year, month, day] = startDateStr.split('/').map(Number);
                    const start = new Date(year, month - 1, day);
                    const now = new Date();
                    const diffTime = start - now;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays > 0) {
                      return (
                        <div>
                          <h2 className="text-4xl font-bold mb-1">還有 {diffDays} 天</h2>
                          <p className="text-indigo-100">準備好出發了嗎？</p>
                        </div>
                      );
                    } else if (Math.abs(diffDays) < itinerary.length) {
                      return (
                        <div>
                          <h2 className="text-4xl font-bold mb-1">Day {Math.abs(diffDays) + 1}</h2>
                          <p className="text-indigo-100">旅程進行中，享受當下！</p>
                        </div>
                      );
                    } else {
                      return (
                        <div>
                          <h2 className="text-3xl font-bold mb-1">旅程已結束</h2>
                          <p className="text-indigo-100">期待下一次的冒險！</p>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col items-center justify-center text-center">
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-2 text-orange-600 dark:text-orange-400">
                    <CalendarDays size={20} />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">總天數</p>
                  <p className="text-xl font-bold text-gray-800 dark:text-slate-100">{itinerary.length} 天</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col items-center justify-center text-center">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-2 text-blue-600 dark:text-blue-400">
                    <MapPin size={20} />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">行程景點</p>
                  <p className="text-xl font-bold text-gray-800 dark:text-slate-100">
                    {itinerary.reduce((acc, day) => acc + (day.events?.length || 0), 0)} 個
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col items-center justify-center text-center">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-2 text-emerald-600 dark:text-emerald-400">
                    <Users size={20} />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">旅伴人數</p>
                  <p className="text-xl font-bold text-gray-800 dark:text-slate-100">{tripDetails.travelers?.length || 1} 人</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col items-center justify-center text-center">
                  <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mb-2 text-rose-600 dark:text-rose-400">
                    <Wallet size={20} />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">目前花費</p>
                  <p className="text-lg font-bold text-gray-800 dark:text-slate-100 truncate w-full">
                    ${Math.round(expenses.reduce((acc, curr) => acc + (curr.currency === 'JPY' ? curr.amount * exchangeRate : curr.amount), 0)).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Flight Cards */}
              {tripDetails?.flights && (
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                    <PlaneTakeoff size={20} className="text-brand-600 dark:text-brand-400" />
                    航班資訊
                  </h3>
                  
                  {/* Outbound */}
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden relative">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-brand-500"></div>
                    <div className="p-4">
                      <div className="flex justify-between items-center mb-3">
                        <span className="bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-xs font-bold px-2 py-1 rounded">去程</span>
                        <span className="text-sm font-bold text-gray-800 dark:text-slate-100">{tripDetails.flights.outbound.date}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-800 dark:text-slate-100">{tripDetails.flights.outbound.dep}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">出發</p>
                        </div>
                        <div className="flex-1 px-4 flex flex-col items-center">
                          <p className="text-xs text-gray-400 dark:text-slate-500 mb-1">{tripDetails.flights.outbound.airline}</p>
                          <div className="w-full h-px bg-gray-300 dark:bg-slate-600 relative flex items-center justify-center">
                            <PlaneTakeoff size={14} className="text-gray-400 dark:text-slate-500 absolute bg-white dark:bg-slate-800 px-1" />
                          </div>
                          <p className="text-xs font-bold text-brand-600 dark:text-brand-400 mt-1">{tripDetails.flights.outbound.code}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-800 dark:text-slate-100">{tripDetails.flights.outbound.arr}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">抵達</p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-50 dark:border-slate-700 flex justify-between items-center text-xs text-gray-500 dark:text-slate-400">
                        <div className="flex gap-4">
                          {tripDetails.flights.outbound.departureTime && (
                            <span className="font-medium text-gray-600 dark:text-slate-300">起飛: {tripDetails.flights.outbound.departureTime}</span>
                          )}
                          {tripDetails.flights.outbound.arrivalTime && (
                            <span className="font-medium text-gray-600 dark:text-slate-300">抵達: {tripDetails.flights.outbound.arrivalTime}</span>
                          )}
                        </div>
                        <button 
                          onClick={() => {
                            setEditingDetailsType('outbound');
                            setIsEditDetailsModalOpen(true);
                          }}
                          className="text-brand-600 dark:text-brand-400 font-medium hover:underline"
                        >
                          編輯
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Inbound */}
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden relative">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-500"></div>
                    <div className="p-4">
                      <div className="flex justify-between items-center mb-3">
                        <span className="bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-bold px-2 py-1 rounded">回程</span>
                        <span className="text-sm font-bold text-gray-800 dark:text-slate-100">{tripDetails.flights.inbound.date}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-800 dark:text-slate-100">{tripDetails.flights.inbound.dep}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">出發</p>
                        </div>
                        <div className="flex-1 px-4 flex flex-col items-center">
                          <p className="text-xs text-gray-400 dark:text-slate-500 mb-1">{tripDetails.flights.inbound.airline}</p>
                          <div className="w-full h-px bg-gray-300 dark:bg-slate-600 relative flex items-center justify-center">
                            <PlaneLanding size={14} className="text-gray-400 dark:text-slate-500 absolute bg-white dark:bg-slate-800 px-1" />
                          </div>
                          <p className="text-xs font-bold text-orange-600 dark:text-orange-400 mt-1">{tripDetails.flights.inbound.code}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-800 dark:text-slate-100">{tripDetails.flights.inbound.arr}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">抵達</p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-50 dark:border-slate-700 flex justify-between items-center text-xs text-gray-500 dark:text-slate-400">
                        <div className="flex gap-4">
                          {tripDetails.flights.inbound.departureTime && (
                            <span className="font-medium text-gray-600 dark:text-slate-300">起飛: {tripDetails.flights.inbound.departureTime}</span>
                          )}
                          {tripDetails.flights.inbound.arrivalTime && (
                            <span className="font-medium text-gray-600 dark:text-slate-300">抵達: {tripDetails.flights.inbound.arrivalTime}</span>
                          )}
                        </div>
                        <button 
                          onClick={() => {
                            setEditingDetailsType('inbound');
                            setIsEditDetailsModalOpen(true);
                          }}
                          className="text-brand-600 dark:text-brand-400 font-medium hover:underline"
                        >
                          編輯
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Accommodation Card */}
              {tripDetails?.accommodation && (
                <div className="space-y-2">
                  <h3 className="font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                    <Home size={20} className="text-brand-600 dark:text-brand-400" />
                    住宿資訊
                  </h3>
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-lg text-gray-800 dark:text-slate-100 mb-1">{tripDetails.accommodation.name}</h4>
                        <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-sm mb-4 cursor-pointer hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                             onClick={() => {
                               navigator.clipboard.writeText(tripDetails.accommodation.address);
                               // Optional: Add toast notification here
                             }}>
                          <MapPin size={14} />
                          <span className="line-clamp-1">{tripDetails.accommodation.address}</span>
                          <Copy size={12} className="text-gray-400 dark:text-slate-500" />
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setEditingDetailsType('accommodation');
                          setIsEditDetailsModalOpen(true);
                        }}
                        className="p-2 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg text-gray-400 dark:text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Check-in</p>
                        <p className="font-bold text-gray-800 dark:text-slate-100">{tripDetails.accommodation.checkIn}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Check-out</p>
                        <p className="font-bold text-gray-800 dark:text-slate-100">{tripDetails.accommodation.checkOut}</p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleOpenGoogleMaps(tripDetails.accommodation.address)}
                      className="w-full mt-4 py-2 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-lg text-sm font-bold hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors flex items-center justify-center gap-2"
                    >
                      <MapPin size={16} />
                      在 Google Maps 查看
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Expense Tab */}
          {activeTab === 'expenses' && (
            <div className="px-4 sm:px-6 lg:px-8 mt-4">
              <ExpenseTracker 
                itinerary={itinerary} 
                expenses={expenses}
                setExpenses={setExpenses}
                exchangeRate={exchangeRate}
                travelers={tripDetails.travelers || []}
              />
            </div>
          )}

          {/* Itinerary Tab */}
          {activeTab === 'itinerary' && (
            <>
              <div className="mt-2">
                <div className="px-4 sm:px-6 lg:px-8 mb-4">
                  <WeatherWidget 
                    date={currentDayData?.date}
                    currentLocation={currentLocation?.locationName}
                    accommodation={tripDetails?.accommodation?.name || '東京'}
                    firstEventLocation={currentDayData?.events?.[0]?.location}
                    selectedEventLocation={selectedEventLocation}
                  />
                </div>

                {/* Events Section */}
                <div className="px-4 sm:px-6 lg:px-8 space-y-6 pb-20">
                  {/* Events List */}
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                    {currentDayData?.events?.length > 0 ? (
                      <div className="divide-y divide-gray-100 dark:divide-slate-700">
                        {currentDayData.events.map((event, idx) => (
                          <div 
                            key={event.id} 
                            data-event-id={event.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, event.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, event.id)}
                            className={`p-6 cursor-pointer transition-all relative ${
                              selectedEventId === event.id 
                                ? 'bg-brand-50 dark:bg-brand-900/30 border-l-4 border-brand-400 dark:border-brand-500' 
                                : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
                            } ${draggedEventId === event.id ? 'opacity-50 bg-gray-100 dark:bg-slate-700' : ''}`}
                            onClick={() => setSelectedEventId(event.id)}
                          >
                            {/* Drag Handle */}
                            <div 
                              className="absolute left-2 top-1/2 transform -translate-y-1/2 cursor-grab text-gray-300 dark:text-slate-600 hover:text-gray-500 dark:hover:text-slate-400 touch-none p-2 z-10"
                              onTouchStart={(e) => handleTouchStart(e, event.id)}
                              onTouchMove={handleTouchMove}
                              onTouchEnd={handleTouchEnd}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <GripVertical size={20} />
                            </div>
                            
                            <div className="pl-6">
                              <EventCard
                                event={event}
                                prevLocation={idx > 0 ? currentDayData.events[idx - 1].location : tripDetails?.accommodation?.address}
                                onEdit={(e) => { setEditingEvent(e); setIsEditModalOpen(true); }}
                                onDelete={handleDeleteEvent}
                                onUpdateMemos={handleUpdateMemos}
                                onOpenGoogleMaps={handleOpenGoogleMaps}
                                exchangeRate={exchangeRate}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-12 text-center">
                        <p className="text-gray-400 dark:text-slate-500 text-lg">還沒有行程</p>
                        <p className="text-gray-400 dark:text-slate-500 text-sm mt-2">點擊右下方「+」開始規劃</p>
                      </div>
                    )}
                  </div>

                  {/* Daily Cost Summary 已移至記帳頁面 */}
                </div>
              </div>
            </>
          )}

          {/* Pre-Trip Checklist Tab */}
          {activeTab === 'preTrip' && (
            <div className="px-6 space-y-6 pb-10 mt-4">
              <Checklist
                title="🎒 行前清單"
                items={checklists?.preTrip || []}
                onAddItem={(text) => handleAddChecklistItem('preTrip', text)}
                onToggleItem={(id) => handleToggleChecklistItem('preTrip', id)}
                onDeleteItem={(id) => handleDeleteChecklistItem('preTrip', id)}
              />
            </div>
          )}

          {/* Packing Checklist Tab */}
          {activeTab === 'packing' && (
            <div className="px-6 space-y-6 pb-10 mt-4">
              <PackingListContent
                items={checklists?.packing || []}
                onUpdate={(newItems) => setChecklists(prev => ({ ...prev, packing: newItems }))}
                travelers={tripDetails?.travelers || []}
                itinerary={itinerary}
              />
            </div>
          )}

          {/* Flights/Accommodation Tab */}
          {activeTab === 'flights' && (
            <>
              <div className="px-6 space-y-4 pb-10 mt-4">
              {tripDetails?.accommodation && (
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-gray-800 dark:text-slate-100">🏨 住宿詳情</h3>
                    <button
                      onClick={() => {
                        setEditingDetailsType('accommodation');
                        setIsEditDetailsModalOpen(true);
                      }}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-brand-600 dark:text-brand-400"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                  <p className="font-bold text-gray-800 dark:text-slate-100">{tripDetails.accommodation.name}</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-2">{tripDetails.accommodation.address}</p>
                  <div className="text-xs text-gray-600 dark:text-slate-300 space-y-1">
                    <p>✓ Check-in: {tripDetails.accommodation.checkIn}</p>
                    <p>✓ Check-out: {tripDetails.accommodation.checkOut}</p>
                  </div>
                </div>
              )}
              {tripDetails?.flights && (
                <>
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-gray-800 dark:text-slate-100">✈️ 去程</h3>
                      <button
                        onClick={() => {
                          setEditingDetailsType('outbound');
                          setIsEditDetailsModalOpen(true);
                        }}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-brand-600 dark:text-brand-400"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                    <p className="text-sm"><span className="font-bold text-gray-800 dark:text-slate-100">{tripDetails.flights.outbound.code}</span> - <span className="text-gray-800 dark:text-slate-100">{tripDetails.flights.outbound.airline}</span></p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {tripDetails.flights.outbound.date}
                      {tripDetails.flights.outbound.departureTime && ` 起飛: ${tripDetails.flights.outbound.departureTime}`}
                      {tripDetails.flights.outbound.arrivalTime && ` 抵達: ${tripDetails.flights.outbound.arrivalTime}`}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{tripDetails.flights.outbound.dep} → {tripDetails.flights.outbound.arr}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-gray-800 dark:text-slate-100">✈️ 回程</h3>
                      <button
                        onClick={() => {
                          setEditingDetailsType('inbound');
                          setIsEditDetailsModalOpen(true);
                        }}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-brand-600 dark:text-brand-400"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                    <p className="text-sm"><span className="font-bold text-gray-800 dark:text-slate-100">{tripDetails.flights.inbound.code}</span> - <span className="text-gray-800 dark:text-slate-100">{tripDetails.flights.inbound.airline}</span></p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {tripDetails.flights.inbound.date}
                      {tripDetails.flights.inbound.departureTime && ` 起飛: ${tripDetails.flights.inbound.departureTime}`}
                      {tripDetails.flights.inbound.arrivalTime && ` 抵達: ${tripDetails.flights.inbound.arrivalTime}`}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{tripDetails.flights.inbound.dep} → {tripDetails.flights.inbound.arr}</p>
                  </div>
                </>
              )}
              </div>
            </>
          )}

          {/* Shopping Tab */}
          {activeTab === 'shopping' && (
            <div className="px-6 mt-4 pb-10">
               <ShoppingListContent tripId="default-trip" />
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button for adding events */}
      {activeTab === 'itinerary' && (
        <button
          onClick={() => { setEditingEvent(null); setIsEditModalOpen(true); }}
          className="fixed bottom-6 right-6 w-14 h-14 bg-brand-600 text-white rounded-full shadow-lg hover:bg-brand-700 flex items-center justify-center transition-all duration-200 hover:scale-110 z-40"
          title="新增行程"
        >
          <Plus size={28} />
        </button>
      )}

      {/* Event Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setEditingEvent(null); }}
        title={editingEvent ? "編輯行程" : "新增行程"}
      >
        <EditEventForm
          event={editingEvent}
          onSave={handleSaveEvent}
          onCancel={() => { setIsEditModalOpen(false); setEditingEvent(null); }}
        />
      </Modal>

      {/* Details Edit Modal */}
      <Modal
        isOpen={isEditDetailsModalOpen}
        onClose={() => { setIsEditDetailsModalOpen(false); setEditingDetailsType(null); }}
        title={
          editingDetailsType === 'accommodation' ? '編輯住宿' :
          editingDetailsType === 'outbound' ? '編輯去程' :
          editingDetailsType === 'inbound' ? '編輯回程' : '編輯詳情'
        }
      >
        <EditDetailsForm
          tripDetails={tripDetails}
          detailsType={editingDetailsType}
          onSave={handleSaveDetails}
          onCancel={() => { setIsEditDetailsModalOpen(false); setEditingDetailsType(null); }}
        />
      </Modal>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={isSettingsPanelOpen}
        onClose={() => setIsSettingsPanelOpen(false)}
        enableGPS={enableGPS}
        onGPSToggle={() => setEnableGPS(!enableGPS)}
        travelers={tripDetails?.travelers || []}
        onUpdateTravelers={(newTravelers) => setTripDetails(prev => ({ ...prev, travelers: newTravelers }))}
          currentTheme={themeMode}
          onThemeChange={setThemeMode}
          interfaceSize={interfaceSize}
          onInterfaceSizeChange={setInterfaceSize}
          exchangeRate={exchangeRate}
          onExchangeRateChange={setExchangeRate}
        onUpdateRate={handleManualRateUpdate}
        lastUpdateDate={lastRateUpdate}
      />
    </div>
  );
};

export default App;

