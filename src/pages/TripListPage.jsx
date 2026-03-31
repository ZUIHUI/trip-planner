import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Plus, Search, Trash2, MapPinned, ChevronDown } from 'lucide-react';
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

const getLastOpenedTripId = () => localStorage.getItem(LAST_OPENED_TRIP_KEY) || '';

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
  const [lastOpenedTripId, setLastOpenedTripIdState] = useState(() => getLastOpenedTripId());
  const [failedCoverImages, setFailedCoverImages] = useState({});
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

  const lastOpenedTrip = useMemo(
    () => trips.find((trip) => trip.id === lastOpenedTripId),
    [trips, lastOpenedTripId]
  );

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
      setLastOpenedTripIdState(tripId);
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
    if (tripId === lastOpenedTripId) {
      localStorage.removeItem(LAST_OPENED_TRIP_KEY);
      setLastOpenedTripIdState('');
    }

    try {
      await deleteTrip(tripId);
    } catch (error) {
      setTrips(prevTrips);
      saveLocalTrips(prevTrips);
      if (localTripRaw) {
        localStorage.setItem(getStorageKey(tripId), localTripRaw);
      }
      if (tripId === lastOpenedTripId) {
        setLastOpenedTripId(tripId);
        setLastOpenedTripIdState(tripId);
      }
      alert('刪除失敗，已回復原始資料');
      console.error(error);
    }
  };

  const openTripDetail = (tripId) => {
    setLastOpenedTripId(tripId);
    setLastOpenedTripIdState(tripId);
    navigate(`/trip/${tripId}`);
  };

  const toggleExpandedCard = (tripId) => {
    setExpandedCards((prev) => ({
      ...prev,
      [tripId]: !prev[tripId]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900">Trip Planner</h1>

        {lastOpenedTrip && (
          <div className="mt-4">
            <button
              onClick={() => openTripDetail(lastOpenedTrip.id)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
            >
              返回目前旅程：{lastOpenedTrip.title}
            </button>
          </div>
        )}

        <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            type="text"
            value={newTripTitle}
            onChange={(event) => setNewTripTitle(event.target.value)}
            placeholder="輸入新的旅程名稱"
            className="w-full rounded-xl border border-gray-300 px-4 py-3"
          />
          <button
            onClick={handleCreateTrip}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-white"
          >
            <Plus size={18} />
            建立新旅程
          </button>
        </div>

        <div className="mt-4 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜尋旅程關鍵字"
            className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-4"
          />
        </div>

        <div className="mt-6 space-y-3">
          {isLoading ? (
            <p className="text-sm text-gray-500">讀取旅程中...</p>
          ) : sortedAndFilteredTrips.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
              尚無符合條件的旅程
            </div>
          ) : (
            sortedAndFilteredTrips.map((trip) => (
              <article key={trip.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="space-y-3">
                  <div>
                    {normalizeCoverImageUrl(trip.coverImage) && !failedCoverImages[trip.id] ? (
                      <img
                        src={normalizeCoverImageUrl(trip.coverImage)}
                        alt={`${trip.title} cover`}
                        className="h-28 w-full rounded-lg object-cover mb-3"
                        onError={() =>
                          setFailedCoverImages((prev) => ({
                            ...prev,
                            [trip.id]: true
                          }))
                        }
                      />
                    ) : (
                      <div className="mb-3 h-20 w-full rounded-lg bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center text-blue-500">
                        <MapPinned size={24} />
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-lg font-semibold text-gray-900">{trip.title}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {statusLabel[trip.status] || '規劃中'} · 最近更新 {new Date(trip.updatedAt).toLocaleString()}
                    </p>
                  </div>

                  <button
                    onClick={() => openTripDetail(trip.id)}
                    className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                  >
                    查看旅程
                  </button>

                  <button
                    onClick={() => toggleExpandedCard(trip.id)}
                    className="inline-flex items-center text-xs text-gray-500 hover:text-gray-700"
                  >
                    {expandedCards[trip.id] ? '收合次要資訊' : '展開次要資訊'}
                    <ChevronDown size={14} className={`ml-1 transition-transform ${expandedCards[trip.id] ? 'rotate-180' : ''}`} />
                  </button>

                  {expandedCards[trip.id] && (
                    <div className="pt-3 border-t border-gray-100 space-y-3">
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
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TripListPage;
