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
  Pencil,
  PlaneTakeoff,
  Plus,
  Search,
  X,
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
  planning: { label: '閬?銝?, variant: 'warning' },
  ongoing: { label: '?葉', variant: 'success' },
  done: { label: '撌脣???, variant: 'muted' }
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
  if (!value) return '撠?湔';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '撠?湔';
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
  if (start) return `${start} ?箇`;
  if (end) return `${end} 蝯?`;
  return '?芾身摰??;
};

const getStatus = (status) => statusConfig[status] || statusConfig.planning;

const TripStatusBadge = ({ status }) => {
  const config = getStatus(status);
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

const accessRoleConfig = {
  owner: { label: '????, variant: 'info' },
  editor: { label: '?舐楊頛?, variant: 'success' },
  edit: { label: '?舐楊頛?, variant: 'success' },
  view: { label: '?航?', variant: 'muted' }
};

const TripAccessBadge = ({ role }) => {
  const config = accessRoleConfig[role] || accessRoleConfig.view;
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

const tripThemePresets = [
  {
    id: 'island',
    label: '瘚瑕雀??',
    keywords: ['okinawa', 'bali', 'hawaii', 'island', 'beach', 'ocean', 'sea', '瘝鼎', '撜?', '憭?憭?, '瘚?, '撜?, '瘝?'],
    primary: '4 83 95',
    secondary: '8 132 139',
    accent: '255 111 97',
    paper: '224 246 242'
  },
  {
    id: 'city',
    label: '???Ｙ揣',
    keywords: ['tokyo', 'osaka', 'seoul', 'london', 'paris', 'new york', 'city', '?曹漪', '憭折', '擐', '撌湧?', '?急', '蝝?', '??'],
    primary: '35 62 105',
    secondary: '12 111 134',
    accent: '255 126 84',
    paper: '230 238 246'
  },
  {
    id: 'mountain',
    label: '撅梁?頝臬?',
    keywords: ['mountain', 'alps', 'camp', 'hike', 'forest', 'swiss', '撅?, '璉格?', '?脩?', '?餃控', '?亥?', '?ㄚ'],
    primary: '27 85 72',
    secondary: '83 139 96',
    accent: '246 141 79',
    paper: '229 243 230'
  },
  {
    id: 'snow',
    label: '?芸???',
    keywords: ['snow', 'ski', 'winter', 'sapporo', 'hokkaido', '??, '皛', '??, '?剖?', '?絲??],
    primary: '28 78 112',
    secondary: '86 152 177',
    accent: '255 128 112',
    paper: '232 244 248'
  },
  {
    id: 'sunset',
    label: '?亥?祈楝',
    keywords: ['road', 'desert', 'sunset', 'california', 'australia', '?祈楝', '瘝?', '憭', '??', '瞉單散'],
    primary: '126 69 45',
    secondary: '190 107 64',
    accent: '255 111 97',
    paper: '247 236 223'
  },
  {
    id: 'food',
    label: '蝢??啣?',
    keywords: ['food', 'cafe', 'market', 'wine', 'restaurant', '蝢?', '?', '撣?', '擗輒', '??'],
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
    className={`touch-target tp-action-mode-button tp-press-feedback tp-hover-icon tp-tap-ripple group flex min-w-0 items-center gap-3 rounded-lg border px-4 py-3 text-left transition ${
      active
        ? 'border-brand-300 bg-white text-brand-800 shadow-sm ring-1 ring-brand-100 dark:border-brand-300/30 dark:bg-brand-100/65 dark:text-brand-900 dark:ring-brand-300/20'
        : 'border-[#e0e9e0] bg-white/70 text-stone-600 hover:border-brand-200 hover:bg-white hover:text-brand-800 hover:shadow-sm dark:border-brand-200/20 dark:bg-brand-100/40 dark:text-brand-800 dark:hover:border-brand-400/40 dark:hover:bg-brand-100/55'
    }`}
  >
    <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${active ? 'tp-soft-pulse bg-white/90 text-brand-700 shadow-sm dark:bg-brand-50/75 dark:text-brand-900' : 'bg-brand-50 text-stone-500 group-hover:text-brand-700 dark:bg-brand-100/50 dark:text-brand-700 dark:group-hover:text-brand-900'}`}>
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
    animate={{ scale: active ? 1.025 : 1 }}
    whileTap={{ scale: 0.96 }}
    transition={{ type: 'spring', stiffness: 520, damping: 36, mass: 0.55 }}
    className={`touch-target tp-filter-chip tp-press-feedback shrink-0 rounded-lg border px-3 py-2 text-sm font-black transition ${
      active
        ? 'border-brand-700 bg-brand-700 text-white shadow-sm dark:border-brand-800 dark:bg-brand-800 dark:text-brand-50'
        : 'border-[#e0e9e0] bg-white/80 text-stone-600 hover:border-brand-200 hover:bg-white hover:text-brand-800 hover:shadow-sm dark:border-brand-200/20 dark:bg-brand-100/45 dark:text-brand-800 dark:hover:border-brand-400/40 dark:hover:bg-brand-100/60'
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
    <Card as="article" interactive className="tp-trip-card overflow-hidden">
      <button
        type="button"
        onClick={onOpen}
        className="group/trip-card block w-full text-left"
        aria-label={`?? ${trip.title || '?芸??蝔?}`}
      >
        {showCover ? (
          <img
            src={coverImageUrl}
            alt={`${trip.title || '??'} 撠`}
            className="h-36 w-full object-cover transition-transform duration-500 group-hover/trip-card:scale-[1.04] sm:h-40"
            onError={onCoverError}
          />
        ) : (
          <div className="flex h-36 w-full items-center justify-center border-b border-[#e0e9e0] bg-[#f4f8f5] text-brand-700 sm:h-40 dark:border-brand-200/20 dark:bg-brand-50/50 dark:text-brand-900">
            <div className="rounded-lg bg-white/80 p-3 ring-1 ring-[#e0e9e0] supports-[backdrop-filter]:backdrop-blur dark:bg-brand-100/70 dark:ring-brand-300/20">
              <Compass size={28} />
            </div>
          </div>
        )}

        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-slate-900 dark:text-white">
                {trip.title || '?芸??蝔?}
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

          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-sky-50/80 px-4 py-3 dark:bg-sky-950/30">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">銵???/p>
              <p className="mt-1 font-bold text-slate-900 dark:text-white">{trip.eventCount || 0} ??/p>
            </div>
            <div className="rounded-lg bg-[#f4f8f5]/80 px-4 py-3 dark:bg-brand-100/45">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">?餈??/p>
              <p className="mt-1 font-bold text-slate-900 dark:text-white">{formatDateTime(trip.updatedAt)}</p>
            </div>
          </div>

          {trip.accessRole === 'view' && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#f4f8f5]/80 px-4 py-3 text-xs font-bold text-stone-600 dark:bg-brand-100/45 dark:text-brand-800">
              <ShieldCheck size={14} className="shrink-0" />
              <span className="truncate">?芾?亦?</span>
            </div>
          )}
        </div>
      </button>

      <div className="border-t border-[#e0e9e0] px-5 py-4 dark:border-brand-200/20">
        <div className={`flex items-center gap-2 ${canDelete ? 'justify-between' : 'justify-end'}`}>
          {canDelete && (
            <button
              type="button"
              onClick={onToggleExpanded}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-stone-500 hover:bg-brand-50 hover:text-stone-800 dark:text-brand-700 dark:hover:bg-brand-100/55 dark:hover:text-brand-900"
              aria-expanded={expanded}
            >
              {expanded ? '?嗅?蝞∠?' : '蝞∠?'}
              <ChevronDown size={14} className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>
          )}
          <Button variant="secondary" size="sm" onClick={onOpen}>
            ????
          </Button>
        </div>

        {expanded && canDelete && (
            <div className="mt-4 flex justify-end border-t border-[#e0e9e0] pt-4 dark:border-brand-200/20">
            <Button variant="danger" size="sm" onClick={onDelete} aria-label={`?芷 ${trip.title || '?芸??蝔?}`}>
              <Trash2 size={14} />
              ?芷??
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
        aria-label={`?? ${trip.title || '??'}`}
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
          <strong>{trip.title || '?芸??蝔?}</strong>
          <span className="tp-mobile-trip-row-date">
            <CalendarDays size={14} />
            <span>{formatDateRange(trip)}</span>
          </span>
          <span className="tp-mobile-trip-row-meta">
            <span>{trip.eventCount || 0} ??蝔?/span>
            <span>{formatDateTime(trip.updatedAt)}</span>
          </span>
        </span>
      </button>
      {canDelete && (
        <button
          type="button"
          className="tp-mobile-trip-row-delete"
          onClick={onDelete}
          aria-label={`?芷 ${trip.title || '??'}`}
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
  const mobileNewTripInputRef = useRef(null);
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
              title: trip.title || localTrip?.title || '?芸??蝔?,
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
        setCloudSyncWarning('?脩垢?郊?急?憭望?嚗迤?券＊蝷箸璈???蝔???渡???閰虫?甈～?);
        logger.warn('霈?蝡舀?蝔?銵典仃???寧?砍鞈?', error);
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
      { id: 'all', label: '?券', count: counts.all },
      { id: 'ongoing', label: '?葉', count: counts.ongoing },
      { id: 'planning', label: '閬?銝?, count: counts.planning },
      { id: 'owner', label: '?恣??, count: counts.owner },
      { id: 'editable', label: '?舐楊頛?, count: counts.editable },
      { id: 'readonly', label: '?航?', count: counts.readonly }
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
  const accountDisplayName = userProfile?.displayName || currentUser?.displayName || currentUser?.email || '撌脩??;
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
  const continueTripLabel = lastOpenedTrip ? '?亥?銝活閬?' : '?餈???';

  const focusActiveNewTripInput = () => {
    const targetInput = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
      ? mobileNewTripInputRef.current
      : newTripInputRef.current;
    targetInput?.focus();
  };

  const focusNewTripTitle = () => {
    setActionMode('create');
    if (typeof window !== 'undefined') {
      window.setTimeout(focusActiveNewTripInput, 0);
    }
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
        title: '撱箇???憭望?',
        description: '撌脣?皛暹?啗???隢?敺?閰艾?
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
        throw new Error('?隢Ⅳ撌脫??雿???敺?蝔?閮?);
      }
      setInviteCode('');
      setLastOpenedTripId(result.tripId);
      toast({
        variant: 'success',
        title: result.alreadyMember ? '雿歇蝬????銝? : '撌脣??交?蝔?,
        description: result.alreadyMember
          ? (result.tripTitle || '')
          : '?啜之摰嗆?颯????喳??
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
        title: '?⊥????',
        description: error.message || '隢Ⅱ隤?隢Ⅳ?臬甇?Ⅱ??
      });
    } finally {
      setIsJoiningInvite(false);
    }
  };

  const handleDeleteTrip = async (tripId) => {
    const target = trips.find((trip) => trip.id === tripId);
    if (!target) return;

    const shouldDelete = await confirm({
      title: '?芷??嚗?,
      description: `??{target.title}??敺璈??脩垢蝘駁嚗迨???⊥?敺拙??,
      confirmLabel: '?芷??',
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
        title: '撌脣?斗?蝔?,
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
        title: '?芷憭望?',
        description: '撌脣?敺拙?憪???隢?敺?閰艾?
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
    const nameError = validateRequiredText(nextName, '?梁迂', { maxLength: 120 });

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
        title: '?梁迂撌脫??,
        description: result.updated ? `撌脫??${result.updated} 頞?蝔葉?＊蝷箏?蝔晞 : '?唳?蝔?雿輻?蝔晞?
      });
      setIsEditingNickname(false);
    } catch (error) {
      toast({
        variant: 'danger',
        title: '?梁迂?湔憭望?',
        description: error.message || '隢?敺?閰艾?
      });
    } finally {
      setIsSavingNickname(false);
    }
  };

  return (
      <main className="tp-page-shell tp-list-shell">
      <div className="tp-atlas-side-rail" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      <section
        className={`tp-mobile-trips-shell ${continueTripTheme.className}`}
        style={continueTripHeroStyle}
        aria-label="Trips mobile dashboard"
      >
        <header
          className={`tp-mobile-trips-hero ${continueTripTheme.className} ${continueTripCoverImageUrl ? 'has-trip-cover' : continueTrip ? 'has-trip-theme' : ''}`}
        >
          <div className="tp-mobile-trips-route" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="tp-mobile-trips-topline">
            <div className="min-w-0">
              <span className="tp-mobile-trips-eyebrow">{continueTrip ? continueTripTheme.label : 'Coastal Atlas'}</span>
              <h1>Trips</h1>
            </div>
            <button
              type="button"
              className="tp-mobile-trips-logout"
              onClick={logout}
            >
              ?餃
            </button>
          </div>

          <div className="tp-mobile-trips-account">
            <div className="min-w-0">
              <span>?犖</span>
              <strong>{accountDisplayName}</strong>
              <small>{currentUser?.email || 'Trip Planner'}</small>
            </div>
            <button
              type="button"
              onClick={handleStartNicknameEdit}
              aria-label="靽格?梁迂"
              title="靽格?梁迂"
            >
              <Pencil size={17} />
            </button>
          </div>

          {isEditingNickname && (
            <form onSubmit={handleSaveNickname} className="tp-mobile-trips-nickname-form">
              <label htmlFor="mobile-nickname-draft">?梁迂</label>
              <Input
                id="mobile-nickname-draft"
                {...plainTextInputProps}
                value={nicknameDraft}
                onChange={(event) => setNicknameDraft(event.target.value)}
                placeholder="頛詨憿舐內?迂"
                enterKeyHint="done"
                autoFocus
              />
              <div>
                <button type="submit" disabled={isSavingNickname || !nicknameDraft.trim()}>
                  <Check size={15} />
                  ?脣?
                </button>
                <button type="button" onClick={handleCancelNicknameEdit} disabled={isSavingNickname}>
                  <X size={15} />
                  ??
                </button>
              </div>
            </form>
          )}

        </header>

        <section className="tp-mobile-trips-sheet" aria-label="????">
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
              <span>{continueTrip ? continueTripLabel : '敹恍?憪?}</span>
              <strong>{continueTrip?.title || '撱箇?蝚砌?頞?蝔?}</strong>
              <small>{continueTrip ? formatDateRange(continueTrip) : '????????渡??其?韏?}</small>
            </span>
            <span className="tp-mobile-trips-continue-count">
              <strong>{continueTrip?.eventCount || totalTripCount || 0}</strong>
              <small>{continueTrip ? '銵?' : '??'}</small>
            </span>
          </button>

          <div className="tp-mobile-action-tabs" role="group" aria-label="????">
            <button
              type="button"
              className={actionMode === 'create' ? 'is-active' : ''}
              onClick={focusNewTripTitle}
              aria-pressed={actionMode === 'create'}
            >
              <Plus size={18} />
              ?啣?
            </button>
            <button
              type="button"
              className={actionMode === 'join' ? 'is-active' : ''}
              onClick={() => setActionMode('join')}
              aria-pressed={actionMode === 'join'}
            >
              <KeyRound size={17} />
              ?
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
              >
                <label className="sr-only" htmlFor="mobile-new-trip-title">?啣????迂</label>
                <Input
                  id="mobile-new-trip-title"
                  ref={mobileNewTripInputRef}
                  {...plainTextInputProps}
                  value={newTripTitle}
                  onChange={(event) => setNewTripTitle(event.target.value)}
                  placeholder="靘?嚗?蝜拙??交?銵?
                  enterKeyHint="go"
                />
                <Button type="submit" className="justify-center">
                  <Plus size={18} />
                  撱箇?
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
              >
                <label className="sr-only" htmlFor="mobile-trip-invite-code">?隢Ⅳ</label>
                <Input
                  id="mobile-trip-invite-code"
                  {...inviteCodeInputProps}
                  value={inviteCode}
                  onChange={(event) => setInviteCode(normalizeInviteCodeInput(event.target.value))}
                  placeholder="YK82-P7Q9"
                  className="font-mono uppercase"
                />
                <Button type="submit" disabled={isJoiningInvite || inviteCode.replace('-', '').length !== 8} className="justify-center">
                  <KeyRound size={16} />
                  {isJoiningInvite ? '?銝? : '?'}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

        </section>

        <section className="tp-mobile-trips-search-panel" aria-label="???祟??>
          <div className="tp-mobile-trip-search">
            <Search size={17} aria-hidden="true" />
            <label className="sr-only" htmlFor="mobile-trip-search">????</label>
            <Input
              id="mobile-trip-search"
              {...searchInputProps}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="??????????
            />
          </div>

          {hasTrips && (
            <div className="tp-mobile-trip-filters" aria-label="??蝭拚">
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

        <section className="tp-mobile-trips-list-panel" aria-label="???”">
          <div className="tp-mobile-trips-list-heading">
            <div>
              <span>Journey stack</span>
              <h2>雿???</h2>
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
                title={hasTrips && (hasSearch || hasActiveFilter) ? '?曆??啁泵??隞嗥???' : '????蝔?}
                actionLabel={hasTrips && hasSearch ? '皜??' : hasTrips && hasActiveFilter ? '憿舐內?券' : '撱箇???'}
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
                  憿舐內?游? {hiddenTripCount}
                </Button>
              )}
              {showAllTrips && sortedAndFilteredTrips.length > 6 && (
                <Button variant="ghost" onClick={() => setShowAllTrips(false)}>
                  ?嗅??”
                </Button>
              )}
            </div>
          </div>
        </section>

        <nav className="tp-mobile-trips-dock" aria-label="??敹恍?閬?>
          <button type="button" className="is-active" aria-current="page">
            <Compass size={20} />
            <span>??</span>
          </button>
          <button type="button" onClick={focusNewTripTitle}>
            <Plus size={20} />
            <span>?啣?</span>
          </button>
          <button type="button" onClick={() => setActionMode('join')}>
            <KeyRound size={19} />
            <span>?</span>
          </button>
          <button
            type="button"
            onClick={continueTrip ? () => openTripDetail(continueTrip.id) : focusNewTripTitle}
          >
            <PlaneTakeoff size={19} />
            <span>蝜潛?</span>
          </button>
        </nav>
      </section>

      <PageContainer
        className="tp-desktop-trips-shell tp-atlas-page-frame py-7 sm:py-10"
      >

        <motion.section
          className="tp-panel tp-command-hero relative mb-4 overflow-hidden p-5 pb-8 pt-6 sm:p-6 sm:pb-9"
          initial={{ opacity: 0, y: 12, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.65 }}
        >
          <div className="tp-command-hero-rule absolute inset-x-0 top-0 h-px bg-[#e0e9e0] dark:bg-brand-300/25" />
          <div className="tp-command-hero-grid grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(340px,1fr)] lg:items-start xl:gap-7">
            <div className="tp-command-hero-intro min-w-0">
              <div className="flex min-w-0 items-start gap-3">
                <div className="tp-icon-chip">
                  <PlaneTakeoff size={19} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-black text-stone-800 dark:text-brand-900">??撠??/h1>
                  <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                    {totalTripCount ? `撌脫憟?${totalTripCount} 頞?蝔?${ownedTripCount} 頞雿恣? : '???喳??寞?脖?'}
                  </p>
                </div>
              </div>

              <div className="tp-command-action-switch mt-5 grid grid-cols-2 gap-3" role="group" aria-label="?豢?????">
                <ActionModeButton
                  active={actionMode === 'create'}
                  icon={Plus}
                  title="撱箇?"
                  meta="??餅憟?
                  onClick={() => setActionMode('create')}
                />
                <ActionModeButton
                  active={actionMode === 'join'}
                  icon={KeyRound}
                  title="?"
                  meta="??隡港?韏?
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
                  className="grid gap-4 rounded-lg border border-[#e0e9e0] bg-white/80 p-4 shadow-sm supports-[backdrop-filter]:backdrop-blur sm:grid-cols-[1fr_auto] dark:border-brand-200/20 dark:bg-brand-50/70"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                >
                  <label className="sr-only" htmlFor="new-trip-title">?啁????迂</label>
                  <Input
                    id="new-trip-title"
                    ref={newTripInputRef}
                    {...plainTextInputProps}
                    value={newTripTitle}
                    onChange={(event) => setNewTripTitle(event.target.value)}
                    placeholder="靘?嚗?026 ?曹漪鞈姣"
                    enterKeyHint="go"
                  />
                  <Button type="submit" className="justify-center">
                    <Plus size={18} />
                    撱箇???
                  </Button>
                </motion.form>
              ) : (
                <motion.form
                  key="join-trip"
                  onSubmit={handleJoinByInviteCode}
                  className="grid gap-4 rounded-lg border border-[#e0e9e0] bg-white/80 p-4 shadow-sm supports-[backdrop-filter]:backdrop-blur sm:grid-cols-[1fr_auto] dark:border-brand-200/20 dark:bg-brand-50/70"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                >
                  <label className="sr-only" htmlFor="trip-invite-code">?隢Ⅳ</label>
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
                    {isJoiningInvite ? '?銝?..' : '???'}
                  </Button>
                </motion.form>
              )}
              </AnimatePresence>
            </div>

            <div className="tp-command-hero-toolbar">
              <div className="tp-command-hero-search relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <label className="sr-only" htmlFor="trip-search">????</label>
                <Input
                  id="trip-search"
                  {...searchInputProps}
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="???迂?????交?"
                  className="pl-9"
                />
              </div>

              {hasTrips && (
                <div className="relative w-full tp-command-hero-filters">
                  <div className="-mx-1 mt-0 flex gap-3 overflow-x-auto px-1 pb-2 no-scrollbar" aria-label="??蝭拚">
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
              <h2 className="tp-section-title">????</h2>
              {hasTrips && (
                <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                  憿舐內 {sortedAndFilteredTrips.length} / {totalTripCount}
                </p>
              )}
            </div>
          </div>

          {cloudSyncWarning && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100" role="status" aria-live="polite">
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
                title={hasTrips && (hasSearch || hasActiveFilter) ? '?曆??啁泵??隞嗥???' : '?桀?撠??'}
                actionLabel={hasTrips && hasSearch ? '皜??' : hasTrips && hasActiveFilter ? '?亦??券' : '?啣?蝚砌???蝔?}
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
                  ?亦??游???嚗?{hiddenTripCount}嚗?
                </Button>
              )}
              {showAllTrips && sortedAndFilteredTrips.length > 6 && (
                <Button variant="ghost" onClick={() => setShowAllTrips(false)}>
                  ?嗅????”
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
