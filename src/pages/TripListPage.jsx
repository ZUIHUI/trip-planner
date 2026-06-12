import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
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
  ShieldCheck,
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

const getLastOpenedTripId = () => {
  try {
    return localStorage.getItem(LAST_OPENED_TRIP_KEY) || '';
  } catch {
    return '';
  }
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

const tripGridMotion = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.045
    }
  }
};

const tripGridItemMotion = {
  hidden: { opacity: 0, y: 10, scale: 0.985 },
  visible: { opacity: 1, y: 0, scale: 1 }
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

const accessRoleConfig = {
  owner: { label: '擁有者', variant: 'info' },
  editor: { label: '可編輯', variant: 'success' },
  edit: { label: '可編輯', variant: 'success' },
  view: { label: '唯讀', variant: 'muted' }
};

const TripAccessBadge = ({ role }) => {
  const config = accessRoleConfig[role] || accessRoleConfig.view;
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

const ActionModeButton = ({ active, icon: Icon, title, meta, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`touch-target tp-press-feedback tp-hover-icon tp-icon-wiggle tp-tap-ripple group flex min-w-0 items-center gap-3 rounded-lg border px-3 py-2 text-left transition ${
      active
        ? 'border-brand-200 bg-gradient-to-br from-white via-brand-50 to-rose-50 text-brand-800 shadow-[0_16px_34px_-26px_rgba(14,116,144,0.55)] dark:border-brand-800 dark:from-slate-900 dark:via-brand-950/35 dark:to-rose-950/20 dark:text-brand-100'
        : 'border-brand-100 bg-white/72 text-slate-600 hover:border-brand-200 hover:bg-white hover:text-brand-800 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/55 dark:text-slate-300 dark:hover:border-brand-800 dark:hover:bg-slate-900'
    }`}
  >
    <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${active ? 'tp-soft-pulse bg-white/90 text-brand-700 shadow-sm dark:bg-slate-900/75 dark:text-brand-200' : 'bg-slate-50 text-slate-500 group-hover:text-brand-700 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:text-brand-200'}`}>
      <Icon size={18} />
    </span>
    <span className="min-w-0">
      <span className="block truncate text-sm font-black">{title}</span>
      {meta && <span className="block truncate text-xs font-semibold opacity-75">{meta}</span>}
    </span>
  </button>
);

const ContinueTripShortcut = ({ trip, label, onOpen }) => {
  if (!trip) return null;

  return (
    <motion.div
      className="tp-gradient-breathe tp-sheen tp-ambient-glow relative mt-3 flex min-w-0 flex-col gap-3 rounded-lg border border-brand-100 bg-gradient-to-br from-white via-sky-50/80 to-rose-50/70 p-3 pb-6 shadow-[0_18px_38px_-32px_rgba(14,116,144,0.55)] sm:flex-row sm:items-center sm:justify-between dark:border-brand-900/60 dark:from-slate-900 dark:via-slate-900/90 dark:to-brand-950/25"
      initial={{ opacity: 0, y: 10, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.65 }}
    >
      <span aria-hidden="true" className="tp-ambient-stars" />
      <span aria-hidden="true" className="tp-route-trail" />
      <div className="flex min-w-0 items-center gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-brand-700 shadow-sm ring-1 ring-brand-100 dark:bg-slate-950/60 dark:text-brand-200 dark:ring-brand-900/70">
          <ArrowRight size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black text-brand-700 dark:text-brand-300">{label}</p>
          <p className="truncate text-sm font-black text-slate-950 dark:text-white">
            {trip.title || '未命名旅程'}
          </p>
          <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
            {formatDateRange(trip)}
          </p>
        </div>
      </div>
      <Button type="button" size="sm" onClick={onOpen} className="shrink-0 justify-center shadow-sm">
        繼續
        <ArrowRight size={15} />
      </Button>
    </motion.div>
  );
};

const TripFilterChip = ({ active, label, count, onClick }) => (
  <motion.button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    layout
    animate={{ scale: active ? 1.025 : 1 }}
    whileTap={{ scale: 0.96 }}
    transition={{ type: 'spring', stiffness: 520, damping: 36, mass: 0.55 }}
    className={`touch-target tp-press-feedback shrink-0 rounded-lg border px-3 py-2 text-sm font-black transition ${
      active
        ? 'border-brand-200 bg-gradient-to-br from-brand-500 via-sky-500 to-rose-400 text-white shadow-[0_14px_28px_-22px_rgba(14,116,144,0.65)] dark:border-brand-500 dark:from-brand-200 dark:via-sky-200 dark:to-rose-200 dark:text-slate-950'
        : 'border-brand-100 bg-white/80 text-slate-600 hover:border-brand-200 hover:bg-white hover:text-brand-800 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/65 dark:text-slate-300 dark:hover:border-brand-800 dark:hover:bg-slate-900'
    }`}
  >
    <span>{label}</span>
    <span className="ml-1 text-xs opacity-70">{count}</span>
  </motion.button>
);

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
    <Card as="article" interactive className="tp-sheen overflow-hidden">
      <button
        type="button"
        onClick={onOpen}
        className="group/trip-card block w-full text-left"
        aria-label={`開啟 ${trip.title || '未命名旅程'}`}
      >
        {showCover ? (
          <img
            src={coverImageUrl}
            alt={`${trip.title || '旅程'} 封面`}
            className="h-36 w-full object-cover transition-transform duration-500 group-hover/trip-card:scale-[1.04] sm:h-40"
            onError={onCoverError}
          />
        ) : (
          <div className="tp-gradient-breathe flex h-36 w-full items-center justify-center bg-gradient-to-br from-sky-50 via-brand-50 to-rose-50 text-brand-700 sm:h-40 dark:from-brand-900/40 dark:via-slate-900 dark:to-rose-950/25">
            <div className="tp-gentle-float rounded-lg bg-white/90 p-3 shadow-sm ring-1 ring-white/70 dark:bg-slate-900/80 dark:ring-slate-700/60">
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
            <div className="flex shrink-0 flex-col items-end gap-2">
              <TripStatusBadge status={trip.status} />
              <TripAccessBadge role={trip.accessRole} />
            </div>
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

          {trip.accessRole === 'view' && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
              <ShieldCheck size={14} className="shrink-0" />
              <span className="truncate">只能查看</span>
            </div>
          )}
        </div>
      </button>

      <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className={`flex items-center gap-2 ${canDelete ? 'justify-between' : 'justify-end'}`}>
          {canDelete && (
            <button
              type="button"
              onClick={onToggleExpanded}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
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
          <div className="mt-3 flex justify-end border-t border-slate-200 pt-3 dark:border-slate-800">
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
  const [actionMode, setActionMode] = useState('create');
  const [tripFilter, setTripFilter] = useState('all');
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

  const sortedTrips = useMemo(() => {
    return [...trips]
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  }, [trips]);

  const tripFilterOptions = useMemo(() => {
    const counts = sortedTrips.reduce((acc, trip) => {
      acc.all += 1;
      if (trip.status === 'ongoing') acc.ongoing += 1;
      if (trip.status === 'planning' || !trip.status) acc.planning += 1;
      if (trip.accessRole === 'owner') acc.owner += 1;
      if (trip.accessRole === 'editor' || trip.accessRole === 'edit') acc.editable += 1;
      if (trip.accessRole === 'view') acc.readonly += 1;
      return acc;
    }, {
      all: 0,
      ongoing: 0,
      planning: 0,
      owner: 0,
      editable: 0,
      readonly: 0
    });

    return [
      { id: 'all', label: '全部', count: counts.all },
      { id: 'ongoing', label: '旅途中', count: counts.ongoing },
      { id: 'planning', label: '規劃中', count: counts.planning },
      { id: 'owner', label: '我管理', count: counts.owner },
      { id: 'editable', label: '可編輯', count: counts.editable },
      { id: 'readonly', label: '唯讀', count: counts.readonly }
    ];
  }, [sortedTrips]);

  const filteredTrips = useMemo(() => {
    if (tripFilter === 'ongoing') return sortedTrips.filter((trip) => trip.status === 'ongoing');
    if (tripFilter === 'planning') return sortedTrips.filter((trip) => trip.status === 'planning' || !trip.status);
    if (tripFilter === 'owner') return sortedTrips.filter((trip) => trip.accessRole === 'owner');
    if (tripFilter === 'editable') return sortedTrips.filter((trip) => trip.accessRole === 'editor' || trip.accessRole === 'edit');
    if (tripFilter === 'readonly') return sortedTrips.filter((trip) => trip.accessRole === 'view');
    return sortedTrips;
  }, [sortedTrips, tripFilter]);

  const sortedAndFilteredTrips = useMemo(() => {
    return filteredTrips.filter((trip) => {
      const statusText = getStatus(trip.status).label;
      const roleText = accessRoleConfig[trip.accessRole]?.label || '';
      const searchTarget = `${trip.title || ''} ${statusText} ${roleText} ${formatDateRange(trip)}`.toLowerCase();
      return searchTarget.includes(keyword.toLowerCase());
    });
  }, [filteredTrips, keyword]);

  const visibleTrips = showAllTrips ? sortedAndFilteredTrips : sortedAndFilteredTrips.slice(0, 6);
  const hiddenTripCount = Math.max(sortedAndFilteredTrips.length - visibleTrips.length, 0);
  const hasTrips = trips.length > 0;
  const hasSearch = keyword.trim().length > 0;
  const hasActiveFilter = tripFilter !== 'all';
  const accountDisplayName = userProfile?.displayName || currentUser?.displayName || currentUser?.email || '已登入';
  const totalTripCount = trips.length;
  const ownedTripCount = trips.filter((trip) => trip.accessRole === 'owner').length;
  const lastOpenedTripId = getLastOpenedTripId();
  const lastOpenedTrip = lastOpenedTripId
    ? trips.find((trip) => trip.id === lastOpenedTripId)
    : null;
  const continueTrip = lastOpenedTrip || sortedTrips[0] || null;
  const continueTripLabel = lastOpenedTrip ? '接著上次規劃' : '最近有動靜';

  const focusNewTripTitle = () => {
    setActionMode('create');
    if (typeof window !== 'undefined') {
      window.setTimeout(() => newTripInputRef.current?.focus(), 0);
    }
  };

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
            <form onSubmit={handleSaveNickname} className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
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

        <motion.section
          className="tp-panel tp-sheen tp-ambient-glow relative mb-4 overflow-hidden p-4 pb-7 pt-5"
          initial={{ opacity: 0, y: 12, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.65 }}
        >
          <span aria-hidden="true" className="tp-ambient-stars" />
          <span aria-hidden="true" className="tp-route-trail" />
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 via-sky-400 to-rose-400" />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(320px,1fr)] lg:items-start">
            <div className="min-w-0">
              <div className="flex min-w-0 items-start gap-3">
                <div className="tp-icon-chip tp-gentle-float">
                  <PlaneTakeoff size={19} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-black text-slate-950 dark:text-white">旅程小基地</h1>
                  <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                    {totalTripCount ? `已收好 ${totalTripCount} 趟旅程，${ownedTripCount} 趟由你管理` : '先把想去的地方收進來'}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2" role="group" aria-label="選擇旅程操作">
                <ActionModeButton
                  active={actionMode === 'create'}
                  icon={Plus}
                  title="建立"
                  meta="把想去收好"
                  onClick={() => setActionMode('create')}
                />
                <ActionModeButton
                  active={actionMode === 'join'}
                  icon={KeyRound}
                  title="加入"
                  meta="和旅伴一起"
                  onClick={() => setActionMode('join')}
                />
              </div>

              <ContinueTripShortcut
                trip={continueTrip}
                label={continueTripLabel}
                onOpen={() => openTripDetail(continueTrip.id)}
              />
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {actionMode === 'create' ? (
                <motion.form
                  key="create-trip"
                  onSubmit={handleCreateTrip}
                  className="grid gap-3 rounded-lg border border-brand-100 bg-white/85 p-3 shadow-sm sm:grid-cols-[1fr_auto] dark:border-slate-800 dark:bg-slate-900/70"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                >
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
                  <Button type="submit" className="justify-center">
                    <Plus size={18} />
                    建立旅程
                  </Button>
                </motion.form>
              ) : (
                <motion.form
                  key="join-trip"
                  onSubmit={handleJoinByInviteCode}
                  className="grid gap-3 rounded-lg border border-brand-100 bg-white/85 p-3 shadow-sm sm:grid-cols-[1fr_auto] dark:border-slate-800 dark:bg-slate-900/70"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                >
                  <label className="sr-only" htmlFor="trip-invite-code">邀請碼</label>
                  <Input
                    id="trip-invite-code"
                    {...inviteCodeInputProps}
                    value={inviteCode}
                    onChange={(event) => setInviteCode(normalizeInviteCodeInput(event.target.value))}
                    placeholder="YK82-P7Q9"
                    className="font-mono uppercase"
                  />
                  <Button type="submit" disabled={isJoiningInvite || inviteCode.replace('-', '').length !== 8} className="justify-center">
                    <KeyRound size={16} />
                    {isJoiningInvite ? '加入中...' : '加入旅程'}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.section>

        <InstallAppPrompt className="mb-4" />

        <section className="mt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="tp-section-title">我的旅程</h2>
              {hasTrips && (
                <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                  顯示 {sortedAndFilteredTrips.length} / {totalTripCount}
                </p>
              )}
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

          {hasTrips && (
            <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar" aria-label="旅程篩選">
              {tripFilterOptions.map((option) => (
                <TripFilterChip
                  key={option.id}
                  active={tripFilter === option.id}
                  label={option.label}
                  count={option.count}
                  onClick={() => setTripFilter(option.id)}
                />
              ))}
            </div>
          )}

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
                title={hasTrips && (hasSearch || hasActiveFilter) ? '找不到符合條件的旅程' : '目前尚無旅程'}
                actionLabel={hasTrips && hasSearch ? '清除搜尋' : hasTrips && hasActiveFilter ? '查看全部' : '新增第一個旅程'}
                onAction={() => {
                  if (hasTrips && hasSearch) {
                    setKeyword('');
                  } else if (hasTrips && hasActiveFilter) {
                    setTripFilter('all');
                  } else {
                    focusNewTripTitle();
                  }
                }}
              />
            ) : (
              <motion.div
                className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
                variants={tripGridMotion}
                initial="hidden"
                animate="visible"
              >
                {visibleTrips.map((trip) => (
                  <motion.div
                    key={trip.id}
                    layout
                    variants={tripGridItemMotion}
                    transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.55 }}
                  >
                    <TripCard
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
                  </motion.div>
                ))}
              </motion.div>
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
