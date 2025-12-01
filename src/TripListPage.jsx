import React, { useState, useEffect } from 'react';
import { Plus, Copy, Trash2, ChevronRight } from 'lucide-react';
import { db } from './firebase';
import { collection, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore';

const TripListPage = ({ onSelectTrip, onRefresh }) => {
  const [trips, setTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTripForm, setNewTripForm] = useState({
    title: '',
    startDate: '',
    endDate: '',
    city: '',
    emoji: '✈️'
  });

  // 載入所有旅程
  const loadTrips = async () => {
    try {
      setIsLoading(true);
      const tripsRef = collection(db, 'trips');
      const snapshot = await getDocs(tripsRef);
      const tripsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTrips(tripsData);
    } catch (err) {
      console.error('❌ 載入旅程列表失敗:', err);
      alert('載入旅程列表失敗');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, []);

  // 新增旅程
  const handleCreateTrip = async () => {
    if (!newTripForm.title || !newTripForm.startDate || !newTripForm.endDate) {
      alert('⚠️ 請填寫標題和日期');
      return;
    }

    try {
      const tripId = `trip-${Date.now()}`;
      const tripData = {
        title: newTripForm.title,
        startDate: newTripForm.startDate,
        endDate: newTripForm.endDate,
        city: newTripForm.city,
        emoji: newTripForm.emoji,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tripDetails: {
          title: newTripForm.title,
          dates: `${newTripForm.startDate} - ${newTripForm.endDate}`,
          accommodation: { name: '', address: '', checkIn: '', checkOut: '' },
          flights: { outbound: {}, inbound: {} }
        },
        itinerary: Array.from({ length: 6 }, (_, i) => ({
          day: i + 1,
          date: '',
          title: `Day ${i + 1}`,
          events: []
        }))
      };

      await setDoc(doc(db, 'trips', tripId), tripData);
      alert('✅ 旅程已建立');
      setNewTripForm({ title: '', startDate: '', endDate: '', city: '', emoji: '✈️' });
      setIsCreateModalOpen(false);
      loadTrips();
    } catch (err) {
      console.error('❌ 新增旅程失敗:', err);
      alert('新增旅程失敗');
    }
  };

  // 複製旅程
  const handleDuplicateTrip = async (trip) => {
    try {
      const newTripId = `trip-${Date.now()}`;
      const newTrip = {
        ...trip,
        id: undefined,
        title: `${trip.title} (複製)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      delete newTrip.id;

      await setDoc(doc(db, 'trips', newTripId), newTrip);
      alert('✅ 旅程已複製');
      loadTrips();
    } catch (err) {
      console.error('❌ 複製旅程失敗:', err);
      alert('複製旅程失敗');
    }
  };

  // 刪除旅程
  const handleDeleteTrip = async (tripId) => {
    if (!window.confirm('確定要刪除這個旅程嗎？')) return;

    try {
      await deleteDoc(doc(db, 'trips', tripId));
      alert('✅ 旅程已刪除');
      loadTrips();
    } catch (err) {
      console.error('❌ 刪除旅程失敗:', err);
      alert('刪除旅程失敗');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">載入中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 pt-12 pb-6 px-6 text-white rounded-b-3xl shadow-lg">
        <h1 className="text-3xl font-bold">我的旅程</h1>
        <p className="text-blue-100 mt-2">管理和計劃您的每一次旅行</p>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 新增按鈕 */}
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full mb-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          新增旅程
        </button>

        {/* 旅程卡片列表 */}
        {trips.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500 mb-4">還沒有任何旅程</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="text-blue-600 font-bold hover:underline"
            >
              建立第一個旅程
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trips.map(trip => (
              <div
                key={trip.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all overflow-hidden cursor-pointer group"
              >
                {/* 卡片上方 emoji 背景 */}
                <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-6 text-center text-5xl group-hover:scale-105 transition-transform">
                  {trip.emoji || '✈️'}
                </div>

                {/* 卡片內容 */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">{trip.title}</h3>
                  <p className="text-sm text-gray-500 mb-3">
                    📍 {trip.city || '未設定'} • {trip.startDate} 至 {trip.endDate}
                  </p>

                  {/* 按鈕區 */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => onSelectTrip(trip.id)}
                      className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                    >
                      打開
                      <ChevronRight size={14} />
                    </button>
                    <button
                      onClick={() => handleDuplicateTrip(trip)}
                      className="py-2 px-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      title="複製旅程"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteTrip(trip.id)}
                      className="py-2 px-3 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                      title="刪除旅程"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 新增旅程 Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">新增旅程</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs text-gray-500 font-bold block mb-1">旅程標題 *</label>
                <input
                  type="text"
                  value={newTripForm.title}
                  onChange={(e) => setNewTripForm({ ...newTripForm, title: e.target.value })}
                  placeholder="例：東京六日遊"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm focus:outline-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 font-bold block mb-1">開始日期 *</label>
                  <input
                    type="date"
                    value={newTripForm.startDate}
                    onChange={(e) => setNewTripForm({ ...newTripForm, startDate: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm focus:outline-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-bold block mb-1">結束日期 *</label>
                  <input
                    type="date"
                    value={newTripForm.endDate}
                    onChange={(e) => setNewTripForm({ ...newTripForm, endDate: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm focus:outline-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 font-bold block mb-1">城市</label>
                <input
                  type="text"
                  value={newTripForm.city}
                  onChange={(e) => setNewTripForm({ ...newTripForm, city: e.target.value })}
                  placeholder="例：東京"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm focus:outline-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 font-bold block mb-1">代表 Emoji</label>
                <div className="flex gap-2 flex-wrap">
                  {['✈️', '🏖️', '🎒', '🗼', '⛩️', '🏔️', '🚂', '🏨'].map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => setNewTripForm({ ...newTripForm, emoji })}
                      className={`text-2xl p-2 rounded-lg transition-colors ${
                        newTripForm.emoji === emoji
                          ? 'bg-blue-200 scale-110'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreateTrip}
                className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
              >
                建立旅程
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripListPage;
