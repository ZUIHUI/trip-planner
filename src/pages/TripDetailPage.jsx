import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Settings } from 'lucide-react';
import Header from '../components/Header';
import Modal from '../components/Modal';
import EditEventForm from '../components/EditEventForm';
import EventCard from '../components/EventCard';
import Checklist from '../components/Checklist';
import DaySelector from '../components/DaySelector';
import SettingsPanel from '../components/SettingsPanel';
import ShoppingListContent from '../components/ShoppingListContent';
import { useTrip } from '../hooks/useTrip';
import { useBudget } from '../hooks/useBudget';
import { useDeviceLocation } from '../hooks/useDeviceLocation';
import { loadTrip } from '../services/tripService';

const TripDetailPage = () => {
  const { tripId: paramTripId } = useParams();
  const tripId = paramTripId || 'default-trip';
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('itinerary');
  const [selectedDay, setSelectedDay] = useState(1);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [tripData, setTripData] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [enableGPS, setEnableGPS] = useState(false);

  // 初始旅程資料結構
  const defaultTripDetails = {
    title: '',
    dates: '',
    accommodation: {},
    flights: {}
  };

  const defaultItinerary = Array.from({ length: 6 }, (_, i) => ({
    day: i + 1,
    date: `Day ${i + 1}`,
    title: `Day ${i + 1}`,
    events: []
  }));

  const { 
    isLoading, 
    tripDetails, 
    setTripDetails, 
    itinerary, 
    setItinerary, 
    checklists, 
    setChecklists 
  } = useTrip(tripId, defaultTripDetails, defaultItinerary);

  const budgetInfo = useBudget(itinerary);

  // 使用 GPS Hook 獲取設備位置
  const { currentLocation, isLocating, locationError } = useDeviceLocation(enableGPS);

  useEffect(() => {
    const initTrip = async () => {
      try {
        const data = await loadTrip(tripId);
        setTripData(data);
        setIsLoadingData(false);
      } catch (err) {
        console.error('❌ 載入旅程失敗:', err);
        setIsLoadingData(false);
      }
    };

    initTrip();
  }, [tripId]);

  const currentDayData = itinerary.find(d => d.day === selectedDay);

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

  const openAddModal = () => {
    setEditingEvent(null);
    setIsEditModalOpen(true);
  };

  const openEditModal = (event) => {
    setEditingEvent(event);
    setIsEditModalOpen(true);
  };

  if (isLoading || isLoadingData) {
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
      <div className="relative">
        <Header 
          details={tripDetails} 
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSettingsOpen={() => setIsSettingsOpen(true)}
        />
        {/* 設定按鈕 */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors z-20"
          title="打開設定"
        >
          <Settings size={24} />
        </button>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-red-100 p-2 text-center text-red-600 font-bold">
            DEBUG: Current Tab is [{activeTab}]
        </div>
        <div className="pt-4">
          {activeTab === 'summary' && (
            <div className="px-6 space-y-4 pb-10">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">旅程概覽</h3>
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
                      {tripDetails.flights.outbound.date} {tripDetails.flights.outbound.time}
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
                      {tripDetails.flights.inbound.date} {tripDetails.flights.inbound.time}
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

              <div className="px-6 mt-4 pb-20">
                <div className="flex justify-between items-end mb-4 border-b border-gray-200 pb-2">
                  <div>
                    {currentDayData ? (
                      <>
                        <h2 className="text-xl font-bold text-gray-800">{currentDayData.title}</h2>
                        <p className="text-sm text-gray-500">{currentDayData.date}</p>
                      </>
                    ) : (
                      <p className="text-gray-500">載入中...</p>
                    )}
                  </div>
                </div>

                <div className="px-6 mt-2 flex justify-between items-center space-x-2">
                  <div className="flex-1 py-2 text-xs bg-green-50 border border-green-200 rounded-lg text-green-700 font-medium shadow-sm text-center">
                    🔄 自動同步中...
                  </div>
                </div>

                <div className="mt-4">
                  {currentDayData && currentDayData.events.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                      <p>尚無行程</p>
                      <button
                        onClick={openAddModal}
                        className="mt-2 text-blue-500 font-bold text-sm"
                      >
                        + 新增第一個行程
                      </button>
                    </div>
                  ) : (
                    currentDayData.events.map((event, index) => {
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
                        />
                      );
                    })
                  )}
                </div>

                {currentDayData && currentDayData.events.length > 0 && (
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

                <button
                  onClick={openAddModal}
                  className="w-full mt-6 py-3 border-2 border-dashed border-blue-300 text-blue-500 rounded-xl font-bold hover:bg-blue-50 transition-colors flex items-center justify-center"
                >
                  <Plus size={20} className="mr-2" />
                  新增行程
                </button>
              </div>
            </>
          )}

          {activeTab === 'checklist' && (
            <div className="px-6 mt-6 space-y-4 pb-10">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">📋 出國前待辦</h3>
                <Checklist
                  items={checklists.preTrip}
                  onUpdate={(newItems) =>
                    setChecklists(prev => ({ ...prev, preTrip: newItems }))
                  }
                />
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">🎒 打包清單</h3>
                <Checklist
                  items={checklists.packing}
                  onUpdate={(newItems) =>
                    setChecklists(prev => ({ ...prev, packing: newItems }))
                  }
                />
              </div>
            </div>
          )}

          {activeTab === 'flights' && (
            <div className="px-6 mt-6 pb-10">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
                <h3 className="text-lg font-bold text-gray-800 mb-4">🏨 住宿資訊</h3>
                <input
                  type="text"
                  placeholder="飯店名稱"
                  value={tripDetails?.accommodation?.name || ''}
                  onChange={(e) =>
                    setTripDetails(prev => ({
                      ...prev,
                      accommodation: { ...prev.accommodation, name: e.target.value }
                    }))
                  }
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm mb-2"
                />
                <input
                  type="text"
                  placeholder="地址"
                  value={tripDetails?.accommodation?.address || ''}
                  onChange={(e) =>
                    setTripDetails(prev => ({
                      ...prev,
                      accommodation: { ...prev.accommodation, address: e.target.value }
                    }))
                  }
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm"
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
                          ...prev.flights,
                          outbound: { ...prev.flights.outbound, code: e.target.value }
                        }
                      }))
                    }
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm mb-2"
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
                          ...prev.flights,
                          inbound: { ...prev.flights.inbound, code: e.target.value }
                        }
                      }))
                    }
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shopping' && (
            <div className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-2xl font-bold mb-4">購物清單測試 (Tab: {activeTab})</h2>
              {/* <ShoppingListContent tripId={tripId} /> */}
              <p>如果看到這行字，表示分頁切換成功，但元件可能有問題。</p>
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
      />

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
