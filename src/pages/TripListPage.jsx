import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Plus, Search, Trash2, ChevronDown, Sparkles, Compass } from 'lucide-react';
import { createTrip, deleteTrip, listTrips } from '../services/tripService';
import { normalizeCoverImageUrl } from '../utils/coverImage';

const TRIP_INDEX_KEY = 'trip_planner_trip_index';
const LAST_OPENED_TRIP_KEY = 'trip_planner_last_opened_trip_id';

const createEmptyItinerary = (days = 6) => {
  return Array.from({ length: days }, (_, i) => ({
    day: i + 1,
    date: `Day ${i + 1}`,
    title: `Day ${i + 1}`,
    events: []
  }));
};

const createTripTemplate = (title) => ({
  tripDetails: {
    title,
    dates: '',
    status: 'planning',
    coverImage: '',
    accommodation: {},
    flights: {}
  },
  itinerary: createEmptyItinerary(),
  checklists: { preTrip: [], packing: [] },
  expenses: []
});

const getStorageKey = (tripId) => `trip_planner_data_${tripId}`;

const loadLocalTrips = () => {
  try {
    const raw = localStorage.getItem(TRIP_INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveLocalTrips = (trips) => {
  localStorage.setItem(TRIP_INDEX_KEY, JSON.stringify(trips));
};

const setLastOpenedTripId = (tripId) => {
  if (!tripId) return;
  localStorage.setItem(LAST_OPENED_TRIP_KEY, tripId);
};

const statusLabel = {
  planning: '規劃中',
  ongoing: '進行中',
  done: '已完成'
};

const TripListPage = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [newTripTitle, setNewTripTitle] = useState('');
  const [keyword, setKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [failedCoverImages, setFailedCoverImages] = useState({});
  const [showAllTrips, setShowAllTrips] = useState(false);
  const [expandedCards, setExpandedCards] = useState({});

  useEffect(() => {
    const init = async () => {
      const localTrips = loadLocalTrips();
      setTrips(localTrips);
      setIsLoading(false);

      try {
        const remoteTrips = await listTrips();
        if (remoteTrips.length > 0) {
          const mergedMap = new Map();

          localTrips.forEach((trip) => {
            mergedMap.set(trip.id, trip);
          });

          remoteTrips.forEach((trip) => {
            const updatedAt = trip.updatedAt || trip.createdAt || new Date().toISOString();
            const localTrip = mergedMap.get(trip.id);
            mergedMap.set(trip.id, {
              id: trip.id,
              title: trip.tripDetails?.title || localTrip?.title || '未命名旅程',
              status: trip.tripDetails?.status || localTrip?.status || 'planning',
              coverImage: trip.tripDetails?.coverImage || localTrip?.coverImage || '',
              updatedAt,
              createdAt: trip.createdAt || localTrip?.createdAt || updatedAt
            });
          });

          const mergedTrips = Array.from(mergedMap.values());
          setTrips(mergedTrips);
          saveLocalTrips(mergedTrips);
        }
      } catch (error) {
        console.warn('⚠️ 讀取雲端旅程列表失敗，改用本地資料', error);
      }
    };

    init();
  }, []);

  const sortedAndFilteredTrips = useMemo(() => {
    return trips
      .filter((trip) => {
        const searchTarget = `${trip.title} ${statusLabel[trip.status] || ''}`.toLowerCase();
        return searchTarget.includes(keyword.toLowerCase());
      })
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  }, [trips, keyword]);

  const visibleTrips = showAllTrips ? sortedAndFilteredTrips : sortedAndFilteredTrips.slice(0, 3);
  const hiddenTripCount = Math.max(sortedAndFilteredTrips.length - visibleTrips.length, 0);

  const handleCreateTrip = async () => {
    const title = newTripTitle.trim();
    if (!title) {
      alert('請先輸入旅程名稱');
      return;
    }

    const tripId = `trip-${Date.now()}`;
    const now = new Date().toISOString();
    const template = createTripTemplate(title);

    const nextTripMeta = {
      id: tripId,
      title,
      status: 'planning',
      coverImage: '',
      createdAt: now,
      updatedAt: now
    };

    const optimisticTrips = [nextTripMeta, ...trips];
    setTrips(optimisticTrips);
    saveLocalTrips(optimisticTrips);

    localStorage.setItem(
      getStorageKey(tripId),
      JSON.stringify({
        ...template,
        savedAt: now
      })
    );

    try {
      await createTrip(tripId, {
        ...template,
        createdAt: now,
        updatedAt: now
      });
      setNewTripTitle('');
      setLastOpenedTripId(tripId);
      navigate(`/trip/${tripId}`);
    } catch (error) {
      setTrips((prev) => prev.filter((trip) => trip.id !== tripId));
      saveLocalTrips(optimisticTrips.filter((trip) => trip.id !== tripId));
      localStorage.removeItem(getStorageKey(tripId));
      alert('建立旅程失敗，已回滾本地資料');
      console.error(error);
    }
  };

  const handleDeleteTrip = async (tripId) => {
    const target = trips.find((trip) => trip.id === tripId);
    if (!target) return;

    if (!window.confirm(`確認刪除「${target.title}」？此動作無法復原。`)) {
      return;
    }

    const prevTrips = [...trips];
    const nextTrips = trips.filter((trip) => trip.id !== tripId);
    setTrips(nextTrips);
    saveLocalTrips(nextTrips);

    const localTripRaw = localStorage.getItem(getStorageKey(tripId));
    localStorage.removeItem(getStorageKey(tripId));

    try {
      await deleteTrip(tripId);
    } catch (error) {
      setTrips(prevTrips);
      saveLocalTrips(prevTrips);
      if (localTripRaw) {
        localStorage.setItem(getStorageKey(tripId), localTripRaw);
      }
      alert('刪除失敗，已回復原始資料');
      console.error(error);
    }
  };

  const openTripDetail = (tripId) => {
    setLastOpenedTripId(tripId);
    navigate(`/trip/${tripId}`);
  };

  const toggleExpandedCard = (tripId) => {
    setExpandedCards((prev) => ({
      ...prev,
      [tripId]: !prev[tripId]
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-blue-50 to-white">
      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        <section className="rounded-3xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 text-white p-6 sm:p-8 shadow-lg">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold tracking-wide">
                <Sparkles size={14} />
                TRIP DASHBOARD
              </div>
              <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold">打造你的下一趟完美旅程</h1>
              <p className="mt-2 text-sm sm:text-base text-blue-100">從建立行程、查看狀態到快速返回最近旅程，一頁完成。</p>
            </div>
            <div className="rounded-2xl bg-white/10 border border-white/30 p-4 min-w-[220px]">
              <p className="text-xs text-blue-100">目前旅程總數</p>
              <p className="text-3xl font-black mt-1">{sortedAndFilteredTrips.length}</p>
              <p className="text-xs text-blue-100 mt-1">可使用下方搜尋快速篩選</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              type="text"
              value={newTripTitle}
              onChange={(event) => setNewTripTitle(event.target.value)}
              placeholder="輸入新的旅程名稱（例如：2026 東京賞櫻）"
              className="w-full rounded-xl border border-white/30 bg-white/95 text-gray-900 placeholder:text-gray-500 tp-form-control"
            />
            <button
              onClick={handleCreateTrip}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900/90 px-5 py-3 tp-body-text font-semibold text-white hover:bg-gray-900"
            >
              <Plus size={18} />
              開始規劃
            </button>
          </div>
        </section>

        <div className="mt-4 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜尋旅程關鍵字"
            className="w-full rounded-xl border border-blue-100 bg-white py-3 pl-9 pr-4 shadow-sm"
          />
        </div>

        <div className="mt-6 space-y-3">
          {isLoading ? (
            <p className="tp-caption-text text-gray-500">讀取旅程中...</p>
          ) : sortedAndFilteredTrips.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center tp-body-text text-gray-500">
              尚無符合條件的旅程
            </div>
          ) : (
            visibleTrips.map((trip) => (
              <article key={trip.id} className="rounded-2xl bg-white p-4 shadow-sm border border-blue-100 hover:shadow-md transition-shadow">
                <button onClick={() => openTripDetail(trip.id)} className="w-full text-left">
                  {normalizeCoverImageUrl(trip.coverImage) && !failedCoverImages[trip.id] ? (
                    <img
                      src={normalizeCoverImageUrl(trip.coverImage)}
                      alt={`${trip.title} cover`}
                      className="h-28 w-full rounded-xl object-cover mb-3"
                      onError={() =>
                        setFailedCoverImages((prev) => ({
                          ...prev,
                          [trip.id]: true
                        }))
                      }
                    />
                  ) : (
                    <div className="mb-3 h-24 w-full rounded-xl bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center text-blue-500">
                      <Compass size={26} />
                    </div>
                  )}

                  <p className="text-lg font-semibold text-gray-900">{trip.title}</p>
                  <div className="mt-1 flex flex-col items-start gap-1 text-sm text-gray-500 sm:flex-row sm:items-center sm:gap-3">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays size={14} />
                      更新於 {new Date(trip.updatedAt).toLocaleString()}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                      {statusLabel[trip.status] || '規劃中'}
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => toggleExpandedCard(trip.id)}
                  className="mt-3 inline-flex items-center text-xs text-gray-500 hover:text-gray-700"
                >
                  {expandedCards[trip.id] ? '收合詳細資訊' : '展開詳細資訊'}
                  <ChevronDown size={14} className={`ml-1 transition-transform ${expandedCards[trip.id] ? 'rotate-180' : ''}`} />
                </button>

                {expandedCards[trip.id] && (
                  <div className="pt-3 border-t border-gray-100 space-y-3 mt-3">
                    <div className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <CalendarDays size={14} />
                      建立於 {new Date(trip.createdAt || trip.updatedAt).toLocaleString()}
                    </div>
                    <div>
                      <button
                        onClick={() => handleDeleteTrip(trip.id)}
                        className="rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-50"
                        title="刪除旅程"
                      >
                        <span className="inline-flex items-center gap-1">
                          <Trash2 size={14} />
                          刪除旅程
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))
          )}

          {hiddenTripCount > 0 && (
            <button
              onClick={() => setShowAllTrips(true)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              查看更多旅程（+{hiddenTripCount}）
            </button>
          )}
          {showAllTrips && sortedAndFilteredTrips.length > 3 && (
            <button
              onClick={() => setShowAllTrips(false)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              收合旅程列表
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripListPage;
