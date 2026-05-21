import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  ChevronDown,
  Clock3,
  Compass,
  MapPin,
  PlaneTakeoff,
  Plus,
  Search,
  UserRound,
  Trash2
} from 'lucide-react';
import { claimOwnerlessTrips, createTrip, deleteTrip, isPrimaryOwnerAccount, listTrips } from '../services/tripService';
import { createTripAppData } from '../domain/tripSchema';
import { normalizeCoverImageUrl } from '../utils/coverImage';
import { Badge, Button, Card, EmptyState, Input, LoadingState, PageContainer } from '../components/ui';
import { useFeedback } from '../contexts/FeedbackContext';
import { useAuth } from '../contexts/AuthContext';

const LAST_OPENED_TRIP_KEY = 'trip_planner_last_opened_trip_id';

const getTripIndexKey = (uid) => `trip_planner_trip_index_${uid || 'guest'}`;
const getStorageKey = (tripId, uid) => `trip_planner_data_${uid || 'guest'}_${tripId}`;

const loadLocalTrips = (uid) => {
  try {
    const raw = localStorage.getItem(getTripIndexKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveLocalTrips = (uid, trips) => {
  localStorage.setItem(getTripIndexKey(uid), JSON.stringify(trips));
};

const setLastOpenedTripId = (tripId) => {
  if (!tripId) return;
  localStorage.setItem(LAST_OPENED_TRIP_KEY, tripId);
};

const statusConfig = {
  planning: { label: '規劃中', variant: 'warning' },
  ongoing: { label: '旅途中', variant: 'success' },
  done: { label: '已完成', variant: 'muted' }
};

const formatDateTime = (value) => {
  if (!value) return '尚未更新';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '尚未更新';
  return date.toLocaleString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDateRange = (trip) => {
  const start = trip?.dateRange?.start || '';
  const end = trip?.dateRange?.end || '';
  if (start && end) return `${start} - ${end}`;
  if (start) return `${start} 出發`;
  if (end) return `${end} 結束`;
  return '未設定日期';
};

const getStatus = (status) => statusConfig[status] || statusConfig.planning;

const TripStatusBadge = ({ status }) => {
  const config = getStatus(status);
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

const TripCard = ({
  trip,
  expanded,
  coverFailed,
  onCoverError,
  onOpen,
  onToggleExpanded,
  onDelete,
  canDelete = false
}) => {
  const coverImageUrl = normalizeCoverImageUrl(trip.coverImage);
  const showCover = coverImageUrl && !coverFailed;

  return (
    <Card as="article" interactive className="overflow-hidden">
      <button
        type="button"
        onClick={onOpen}
        className="block w-full text-left"
        aria-label={`開啟 ${trip.title || '未命名旅程'}`}
      >
        {showCover ? (
          <img
            src={coverImageUrl}
            alt={`${trip.title || '旅程'} 封面`}
            className="h-36 w-full object-cover sm:h-40"
            onError={onCoverError}
          />
        ) : (
          <div className="flex h-36 w-full items-center justify-center bg-gradient-to-br from-brand-50 via-sky-50 to-white text-brand-700 sm:h-40 dark:from-brand-900/40 dark:via-slate-900 dark:to-slate-950">
            <div className="rounded-lg bg-white/80 p-3 shadow-sm dark:bg-slate-900/80">
              <Compass size={28} />
            </div>
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-slate-900 dark:text-white">
                {trip.title || '未命名旅程'}
              </p>
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <CalendarDays size={15} className="shrink-0 text-brand-600" />
                <span className="truncate">{formatDateRange(trip)}</span>
              </div>
            </div>
            <TripStatusBadge status={trip.status} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/70">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">行程數</p>
              <p className="mt-1 font-bold text-slate-900 dark:text-white">{trip.eventCount || 0} 個</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/70">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">最近更新</p>
              <p className="mt-1 font-bold text-slate-900 dark:text-white">{formatDateTime(trip.updatedAt)}</p>
            </div>
          </div>
        </div>
      </button>

      <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onToggleExpanded}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            aria-expanded={expanded}
          >
            {expanded ? '收合資訊' : '更多資訊'}
            <ChevronDown size={14} className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>
          <Button variant="secondary" size="sm" onClick={onOpen}>
            查看旅程
          </Button>
        </div>

        {expanded && (
          <div className="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
            <div className="grid gap-2 text-sm text-slate-500 sm:grid-cols-2 dark:text-slate-400">
              <span className="inline-flex items-center gap-2">
                <Clock3 size={15} />
                建立於 {formatDateTime(trip.createdAt || trip.updatedAt)}
              </span>
              <span className="inline-flex items-center gap-2">
                <MapPin size={15} />
                {formatDateRange(trip)}
              </span>
            </div>
            <div className={canDelete ? 'flex justify-end' : 'hidden'}>
              <Button variant="danger" size="sm" onClick={onDelete} aria-label={`刪除 ${trip.title || '未命名旅程'}`}>
                <Trash2 size={14} />
                刪除旅程
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

const TripListPage = () => {
  const navigate = useNavigate();
  const { confirm, toast } = useFeedback();
  const { currentUser, userProfile, logout } = useAuth();
  const uid = currentUser?.uid || '';
  const newTripInputRef = useRef(null);
  const [trips, setTrips] = useState([]);
  const [newTripTitle, setNewTripTitle] = useState('');
  const [keyword, setKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [failedCoverImages, setFailedCoverImages] = useState({});
  const [showAllTrips, setShowAllTrips] = useState(false);
  const [expandedCards, setExpandedCards] = useState({});
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [isClaimingOwnerlessTrips, setIsClaimingOwnerlessTrips] = useState(false);

  useEffect(() => {
    if (!currentUser) return undefined;

    const init = async () => {
      const localTrips = loadLocalTrips(uid);
      setTrips(localTrips);
      setIsLoading(false);

      try {
        const remoteTrips = await listTrips({ user: currentUser });
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
              title: trip.title || localTrip?.title || '未命名旅程',
              status: trip.status || localTrip?.status || 'planning',
              coverImage: trip.coverImage || localTrip?.coverImage || '',
              dateRange: trip.dateRange || localTrip?.dateRange || { start: '', end: '' },
              eventCount: trip.eventCount ?? localTrip?.eventCount ?? 0,
              updatedAt,
              createdAt: trip.createdAt || localTrip?.createdAt || updatedAt,
              accessRole: trip.accessRole || localTrip?.accessRole || 'view'
            });
          });

          const mergedTrips = Array.from(mergedMap.values());
          setTrips(mergedTrips);
          saveLocalTrips(uid, mergedTrips);
        }
      } catch (error) {
        console.warn('讀取雲端旅程列表失敗，改用本地資料', error);
      }
    };

    init();
    return undefined;
  }, [currentUser, uid]);

  const sortedAndFilteredTrips = useMemo(() => {
    return trips
      .filter((trip) => {
        const statusText = getStatus(trip.status).label;
        const searchTarget = `${trip.title || ''} ${statusText} ${formatDateRange(trip)}`.toLowerCase();
        return searchTarget.includes(keyword.toLowerCase());
      })
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  }, [trips, keyword]);

  const visibleTrips = showAllTrips ? sortedAndFilteredTrips : sortedAndFilteredTrips.slice(0, 6);
  const hiddenTripCount = Math.max(sortedAndFilteredTrips.length - visibleTrips.length, 0);
  const hasTrips = trips.length > 0;
  const hasSearch = keyword.trim().length > 0;

  const handleCreateTrip = async (event) => {
    event?.preventDefault();
    const title = newTripTitle.trim();
    if (!title) {
      newTripInputRef.current?.focus();
      return;
    }

    const tripId = `trip-${Date.now()}`;
    const now = new Date().toISOString();
    const template = createTripAppData(title);

    const nextTripMeta = {
      id: tripId,
      title,
      status: 'planning',
      coverImage: '',
      dateRange: { start: '', end: '' },
      eventCount: 0,
      createdAt: now,
      updatedAt: now,
      accessRole: 'owner'
    };

    const optimisticTrips = [nextTripMeta, ...trips];
    setTrips(optimisticTrips);
    saveLocalTrips(uid, optimisticTrips);

    localStorage.setItem(
      getStorageKey(tripId, uid),
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
      }, { user: currentUser, profile: userProfile });
      setNewTripTitle('');
      setLastOpenedTripId(tripId);
      navigate(`/trip/${tripId}`);
    } catch (error) {
      setTrips((prev) => prev.filter((trip) => trip.id !== tripId));
      saveLocalTrips(uid, optimisticTrips.filter((trip) => trip.id !== tripId));
      localStorage.removeItem(getStorageKey(tripId, uid));
      toast({
        variant: 'danger',
        title: '建立旅程失敗',
        description: '已回滾本地資料，請稍後再試。'
      });
      console.error(error);
    }
  };

  const handleDeleteTrip = async (tripId) => {
    const target = trips.find((trip) => trip.id === tripId);
    if (!target) return;

    const shouldDelete = await confirm({
      title: '刪除旅程？',
      description: `「${target.title}」會從本機與雲端移除，此動作無法復原。`,
      confirmLabel: '刪除旅程',
      variant: 'danger'
    });

    if (!shouldDelete) {
      return;
    }

    const prevTrips = [...trips];
    const nextTrips = trips.filter((trip) => trip.id !== tripId);
    setTrips(nextTrips);
    saveLocalTrips(uid, nextTrips);

    const localTripRaw = localStorage.getItem(getStorageKey(tripId, uid));
    localStorage.removeItem(getStorageKey(tripId, uid));

    try {
      await deleteTrip(tripId);
      toast({
        variant: 'success',
        title: '已刪除旅程',
        description: target.title
      });
    } catch (error) {
      setTrips(prevTrips);
      saveLocalTrips(uid, prevTrips);
      if (localTripRaw) {
        localStorage.setItem(getStorageKey(tripId, uid), localTripRaw);
      }
      toast({
        variant: 'danger',
        title: '刪除失敗',
        description: '已回復原始資料，請稍後再試。'
      });
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

  const handleClaimOwnerlessTrips = async () => {
    setIsClaimingOwnerlessTrips(true);
    setMigrationStatus(null);
    try {
      const result = await claimOwnerlessTrips({ user: currentUser, profile: userProfile });
      setMigrationStatus(`已綁定 ${result.claimed || 0} 筆 ownerless 旅程，修復 ${result.reassigned || 0} 筆舊 Owner 旅程，同步 ${result.synced || 0} 筆已是 Owner 的旅程，略過 ${result.skipped || 0} 筆。`);
      const remoteTrips = await listTrips({ user: currentUser });
      setTrips(remoteTrips);
      saveLocalTrips(uid, remoteTrips);
    } catch (error) {
      setMigrationStatus(error.message || '綁定既有旅程失敗');
    } finally {
      setIsClaimingOwnerlessTrips(false);
    }
  };

  return (
    <main className="tp-page-shell">
      <PageContainer className="py-6 sm:py-8">
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="tp-icon-chip bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <UserRound size={18} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                {userProfile?.displayName || currentUser?.displayName || currentUser?.email || '已登入'}
              </p>
              <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                {currentUser?.email || '帳號旅程已隔離保存'}
              </p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={logout}>
            登出
          </Button>
        </div>

        {isPrimaryOwnerAccount(currentUser) && (
          <Card className="mb-4 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="tp-section-title">既有雲端旅程 Owner 綁定</h2>
                <p className="tp-section-subtitle mt-1">
                  會將既有雲端旅程綁定到目前主要帳號；若舊資料已被測試 Owner 綁住，也會修復為目前帳號。
                </p>
              </div>
              <Button onClick={handleClaimOwnerlessTrips} disabled={isClaimingOwnerlessTrips} className="justify-center">
                {isClaimingOwnerlessTrips ? '綁定中...' : '綁定既有旅程'}
              </Button>
            </div>
            {migrationStatus && (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {migrationStatus}
              </p>
            )}
          </Card>
        )}

        <section className="overflow-hidden rounded-lg border border-brand-100 bg-white shadow-sm dark:border-brand-900/60 dark:bg-slate-900">
          <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="p-5 sm:p-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-800 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-200">
                <PlaneTakeoff size={14} />
                Trip Planner
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">
                規劃下一趟旅程
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base dark:text-slate-300">
                建立旅程、安排每日行程、管理行前清單和花費。所有重點都放在一眼能看懂的位置。
              </p>

              <form onSubmit={handleCreateTrip} className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
                <label className="sr-only" htmlFor="new-trip-title">新的旅程名稱</label>
                <Input
                  id="new-trip-title"
                  ref={newTripInputRef}
                  type="text"
                  value={newTripTitle}
                  onChange={(event) => setNewTripTitle(event.target.value)}
                  placeholder="例如：2026 東京賞櫻"
                />
                <Button type="submit" size="lg">
                  <Plus size={18} />
                  建立旅程
                </Button>
              </form>
            </div>

            <div className="border-t border-brand-100 bg-gradient-to-br from-brand-50 via-sky-50 to-white p-5 sm:p-7 lg:border-l lg:border-t-0 dark:border-brand-900/60 dark:from-brand-950/30 dark:via-slate-900 dark:to-slate-950">
              <p className="text-sm font-semibold text-brand-800 dark:text-brand-200">目前工作台</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-white/85 p-4 shadow-sm dark:bg-slate-900/80">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">旅程數</p>
                  <p className="mt-1 text-3xl font-black text-slate-950 dark:text-white">{trips.length}</p>
                </div>
                <div className="rounded-lg bg-white/85 p-4 shadow-sm dark:bg-slate-900/80">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">搜尋結果</p>
                  <p className="mt-1 text-3xl font-black text-slate-950 dark:text-white">{sortedAndFilteredTrips.length}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
                建議先設定旅程日期，系統會自動產生天數，接著就能逐日加入行程。
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="tp-section-title">我的旅程</h2>
              <p className="tp-section-subtitle mt-1">快速回到正在規劃或旅途中使用的旅程。</p>
            </div>
            <div className="relative w-full sm:max-w-sm">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <label className="sr-only" htmlFor="trip-search">搜尋旅程</label>
              <Input
                id="trip-search"
                type="text"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜尋名稱、狀態或日期"
                className="pl-9"
              />
            </div>
          </div>

          <div className="mt-4">
            {isLoading ? (
              <LoadingState label="讀取旅程中..." />
            ) : sortedAndFilteredTrips.length === 0 ? (
              <EmptyState
                icon={Compass}
                title={hasTrips && hasSearch ? '找不到符合條件的旅程' : '目前尚無旅程'}
                description={hasTrips && hasSearch ? '試著換一個關鍵字，或清除搜尋條件。' : '輸入旅程名稱後，就可以新增第一趟旅程。'}
                actionLabel={hasTrips && hasSearch ? '清除搜尋' : '新增第一個旅程'}
                onAction={() => {
                  if (hasTrips && hasSearch) {
                    setKeyword('');
                  } else {
                    newTripInputRef.current?.focus();
                  }
                }}
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleTrips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    expanded={Boolean(expandedCards[trip.id])}
                    coverFailed={Boolean(failedCoverImages[trip.id])}
                    onCoverError={() =>
                      setFailedCoverImages((prev) => ({
                        ...prev,
                        [trip.id]: true
                      }))
                    }
                    onOpen={() => openTripDetail(trip.id)}
                    onToggleExpanded={() => toggleExpandedCard(trip.id)}
                    onDelete={() => handleDeleteTrip(trip.id)}
                    canDelete={trip.accessRole === 'owner'}
                  />
                ))}
              </div>
            )}

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {hiddenTripCount > 0 && (
                <Button variant="secondary" onClick={() => setShowAllTrips(true)}>
                  查看更多旅程（+{hiddenTripCount}）
                </Button>
              )}
              {showAllTrips && sortedAndFilteredTrips.length > 6 && (
                <Button variant="ghost" onClick={() => setShowAllTrips(false)}>
                  收合旅程列表
                </Button>
              )}
            </div>
          </div>
        </section>
      </PageContainer>
    </main>
  );
};

export default TripListPage;
