import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import Modal from './components/Modal';
import EditEventForm from './components/EditEventForm';
import EditDetailsForm from './components/EditDetailsForm';
import EventCard from './components/EventCard';
import Checklist from './components/Checklist';
import DaySelector from './components/DaySelector';
import { useTrip } from './hooks/useTrip';
import { useBudget } from './hooks/useBudget';
import { Plus, Edit2 } from 'lucide-react';

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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isEditDetailsModalOpen, setIsEditDetailsModalOpen] = useState(false);
  const [editingDetailsType, setEditingDetailsType] = useState(null); // 'accommodation', 'outbound', 'inbound'

  const currentDayData = itinerary.find(d => d.day === selectedDay);
  const budgetSummary = useBudget(itinerary);

  // 事件處理函數
  const handleSaveEvent = useCallback((eventData) => {
    setItinerary(prev => prev.map(day => {
      if (day.day === selectedDay) {
        if (editingEvent) {
          // 編輯現有事件
          return {
            ...day,
            events: day.events.map(e => e.id === editingEvent.id ? { ...eventData, id: e.id, memos: e.memos } : e)
          };
        } else {
          // 新增事件
          return {
            ...day,
            events: [...(day.events || []), { ...eventData, id: Date.now(), memos: [] }]
          };
        }
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
    <div className="min-h-screen bg-gray-50 font-sans">
      <Header details={tripDetails} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* 儲存狀態和手動更新工具欄 */}
        <div className="flex justify-between items-center bg-white p-3 mt-4 rounded-lg shadow-sm border border-gray-100 mb-2">
          <div className="flex items-center gap-2">
            {isSaving && (
              <div className="flex items-center gap-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                <span className="text-xs font-medium">自動儲存中...</span>
              </div>
            )}
            {saveError && !isSaving && (
              <div className="flex items-center gap-2 text-orange-600">
                <span className="text-xs">⚠️ {saveError}</span>
              </div>
            )}
            {!isSaving && !saveError && (
              <span className="text-xs text-gray-500">✓ 已儲存</span>
            )}
          </div>
          <button
            onClick={manualRefresh}
            disabled={isLoading}
            className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {isLoading ? '更新中...' : '🔄 手動更新'}
          </button>
        </div>

        <div className="pt-4">
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
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl shadow-sm border border-blue-200">
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
                              <span className="inline-block bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-bold mr-2">Day {day.day}</span>
                              <span className="text-gray-600">{day.date} {day.weekday}</span>
                            </p>
                            <p className="text-xs text-gray-500 ml-0">{costItems} 個項目</p>
                          </div>
                          <p className="text-base font-bold text-blue-600 ml-4">${dayTotal.toLocaleString()}</p>
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
              <div className="mt-4">
                <DaySelector 
                  itinerary={itinerary}
                  selectedDay={selectedDay}
                  onSelectDay={setSelectedDay}
                />
              </div>

              <div className="mt-4 pb-10">
                <div className="px-6">
                {/* Events for selected day */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">
                        Day {currentDayData?.day} - {currentDayData?.date} {currentDayData?.weekday}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">行程表</p>
                    </div>
                  </div>

                  {currentDayData?.events?.length > 0 ? (
                    <div className="space-y-4">
                      {currentDayData.events.map((event, idx) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          prevLocation={idx > 0 ? currentDayData.events[idx - 1].location : tripDetails?.accommodation?.address}
                          onEdit={(e) => { setEditingEvent(e); setIsEditModalOpen(true); }}
                          onDelete={handleDeleteEvent}
                          onUpdateMemos={handleUpdateMemos}
                          onOpenGoogleMaps={handleOpenGoogleMaps}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">還沒有行程，點擊「新增」開始規劃</p>
                  )}
                </div>

                {/* Daily Cost Summary */}
                {currentDayData?.events?.some(e => e.cost) && (
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <p className="text-sm text-blue-900">
                      💰 今天消費: <span className="font-bold">{currentDayData.events.filter(e => e.cost).reduce((sum, e) => sum + (parseInt(e.cost) || 0), 0)}</span> 元
                      ({currentDayData.events.filter(e => e.cost).length} 個項目)
                    </p>
                  </div>
                )}
                </div>
              </div>
            </>
          )}

          {/* Checklist Tab */}
          {activeTab === 'checklist' && (
            <>
              <div className="px-6 space-y-6 pb-10 mt-4">
              <Checklist
                title="🎒 行前清單"
                items={checklists?.preTrip || []}
                onAddItem={(text) => handleAddChecklistItem('preTrip', text)}
                onToggleItem={(id) => handleToggleChecklistItem('preTrip', id)}
                onDeleteItem={(id) => handleDeleteChecklistItem('preTrip', id)}
              />
              <Checklist
                title="🧳 行李清單"
                items={checklists?.packing || []}
                onAddItem={(text) => handleAddChecklistItem('packing', text)}
                onToggleItem={(id) => handleToggleChecklistItem('packing', id)}
                onDeleteItem={(id) => handleDeleteChecklistItem('packing', id)}
              />
              </div>
            </>
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
                      className="p-1 hover:bg-gray-100 rounded text-blue-600"
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
                        className="p-1 hover:bg-gray-100 rounded text-blue-600"
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
                        className="p-1 hover:bg-gray-100 rounded text-blue-600"
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
        </div>
      </div>

      {/* Floating Action Button for adding events */}
      {activeTab === 'itinerary' && (
        <button
          onClick={() => { setEditingEvent(null); setIsEditModalOpen(true); }}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 flex items-center justify-center transition-all duration-200 hover:scale-110 z-40"
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
    </div>
  );
};

export default App;

