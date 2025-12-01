// 🔥 Firebase Firestore
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import React, { useState, useEffect } from 'react';
import { 
  Plane, MapPin, Calendar, Clock, Train, Camera, ShoppingBag, 
  Coffee, Info, ChevronRight, AlertCircle, Home, Map, 
  Plus, MoreVertical, Trash2, Edit2, X, CheckSquare, Square,
  Navigation, ExternalLink, Save, ArrowLeft
} from 'lucide-react';
import TripListPage from './TripListPage';

// --- Initial Data ---

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

const initialItinerary = [
  {
    day: 1,
    date: "2/23 (一)",
    title: "Day 1",
    events: []
  },
  {
    day: 2,
    date: "2/24 (二)",
    title: "Day 2",
    events: []
  },
  {
    day: 3,
    date: "2/25 (三)",
    title: "Day 3",
    events: []
  },
  {
    day: 4,
    date: "2/26 (四)",
    title: "Day 4",
    events: []
  },
  {
    day: 5,
    date: "2/27 (五)",
    title: "Day 5",
    events: []
  },
  {
    day: 6,
    date: "2/28 (六)",
    title: "Day 6",
    events: []
  }
];

// --- Helper Functions ---

const openGoogleMaps = (origin, destination) => {
  if (!destination) return;
  const baseUrl = "https://www.google.com/maps/dir/?api=1";
  const originParam = origin ? `&origin=${encodeURIComponent(origin)}` : "";
  const destParam = `&destination=${encodeURIComponent(destination)}`;
  const travelMode = "&travelmode=transit"; // Default to public transport
  window.open(`${baseUrl}${originParam}${destParam}${travelMode}`, '_blank');
};

// --- Components ---

const Header = ({ details }) => (
  <div className="bg-gradient-to-r from-blue-600 to-indigo-700 pt-12 pb-6 px-6 text-white rounded-b-3xl shadow-lg relative overflow-hidden">
    <div className="absolute top-0 right-0 opacity-10 transform translate-x-10 -translate-y-10">
      <Plane size={150} />
    </div>
    <p className="text-blue-100 text-sm font-medium tracking-wider mb-1">{details.dates}</p>
    <h1 className="text-3xl font-bold mb-2">{details.title}</h1>
    <div className="flex items-center space-x-2 text-blue-100 text-sm">
      <Home size={16} />
      <span>{details.accommodation.name}</span>
    </div>
  </div>
);

const Modal = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in-up">
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

