import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Copy, Trash2, ChevronRight } from 'lucide-react';
import { listTrips, deleteTrip, createTrip } from '../services/tripService';
import Modal from '../components/Modal';

const TripListPage = () => {
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

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      setIsLoading(true);
      const tripsList = await listTrips();
      setTrips(tripsList);
    } catch (err) {
      console.error('❌ 載入旅程失敗:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTrip = async () => {
    if (!newTripForm.title || !newTripForm.startDate || !newTripForm.endDate) {
      alert('⚠️ 請填寫標題和日期');
      return;
    }

    try {
      const tripId = `trip-${Date.now()}`;
      const initialItinerary = Array.from({ length: 6 }, (_, i) => ({
        day: i + 1,
        date: `Day ${i + 1}`,
        title: `Day ${i + 1}`,
        events: []
      }));

      const tripData = {
        title: newTripForm.title,
        startDate: newTripForm.startDate,
        endDate: newTripForm.endDate,
        city: newTripForm.city,
        emoji: newTripForm.emoji,
        tripDetails: {
          title: newTripForm.title,
          dates: `${newTripForm.startDate} - ${newTripForm.endDate}`,
          accommodation: { name: '', address: '', checkIn: '', checkOut: '' },
          flights: { outbound: {}, inbound: {} }
        },
        itinerary: initialItinerary,
        checklists: { preTrip: [], packing: [] },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await createTrip(tripId, tripData);
      alert('✅ 旅程已建立');
      setNewTripForm({ title: '', startDate: '', endDate: '', city: '', emoji: '✈️' });
      setIsCreateModalOpen(false);
      await loadTrips();
    } catch (err) {
      console.error('❌ 建立旅程失敗:', err);
      alert('建立旅程失敗');
    }
  };

  const handleDuplicateTrip = async (trip) => {
    try {
      const newTripId = `trip-${Date.now()}`;
      const newTripData = {
        ...trip,
        title: `${trip.title} (複製)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      delete newTripData.id;

      await createTrip(newTripId, newTripData);
      alert('✅ 旅程已複製');
      await loadTrips();
    } catch (err) {
      console.error('❌ 複製旅程失敗:', err);
    }
  };

  const handleDeleteTrip = async (tripId) => {
    if (!window.confirm('確認刪除此旅程?')) return;

    try {
      await deleteTrip(tripId);
      alert('✅ 旅程已刪除');
      await loadTrips();
    } catch (err) {
      console.error('❌ 刪除旅程失敗:', err);
    }
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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 pt-12 pb-8 px-6 text-white rounded-b-3xl shadow-lg">
        <h1 className="text-4xl font-bold mb-2">我的旅程</h1>
        <p className="text-blue-100">管理和規劃您的每一趟旅行</p>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-center">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-md"
          >
            <Plus size={20} /> 新增旅程
          </button>
        </div>

        {trips.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
            {trips.map(trip => (
              <div key={trip.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-100 overflow-hidden group">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 text-white">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-4xl">{trip.emoji}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDuplicateTrip(trip)}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded transition-colors"
                        title="複製旅程"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteTrip(trip.id)}
                        className="p-2 bg-white/20 hover:bg-red-500 rounded transition-colors"
                        title="刪除旅程"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold">{trip.title}</h3>
                </div>

                <div className="p-4 space-y-2">
                  <p className="text-sm text-gray-600">
                    📅 {trip.startDate} 至 {trip.endDate}
                  </p>
                  {trip.city && (
                    <p className="text-sm text-gray-600">
                      📍 {trip.city}
                    </p>
                  )}
                  <p className="text-xs text-gray-400">
                    已建立: {new Date(trip.createdAt).toLocaleDateString('zh-TW')}
                  </p>
                </div>

                <Link
                  to={`/trip/${trip.id}`}
                  className="block w-full p-3 bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium flex items-center justify-center gap-2 transition-colors border-t border-gray-100"
                >
                  打開 <ChevronRight size={16} />
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-4">還沒有旅程，點擊「新增旅程」開始規劃吧！</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              新增旅程
            </button>
          </div>
        )}
      </div>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="新增旅程"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 font-bold block mb-1">旅程名稱</label>
            <input
              type="text"
              value={newTripForm.title}
              onChange={(e) => setNewTripForm({ ...newTripForm, title: e.target.value })}
              placeholder="例：日本東京六日遊"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 font-bold block mb-1">開始日期</label>
              <input
                type="date"
                value={newTripForm.startDate}
                onChange={(e) => setNewTripForm({ ...newTripForm, startDate: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-bold block mb-1">結束日期</label>
              <input
                type="date"
                value={newTripForm.endDate}
                onChange={(e) => setNewTripForm({ ...newTripForm, endDate: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm"
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
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 font-bold block mb-1">emoji</label>
            <div className="flex gap-2">
              {['✈️', '🏖️', '🏔️', '🏙️', '🗼', '🎡'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setNewTripForm({ ...newTripForm, emoji })}
                  className={`text-3xl p-2 rounded ${newTripForm.emoji === emoji ? 'bg-blue-100 border-2 border-blue-600' : 'border-2 border-gray-200'}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCreateTrip}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700"
          >
            建立旅程
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default TripListPage;
