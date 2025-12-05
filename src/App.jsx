import React, { useState, useCallback, useEffect } from 'react';
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
import { useTrip } from './hooks/useTrip';
import { useBudget } from './hooks/useBudget';
import { useDeviceLocation } from './hooks/useDeviceLocation';
import { Plus, Edit2, GripVertical } from 'lucide-react';

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
    outbound: { code: "JX802", airline: "星宇航空", date: "2/23", time: "14:40 抵達", dep: "TPE", arr: "NRT" },
    inbound: { code: "CX451", airline: "國泰航空", date: "2/28", time: "15:25 起飛", dep: "NRT", arr: "TPE" }
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
  const { isLoading, isSaving, saveError, tripDetails, setTripDetails, itinerary, setItinerary, checklists, setChecklists, manualRefresh } = 
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
  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('app_theme') || 'ocean');

  useEffect(() => {
    localStorage.setItem('app_theme', currentTheme);
    if (currentTheme === 'midnight') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [currentTheme]);

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
    if (destination) {
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin || '')}&destination=${encodeURIComponent(destination)}`;
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans pb-20" data-theme={currentTheme}>
      <Header 
        details={tripDetails} 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSettingsOpen={() => setIsSettingsPanelOpen(true)}
        isSaving={isSaving}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pt-2">
          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <div className="px-6 space-y-4 pb-10">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">{tripDetails?.title || '旅程概覽'}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-gray-500 text-xs mb-1">旅程期間</p>
                      <p className="text-lg font-bold text-gray-800">{tripDetails?.dates || '未設定'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500 text-xs mb-1">天數</p>
                      <p className="text-lg font-bold text-gray-800">{itinerary.length} 天</p>
                    </div>
                  </div>
                </div>
              </div>

              {tripDetails?.accommodation && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="font-bold text-gray-800 mb-3">🏨 住宿</h3>
                  <p className="font-bold text-gray-800">{tripDetails.accommodation.name}</p>
                  <p className="text-sm text-gray-500 mb-2">{tripDetails.accommodation.address}</p>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>✓ Check-in: {tripDetails.accommodation.checkIn}</p>
                    <p>✓ Check-out: {tripDetails.accommodation.checkOut}</p>
                  </div>
                </div>
              )}

              {tripDetails?.flights && (
                <>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-3">✈️ 去程</h3>
                    <p className="text-sm"><span className="font-bold">{tripDetails.flights.outbound.code}</span> - {tripDetails.flights.outbound.airline}</p>
                    <p className="text-xs text-gray-500">{tripDetails.flights.outbound.date} {tripDetails.flights.outbound.time}</p>
                    <p className="text-xs text-gray-500">{tripDetails.flights.outbound.dep} → {tripDetails.flights.outbound.arr}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-3">✈️ 回程</h3>
                    <p className="text-sm"><span className="font-bold">{tripDetails.flights.inbound.code}</span> - {tripDetails.flights.inbound.airline}</p>
                    <p className="text-xs text-gray-500">{tripDetails.flights.inbound.date} {tripDetails.flights.inbound.time}</p>
                    <p className="text-xs text-gray-500">{tripDetails.flights.inbound.dep} → {tripDetails.flights.inbound.arr}</p>
                  </div>
                </>
              )}

              {/* 預算總覽 */}
              <div className="bg-gradient-to-br from-brand-50 to-brand-100 p-4 rounded-xl shadow-sm border border-brand-200">
                <h3 className="font-bold text-gray-800 mb-4">💰 預算總覽</h3>
                {itinerary.some(day => day.events?.some(e => e.cost)) ? (
                  <div className="space-y-2">
                    {itinerary.map(day => {
                      const dayTotal = day.events?.reduce((sum, e) => sum + (parseInt(e.cost) || 0), 0) || 0;
                      const costItems = day.events?.filter(e => e.cost).length || 0;
                      return dayTotal > 0 && (
                        <div key={day.day} className="flex justify-between items-center px-3 py-2 bg-white rounded-lg shadow-sm">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800">
                              <span className="inline-block bg-brand-600 text-white px-2 py-0.5 rounded text-xs font-bold mr-2">Day {day.day}</span>
                              <span className="text-gray-600">{day.date} {day.weekday}</span>
                            </p>
                            <p className="text-xs text-gray-500 ml-0">{costItems} 個項目</p>
                          </div>
                          <p className="text-base font-bold text-brand-600 ml-4">${dayTotal.toLocaleString()}</p>
                        </div>
                      );
                    })}
                    <div className="flex justify-between items-center px-3 py-3 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg border border-green-300 mt-3">
                      <p className="font-bold text-gray-800">旅程總計</p>
                      <p className="text-lg font-bold text-green-700">
                        ${itinerary.reduce((sum, day) => {
                          return sum + (day.events?.reduce((daySum, e) => daySum + (parseInt(e.cost) || 0), 0) || 0);
                        }, 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-gray-500 text-sm py-4">還沒有記錄花費</p>
                )}
              </div>
            </div>
          )}

          {/* Itinerary Tab */}
          {activeTab === 'itinerary' && (
            <>
              <div className="mt-2">
                <div className="px-4 sm:px-6 lg:px-8">
                  {/* Day Selector */}
                  <div className="mb-4">
                    <DaySelector 
                      itinerary={itinerary}
                      selectedDay={selectedDay}
                      onSelectDay={setSelectedDay}
                    />
                  </div>

                  {/* Weather Widget */}
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
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {currentDayData?.events?.length > 0 ? (
                      <div className="divide-y divide-gray-100">
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
                                ? 'bg-brand-50 border-l-4 border-brand-400' 
                                : 'hover:bg-gray-50'
                            } ${draggedEventId === event.id ? 'opacity-50 bg-gray-100' : ''}`}
                            onClick={() => setSelectedEventId(event.id)}
                          >
                            {/* Drag Handle */}
                            <div 
                              className="absolute left-2 top-1/2 transform -translate-y-1/2 cursor-grab text-gray-300 hover:text-gray-500 touch-none p-2 z-10"
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
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-12 text-center">
                        <p className="text-gray-400 text-lg">還沒有行程</p>
                        <p className="text-gray-400 text-sm mt-2">點擊右下方「+」開始規劃</p>
                      </div>
                    )}
                  </div>

                  {/* Daily Cost Summary */}
                  {currentDayData?.events?.some(e => e.cost) && (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-amber-700 font-medium">今日消費統計</p>
                          <p className="text-2xl font-bold text-amber-900 mt-1">
                            ¥ {currentDayData.events.filter(e => e.cost).reduce((sum, e) => sum + (parseInt(e.cost) || 0), 0)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-amber-700">{currentDayData.events.filter(e => e.cost).length} 項</p>
                        </div>
                      </div>
                    </div>
                  )}
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
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-gray-800">🏨 住宿詳情</h3>
                    <button
                      onClick={() => {
                        setEditingDetailsType('accommodation');
                        setIsEditDetailsModalOpen(true);
                      }}
                      className="p-1 hover:bg-gray-100 rounded text-brand-600"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                  <p className="font-bold text-gray-800">{tripDetails.accommodation.name}</p>
                  <p className="text-sm text-gray-500 mb-2">{tripDetails.accommodation.address}</p>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>✓ Check-in: {tripDetails.accommodation.checkIn}</p>
                    <p>✓ Check-out: {tripDetails.accommodation.checkOut}</p>
                  </div>
                </div>
              )}
              {tripDetails?.flights && (
                <>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-gray-800">✈️ 去程</h3>
                      <button
                        onClick={() => {
                          setEditingDetailsType('outbound');
                          setIsEditDetailsModalOpen(true);
                        }}
                        className="p-1 hover:bg-gray-100 rounded text-brand-600"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                    <p className="text-sm"><span className="font-bold">{tripDetails.flights.outbound.code}</span> - {tripDetails.flights.outbound.airline}</p>
                    <p className="text-xs text-gray-500">{tripDetails.flights.outbound.date} {tripDetails.flights.outbound.time}</p>
                    <p className="text-xs text-gray-500">{tripDetails.flights.outbound.dep} → {tripDetails.flights.outbound.arr}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-gray-800">✈️ 回程</h3>
                      <button
                        onClick={() => {
                          setEditingDetailsType('inbound');
                          setIsEditDetailsModalOpen(true);
                        }}
                        className="p-1 hover:bg-gray-100 rounded text-brand-600"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                    <p className="text-sm"><span className="font-bold">{tripDetails.flights.inbound.code}</span> - {tripDetails.flights.inbound.airline}</p>
                    <p className="text-xs text-gray-500">{tripDetails.flights.inbound.date} {tripDetails.flights.inbound.time}</p>
                    <p className="text-xs text-gray-500">{tripDetails.flights.inbound.dep} → {tripDetails.flights.inbound.arr}</p>
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
        currentTheme={currentTheme}
        onThemeChange={setCurrentTheme}
      />
    </div>
  );
};

export default App;