const EditEventForm = ({ event, onSave, onCancel }) => {
  const [formData, setFormData] = useState(event || {
    time: "", title: "", type: "sightseeing", location: "", desc: "", urgent: false,
    transport: { mode: "train", duration: "", route: "" },
    cost: "" // 花費欄位
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-1">
          <label className="text-xs text-gray-500 font-bold block mb-1">時間</label>
          <input type="time" name="time" value={formData.time} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm focus:outline-blue-500" />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-gray-500 font-bold block mb-1">類型</label>
          <select name="type" value={formData.type} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm focus:outline-blue-500">
            <option value="sightseeing">景點</option>
            <option value="food">美食</option>
            <option value="shopping">購物</option>
            <option value="transport">交通</option>
            <option value="hotel">住宿</option>
            <option value="flight">航班</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 font-bold block mb-1">標題</label>
        <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="輸入行程名稱" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm focus:outline-blue-500" />
      </div>

      <div>
        <label className="text-xs text-gray-500 font-bold block mb-1">地點 (用於導航)</label>
        <div className="relative">
          <MapPin size={16} className="absolute left-3 top-3 text-gray-400" />
          <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="輸入Google Maps地點名稱" className="w-full pl-9 bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm focus:outline-blue-500" />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 font-bold block mb-1">描述 / 備註</label>
        <textarea name="desc" value={formData.desc} onChange={handleChange} placeholder="輸入詳細資訊" rows="2" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm focus:outline-blue-500"></textarea>
      </div>

      <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
        <h4 className="text-xs font-bold text-blue-700 mb-2 flex items-center"><Navigation size={12} className="mr-1"/> 交通資訊 (選填)</h4>
        <div className="grid grid-cols-2 gap-2 mb-2">
           <input type="text" name="transport.duration" value={formData.transport?.duration || ""} onChange={handleChange} placeholder="預估時間 (如: 30分)" className="bg-white border border-blue-200 rounded p-1.5 text-xs" />
           <select name="transport.mode" value={formData.transport?.mode || "train"} onChange={handleChange} className="bg-white border border-blue-200 rounded p-1.5 text-xs">
             <option value="train">電車/地鐵</option>
             <option value="walk">步行</option>
             <option value="taxi">計程車/Uber</option>
             <option value="bus">巴士</option>
           </select>
        </div>
        <input type="text" name="transport.route" value={formData.transport?.route || ""} onChange={handleChange} placeholder="路線備註 (如: 山手線往池袋)" className="w-full bg-white border border-blue-200 rounded p-1.5 text-xs" />
      </div>

      <div>
        <label className="text-xs text-gray-500 font-bold block mb-1">💰 預估花費 (選填)</label>
        <div className="relative">
          <input 
            type="number" 
            name="cost" 
            value={formData.cost || ""} 
            onChange={handleChange} 
            placeholder="輸入金額 (如: 1500)" 
            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm focus:outline-blue-500" 
          />
          <span className="absolute right-3 top-2.5 text-gray-500 text-sm">元</span>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <input type="checkbox" id="urgent" name="urgent" checked={formData.urgent} onChange={handleChange} className="rounded text-blue-600 focus:ring-blue-500" />
        <label htmlFor="urgent" className="text-sm text-gray-700 font-medium">標記為重要 (需預約/必去)</label>
      </div>

      <button onClick={() => onSave(formData)} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-md mt-2 flex items-center justify-center">
        <Save size={18} className="mr-2" />
        儲存行程
      </button>
    </div>
  );
};

const EventCard = ({ event, prevLocation, onEdit, onDelete, onUpdateMemos }) => {
  const [showMemos, setShowMemos] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const Icon = {
    flight: Plane, transport: Train, sightseeing: Camera,
    food: Coffee, shopping: ShoppingBag, hotel: Home
  }[event.type] || MapPin;

  const styleClass = {
    flight: 'bg-indigo-100 text-indigo-600', transport: 'bg-gray-100 text-gray-600',
    sightseeing: 'bg-pink-100 text-pink-600', food: 'bg-orange-100 text-orange-600',
    shopping: 'bg-emerald-100 text-emerald-600', hotel: 'bg-blue-100 text-blue-600'
  }[event.type] || 'bg-gray-100 text-gray-600';

  const handleToggleMemo = (id) => {
    const newMemos = event.memos.map(m => m.id === id ? { ...m, done: !m.done } : m);
    onUpdateMemos(event.id, newMemos);
  };

  const handleAddMemo = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      const newMemo = { id: Date.now(), text: e.target.value, done: false };
      onUpdateMemos(event.id, [...(event.memos || []), newMemo]);
      e.target.value = '';
    }
  };

  const deleteMemo = (id) => {
    const newMemos = event.memos.filter(m => m.id !== id);
    onUpdateMemos(event.id, newMemos);
  };

  return (
    <div className="relative pl-6 pb-8 last:pb-0 border-l-2 border-gray-200 ml-3 group">
      <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 bg-white ${event.urgent ? 'border-red-500 bg-red-50' : 'border-blue-400'}`}></div>
      
      {/* Route Info Line (Connecting to previous event) */}
      {prevLocation && (
        <div className="absolute -left-3 -top-8 w-px h-8"></div> 
      )}

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all relative">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-2 gap-2">
          <div className="flex items-center space-x-2 min-w-0">
            <div className={`p-2 rounded-lg flex-shrink-0 ${styleClass}`}>
              <Icon size={18} />
            </div>
            <span className="font-mono text-sm font-bold bg-gray-50 px-2 py-1 rounded text-gray-600 whitespace-nowrap">{event.time}</span>
          </div>
          
          <div className="flex items-center space-x-1 flex-shrink-0">
            {event.urgent && <AlertCircle size={16} className="text-red-500" />}
            <button onClick={() => setShowMenu(!showMenu)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
              <MoreVertical size={16} />
            </button>
            {showMenu && (
              <div className="absolute right-2 top-10 bg-white shadow-xl border border-gray-100 rounded-lg z-10 w-24 py-1 flex flex-col">
                <button onClick={() => {onEdit(event); setShowMenu(false)}} className="px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center"><Edit2 size={12} className="mr-2"/> 編輯</button>
                <button onClick={() => {onDelete(event.id); setShowMenu(false)}} className="px-3 py-2 text-left text-sm hover:bg-gray-50 text-red-500 flex items-center"><Trash2 size={12} className="mr-2"/> 刪除</button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <h3 className="text-lg font-bold text-gray-800 leading-tight break-words word-wrap">{event.title}</h3>
        <p className="text-sm text-gray-500 mt-1 break-words word-wrap">{event.desc}</p>

        {/* Transport Info & Google Map Button */}
        <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
               <Navigation size={12} className="mr-1 text-blue-500" />
               {event.transport?.duration ? 
                 <span>{event.transport.duration} {event.transport.route && `• ${event.transport.route}`}</span> 
                 : <span className="text-gray-400">未設定交通</span>
               }
            </div>
            <button 
              onClick={() => openGoogleMaps(prevLocation, event.location)}
              className="flex items-center text-xs font-medium text-blue-600 hover:bg-blue-50 px-2 py-1 rounded border border-blue-100 transition-colors"
            >
              <Map size={12} className="mr-1" />
              規劃路線
            </button>
        </div>

        {/* Memos Section */}
        <div className="mt-3">
          <button 
            onClick={() => setShowMemos(!showMemos)} 
            className="flex items-center text-xs text-gray-500 font-medium hover:text-blue-600 transition-colors"
          >
            <CheckSquare size={12} className="mr-1" />
            備忘錄 ({event.memos?.length || 0}) 
            <ChevronRight size={12} className={`transform transition-transform ${showMemos ? 'rotate-90' : ''}`} />
          </button>
          
          {showMemos && (
            <div className="mt-2 bg-yellow-50 rounded-lg p-2 border border-yellow-100">
              <ul className="space-y-1 mb-2">
                {event.memos?.map(memo => (
                  <li key={memo.id} className="flex items-start group/item gap-2">
                    <button onClick={() => handleToggleMemo(memo.id)} className="mt-0.5 text-gray-400 hover:text-blue-600 flex-shrink-0">
                      {memo.done ? <CheckSquare size={14} className="text-blue-500" /> : <Square size={14} />}
                    </button>
                    <span className={`text-xs flex-1 break-words word-wrap overflow-wrap-break-word ${memo.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{memo.text}</span>
                    <button onClick={() => deleteMemo(memo.id)} className="opacity-0 group-hover/item:opacity-100 text-gray-400 hover:text-red-500 flex-shrink-0">
                      <X size={12} />
                    </button>
                  </li>
                ))}
              </ul>
              <input 
                type="text" 
                placeholder="+ 新增待辦 (Enter)" 
                className="w-full bg-white border border-yellow-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-yellow-400"
                onKeyDown={handleAddMemo}
              />
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

