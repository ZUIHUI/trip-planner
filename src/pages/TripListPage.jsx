import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  Check,
  Compass,
  KeyRound,
  LogOut,
  Pencil,
  PlaneTakeoff,
  Plus,
  Search,
  X,
  ShieldCheck,
  Trash2,
  UserRound
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
import CompactScrollHeader from '../components/CompactScrollHeader';
import { scrollAppTo } from '../utils/appScroll';
import { inviteCodeInputProps, plainTextInputProps, searchInputProps } from '../utils/mobileInputProps';
import {
  LAST_OPENED_TRIP_KEY,
  getTripIndexKey,
  getTripStorageKey
} from '../utils/storageKeys';
import { validateInviteCode, validateRequiredText } from '../utils/validation';
import { logger } from '../utils/logger';
import { formatDateTimeWithWeekday, getTripDisplayDates } from '../utils/tripDates';

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
  return formatDateTimeWithWeekday(value, { includeYear: false }) || '尚未更新';
};

const formatDateRange = (trip) => {
  return getTripDisplayDates(trip) || '未設定日期';
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

const tripThemePresets = [
  {
    id: 'island',
    label: '海島旅程',
    keywords: ['okinawa', 'bali', 'hawaii', 'island', 'beach', 'ocean', 'sea', '沖繩', '峇里', '夏威夷', '海', '島', '沙灘'],
    primary: '4 83 95',
    secondary: '8 132 139',
    accent: '255 111 97',
    paper: '224 246 242'
  },
  {
    id: 'city',
    label: '城市探索',
    keywords: ['tokyo', 'osaka', 'seoul', 'london', 'paris', 'new york', 'city', '東京', '大阪', '首爾', '巴黎', '倫敦', '紐約', '城市'],
    primary: '35 62 105',
    secondary: '12 111 134',
    accent: '255 126 84',
    paper: '230 238 246'
  },
  {
    id: 'mountain',
    label: '山線路徑',
    keywords: ['mountain', 'alps', 'camp', 'hike', 'forest', 'swiss', '山', '森林', '露營', '登山', '健行', '瑞士'],
    primary: '27 85 72',
    secondary: '83 139 96',
    accent: '246 141 79',
    paper: '229 243 230'
  },
  {
    id: 'snow',
    label: '雪境假期',
    keywords: ['snow', 'ski', 'winter', 'sapporo', 'hokkaido', '雪', '滑雪', '冬', '札幌', '北海道'],
    primary: '28 78 112',
    secondary: '86 152 177',
    accent: '255 128 112',
    paper: '232 244 248'
  },
  {
    id: 'sunset',
    label: '日落公路',
    keywords: ['road', 'desert', 'sunset', 'california', 'australia', '公路', '沙漠', '夕陽', '加州', '澳洲'],
    primary: '126 69 45',
    secondary: '190 107 64',
    accent: '255 111 97',
    paper: '247 236 223'
  },
  {
    id: 'food',
    label: '美食地圖',
    keywords: ['food', 'cafe', 'market', 'wine', 'restaurant', '美食', '咖啡', '市集', '餐廳', '酒莊'],
    primary: '112 65 54',
    secondary: '176 100 76',
    accent: '7 129 138',
    paper: '246 236 229'
  }
];

const getTripTheme = (trip) => {
  const rawTitle = String(trip?.title || '').toLowerCase();
  const match = tripThemePresets.find((theme) =>
    theme.keywords.some((keyword) => rawTitle.includes(keyword.toLowerCase()))
  );
  const hashBase = rawTitle || trip?.status || 'atlas';
  const hash = Array.from(hashBase).reduce((total, char) => total + char.charCodeAt(0), 0);
  const theme = match || tripThemePresets[hash % tripThemePresets.length] || tripThemePresets[0];

  return {
    ...theme,
    className: `is-theme-${theme.id}`,
    style: {
      '--tp-mobile-trip-theme-primary': theme.primary,
      '--tp-mobile-trip-theme-secondary': theme.secondary,
      '--tp-mobile-trip-theme-accent': theme.accent,
      '--tp-mobile-trip-theme-paper': theme.paper
    }
  };
};

const ActionModeButton = ({ active, icon: Icon, title, meta, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`touch-target tp-action-mode-button tp-press-feedback tp-hover-icon tp-tap-ripple ${active ? 'is-active' : ''}`}
  >
    <span className="tp-action-mode-icon">
      <Icon size={18} />
    </span>
    <span className="min-w-0">
      <span className="block truncate text-sm font-black">{title}</span>
      {meta && <span className="block truncate text-xs font-semibold opacity-75">{meta}</span>}
    </span>
  </button>
);

const TripFilterChip = ({ active, label, count, onClick }) => (
  <motion.button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    layout
    whileTap={{ y: 1 }}
    transition={{ type: 'spring', stiffness: 520, damping: 36, mass: 0.55 }}
    className={`touch-target tp-filter-chip tp-press-feedback ${active ? 'is-active' : ''}`}
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
    <Card as="article" interactive className="tp-trip-card overflow-hidden">
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
          <div className="tp-trip-card-placeholder">
            <div className="tp-trip-card-placeholder-icon">
              <Compass size={28} />
            </div>
          </div>
        )}

        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="tp-trip-card-title">
                {trip.title || '未命名旅程'}
              </p>
              <div className="tp-trip-card-meta">
                <CalendarDays size={15} />
                <span className="truncate">{formatDateRange(trip)}</span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <TripStatusBadge status={trip.status} />
              <TripAccessBadge role={trip.accessRole} />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="tp-trip-card-metric is-info">
              <p>行程數</p>
              <strong>{trip.eventCount || 0} 個</strong>
            </div>
            <div className="tp-trip-card-metric is-neutral">
              <p>最近更新</p>
              <strong>{formatDateTime(trip.updatedAt)}</strong>
            </div>
          </div>

          {trip.accessRole === 'view' && (
            <div className="tp-trip-card-readonly">
              <ShieldCheck size={14} className="shrink-0" />
              <span className="truncate">只能查看</span>
            </div>
          )}
        </div>
      </button>

      <div className="tp-trip-card-footer">
        <div className={`flex items-center gap-2 ${canDelete ? 'justify-between' : 'justify-end'}`}>
          {canDelete && (
            <button
              type="button"
              onClick={onToggleExpanded}
              className="tp-trip-card-manage"
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
            <div className="tp-trip-card-delete">
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

const MobileTripRow = ({
  trip,
  coverFailed,
  onCoverError,
  onOpen,
  onDelete,
  canDelete = false
}) => {
  const coverImageUrl = normalizeCoverImageUrl(trip.coverImage);
  const showCover = coverImageUrl && !coverFailed;
  const tripTheme = getTripTheme(trip);

  return (
    <article className={`tp-mobile-trip-row ${tripTheme.className}`} style={tripTheme.style}>
      <button
        type="button"
        onClick={onOpen}
        className="tp-mobile-trip-row-main"
        aria-label={`開啟 ${trip.title || '旅程'}`}
      >
        <span className="tp-mobile-trip-row-cover" aria-hidden="true">
          {showCover ? (
            <img
              src={coverImageUrl}
              alt=""
              onError={onCoverError}
            />
          ) : (
            <Compass size={23} />
          )}
        </span>
        <span className="tp-mobile-trip-row-content">
          <span className="tp-mobile-trip-row-badges">
            <TripStatusBadge status={trip.status} />
            <TripAccessBadge role={trip.accessRole} />
          </span>
          <strong>{trip.title || '未命名旅程'}</strong>
          <span className="tp-mobile-trip-row-date">
            <CalendarDays size={14} />
            <span>{formatDateRange(trip)}</span>
          </span>
          <span className="tp-mobile-trip-row-meta">
            <span>{trip.eventCount || 0} 個行程</span>
            <span>{formatDateTime(trip.updatedAt)}</span>
          </span>
        </span>
      </button>
      {canDelete && (
        <button
          type="button"
          className="tp-mobile-trip-row-delete"
          onClick={onDelete}
          aria-label={`刪除 ${trip.title || '旅程'}`}
        >
          <Trash2 size={16} />
        </button>
      )}
    </article>
  );
};

const TripListPage = () => {
  const navigate = useNavigate();
  const { confirm, toast } = useFeedback();
  const { currentUser, userProfile, updateDisplayName, logout } = useAuth();
  const uid = currentUser?.uid || '';
  const newTripInputRef = useRef(null);
  const joinTripInputRef = useRef(null);
  const mobileNewTripInputRef = useRef(null);
  const mobileJoinTripInputRef = useRef(null);
  const pendingActionFocusRef = useRef(null);
  const mobileTripsHeroRef = useRef(null);
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
  const continueTripCoverImageUrl = normalizeCoverImageUrl(continueTrip?.coverImage);
  const continueTripTheme = getTripTheme(continueTrip);
  const continueTripHeroStyle = {
    ...continueTripTheme.style,
    ...(continueTripCoverImageUrl ? { '--tp-mobile-trip-hero-image': `url("${continueTripCoverImageUrl}")` } : {})
  };
  const continueTripLabel = lastOpenedTrip ? '接著上次規劃' : '最近有動靜';

  const getActiveTripActionInput = (mode) => {
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
    if (mode === 'join') {
      return isMobile ? mobileJoinTripInputRef.current : joinTripInputRef.current;
    }
    return isMobile ? mobileNewTripInputRef.current : newTripInputRef.current;
  };

  const focusPendingTripActionInput = () => {
    const requestedMode = pendingActionFocusRef.current;
    if (!requestedMode) return;

    const targetInput = getActiveTripActionInput(requestedMode);
    if (!targetInput) return;

    targetInput.focus();
    pendingActionFocusRef.current = null;
  };

  const focusTripActionInput = (mode) => {
    pendingActionFocusRef.current = mode;
    setActionMode(mode);
    if (typeof window !== 'undefined') {
      window.setTimeout(focusPendingTripActionInput, 0);
    }
  };

  const focusActiveNewTripInput = () => {
    getActiveTripActionInput('create')?.focus();
  };

  const focusNewTripTitle = () => {
    focusTripActionInput('create');
  };

  const focusJoinTripCode = () => {
    focusTripActionInput('join');
  };

  const handleCreateTrip = async (event) => {
    event?.preventDefault();
    const title = newTripTitle.trim();
    if (!title) {
      focusActiveNewTripInput();
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
    <main id="main-content" tabIndex={-1} className="tp-page-shell tp-list-shell">
      <div className="tp-atlas-side-rail" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      <CompactScrollHeader
        observeRef={mobileTripsHeroRef}
        title="我的旅程"
        subtitle={`${totalTripCount} 趟旅程`}
        onAction={() => {
          handleStartNicknameEdit();
          scrollAppTo({
            top: 0,
            behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
          });
        }}
        actionLabel="帳號與暱稱"
        ActionIcon={UserRound}
      />

      <section
        className={`tp-mobile-trips-shell ${continueTripTheme.className}`}
        style={continueTripHeroStyle}
        aria-label="旅程手機儀表板"
      >
        <header
          ref={mobileTripsHeroRef}
          className={`tp-mobile-trips-hero ${continueTripTheme.className} ${continueTripCoverImageUrl ? 'has-trip-cover' : continueTrip ? 'has-trip-theme' : ''}`}
        >
          {!continueTripCoverImageUrl && (
            <div className="tp-mobile-trips-route" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          )}
          <div className="tp-mobile-trips-topline">
            <div className="min-w-0">
              <span className="tp-mobile-trips-eyebrow">{continueTrip ? continueTripTheme.label : '海岸地圖'}</span>
              <h1>我的旅程</h1>
            </div>
            <button
              type="button"
              className="tp-mobile-trips-logout"
              onClick={logout}
            >
              登出
            </button>
          </div>

          <div className="tp-mobile-trips-account">
            <div className="min-w-0">
              <span>旅人</span>
              <strong>{accountDisplayName}</strong>
              <small>{currentUser?.email || 'Trip Planner'}</small>
            </div>
            <button
              type="button"
              onClick={handleStartNicknameEdit}
              aria-label="修改暱稱"
              title="修改暱稱"
            >
              <Pencil size={17} />
            </button>
          </div>

          {isEditingNickname && (
            <form onSubmit={handleSaveNickname} className="tp-mobile-trips-nickname-form">
              <label htmlFor="mobile-nickname-draft">暱稱</label>
              <Input
                id="mobile-nickname-draft"
                {...plainTextInputProps}
                value={nicknameDraft}
                onChange={(event) => setNicknameDraft(event.target.value)}
                placeholder="輸入顯示名稱"
                enterKeyHint="done"
                autoFocus
              />
              <div>
                <button type="submit" disabled={isSavingNickname || !nicknameDraft.trim()}>
                  <Check size={15} />
                  儲存
                </button>
                <button type="button" onClick={handleCancelNicknameEdit} disabled={isSavingNickname}>
                  <X size={15} />
                  取消
                </button>
              </div>
            </form>
          )}

        </header>

        <section className="tp-mobile-trips-sheet" aria-label="旅程操作">
          <button
            type="button"
            className="tp-mobile-trips-continue"
            onClick={continueTrip ? () => openTripDetail(continueTrip.id) : focusNewTripTitle}
          >
            <span
              className="tp-mobile-trips-continue-cover"
              style={continueTripCoverImageUrl ? { backgroundImage: `url(${continueTripCoverImageUrl})` } : undefined}
              aria-hidden="true"
            >
              {!continueTripCoverImageUrl && <PlaneTakeoff size={21} />}
            </span>
            <span className="tp-mobile-trips-continue-copy">
              <span>{continueTrip ? continueTripLabel : '快速開始'}</span>
              <strong>{continueTrip?.title || '建立第一趟旅程'}</strong>
              <small>{continueTrip ? formatDateRange(continueTrip) : '把目的地、日期與靈感整理在一起'}</small>
            </span>
            <span className="tp-mobile-trips-continue-count">
              <strong>{continueTrip?.eventCount || totalTripCount || 0}</strong>
              <small>{continueTrip ? '行程' : '旅程'}</small>
            </span>
          </button>

          <div className="tp-mobile-action-tabs" role="group" aria-label="旅程操作">
            <button
              type="button"
              className={actionMode === 'create' ? 'is-active' : ''}
              onClick={focusNewTripTitle}
              aria-pressed={actionMode === 'create'}
            >
              <Plus size={18} />
              新增
            </button>
            <button
              type="button"
              className={actionMode === 'join' ? 'is-active' : ''}
              onClick={focusJoinTripCode}
              aria-pressed={actionMode === 'join'}
            >
              <KeyRound size={17} />
              加入
            </button>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {actionMode === 'create' ? (
              <motion.form
                key="mobile-create-trip"
                onSubmit={handleCreateTrip}
                className="tp-mobile-trip-form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                onAnimationComplete={focusPendingTripActionInput}
              >
                <label className="sr-only" htmlFor="mobile-new-trip-title">新增旅程名稱</label>
                <Input
                  id="mobile-new-trip-title"
                  ref={mobileNewTripInputRef}
                  {...plainTextInputProps}
                  value={newTripTitle}
                  onChange={(event) => setNewTripTitle(event.target.value)}
                  placeholder="例如：沖繩夏日旅行"
                  enterKeyHint="go"
                />
                <Button type="submit" className="justify-center">
                  <Plus size={18} />
                  建立
                </Button>
              </motion.form>
            ) : (
              <motion.form
                key="mobile-join-trip"
                onSubmit={handleJoinByInviteCode}
                className="tp-mobile-trip-form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                onAnimationComplete={focusPendingTripActionInput}
              >
                <label className="sr-only" htmlFor="mobile-trip-invite-code">邀請碼</label>
                <Input
                  id="mobile-trip-invite-code"
                  ref={mobileJoinTripInputRef}
                  {...inviteCodeInputProps}
                  value={inviteCode}
                  onChange={(event) => setInviteCode(normalizeInviteCodeInput(event.target.value))}
                  placeholder="YK82-P7Q9"
                  className="font-mono uppercase"
                />
                <Button type="submit" disabled={isJoiningInvite || inviteCode.replace('-', '').length !== 8} className="justify-center">
                  <KeyRound size={16} />
                  {isJoiningInvite ? '加入中' : '加入'}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

        </section>

        <section className="tp-mobile-trips-search-panel" aria-label="搜尋與篩選">
          <div className="tp-mobile-trip-search">
            <Search size={17} aria-hidden="true" />
            <label className="sr-only" htmlFor="mobile-trip-search">搜尋旅程</label>
            <Input
              id="mobile-trip-search"
              {...searchInputProps}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜尋旅程、狀態、角色"
            />
          </div>

          {hasTrips && (
            <div className="tp-mobile-trip-filters" aria-label="旅程篩選">
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
        </section>

        <section className="tp-mobile-trips-list-panel" aria-label="旅程列表">
          <div className="tp-mobile-trips-list-heading">
            <div>
              <span>旅程列表</span>
              <h2>你的旅程</h2>
            </div>
            {hasTrips && <strong>{sortedAndFilteredTrips.length}/{totalTripCount}</strong>}
          </div>

          <InstallAppPrompt className="tp-mobile-install-card" />

          {cloudSyncWarning && (
            <div className="tp-mobile-sync-warning" role="status" aria-live="polite">
              <AlertTriangle size={17} />
              <p>{cloudSyncWarning}</p>
            </div>
          )}

          <div className="tp-mobile-trip-list-region">
            {isLoading ? (
              <LoadingState />
            ) : sortedAndFilteredTrips.length === 0 ? (
              <EmptyState
                icon={Compass}
                title={hasTrips && (hasSearch || hasActiveFilter) ? '找不到符合條件的旅程' : '還沒有旅程'}
                actionLabel={hasTrips && hasSearch ? '清除搜尋' : hasTrips && hasActiveFilter ? '顯示全部' : '建立旅程'}
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
                className="tp-mobile-trip-list"
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
                    <MobileTripRow
                      trip={trip}
                      coverFailed={Boolean(failedCoverImages[trip.id])}
                      onCoverError={() =>
                        setFailedCoverImages((prev) => ({
                          ...prev,
                          [trip.id]: true
                        }))
                      }
                      onOpen={() => openTripDetail(trip.id)}
                      onDelete={() => handleDeleteTrip(trip.id)}
                      canDelete={trip.accessRole === 'owner'}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}

            <div className="tp-mobile-trip-list-actions">
              {hiddenTripCount > 0 && (
                <Button variant="secondary" onClick={() => setShowAllTrips(true)}>
                  顯示更多 {hiddenTripCount}
                </Button>
              )}
              {showAllTrips && sortedAndFilteredTrips.length > 6 && (
                <Button variant="ghost" onClick={() => setShowAllTrips(false)}>
                  收合列表
                </Button>
              )}
            </div>
          </div>
        </section>

        <nav className="tp-mobile-trips-dock" aria-label="旅程快速導覽">
          <button type="button" className="is-active" aria-current="page">
            <Compass size={20} />
            <span>旅程</span>
          </button>
          <button type="button" onClick={focusNewTripTitle}>
            <Plus size={20} />
            <span>新增</span>
          </button>
          <button type="button" onClick={focusJoinTripCode}>
            <KeyRound size={19} />
            <span>加入</span>
          </button>
          <button
            type="button"
            onClick={continueTrip ? () => openTripDetail(continueTrip.id) : focusNewTripTitle}
          >
            <PlaneTakeoff size={19} />
            <span>繼續</span>
          </button>
        </nav>
      </section>

      <PageContainer className="tp-desktop-trips-shell tp-atlas-page-frame py-7 sm:py-10">
        <motion.section
          className="tp-panel tp-command-hero tp-story-command-hero relative mb-4 overflow-hidden p-5 pb-8 pt-6 sm:p-6 sm:pb-9"
          initial={{ opacity: 0, y: 12, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.65 }}
        >
          <div className="tp-command-hero-rule" />
          <div className="tp-command-hero-grid grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(340px,1fr)] lg:items-start xl:gap-7">
            <div className="tp-command-hero-intro min-w-0">
              <div className="flex min-w-0 items-start gap-3">
                <div className="tp-icon-chip">
                  <PlaneTakeoff size={19} />
                </div>
                <div className="min-w-0">
                  <span className="tp-story-eyebrow">TRIP LIBRARY</span>
                  <h1 className="tp-command-title">下一趟，一起排得更好</h1>
                  <p className="tp-command-subtitle">
                    {totalTripCount ? `共 ${totalTripCount} 趟旅程，其中 ${ownedTripCount} 趟由你管理` : '建立旅程，開始整理日期、地點與旅伴。'}
                  </p>
                </div>
              </div>

              <div className="tp-desktop-trips-account" aria-label="個人資訊">
                <div className="tp-desktop-trips-account-avatar" aria-hidden="true">
                  <UserRound size={18} />
                </div>
                <div className="min-w-0">
                  <span>旅人</span>
                  <strong>{accountDisplayName}</strong>
                  <small>{currentUser?.email || 'Trip Planner'}</small>
                </div>
                <div className="tp-desktop-trips-account-actions">
                  <button
                    type="button"
                    className="tp-desktop-trips-account-button"
                    onClick={handleStartNicknameEdit}
                  >
                    <Pencil size={14} />
                    修改
                  </button>
                  <button
                    type="button"
                    className="tp-desktop-trips-account-button is-danger"
                    onClick={logout}
                  >
                    <LogOut size={14} />
                    登出
                  </button>
                </div>
              </div>

              {isEditingNickname && (
                <form onSubmit={handleSaveNickname} className="tp-desktop-trips-nickname-form">
                  <label htmlFor="desktop-nickname-draft">暱稱</label>
                  <Input
                    id="desktop-nickname-draft"
                    {...plainTextInputProps}
                    value={nicknameDraft}
                    onChange={(event) => setNicknameDraft(event.target.value)}
                    placeholder="輸入顯示名稱"
                    enterKeyHint="done"
                    autoFocus
                  />
                  <div>
                    <button type="submit" disabled={isSavingNickname || !nicknameDraft.trim()}>
                      <Check size={14} />
                      儲存
                    </button>
                    <button type="button" onClick={handleCancelNicknameEdit} disabled={isSavingNickname}>
                      <X size={14} />
                      取消
                    </button>
                  </div>
                </form>
              )}

              <div className="tp-command-action-switch mt-5 grid grid-cols-2 gap-3" role="group" aria-label="選擇旅程操作">
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

            </div>

            <div className="tp-atlas-action-stack">
              <div className="tp-atlas-map-strip" aria-hidden="true" />
              <AnimatePresence mode="wait" initial={false}>
              {actionMode === 'create' ? (
                <motion.form
                  key="create-trip"
                  onSubmit={handleCreateTrip}
                  className="tp-command-action-form"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  onAnimationComplete={focusPendingTripActionInput}
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
                  className="tp-command-action-form"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  onAnimationComplete={focusPendingTripActionInput}
                >
                  <label className="sr-only" htmlFor="trip-invite-code">邀請碼</label>
                  <Input
                    id="trip-invite-code"
                    ref={joinTripInputRef}
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

            <div className="tp-command-hero-toolbar">
              <div className="tp-command-hero-search relative">
                <Search size={16} className="tp-command-search-icon" />
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

              {hasTrips && (
                <div className="relative w-full tp-command-hero-filters">
                  <div className="-mx-1 mt-0 flex gap-3 overflow-x-auto px-1 pb-2 no-scrollbar" aria-label="旅程篩選">
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
                </div>
              )}
            </div>
          </div>
        </motion.section>

        <InstallAppPrompt className="mb-4" />

        <section className="tp-list-body-shell mt-4 sm:mt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="tp-section-title">我的旅程</h2>
              {hasTrips && (
                <p className="tp-list-count-copy">
                  顯示 {sortedAndFilteredTrips.length} / {totalTripCount}
                </p>
              )}
            </div>
          </div>

          {cloudSyncWarning && (
            <div className="tp-semantic-banner tp-semantic-banner-warning" role="status" aria-live="polite">
              <AlertTriangle size={17} className="mt-0.5 shrink-0" />
              <p>{cloudSyncWarning}</p>
            </div>
          )}

            <div className="mt-5">
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
                className="tp-trip-stack grid gap-5 md:grid-cols-2 xl:grid-cols-3 xl:gap-6"
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

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
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
