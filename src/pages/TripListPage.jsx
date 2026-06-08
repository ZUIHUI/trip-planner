import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  Check,
  Compass,
  KeyRound,
  Pencil,
  PlaneTakeoff,
  Plus,
  Search,
  X,
  UserRound,
  Trash2
} from 'lucide-react';
import {
  createTrip,
  deleteTrip,
  listTrips,
  redeemTripInviteCode,
  updateCurrentUserMemberProfiles
} from '../services/tripService';
import { createTripAppData } from '../domain/tripSchema';
import { normalizeCoverImageUrl } from '../utils/coverImage';
import { Badge, Button, Card, EmptyState, Input, LoadingState, PageContainer } from '../components/ui';
import { useFeedback } from '../contexts/FeedbackContext';
import { useAuth } from '../contexts/AuthContext';
import InstallAppPrompt from '../components/InstallAppPrompt';
import { inviteCodeInputProps, plainTextInputProps, searchInputProps } from '../utils/mobileInputProps';
import {
  LAST_OPENED_TRIP_KEY,
  getTripIndexKey,
  getTripStorageKey
} from '../utils/storageKeys';
import { validateInviteCode, validateRequiredText } from '../utils/validation';
import { logger } from '../utils/logger';

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

const normalizeInviteCodeInput = (value) => String(value || '')
  .toUpperCase()
  .replace(/[^A-Z0-9]/g, '')
  .slice(0, 8)
  .replace(/(.{4})(.+)/, '$1-$2');

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
          <div className="flex h-36 w-full items-center justify-center bg-gradient-to-br from-sky-50 via-brand-50 to-rose-50 text-brand-700 sm:h-40 dark:from-brand-900/40 dark:via-slate-900 dark:to-violet-950/30">
            <div className="rounded-lg bg-white/90 p-3 shadow-sm ring-1 ring-white/70 dark:bg-slate-900/80 dark:ring-slate-700/60">
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
            <div className="rounded-lg bg-sky-50/80 px-3 py-2 dark:bg-slate-800/70">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">行程數</p>
              <p className="mt-1 font-bold text-slate-900 dark:text-white">{trip.eventCount || 0} 個</p>
            </div>
            <div className="rounded-lg bg-rose-50/70 px-3 py-2 dark:bg-slate-800/70">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">最近更新</p>
              <p className="mt-1 font-bold text-slate-900 dark:text-white">{formatDateTime(trip.updatedAt)}</p>
            </div>
          </div>
        </div>
      </button>

      <div className="border-t border-cyan-100 px-4 py-3 dark:border-slate-800">
        <div className={`flex items-center gap-2 ${canDelete ? 'justify-between' : 'justify-end'}`}>
          {canDelete && (
            <button
              type="button"
              onClick={onToggleExpanded}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 hover:bg-sky-50 hover:text-brand-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              aria-expanded={expanded}
            >
              {expanded ? '收合管理' : '管理'}
              <ChevronDown size={14} className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>
          )}
          <Button variant="secondary" size="sm" onClick={onOpen}>
            開啟旅程
          </Button>
        </div>

        {expanded && canDelete && (
          <div className="mt-3 flex justify-end border-t border-cyan-100 pt-3 dark:border-slate-800">
            <Button variant="danger" size="sm" onClick={onDelete} aria-label={`刪除 ${trip.title || '未命名旅程'}`}>
              <Trash2 size={14} />
              刪除旅程
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

const TripListPage = () => {
  const navigate = useNavigate();
  const { confirm, toast } = useFeedback();
  const { currentUser, userProfile, updateDisplayName, logout } = useAuth();
  const uid = currentUser?.uid || '';
  const newTripInputRef = useRef(null);
  const [trips, setTrips] = useState([]);
  const [newTripTitle, setNewTripTitle] = useState('');
  const [keyword, setKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [cloudSyncWarning, setCloudSyncWarning] = useState('');
  const [failedCoverImages, setFailedCoverImages] = useState({});
  const [showAllTrips, setShowAllTrips] = useState(false);
  const [expandedCards, setExpandedCards] = useState({});
  const [nicknameDraft, setNicknameDraft] = useState(userProfile?.displayName || currentUser?.displayName || '');
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [isJoiningInvite, setIsJoiningInvite] = useState(false);

  useEffect(() => {
    setNicknameDraft(userProfile?.displayName || currentUser?.displayName || '');
  }, [userProfile?.displayName, currentUser?.displayName]);

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
          const localTripsById = new Map(localTrips.map((trip) => [trip.id, trip]));

          remoteTrips.forEach((trip) => {
            const updatedAt = trip.updatedAt || trip.createdAt || new Date().toISOString();
            const localTrip = localTripsById.get(trip.id);
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
        setCloudSyncWarning('');
      } catch (error) {
        setCloudSyncWarning('雲端同步暫時失敗，正在顯示本機資料。請稍後重新整理或再試一次。');
        logger.warn('讀取雲端旅程列表失敗，改用本地資料', error);
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
  const accountDisplayName = userProfile?.displayName || currentUser?.displayName || currentUser?.email || '已登入';

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
      getTripStorageKey(tripId, uid),
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
      localStorage.removeItem(getTripStorageKey(tripId, uid));
      toast({
        variant: 'danger',
        title: '建立旅程失敗',
        description: '已回滾本地資料，請稍後再試。'
      });
      logger.error(error);
    }
  };

  const handleJoinByInviteCode = async (event) => {
    event.preventDefault();
    const code = normalizeInviteCodeInput(inviteCode);
    const inviteError = validateInviteCode(code);

    if (inviteError) {
      toast({
        variant: 'warning',
        title: inviteError
      });
      return;
    }

    setIsJoiningInvite(true);
    try {
      const result = await redeemTripInviteCode({
        code,
        user: currentUser,
        profile: userProfile
      });
      if (!result.tripId) {
        throw new Error('邀請碼已接受，但沒有取得旅程資訊。');
      }
      setInviteCode('');
      setLastOpenedTripId(result.tripId);
      toast({
        variant: 'success',
        title: result.alreadyMember ? '你已經在這趟旅程中' : '已加入旅程',
        description: result.alreadyMember
          ? (result.tripTitle || '')
          : '到「大家想去」按「我想去」。'
      });
      navigate(`/trip/${result.tripId}`, {
        state: {
          initialTab: 'ideas',
          focusTarget: 'placeIdeas'
        }
      });
    } catch (error) {
      toast({
        variant: 'danger',
        title: '無法加入旅程',
        description: error.message || '請確認邀請碼是否正確。'
      });
    } finally {
      setIsJoiningInvite(false);
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

    const localTripRaw = localStorage.getItem(getTripStorageKey(tripId, uid));
    localStorage.removeItem(getTripStorageKey(tripId, uid));

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
        localStorage.setItem(getTripStorageKey(tripId, uid), localTripRaw);
      }
      toast({
        variant: 'danger',
        title: '刪除失敗',
        description: '已回復原始資料，請稍後再試。'
      });
      logger.error(error);
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

  const handleStartNicknameEdit = () => {
    setNicknameDraft(userProfile?.displayName || currentUser?.displayName || '');
    setIsEditingNickname(true);
  };

  const handleCancelNicknameEdit = () => {
    setNicknameDraft(userProfile?.displayName || currentUser?.displayName || '');
    setIsEditingNickname(false);
  };

  const handleSaveNickname = async (event) => {
    event.preventDefault();
    const nextName = nicknameDraft.trim();
    const nameError = validateRequiredText(nextName, '暱稱', { maxLength: 120 });

    if (nameError) {
      toast({
        variant: 'warning',
        title: nameError
      });
      return;
    }

    setIsSavingNickname(true);
    try {
      await updateDisplayName(nextName);
      const result = await updateCurrentUserMemberProfiles({
        user: currentUser,
        displayName: nextName,
        photoURL: currentUser?.photoURL || ''
      });
      toast({
        variant: 'success',
        title: '暱稱已更新',
        description: result.updated ? `已更新 ${result.updated} 趟旅程中的顯示名稱。` : '新旅程會使用這個暱稱。'
      });
      setIsEditingNickname(false);
    } catch (error) {
      toast({
        variant: 'danger',
        title: '暱稱更新失敗',
        description: error.message || '請稍後再試。'
      });
    } finally {
      setIsSavingNickname(false);
    }
  };

  return (
    <main className="tp-page-shell">
      <PageContainer className="py-6 sm:py-8">
        <div className="tp-panel mb-4 p-3">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="tp-icon-chip">
                <UserRound size={18} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                  {accountDisplayName}
                </p>
                <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {currentUser?.email || '你的旅程會保存在這個帳號中'}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {!isEditingNickname && (
                <Button type="button" variant="ghost" size="sm" onClick={handleStartNicknameEdit} className="justify-center">
                  <Pencil size={15} />
                  <span className="hidden sm:inline">編輯名稱</span>
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={logout}>
                登出
              </Button>
            </div>
          </div>

          {isEditingNickname && (
            <form onSubmit={handleSaveNickname} className="mt-3 border-t border-cyan-100 pt-3 dark:border-slate-800">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <label className="min-w-0 flex-1">
                  <span className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400">顯示名稱</span>
                  <Input
                    {...plainTextInputProps}
                    value={nicknameDraft}
                    onChange={(event) => setNicknameDraft(event.target.value)}
                    placeholder="設定你的暱稱"
                    aria-label="設定你的暱稱"
                    className="h-10 text-sm"
                    enterKeyHint="done"
                    autoFocus
                  />
                </label>
                <div className="grid grid-cols-1 gap-2 sm:flex sm:shrink-0">
                  <Button type="submit" variant="secondary" size="sm" disabled={isSavingNickname || !nicknameDraft.trim()} className="justify-center">
                    <Check size={15} />
                    {isSavingNickname ? '儲存中...' : '儲存'}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={handleCancelNicknameEdit} disabled={isSavingNickname} className="justify-center">
                    <X size={15} />
                    取消
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>

        <section className="tp-panel mb-4 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(280px,1fr)] lg:items-center">
            <div className="flex min-w-0 items-start gap-3">
              <div className="tp-icon-chip">
                <KeyRound size={18} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-black text-slate-950 dark:text-white">加入旅程</h2>
              </div>
            </div>
            <form onSubmit={handleJoinByInviteCode} className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <label className="sr-only" htmlFor="trip-invite-code">邀請碼</label>
              <Input
                id="trip-invite-code"
                {...inviteCodeInputProps}
                value={inviteCode}
                onChange={(event) => setInviteCode(normalizeInviteCodeInput(event.target.value))}
                placeholder="YK82-P7Q9"
                className="font-mono uppercase tracking-wider"
              />
              <Button type="submit" disabled={isJoiningInvite || inviteCode.replace('-', '').length !== 8} className="justify-center">
                <KeyRound size={16} />
                {isJoiningInvite ? '加入中...' : '加入旅程'}
              </Button>
            </form>
          </div>
        </section>

        <InstallAppPrompt className="mb-4" />

        <section className="tp-card p-5 sm:p-7">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-sky-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-800 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-200">
              <PlaneTakeoff size={14} />
              Trip Planner
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">
              規劃下一趟旅程
            </h1>

            <form onSubmit={handleCreateTrip} className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="sr-only" htmlFor="new-trip-title">新的旅程名稱</label>
              <Input
                id="new-trip-title"
                ref={newTripInputRef}
                {...plainTextInputProps}
                value={newTripTitle}
                onChange={(event) => setNewTripTitle(event.target.value)}
                placeholder="例如：2026 東京賞櫻"
                enterKeyHint="go"
              />
              <Button type="submit" size="lg">
                <Plus size={18} />
                建立旅程
              </Button>
            </form>
          </div>
        </section>

        <section className="mt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="tp-section-title">我的旅程</h2>
            </div>
            <div className="relative w-full sm:max-w-sm">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <label className="sr-only" htmlFor="trip-search">搜尋旅程</label>
              <Input
                id="trip-search"
                {...searchInputProps}
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜尋名稱、狀態或日期"
                className="pl-9"
              />
            </div>
          </div>

          {cloudSyncWarning && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100" role="status" aria-live="polite">
              <AlertTriangle size={17} className="mt-0.5 shrink-0" />
              <p>{cloudSyncWarning}</p>
            </div>
          )}

          <div className="mt-4">
            {isLoading ? (
              <LoadingState />
            ) : sortedAndFilteredTrips.length === 0 ? (
              <EmptyState
                icon={Compass}
                title={hasTrips && hasSearch ? '找不到符合條件的旅程' : '目前尚無旅程'}
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