// --- Main App ---

const App = () => {
  const [currentView, setCurrentView] = useState('tripList'); // 'tripList' or 'tripDetail'
  const [currentTripId, setCurrentTripId] = useState(null);
  const [currentTripData, setCurrentTripData] = useState(null);
  const [activeTab, setActiveTab] = useState('itinerary');
  const [selectedDay, setSelectedDay] = useState(1);
  const [itinerary, setItinerary] = useState([]);
  const [tripDetails, setTripDetails] = useState({});
  const [checklists, setChecklists] = useState({
    preTrip: [],
    packing: []
  });
  
  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const currentDayData = itinerary.find(d => d.day === selectedDay);
  const autoSaveTimeoutRef = React.useRef(null);

  // 載入特定旅程資料
  useEffect(() => {
    const loadTripData = async () => {
      if (!currentTripId || !db) {
        console.log('⚠️ currentTripId 或 db 未準備好:', { currentTripId, db });
        return;
      }

      try {
        console.log('📝 開始載入旅程:', currentTripId);
        const ref = doc(db, 'trips', currentTripId);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          console.log('✅ 旅程資料已載入:', data);
          setCurrentTripData(data);
          setItinerary(data.itinerary || []);
          setTripDetails(data.tripDetails || {});
          setChecklists(data.checklists || { preTrip: [], packing: [] });
          setSelectedDay(1);
          setActiveTab('summary'); // 改為載入時先看 Summary tab
          console.log('✅ 已載入旅程:', currentTripId);
        } else {
          console.error('❌ 旅程不存在:', currentTripId);
          alert('旅程不存在或已被刪除');
        }
      } catch (err) {
        console.error('❌ 載入旅程失敗:', err);
        alert('載入旅程失敗: ' + err.message);
      }
    };

    loadTripData();
  }, [currentTripId]);

  // 自動儲存行程到 Firebase（防抖 1 秒）
  useEffect(() => {
    if (!currentTripId || !db) return;

    // 清除前一個計時器
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // 設定新的計時器
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        const ref = doc(db, 'trips', currentTripId);
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
  }, [itinerary, tripDetails, checklists, currentTripId]); // 只在變更時執行

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

  // 返回旅程列表
  const handleBackToList = () => {
    setCurrentView('tripList');
    setCurrentTripId(null);
    setItinerary([]);
    setTripDetails({});
  };

  // 如果在列表視圖，顯示 TripListPage
  if (currentView === 'tripList') {
    return (
      <TripListPage
        onSelectTrip={(tripId) => {
          setCurrentTripId(tripId);
          setCurrentView('tripDetail');
        }}
        onRefresh={() => {}}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header with back button */}
      <div className="relative">
        <Header details={tripDetails} />
        <button
          onClick={handleBackToList}
          className="absolute top-4 left-6 bg-white text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1 text-sm font-medium"
        >
          <ArrowLeft size={18} />
          返回
        </button>
      </div>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">

        {/* Navigation Tabs */}
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
                      const ref = doc(db, 'trips', currentTripId);
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
