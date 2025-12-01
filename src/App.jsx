import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import Modal from './components/Modal';
import EditEventForm from './components/EditEventForm';
import EventCard from './components/EventCard';
import Checklist from './components/Checklist';
import { useTrip } from './hooks/useTrip';
import { useBudget } from './hooks/useBudget';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';

// 預設資料
const initialTripDetails = {
  title: "東京六天五夜自由行",
  dates: "2026/02/23 - 02/28",
  accommodation: {
    name: "新大久保 / 新宿御苑 V",
    address: "新大久保站", // 用於 Google Maps 定位
    checkIn: "2/23 16:00",
    checkOut: "2/28 10:00"
  },
  flights: {
    outbound: { code: "JX802", airline: "星宇航空", date: "2/23", time: "14:40 抵達", dep: "TPE", arr: "NRT" },
    inbound: { code: "CX451", airline: "國泰航空", date: "2/28", time: "15:25 起飛", dep: "NRT", arr: "TPE" }
  }
};

const initialItinerary = Array.from({ length: 6 }, (_, i) => ({
  day: i + 1,
  date: `2/23-28 (day ${i + 1})`,
  title: `Day ${i + 1}`,
  events: []
}));

const App = () => {
  // 固定使用單一旅程 ID
  const TRIP_ID = 'default-trip';
  
  const [isLoading, setIsLoading] = useState(true);
  const [currentTripData, setCurrentTripData] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [selectedDay, setSelectedDay] = useState(1);
  const [itinerary, setItinerary] = useState(initialItinerary);
  const [tripDetails, setTripDetails] = useState(initialTripDetails);
  const [checklists, setChecklists] = useState({
    preTrip: [],
    packing: []
  });
  
  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const currentDayData = itinerary.find(d => d.day === selectedDay);
  const autoSaveTimeoutRef = React.useRef(null);

  // 在組件掛載時初始化旅程資料
  useEffect(() => {
    const initializeTripData = async () => {
      try {
        setIsLoading(true);
        console.log('📝 開始載入旅程:', TRIP_ID);
        const ref = doc(db, 'trips', TRIP_ID);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          console.log('✅ 旅程資料已載入:', data);
          setCurrentTripData(data);
          setItinerary(data.itinerary || initialItinerary);
          setTripDetails(data.tripDetails || initialTripDetails);
          setChecklists(data.checklists || { preTrip: [], packing: [] });
          console.log('✅ 已載入旅程');
        } else {
          console.log('⚠️ 旅程不存在，使用預設資料並建立新旅程');
          // 如果第一次使用，建立預設旅程
          const initialData = {
            title: initialTripDetails.title,
            dates: initialTripDetails.dates,
            tripDetails: initialTripDetails,
            itinerary: initialItinerary,
            checklists: { preTrip: [], packing: [] },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await setDoc(ref, initialData);
          setCurrentTripData(initialData);
          setItinerary(initialItinerary);
          setTripDetails(initialTripDetails);
          setChecklists({ preTrip: [], packing: [] });
          console.log('✅ 已建立預設旅程');
        }
      } catch (err) {
        console.error('❌ 初始化旅程失敗:', err);
        // 使用本地預設資料（故障恢復）
        console.log('⚠️ 使用本地預設資料');
        setItinerary(initialItinerary);
        setTripDetails(initialTripDetails);
        setChecklists({ preTrip: [], packing: [] });
      } finally {
        setIsLoading(false);
      }
    };

    initializeTripData();
  }, []);

  // 自動儲存行程到 Firebase（防抖 1 秒）
  useEffect(() => {
    if (!db) return;

    // 清除前一個計時器
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // 設定新的計時器
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        const ref = doc(db, 'trips', TRIP_ID);
        const payload = {
          tripDetails,
          itinerary,
          checklists,
          updatedAt: new Date().toISOString()
        };

        await setDoc(ref, payload, { merge: true });
        console.log('✅ 自動儲存成功');
      } catch (err) {
        console.error('❌ 自動儲存失敗:', err);
      }
    }, 1000); // 1 秒防抖

    // Cleanup：組件卸載時清除計時器
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [itinerary, tripDetails, checklists]); // 只在變更時執行

  // Handlers
  const handleSaveEvent = (eventData) => {
    if (editingEvent) {
      // Edit existing
      setItinerary(prev => prev.map(day => {
        if (day.day === selectedDay) {
          return {
            ...day,
            events: day.events.map(e => e.id === eventData.id ? eventData : e).sort((a,b) => a.time.localeCompare(b.time))
          };
        }
        return day;
      }));
    } else {
      // Add new
      const newEvent = { ...eventData, id: Date.now(), memos: [] };
      setItinerary(prev => prev.map(day => {
        if (day.day === selectedDay) {
          return {
            ...day,
            events: [...day.events, newEvent].sort((a,b) => a.time.localeCompare(b.time))
          };
        }
        return day;
      }));
    }
    setIsEditModalOpen(false);
    setEditingEvent(null);
  };

  const handleDeleteEvent = (id) => {
    if (window.confirm("確定要刪除這個行程嗎？")) {
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

  // 直接返回旅程編輯視圖
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
      {/* Header */}
      <div className="relative">
        <Header details={tripDetails} />
      </div>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">        {/* Navigation Tabs */}
        <div className="flex justify-center space-x-1 bg-white p-1 mt-[-20px] rounded-xl shadow-md relative z-10 border border-gray-100">
          <button onClick={() => setActiveTab('summary')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${activeTab === 'summary' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>總覽</button>
          <button onClick={() => setActiveTab('itinerary')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${activeTab === 'itinerary' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>行程表</button>
          <button onClick={() => setActiveTab('checklist')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${activeTab === 'checklist' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>清單</button>
          <button onClick={() => setActiveTab('flights')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${activeTab === 'flights' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>機票/住宿</button>
        </div>

        <div className="pt-4">
          {activeTab === 'summary' && (
            <div className="px-6 space-y-4 pb-10">
              {/* 旅程統計 */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">旅程概覽</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-gray-500 text-xs mb-1">旅程期間</p>
                    <p className="text-lg font-bold text-gray-800">{tripDetails.dates || '未設定'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500 text-xs mb-1">天數</p>
                    <p className="text-lg font-bold text-gray-800">{itinerary.length} 天</p>
                  </div>
                </div>
              </div>

              {/* 住宿卡片 */}
              {tripDetails.accommodation && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="font-bold text-gray-800 mb-3">🏨 住宿</h3>
                  <p className="font-bold text-gray-800">{tripDetails.accommodation.name || '未設定'}</p>
                  <p className="text-sm text-gray-500 mb-2">{tripDetails.accommodation.address || '未設定地址'}</p>
                  <div className="text-xs text-gray-600 space-y-1 mb-3">
                    <p>✓ 入住：{tripDetails.accommodation.checkIn || '未設定'}</p>
                    <p>✓ 退住：{tripDetails.accommodation.checkOut || '未設定'}</p>
                  </div>
                  {tripDetails.accommodation.address && (
                    <button
                      onClick={() => openGoogleMaps(null, tripDetails.accommodation.address)}
                      className="text-xs bg-blue-100 text-blue-600 px-3 py-1 rounded-full hover:bg-blue-200 transition-colors"
                    >
                      📍 查看地圖
                    </button>
                  )}
                </div>
              )}

              {/* 航班卡片 */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-3">✈️ 航班</h3>

                {tripDetails.flights?.outbound?.code ? (
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-blue-600">去程</span>
                      <span className="font-mono text-gray-800 text-sm">{tripDetails.flights.outbound.code}</span>
                    </div>
                    <p className="text-sm text-gray-600">{tripDetails.flights.outbound.airline || '航空公司'}</p>
                    <p className="text-xs text-gray-500">{tripDetails.flights.outbound.date} {tripDetails.flights.outbound.time}</p>
                    <p className="text-xs text-gray-600 mt-1">{tripDetails.flights.outbound.dep} → {tripDetails.flights.outbound.arr}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 mb-3">未設定去程</p>
                )}

                <div className="border-t border-gray-100 my-3"></div>

                {tripDetails.flights?.inbound?.code ? (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-indigo-600">回程</span>
                      <span className="font-mono text-gray-800 text-sm">{tripDetails.flights.inbound.code}</span>
                    </div>
                    <p className="text-sm text-gray-600">{tripDetails.flights.inbound.airline || '航空公司'}</p>
                    <p className="text-xs text-gray-500">{tripDetails.flights.inbound.date} {tripDetails.flights.inbound.time}</p>
                    <p className="text-xs text-gray-600 mt-1">{tripDetails.flights.inbound.dep} → {tripDetails.flights.inbound.arr}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">未設定回程</p>
                )}
              </div>
            </div>
          )}
          {activeTab === 'itinerary' && (
            <>
              {/* Day Selector */}
              <div className="flex overflow-x-auto px-4 py-2 space-x-3 no-scrollbar">
                {itinerary.map((item) => (
                  <button
                    key={item.day}
                    onClick={() => setSelectedDay(item.day)}
                    className={`flex-shrink-0 flex flex-col items-center justify-center w-14 h-18 rounded-2xl transition-all border ${
                      selectedDay === item.day
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md transform scale-105'
                      : 'bg-white border-gray-100 text-gray-400'
                  }`}
                >
                  <span className="text-xs">Day</span>
                  <span className="text-lg font-bold">{item.day}</span>
                </button>
              ))}
              </div>
              
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
                
                {/* 雲端同步工具列 */}
                <div className="px-6 mt-2 flex justify-between items-center space-x-2">
                  <div className="flex-1 py-2 text-xs bg-green-50 border border-green-200 rounded-lg text-green-700 font-medium shadow-sm text-center">
                    🔄 自動同步中...
                  </div>
                  <button
                    onClick={() => {
                      const ref = doc(db, 'trips', TRIP_ID);
                      getDoc(ref).then(snap => {
                        if (snap.exists()) {
                          const data = snap.data();
                          setItinerary(data.itinerary || []);
                          setTripDetails(data.tripDetails || {});
                          alert('✅ 已重新載入雲端資料');
                        }
                      });
                    }}
                    className="flex-1 py-2 text-xs bg-white border border-gray-300 rounded-lg text-gray-700 font-medium shadow-sm active:scale-[0.98] transition"
                  >
                    重新載入
                  </button>
                </div>

                <div className="mt-4">
                  {currentDayData && currentDayData.events.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                      <p>尚無行程</p>
                      <button onClick={openAddModal} className="mt-2 text-blue-500 font-bold text-sm">+ 新增第一個行程</button>
                    </div>
                  ) : (
                    currentDayData.events.map((event, index) => {
                      // Calculate previous location for Google Maps routing
                      const prevEvent = index > 0 ? currentDayData.events[index - 1] : null;
                      const prevLocation = prevEvent ? prevEvent.location : (tripDetails.accommodation?.address || '');

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

                {/* Daily Cost Summary */}
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

                {/* Add Button */}
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

          {/* Checklist Tab */}
          {activeTab === 'checklist' && (
            <div className="px-6 mt-6 space-y-4 pb-10">
              {/* 出國前待辦 */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">📋 出國前待辦</h3>
                <div className="space-y-2 mb-4">
                  {checklists.preTrip.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg group">
                      <button
                        onClick={() => {
                          setChecklists(prev => ({
                            ...prev,
                            preTrip: prev.preTrip.map(i => i.id === item.id ? { ...i, done: !i.done } : i)
                          }));
                        }}
                        className="flex-shrink-0 text-gray-400 hover:text-blue-600"
                      >
                        {item.done ? <CheckSquare size={18} className="text-blue-500" /> : <Square size={18} />}
                      </button>
                      <span className={`flex-1 text-sm ${item.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {item.text}
                      </span>
                      <button
                        onClick={() => {
                          setChecklists(prev => ({
                            ...prev,
                            preTrip: prev.preTrip.filter(i => i.id !== item.id)
                          }));
                        }}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 flex-shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="+ 新增待辦 (Enter)"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm focus:outline-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        setChecklists(prev => ({
                          ...prev,
                          preTrip: [...prev.preTrip, { id: Date.now(), text: e.target.value, done: false }]
                        }));
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              </div>

              {/* 打包清單 */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">🎒 打包清單</h3>
                <div className="space-y-2 mb-4">
                  {checklists.packing.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg group">
                      <button
                        onClick={() => {
                          setChecklists(prev => ({
                            ...prev,
                            packing: prev.packing.map(i => i.id === item.id ? { ...i, done: !i.done } : i)
                          }));
                        }}
                        className="flex-shrink-0 text-gray-400 hover:text-blue-600"
                      >
                        {item.done ? <CheckSquare size={18} className="text-blue-500" /> : <Square size={18} />}
                      </button>
                      <span className={`flex-1 text-sm ${item.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {item.text}
                      </span>
                      <button
                        onClick={() => {
                          setChecklists(prev => ({
                            ...prev,
                            packing: prev.packing.filter(i => i.id !== item.id)
                          }));
                        }}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 flex-shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="+ 新增物品 (Enter)"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm focus:outline-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        setChecklists(prev => ({
                          ...prev,
                          packing: [...prev.packing, { id: Date.now(), text: e.target.value, done: false }]
                        }));
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Flight & Info Tab (Simplified for brevity as requested focus was on Itinerary features) */}
          {activeTab === 'flights' && (
            <div className="px-6 mt-6 space-y-4 pb-10">
              <h2 className="text-xl font-bold text-gray-800">住宿資訊</h2>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                 <h3 className="font-bold">{tripDetails.accommodation?.name || '未設定'}</h3>
                 <p className="text-sm text-gray-500">{tripDetails.accommodation?.address || '未設定地址'}</p>
                 {tripDetails.accommodation?.address && (
                   <div className="mt-2 flex space-x-2">
                     <button onClick={() => openGoogleMaps(null, tripDetails.accommodation.address)} className="text-xs bg-blue-100 text-blue-600 px-3 py-1 rounded-full flex items-center"><MapPin size={10} className="mr-1"/> 查看地圖</button>
                   </div>
                 )}
              </div>

              <h2 className="text-xl font-bold text-gray-800">航班資訊</h2>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                 {tripDetails.flights?.outbound?.code ? (
                   <div className="mb-3">
                     <div className="flex justify-between items-center mb-2">
                       <span className="font-bold text-blue-600">去程</span>
                       <span className="font-mono text-gray-800">{tripDetails.flights.outbound.code}</span>
                     </div>
                     <p className="text-sm text-gray-600">{tripDetails.flights.outbound.date} - {tripDetails.flights.outbound.time}</p>
                   </div>
                 ) : (
                   <p className="text-sm text-gray-400 mb-3">未設定去程</p>
                 )}
                 
                 <div className="border-t border-gray-100 my-3"></div>

                 {tripDetails.flights?.inbound?.code ? (
                   <div>
                     <div className="flex justify-between items-center mb-2">
                       <span className="font-bold text-indigo-600">回程</span>
                       <span className="font-mono text-gray-800">{tripDetails.flights.inbound.code}</span>
                     </div>
                     <p className="text-sm text-gray-600">{tripDetails.flights.inbound.date} - {tripDetails.flights.inbound.time}</p>
                   </div>
                 ) : (
                   <p className="text-sm text-gray-400">未設定回程</p>
                 )}
              </div>
            </div>
          )}
        </div>

      {/* Edit/Add Modal */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        title={editingEvent ? "編輯行程" : "新增行程"}
      >
        <EditEventForm 
          event={editingEvent} 
          onSave={handleSaveEvent}
          onCancel={() => setIsEditModalOpen(false)}
        />
      </Modal>
      </div>
    </div>
  );
};

export default App;
