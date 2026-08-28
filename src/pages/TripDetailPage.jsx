import React, { Suspense, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  CalendarDays,
  ChevronLeft,
  Plus,
  Save,
  Settings,
  UsersRound,
  Lightbulb,
  Map as MapIcon,
  Menu as MenuIcon
} from 'lucide-react';
import Header from '../components/Header';
import WeatherWidget from '../components/WeatherWidget';
import Modal from '../components/Modal';
import BottomNavigation from '../components/BottomNavigation';
import TodayTab from '../components/trip/TodayTab';
import ItineraryTab from '../components/trip/ItineraryTab';
import IdeasTab from '../components/trip/IdeasTab';
import {
  DesktopMapOverview,
  DesktopPlannerPanel,
  DesktopWorkspaceRail
} from '../components/trip/DesktopWorkspace';
import {
  PermissionBanner,
  SyncStatusBanner
} from '../components/trip/WorkspaceStatusBanners';
import { TripWorkspaceProvider } from '../contexts/TripWorkspaceContext';
import { useTrip } from '../hooks/useTrip';
import { useTripPresence } from '../hooks/useTripPresence';
import { useTripRealtime } from '../hooks/useTripRealtime';
import { useBudget } from '../hooks/useBudget';
import { useDeviceLocation } from '../hooks/useDeviceLocation';
import { useTripAiRecommendations } from '../hooks/useTripAiRecommendations';
import { useTripHandbook } from '../hooks/useTripHandbook';
import { fetchJPYRate } from '../services/currencyService';
import { buildGoogleMapsDirectionsUrl, buildGoogleMapsSearchUrl } from '../services/googleMapsService';
import {
  deleteTripChecklistItemDocument,
  deleteTripEventDocument,
  deleteTripExpenseDocument,
  deleteTripPlaceIdeaDocument,
  deleteTripShoppingCategoryDocument,
  deleteTripShoppingItemDocument,
  moveTripChecklistItemDocument,
  moveTripEventDocument,
  moveTripShoppingItemDocument,
  saveTripChecklistItemDocument,
  saveTripEventDocument,
  saveTripExpenseDocument,
  saveTripPlaceIdeaDocument,
  saveTripShoppingCategoryDocument,
  saveTripShoppingItemDocument,
  updateTripAccommodationFields,
  updateTripBudgetFields,
  updateTripCollaborationSettings,
  updateTripDayFields,
  updateTripFlightsFields,
  updateTripMetaFields
} from '../services/tripService';
import { createEmptyItinerary } from '../domain/tripSchema';
import {
  getTripDayDisplayLabel,
  getTripDayDisplayTitle,
  getTripDayLabelByNumber,
  getTripDisplayDates,
  isGenericTripDayTitle
} from '../utils/tripDates';
import { getTripDayIsoDate } from '../utils/tripEvents';
import { getTripDetailsPatchSections } from '../utils/tripDetailsPatch';
import { normalizeCoverImageUrl } from '../utils/coverImage';
import { buildPresenceUiState } from '../utils/presence';
import { moveEventInDay, moveEventToDay } from '../utils/itineraryEvents';
import { lazyWithReload } from '../utils/lazyComponent';
import { buildSyncConflictSummary } from '../utils/tripSync';
import {
  getAppendOrderKey,
  getEventOrderKeyAtIndex,
  getOrderKeyBetween,
  makeTripEventId
} from '../utils/tripEventDocuments';
import { getItemOrderKeyBetween } from '../utils/tripItemDocuments';
import {
  createEventFromAiRecommendation,
  createPlaceFromAiRecommendation
} from '../utils/tripAiRecommendations';
import { getPermissionDeniedToast, isPermissionDeniedError } from '../utils/persistenceErrors';
import { readStoredAppTheme, saveAppTheme } from '../utils/appTheme';
import { Button, ErrorState, LoadingState, PageContainer } from '../components/ui';
import { useFeedback } from '../contexts/FeedbackContext';
import { useAuth } from '../contexts/AuthContext';
import {
  INTERFACE_SIZE_STORAGE_KEY,
  LAST_OPENED_TRIP_KEY,
  getTripIndexKey
} from '../utils/storageKeys';
import { logger } from '../utils/logger';

const EditEventForm = lazyWithReload(() => import('../components/EditEventForm'));
const EventDetailView = lazyWithReload(() => import('../components/EventDetailView'));
const SettingsPanel = lazyWithReload(() => import('../components/SettingsPanel'));
const SummaryTab = lazyWithReload(() => import('../components/trip/SummaryTab'));
const MoreTab = lazyWithReload(() => import('../components/trip/MoreTab'));
const LogisticsTab = lazyWithReload(() => import('../components/trip/LogisticsTab'));
const PreTripTab = lazyWithReload(() => import('../components/trip/PreTripTab'));
const PackingTab = lazyWithReload(() => import('../components/trip/PackingTab'));
const ShoppingTab = lazyWithReload(() => import('../components/trip/ShoppingTab'));
const ExpensesTab = lazyWithReload(() => import('../components/trip/ExpensesTab'));
const TripAiRecommendationPanel = lazyWithReload(() => import('../components/trip/TripAiRecommendationPanel'));
const TripHandbookModal = lazyWithReload(() => import('../components/trip/TripHandbookModal'));

const ModuleFallback = ({ label = '載入功能中...' }) => (
  <div className="flex min-h-40 items-center justify-center px-5 py-8" role="status">
    <LoadingState label={label} />
  </div>
);

const RATE_CACHE_KEY = 'trip_planner_jpy_rate_cache';
const RATE_REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 小時
const RATE_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 小時
const MAX_AUTO_GENERATED_DAYS = 30;
const MORE_CHILD_TABS = new Set(['summary', 'flights', 'preTrip', 'packing', 'expenses', 'shopping', 'companions']);
const MOBILE_DETAIL_TABS = [
  { id: 'today', label: '旅程總覽', icon: CalendarDays },
  { id: 'itinerary', label: '行程安排', icon: MapIcon },
  { id: 'ideas', label: '靈感', icon: Lightbulb },
  { id: 'more', label: '更多', icon: MenuIcon }
];
const mobileDetailThemePresets = [
  {
    id: 'coast',
    keywords: ['beach', 'coast', 'ocean', 'sea', 'island', 'okinawa', 'bali', 'hawaii'],
    primary: '4 83 95',
    secondary: '8 132 139',
    accent: '255 111 97',
    paper: '224 246 242'
  },
  {
    id: 'city',
    keywords: ['tokyo', 'osaka', 'seoul', 'london', 'paris', 'new york', 'city'],
    primary: '35 62 105',
    secondary: '12 111 134',
    accent: '255 126 84',
    paper: '230 238 246'
  },
  {
    id: 'trail',
    keywords: ['mountain', 'alps', 'camp', 'hike', 'forest', 'swiss'],
    primary: '27 85 72',
    secondary: '83 139 96',
    accent: '246 141 79',
    paper: '229 243 230'
  },
  {
    id: 'winter',
    keywords: ['snow', 'ski', 'winter', 'sapporo', 'hokkaido'],
    primary: '28 78 112',
    secondary: '86 152 177',
    accent: '255 128 112',
    paper: '232 244 248'
  },
  {
    id: 'sunset',
    keywords: ['road', 'desert', 'sunset', 'california', 'australia'],
    primary: '126 69 45',
    secondary: '190 107 64',
    accent: '255 111 97',
    paper: '247 236 223'
  }
];
const mobileDetailStatusLabels = {
  planning: 'Planning',
  ongoing: 'On trip',
  done: 'Archived'
};
const sameJsonValue = (left, right) => JSON.stringify(left ?? null) === JSON.stringify(right ?? null);

const getWeatherEventLocation = (event) => {
  const location = event?.locationPlace || event?.location?.name || event?.location || '';
  return typeof location === 'string' ? location.trim() : '';
};

const getMobileDetailTheme = (details = {}) => {
  const rawTitle = String(details?.title || '').toLowerCase();
  const match = mobileDetailThemePresets.find((theme) =>
    theme.keywords.some((keyword) => rawTitle.includes(keyword))
  );
  const hashBase = rawTitle || details?.status || 'atlas';
  const hash = Array.from(hashBase).reduce((total, char) => total + char.charCodeAt(0), 0);
  const theme = match || mobileDetailThemePresets[hash % mobileDetailThemePresets.length] || mobileDetailThemePresets[0];

  return {
    id: theme.id,
    style: {
      '--tp-mobile-detail-primary': theme.primary,
      '--tp-mobile-detail-secondary': theme.secondary,
      '--tp-mobile-detail-accent': theme.accent,
      '--tp-mobile-detail-paper': theme.paper
    }
  };
};

const getDateRangeDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
};

const buildAutoItineraryFromDateRange = (existingItinerary, startDate, endDate) => {
  const dayCount = Math.min(getDateRangeDays(startDate, endDate), MAX_AUTO_GENERATED_DAYS);
  if (dayCount <= 0) return existingItinerary;

  const start = new Date(`${startDate}T00:00:00`);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return Array.from({ length: dayCount }, (_, index) => {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + index);
    const legacyDay = existingItinerary[index];

    return {
      day: index + 1,
      date: `${currentDate.getMonth() + 1}/${currentDate.getDate()}`,
      weekday: weekdays[currentDate.getDay()],
      title: legacyDay?.title || `Day ${index + 1}`,
      events: legacyDay?.events || []
    };
  });
};

const applyDayMetaPatchToItinerary = (itinerary = [], dayNumber, patch = {}) => (
  (Array.isArray(itinerary) ? itinerary : []).map((day) => (
    Number(day?.day) === Number(dayNumber)
      ? { ...day, ...patch }
      : day
  ))
);

const syncTripMetaToLocalIndex = (tripId, patch, uid) => {
  try {
    const storageKey = getTripIndexKey(uid);
    const raw = localStorage.getItem(storageKey);
    const list = raw ? JSON.parse(raw) : [];
    const safeList = Array.isArray(list) ? list : [];
    const targetIndex = safeList.findIndex((trip) => trip.id === tripId);

    if (targetIndex >= 0) {
      safeList[targetIndex] = {
        ...safeList[targetIndex],
        ...patch,
        updatedAt: new Date().toISOString()
      };
    } else {
      safeList.push({
        id: tripId,
        title: patch.title || '未命名旅程',
        status: patch.status || 'planning',
        coverImage: patch.coverImage || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    localStorage.setItem(storageKey, JSON.stringify(safeList));
  } catch (error) {
    logger.warn('更新旅程索引失敗:', error);
  }
};

const buildTravelersFromMembers = (members = [], currentUser = null, userProfile = null) => {
  const memberRows = Array.isArray(members) ? members : [];
  const travelers = memberRows
    .map((member) => ({
      id: member.uid || member.id || member.email || '',
      uid: member.uid || '',
      name: member.displayName || member.email || member.uid || '',
      email: member.email || '',
      role: member.role || 'view'
    }))
    .filter((traveler) => traveler.id && traveler.name);

  if (travelers.length) return travelers;

  if (!currentUser?.uid) return [];
  return [{
    id: currentUser.uid,
    uid: currentUser.uid,
    name: userProfile?.displayName || currentUser.displayName || currentUser.email || 'Traveler',
    email: currentUser.email || '',
    role: 'owner'
  }];
};

const readRealtimeActivityMs = (activity = {}) => {
  const value = activity.updatedAt || activity.createdAt;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const TripDetailPage = () => {
  const { tripId: paramTripId } = useParams();
  const tripId = typeof paramTripId === 'string' ? paramTripId.trim() : '';
  const navigate = useNavigate();
  const location = useLocation();
  const { confirm, toast } = useFeedback();
  const { currentUser, userProfile, updateDisplayName, logout } = useAuth();
  const legacyShareToken = useMemo(
    () => new URLSearchParams(location.search).get('share') || '',
    [location.search]
  );
  const [activeTab, setActiveTab] = useState(() => location.state?.initialTab || 'today');
  const [selectedDay, setSelectedDay] = useState(1);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isEventViewMode, setIsEventViewMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isShoppingModalOpen, setIsShoppingModalOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(readStoredAppTheme);
  const [interfaceSize, setInterfaceSize] = useState(() => localStorage.getItem(INTERFACE_SIZE_STORAGE_KEY) || 'medium');
  const [enableGPS, setEnableGPS] = useState(false);
  const [selectedEventLocation, setSelectedEventLocation] = useState(null);
  const [isEditingDayMeta, setIsEditingDayMeta] = useState(false);
  const [dayMetaDraft, setDayMetaDraft] = useState({ title: '', date: '' });
  const [coverImageLoadFailed, setCoverImageLoadFailed] = useState(false);
  const [showSecondaryModules, setShowSecondaryModules] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(0.215);
  const [lastUpdateDate, setLastUpdateDate] = useState('');
  const [isRateUpdating, setIsRateUpdating] = useState(false);
  const [rateUpdateError, setRateUpdateError] = useState('');
  const shoppingListRef = useRef(null);
  const expenseTrackerRef = useRef(null);

  // 初始旅程資料結構
  const defaultTripDetails = useMemo(() => ({
    title: '',
    dates: '',
    dateRange: { start: '', end: '' },
    status: 'planning',
    coverImage: '',
    budget: {
      total: ''
    },
    accommodation: {},
    flights: {},
    travelers: []
  }), []);

  const defaultItinerary = useMemo(() => createEmptyItinerary(), []);

  const { 
    isLoading, 
    tripDetails, 
    applyTripDetailsPatch,
    setTripDetails,
    itinerary, 
    setItinerary, 
    applyItineraryPatch,
    checklists, 
    applyChecklistsPatch,
    setChecklists,
    expenses,
    applyExpensesPatch,
    setExpenses,
    shoppingList,
    applyShoppingListPatch,
    setShoppingList,
    shoppingCategories,
    applyShoppingCategoriesPatch,
    setShoppingCategories,
    placePool,
    applyPlacePoolPatch,
    setPlacePool,
    collaboration,
    applyCollaborationPatch,
    setCollaboration,
    accessError,
    accessRole,
    canEdit,
    isReadOnly,
    members,
    syncConflict,
    resolveConflict,
    isSaving,
    saveError,
    saveNow,
    clientId
  } = useTrip(tripId, defaultTripDetails, defaultItinerary, {
    currentUser,
    userProfile
  });
  const [isSavingTripDetails, setIsSavingTripDetails] = useState(false);
  const tripDetailsRef = useRef(tripDetails);
  const collaborationRef = useRef(collaboration);
  const tripDetailsSaveCountRef = useRef(0);
  const seenCollaborationActivityIdsRef = useRef(new Set());
  const collaborationActivityTripIdRef = useRef('');
  const collaborationActivityReadyRef = useRef(false);
  const collaborationActivityStartedAtRef = useRef(Date.now());

  useEffect(() => {
    tripDetailsRef.current = tripDetails;
  }, [tripDetails]);

  useEffect(() => {
    collaborationRef.current = collaboration;
  }, [collaboration]);
  const {
    onlineMembers,
    presenceByUid,
    presenceError,
    updatePresenceEditingTarget
  } = useTripPresence({
    tripId,
    currentUser,
    clientId,
    userProfile,
    accessRole,
    activeTab,
    enabled: !isLoading && !accessError
  });
  const {
    placeVotesByPlaceId,
    checklistStatusByListId,
    shoppingItemStatusById,
    realtimeEditingByTarget,
    recentActivities,
    isRealtimeEnabled,
    realtimeError,
    updateRealtimeEditingTarget,
    publishChecklistItemStatus,
    publishShoppingItemStatus
  } = useTripRealtime({
    tripId,
    currentUser,
    accessRole,
    activeTab,
    enabled: !isLoading && !accessError
  });

  useEffect(() => {
    const activities = Array.isArray(recentActivities) ? recentActivities : [];
    const seenIds = seenCollaborationActivityIdsRef.current;

    if (collaborationActivityTripIdRef.current !== tripId) {
      seenIds.clear();
      collaborationActivityTripIdRef.current = tripId;
      collaborationActivityReadyRef.current = false;
      collaborationActivityStartedAtRef.current = Date.now();
    }

    const startedAt = collaborationActivityStartedAtRef.current;
    if (!collaborationActivityReadyRef.current) {
      activities.forEach((activity) => {
        if (activity?.id && readRealtimeActivityMs(activity) <= startedAt) {
          seenIds.add(activity.id);
        }
      });
      collaborationActivityReadyRef.current = true;
    }

    const currentUid = currentUser?.uid || '';
    const newActivities = activities
      .filter((activity) => (
        activity?.type === 'collaboration-update'
        && activity.id
        && !seenIds.has(activity.id)
        && readRealtimeActivityMs(activity) > startedAt
      ))
      .reverse();

    newActivities.forEach((activity) => {
      seenIds.add(activity.id);
      if (activity.actorUid && activity.actorUid === currentUid) return;

      toast({
        variant: 'info',
        title: activity.title || '協作更新',
        description: activity.body || '',
        duration: 4200,
        size: 'compact'
      });
    });

    if (seenIds.size > 240) {
      const recentIds = activities
        .map((activity) => activity?.id)
        .filter(Boolean);
      seenCollaborationActivityIdsRef.current = new Set(recentIds);
    }
  }, [currentUser?.uid, recentActivities, toast, tripId]);

  const beginTripDetailsSave = useCallback(() => {
    tripDetailsSaveCountRef.current += 1;
    setIsSavingTripDetails(true);

    return () => {
      tripDetailsSaveCountRef.current = Math.max(0, tripDetailsSaveCountRef.current - 1);
      if (!tripDetailsSaveCountRef.current) {
        setIsSavingTripDetails(false);
      }
    };
  }, []);

  const handleDocumentPersistenceError = useCallback((error, {
    label = '這次變更',
    fallback = null,
    deniedLogMessage = 'Document write denied; skipping root trip autosave fallback.',
    fallbackLogMessage = 'Document write failed; falling back to full trip autosave.'
  } = {}) => {
    if (isPermissionDeniedError(error)) {
      logger.warn(deniedLogMessage, error);
      toast(getPermissionDeniedToast(label));
      return false;
    }

    logger.warn(fallbackLogMessage, error);
    fallback?.();
    toast({
      variant: 'warning',
      title: '改用完整儲存',
      description: '子文件儲存失敗，已改用完整旅程儲存。'
    });
    return true;
  }, [toast]);

  const handleTripDetailsChange = useCallback((updater) => {
    if (!canEdit) {
      setTripDetails(updater);
      return;
    }

    const previousTripDetails = tripDetailsRef.current || {};
    const nextValue = typeof updater === 'function'
      ? updater(previousTripDetails)
      : updater;
    const patch = getTripDetailsPatchSections(previousTripDetails, nextValue || {});
    const nextTripDetails = patch.nextTripDetails;
    const fallbackToTripSave = () => {
      tripDetailsRef.current = nextTripDetails;
      setTripDetails(nextTripDetails);
    };

    if (!patch.changed.any) return;

    if (!tripId || !currentUser?.uid || patch.changed.untracked) {
      fallbackToTripSave();
      return;
    }

    tripDetailsRef.current = nextTripDetails;
    applyTripDetailsPatch(nextTripDetails);

    const operations = [];

    if (patch.changed.meta) {
      operations.push(updateTripMetaFields({
        tripId,
        tripDetails: nextTripDetails,
        user: currentUser,
        clientId
      }));
    }

    if (patch.changed.accommodation) {
      operations.push(updateTripAccommodationFields({
        tripId,
        accommodation: patch.accommodation,
        user: currentUser,
        clientId
      }));
    }

    if (patch.changed.flights) {
      operations.push(updateTripFlightsFields({
        tripId,
        flights: patch.flights,
        user: currentUser,
        clientId
      }));
    }

    if (patch.changed.budget) {
      operations.push(updateTripBudgetFields({
        tripId,
        budget: patch.budget,
        user: currentUser,
        clientId
      }));
    }

    if (!operations.length) return;

    const finishTripDetailsSave = beginTripDetailsSave();

    void Promise.all(operations).catch((error) => {
      if (isPermissionDeniedError(error)) {
        handleDocumentPersistenceError(error, {
          label: '旅程資訊更新',
          deniedLogMessage: 'Trip detail field update denied; skipping root trip autosave fallback.'
        });
        return;
      }

      logger.warn('Trip detail field update failed; falling back to full trip autosave.', error);
      fallbackToTripSave();
      toast({
        variant: 'warning',
        title: '已改用完整儲存',
        description: '局部同步失敗，已退回原本的旅程儲存。'
      });
    }).finally(finishTripDetailsSave);
  }, [
    applyTripDetailsPatch,
    beginTripDetailsSave,
    canEdit,
    clientId,
    currentUser,
    handleDocumentPersistenceError,
    setTripDetails,
    toast,
    tripId
  ]);

  const handleCollaborationChange = useCallback((updater) => {
    if (accessRole !== 'owner') {
      toast({
        variant: 'warning',
        title: '沒有管理權限',
        description: '只有旅程擁有者可以調整分享與協作設定。'
      });
      return;
    }

    const previousCollaboration = collaborationRef.current || {};
    const nextCollaboration = typeof updater === 'function'
      ? updater(previousCollaboration)
      : updater;

    if (sameJsonValue(previousCollaboration, nextCollaboration)) return;

    const fallbackToTripSave = () => {
      collaborationRef.current = nextCollaboration;
      setCollaboration(nextCollaboration);
    };

    if (!tripId || !currentUser?.uid) {
      fallbackToTripSave();
      return;
    }

    collaborationRef.current = nextCollaboration;
    applyCollaborationPatch(nextCollaboration);

    void updateTripCollaborationSettings({
      tripId,
      collaboration: nextCollaboration,
      user: currentUser,
      clientId
    }).catch((error) => {
      if (isPermissionDeniedError(error)) {
        handleDocumentPersistenceError(error, {
          label: '協作設定更新',
          deniedLogMessage: 'Trip collaboration setting update denied; skipping root trip autosave fallback.'
        });
        return;
      }

      logger.warn('Trip collaboration setting update failed; falling back to full trip autosave.', error);
      fallbackToTripSave();
      toast({
        variant: 'warning',
        title: '已改用完整儲存',
        description: '協作設定局部同步失敗，已退回原本的旅程儲存。'
      });
    });
  }, [
    accessRole,
    applyCollaborationPatch,
    clientId,
    currentUser,
    handleDocumentPersistenceError,
    setCollaboration,
    toast,
    tripId
  ]);

  const tripAi = useTripAiRecommendations({
    tripId,
    selectedDay,
    canEdit,
    toast
  });
  const tripHandbook = useTripHandbook({
    tripId,
    canEdit,
    toast
  });

  useEffect(() => {
    const initialTab = location.state?.initialTab;
    const focusTarget = location.state?.focusTarget;
    if (isLoading || accessError || (!initialTab && !focusTarget)) return undefined;
    const targetTab = focusTarget === 'placeIdeas' ? 'ideas' : initialTab;

    if (targetTab && activeTab !== targetTab) {
      setActiveTab(targetTab);
      return undefined;
    }

    if (focusTarget === 'placeIdeas' && activeTab === 'ideas') {
      const timer = window.setTimeout(() => {
        document.getElementById('trip-place-ideas')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
        navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
      }, 150);

      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [
    activeTab,
    accessError,
    isLoading,
    location.pathname,
    location.search,
    location.state,
    navigate
  ]);
  const memberTravelers = useMemo(
    () => buildTravelersFromMembers(members, currentUser, userProfile),
    [members, currentUser, userProfile]
  );
  const presenceUi = useMemo(
    () => buildPresenceUiState({
      onlineMembers,
      presenceByUid,
      members,
      currentUser,
      realtimeEditingByTarget
    }),
    [onlineMembers, presenceByUid, members, currentUser, realtimeEditingByTarget]
  );
  const syncConflictSummary = useMemo(
    () => buildSyncConflictSummary({ syncConflict, members, currentUser }),
    [syncConflict, members, currentUser]
  );

  const budgetInfo = useBudget(itinerary, expenses, exchangeRate);
  const totalEvents = useMemo(
    () => itinerary.reduce((acc, day) => acc + day.events.length, 0),
    [itinerary]
  );

  // 使用 GPS Hook 獲取設備位置
  const { currentLocation, isLocating, locationError } = useDeviceLocation(enableGPS);

  useEffect(() => {
    if (!tripId) {
      navigate('/', { replace: true });
    }
  }, [tripId, navigate]);

  useEffect(() => {
    if (!tripId) return;

    syncTripMetaToLocalIndex(tripId, {
      title: tripDetails?.title || '未命名旅程',
      status: tripDetails?.status || 'planning',
      coverImage: tripDetails?.coverImage || ''
    }, currentUser?.uid);
  }, [tripId, currentUser?.uid]);

  useEffect(() => {
    if (!tripId) return;
    localStorage.setItem(LAST_OPENED_TRIP_KEY, tripId);
  }, [tripId]);

  useEffect(() => {
    if (!tripId) return;
    syncTripMetaToLocalIndex(tripId, {
      title: tripDetails?.title || '未命名旅程',
      status: tripDetails?.status || 'planning',
      coverImage: tripDetails?.coverImage || '',
      eventCount: totalEvents
    }, currentUser?.uid);
  }, [tripId, tripDetails?.title, tripDetails?.status, tripDetails?.coverImage, totalEvents, currentUser?.uid]);

  useEffect(() => {
    if (isLoading) return;

    const startDate = tripDetails?.dateRange?.start || '';
    const endDate = tripDetails?.dateRange?.end || '';
    const computedDays = getDateRangeDays(startDate, endDate);

    if (!computedDays) return;

    applyItineraryPatch((prev) => {
      if (!Array.isArray(prev)) return prev;

      const next = buildAutoItineraryFromDateRange(prev, startDate, endDate);
      if (next.length === prev.length) {
        const hasAnyDateMismatch = next.some((day, index) => day.date !== prev[index]?.date || day.weekday !== prev[index]?.weekday);
        if (!hasAnyDateMismatch) return prev;
      }
      return next;
    });

    setSelectedDay((prevSelectedDay) => Math.min(Math.max(prevSelectedDay, 1), computedDays));
  }, [tripDetails?.dateRange?.start, tripDetails?.dateRange?.end, isLoading, applyItineraryPatch]);


  useEffect(() => {
    saveAppTheme(currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    localStorage.setItem(INTERFACE_SIZE_STORAGE_KEY, interfaceSize);
  }, [interfaceSize]);

  useEffect(() => {
    const readRateCache = () => {
      try {
        const raw = localStorage.getItem(RATE_CACHE_KEY);
        if (!raw) return null;
        const cache = JSON.parse(raw);

        if (!cache || typeof cache.rate !== 'number' || !cache.updatedAt) {
          return null;
        }

        return cache;
      } catch (error) {
        logger.warn('讀取匯率快取失敗:', error);
        return null;
      }
    };

    const persistRateCache = (rate, updatedAt) => {
      try {
        localStorage.setItem(
          RATE_CACHE_KEY,
          JSON.stringify({
            rate,
            updatedAt
          })
        );
      } catch (error) {
        logger.warn('寫入匯率快取失敗:', error);
      }
    };

    const syncRate = async ({ silent = false } = {}) => {
      if (!silent) {
        setIsRateUpdating(true);
      }
      setRateUpdateError('');

      const result = await fetchJPYRate();
      if (result?.success && typeof result.rate === 'number') {
        const updatedAt = new Date().toISOString();
        setExchangeRate(result.rate);
        setLastUpdateDate(updatedAt);
        persistRateCache(result.rate, updatedAt);
      } else {
        setRateUpdateError('匯率更新失敗，已保留上次成功資料。');
      }

      if (!silent) {
        setIsRateUpdating(false);
      }
    };

    const cached = readRateCache();
    let shouldRefresh = true;

    if (cached) {
      setExchangeRate(cached.rate);
      setLastUpdateDate(cached.updatedAt);
      shouldRefresh = Date.now() - new Date(cached.updatedAt).getTime() > RATE_CACHE_TTL_MS;
    }

    if (!cached || shouldRefresh) {
      void syncRate({ silent: true });
    }

    const intervalId = window.setInterval(() => {
      void syncRate({ silent: true });
    }, RATE_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const handleManualRateUpdate = async () => {
    setIsRateUpdating(true);
    setRateUpdateError('');

    const result = await fetchJPYRate();
    if (result?.success && typeof result.rate === 'number') {
      const updatedAt = new Date().toISOString();
      setExchangeRate(result.rate);
      setLastUpdateDate(updatedAt);
      localStorage.setItem(
        RATE_CACHE_KEY,
        JSON.stringify({
          rate: result.rate,
          updatedAt
        })
      );
    } else {
      setRateUpdateError('匯率更新失敗，已保留上次成功資料。');
    }

    setIsRateUpdating(false);
  };

  const currentDayData = itinerary.find(d => d.day === selectedDay);
  const currentDayTitle = isGenericTripDayTitle(currentDayData?.title)
    ? ''
    : String(currentDayData?.title || '').trim();
  const currentDayDate = isGenericTripDayTitle(currentDayData?.date)
    ? ''
    : String(currentDayData?.date || '').trim();
  const currentDayWeatherDate = getTripDayIsoDate(tripDetails?.dateRange?.start, selectedDay)
    || currentDayDate;
  const currentDayWeatherLocation = (currentDayData?.events || [])
    .map(getWeatherEventLocation)
    .find(Boolean) || '';
  const currentDayDisplayTitle = getTripDayDisplayTitle(currentDayData);
  const currentDayLabel = getTripDayDisplayLabel(currentDayData, tripDetails);
  const tripDisplayDates = getTripDisplayDates(tripDetails);
  const budgetTarget = Number(tripDetails?.budget?.total || 0);
  const remainingBudget = budgetTarget - budgetInfo.totalCost;
  const budgetProgress = budgetTarget > 0
    ? Math.min(100, Math.round((budgetInfo.totalCost / budgetTarget) * 100))
    : 0;

  const coverImageUrl = useMemo(
    () => normalizeCoverImageUrl(tripDetails?.coverImage),
    [tripDetails?.coverImage]
  );
  const shouldShowCoverBackground = Boolean(coverImageUrl && !coverImageLoadFailed);
  const mobileDetailTheme = useMemo(
    () => getMobileDetailTheme(tripDetails),
    [tripDetails?.title, tripDetails?.status]
  );
  const mobileDetailHeroStyle = shouldShowCoverBackground
    ? { '--tp-mobile-detail-cover-image': `url("${coverImageUrl}")` }
    : undefined;
  const mobileDetailTravelerCount = memberTravelers.length || members.length || 1;
  const mobileDetailStatusLabel = mobileDetailStatusLabels[tripDetails?.status] || mobileDetailStatusLabels.planning;
  const mobileDetailActiveLabel = MOBILE_DETAIL_TABS.find((tab) => (
    tab.id === 'more'
      ? activeTab === 'more' || MORE_CHILD_TABS.has(activeTab)
      : tab.id === activeTab
  ))?.label || 'Details';

  useEffect(() => {
    setSelectedEventLocation(null);
  }, [selectedDay]);

  useEffect(() => {
    setIsEditingDayMeta(false);
    setDayMetaDraft({
      title: currentDayTitle,
      date: currentDayDate
    });
  }, [selectedDay, currentDayTitle, currentDayDate]);

  useEffect(() => {
    setCoverImageLoadFailed(false);

    if (!coverImageUrl) return;

    let cancelled = false;
    const image = new Image();

    image.onload = () => {
      if (!cancelled) {
        setCoverImageLoadFailed(false);
      }
    };

    image.onerror = () => {
      if (!cancelled) {
        setCoverImageLoadFailed(true);
      }
    };

    image.src = coverImageUrl;

    return () => {
      cancelled = true;
    };
  }, [coverImageUrl]);

  useEffect(() => {
    if (!isEditModalOpen || isEventViewMode) {
      updatePresenceEditingTarget('');
      void updateRealtimeEditingTarget('');
      return undefined;
    }

    const target = editingEvent?.id ? `event:${editingEvent.id}` : 'event:new';
    updatePresenceEditingTarget(target);
    void updateRealtimeEditingTarget(target);
    return () => {
      updatePresenceEditingTarget('');
      void updateRealtimeEditingTarget('');
    };
  }, [
    isEditModalOpen,
    isEventViewMode,
    editingEvent?.id,
    updatePresenceEditingTarget,
    updateRealtimeEditingTarget
  ]);

  const markItineraryForFallbackSave = () => {
    setItinerary((prev) => (Array.isArray(prev) ? prev.map((day) => ({
      ...day,
      events: [...(day.events || [])]
    })) : prev));
  };

  const handleEventDocumentWriteError = (error) => {
    if (isPermissionDeniedError(error)) {
      handleDocumentPersistenceError(error, {
        label: '行程更新',
        deniedLogMessage: 'Event document write denied; skipping root trip autosave fallback.'
      });
      return;
    }

    logger.warn('Event document write failed; falling back to trip autosave.', error);
    markItineraryForFallbackSave();
    toast({
      variant: 'warning',
      title: '已改用相容儲存',
      description: '這次行程變更會先用原本的旅程儲存方式保留。'
    });
  };

  const handleSaveEventDocument = (eventData) => {
    if (!canEdit) {
      toast({ variant: 'warning', title: '沒有編輯權限', description: '這趟旅程目前不能編輯行程。' });
      return;
    }

    const targetDay = itinerary.find((day) => Number(day.day) === Number(selectedDay));
    const targetEvents = (targetDay?.events || []).map((event, index) => ({
      ...event,
      orderKey: getEventOrderKeyAtIndex(event, index)
    }));
    const existingIndex = targetEvents.findIndex((event) => String(event.id) === String(eventData.id));
    const existingEvent = existingIndex >= 0 ? targetEvents[existingIndex] : null;
    const eventId = editingEvent ? (eventData.id || editingEvent.id || makeTripEventId()) : makeTripEventId();
    const orderKey = editingEvent
      ? getEventOrderKeyAtIndex(existingEvent, Math.max(existingIndex, 0))
      : getAppendOrderKey(targetEvents);
    const nextEvent = {
      ...eventData,
      id: eventId,
      memos: eventData.memos || existingEvent?.memos || [],
      orderKey
    };

    applyItineraryPatch((prev) => prev.map((day) => {
      if (Number(day.day) !== Number(selectedDay)) return day;
      if (editingEvent) {
        return {
          ...day,
          events: (day.events || []).map((event) => (
            String(event.id) === String(nextEvent.id) ? nextEvent : event
          ))
        };
      }
      return {
        ...day,
        events: [...(day.events || []), nextEvent]
      };
    }));

    void saveTripEventDocument({
      tripId,
      event: nextEvent,
      dayNumber: selectedDay,
      orderKey,
      user: currentUser,
      clientId
    }).catch(handleEventDocumentWriteError);

    setIsEditModalOpen(false);
    setEditingEvent(null);
  };

  const handleAppendEventDocument = (eventData, dayNumber = selectedDay) => {
    if (!canEdit) {
      toast({ variant: 'warning', title: '沒有編輯權限', description: '這趟旅程目前不能新增行程。' });
      return null;
    }

    const targetDayNumber = Number(dayNumber || selectedDay);
    const targetDay = itinerary.find((day) => Number(day.day) === targetDayNumber);
    const targetEvents = (targetDay?.events || []).map((event, index) => ({
      ...event,
      orderKey: getEventOrderKeyAtIndex(event, index)
    }));
    const orderKey = getAppendOrderKey(targetEvents);
    const nextEvent = {
      ...eventData,
      id: eventData?.id || makeTripEventId(),
      memos: eventData?.memos || [],
      orderKey
    };

    applyItineraryPatch((prev) => prev.map((day) => (
      Number(day.day) === targetDayNumber
        ? { ...day, events: [...(day.events || []), nextEvent] }
        : day
    )));

    void saveTripEventDocument({
      tripId,
      event: nextEvent,
      dayNumber: targetDayNumber,
      orderKey,
      user: currentUser,
      clientId
    }).catch(handleEventDocumentWriteError);

    return nextEvent;
  };

  const handleDeleteEventDocument = async (id) => {
    if (!canEdit) {
      toast({ variant: 'warning', title: '沒有編輯權限', description: '這趟旅程目前不能刪除行程。' });
      return;
    }

    const targetDay = itinerary.find((day) => day.day === selectedDay);
    const targetEvent = targetDay?.events?.find((event) => event.id === id);
    if (!targetEvent) return;

    const shouldDelete = await confirm({
      title: '刪除行程？',
      description: `「${targetEvent.title || '未命名行程'}」會從 ${currentDayLabel} 移除。`,
      confirmLabel: '刪除行程',
      variant: 'danger'
    });

    if (!shouldDelete) return;

    applyItineraryPatch((prev) => prev.map((day) => {
      if (day.day === selectedDay) {
        return { ...day, events: day.events.filter((event) => event.id !== id) };
      }
      return day;
    }));

    void deleteTripEventDocument({
      tripId,
      event: targetEvent,
      eventId: id,
      user: currentUser,
      clientId
    }).catch(handleEventDocumentWriteError);

    toast({
      variant: 'info',
      title: '已刪除行程',
      description: targetEvent.title || '未命名行程',
      actionLabel: '復原',
      duration: 7000,
      onAction: () => {
        const orderKey = getAppendOrderKey(targetDay?.events || []);
        const restoredEvent = {
          ...targetEvent,
          orderKey: targetEvent.orderKey ?? orderKey
        };

        applyItineraryPatch((prev) => prev.map((day) => {
          if (day.day !== selectedDay) return day;
          const exists = day.events.some((event) => event.id === targetEvent.id);
          if (exists) return day;
          return {
            ...day,
            events: [...day.events, restoredEvent]
          };
        }));

        void saveTripEventDocument({
          tripId,
          event: restoredEvent,
          dayNumber: selectedDay,
          orderKey: restoredEvent.orderKey,
          user: currentUser,
          clientId
        }).catch(handleEventDocumentWriteError);
      }
    });
  };

  const handleMoveEventDocument = (eventId, direction) => {
    if (!canEdit) {
      toast({ variant: 'warning', title: '沒有編輯權限', description: '這趟旅程目前不能調整行程順序。' });
      return;
    }

    const targetDay = itinerary.find((day) => Number(day.day) === Number(selectedDay));
    const currentEvents = (targetDay?.events || []).map((event, index) => ({
      ...event,
      orderKey: getEventOrderKeyAtIndex(event, index)
    }));
    const nextEvents = moveEventInDay(currentEvents, eventId, direction);
    if (nextEvents === currentEvents) return;

    const movedIndex = nextEvents.findIndex((event) => String(event.id) === String(eventId));
    const movedEvent = movedIndex >= 0 ? nextEvents[movedIndex] : null;
    if (!movedEvent) return;

    const orderKey = getOrderKeyBetween(nextEvents[movedIndex - 1], nextEvents[movedIndex + 1], movedIndex);
    const eventWithOrder = { ...movedEvent, orderKey };
    const nextEventsWithOrder = nextEvents.map((event) => (
      String(event.id) === String(eventId) ? eventWithOrder : event
    ));

    applyItineraryPatch((prev) => prev.map((day) => (
      Number(day.day) === Number(selectedDay)
        ? { ...day, events: nextEventsWithOrder }
        : day
    )));

    void moveTripEventDocument({
      tripId,
      event: eventWithOrder,
      dayNumber: selectedDay,
      orderKey,
      user: currentUser,
      clientId
    }).catch(handleEventDocumentWriteError);
  };

  const handleMoveEventToAdjacentDayDocument = (eventId, direction) => {
    if (!canEdit) {
      toast({ variant: 'warning', title: '沒有編輯權限', description: '這趟旅程目前不能移動行程。' });
      return;
    }

    const sourceDayIndex = itinerary.findIndex((day) => day.day === selectedDay);
    const targetDay = direction === 'previous'
      ? itinerary[sourceDayIndex - 1]
      : itinerary[sourceDayIndex + 1];
    const sourceDay = itinerary[sourceDayIndex];
    const targetEventIndex = sourceDay?.events?.findIndex((event) => String(event.id) === String(eventId)) ?? -1;
    const targetEvent = targetEventIndex >= 0 ? sourceDay.events[targetEventIndex] : null;

    if (!sourceDay || !targetDay || !targetEvent) return;

    const orderKey = getAppendOrderKey(targetDay.events || []);
    const movedEvent = { ...targetEvent, orderKey };
    applyItineraryPatch((prev) => moveEventToDay(prev, eventId, sourceDay.day, targetDay.day).map((day) => (
      Number(day.day) === Number(targetDay.day)
        ? {
            ...day,
            events: (day.events || []).map((event) => (
              String(event.id) === String(eventId) ? movedEvent : event
            ))
          }
        : day
    )));

    void moveTripEventDocument({
      tripId,
      event: movedEvent,
      dayNumber: targetDay.day,
      orderKey,
      user: currentUser,
      clientId
    }).catch(handleEventDocumentWriteError);

    toast({
      variant: 'success',
      title: `已移到 ${getTripDayDisplayLabel(targetDay, tripDetails)}`,
      description: targetEvent.title || '未命名行程',
      actionLabel: '復原',
      duration: 7000,
      onAction: () => {
        const restoreEvents = sourceDay.events || [];
        const restoredOrderKey = getOrderKeyBetween(
          restoreEvents[targetEventIndex - 1],
          restoreEvents[targetEventIndex],
          targetEventIndex
        );
        const restoredEvent = { ...targetEvent, orderKey: restoredOrderKey };

        applyItineraryPatch((prev) => moveEventToDay(prev, eventId, targetDay.day, sourceDay.day, {
          insertIndex: targetEventIndex
        }).map((day) => (
          Number(day.day) === Number(sourceDay.day)
            ? {
                ...day,
                events: (day.events || []).map((event) => (
                  String(event.id) === String(eventId) ? restoredEvent : event
                ))
              }
            : day
        )));

        void moveTripEventDocument({
          tripId,
          event: restoredEvent,
          dayNumber: sourceDay.day,
          orderKey: restoredOrderKey,
          user: currentUser,
          clientId
        }).catch(handleEventDocumentWriteError);
      }
    });
  };

  const handleUpdateDayMeta = (dayNumber, patch) => {
    if (!canEdit) return;
    const nextItinerary = applyDayMetaPatchToItinerary(itinerary, dayNumber, patch);
    const updatedDay = nextItinerary.find((day) => Number(day?.day) === Number(dayNumber));
    if (!updatedDay) return;

    const fallbackToTripSave = () => {
      setItinerary(nextItinerary);
    };

    applyItineraryPatch(nextItinerary);

    if (!tripId || !currentUser?.uid) {
      fallbackToTripSave();
      return;
    }

    void updateTripDayFields({
      tripId,
      day: updatedDay,
      dayNumber,
      itinerary: nextItinerary,
      user: currentUser,
      clientId
    }).catch((error) => {
      if (isPermissionDeniedError(error)) {
        handleDocumentPersistenceError(error, {
          label: '日期資訊更新',
          deniedLogMessage: 'Trip day document update denied; skipping root trip autosave fallback.'
        });
        return;
      }

      logger.warn('Trip day document update failed; falling back to full trip autosave.', error);
      fallbackToTripSave();
      toast({
        variant: 'warning',
        title: '已改用完整儲存',
        description: '日期與標題局部同步失敗，已退回原本的旅程儲存。'
      });
    });
  };

  const startDayMetaEdit = () => {
    if (!canEdit) return;
    setDayMetaDraft({ title: currentDayTitle, date: currentDayDate });
    setIsEditingDayMeta(true);
  };

  const cancelDayMetaEdit = () => {
    setDayMetaDraft({ title: currentDayTitle, date: currentDayDate });
    setIsEditingDayMeta(false);
  };

  const saveDayMeta = () => {
    if (!canEdit) return;
    handleUpdateDayMeta(selectedDay, {
      title: dayMetaDraft.title.trim() || '當日行程',
      date: dayMetaDraft.date.trim() || currentDayDate
    });
    setIsEditingDayMeta(false);
  };

  const openAddModal = () => {
    if (!canEdit) {
      toast({ variant: 'warning', title: '目前只能查看', description: '這趟旅程暫時不能由你新增行程。' });
      return;
    }

    setEditingEvent(null);
    setIsEventViewMode(false);
    setIsEditModalOpen(true);
  };

  const openEditModal = (event, viewMode = false) => {
    if (!canEdit && !viewMode) {
      toast({ variant: 'warning', title: '目前只能查看', description: '你可以查看行程詳情，但不能修改。' });
      return;
    }

    setEditingEvent(event);
    setIsEventViewMode(viewMode);
    setSelectedEventLocation(event?.location || null);
    setIsEditModalOpen(true);
  };

  const handleBackToTrips = () => {
    const hasHistory =
      typeof window !== 'undefined' &&
      window.history &&
      window.history.length > 1 &&
      (typeof window.history.state?.idx !== 'number' || window.history.state.idx > 0);

    if (hasHistory) {
      navigate(-1);
      return;
    }

    navigate('/');
  };

  const openMapsUrl = (url) => {
    if (!url) return;
    const openedWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (!openedWindow) {
      window.location.href = url;
    }
  };

  const handleOpenGoogleMaps = (origin, destination) => {
    const url = origin
      ? buildGoogleMapsDirectionsUrl(origin, destination)
      : buildGoogleMapsSearchUrl(destination);
    openMapsUrl(url);
  };

  const toggleSecondaryModules = () => {
    setShowSecondaryModules((prev) => !prev);
  };

  const handleApplyAiPlaceRecommendation = useCallback((recommendation) => {
    if (!canEdit) {
      toast({ variant: 'warning', title: '無法套用推薦', description: '目前是唯讀權限，不能加入想去清單。' });
      return null;
    }

    const currentPlaces = Array.isArray(placePool) ? placePool : [];
    const orderKey = getItemOrderKeyBetween(null, currentPlaces[0] || null, 0);
    const nextPlace = {
      ...createPlaceFromAiRecommendation(
        recommendation,
        getTripDayLabelByNumber(itinerary, recommendation?.suggestedDay, tripDetails)
      ),
      orderKey
    };
    const nextPlaces = [nextPlace, ...currentPlaces];
    const fallbackToTripSave = () => {
      setPlacePool(nextPlaces);
    };

    applyPlacePoolPatch?.(nextPlaces);

    if (tripId && currentUser?.uid && saveTripPlaceIdeaDocument) {
      void saveTripPlaceIdeaDocument({
        tripId,
        place: nextPlace,
        orderKey,
        user: currentUser,
        clientId
      }).catch((error) => {
        if (handleDocumentPersistenceError) {
          handleDocumentPersistenceError(error, {
            label: '想去推薦',
            fallback: fallbackToTripSave,
            deniedLogMessage: 'AI place recommendation write denied; skipping root trip autosave fallback.',
            fallbackLogMessage: 'AI place recommendation write failed; falling back to full trip autosave.'
          });
          return;
        }
        fallbackToTripSave();
      });
    } else {
      fallbackToTripSave();
    }

    toast({
      variant: 'success',
      title: '已加入想去',
      description: nextPlace.name || nextPlace.address
    });
    return nextPlace;
  }, [
    applyPlacePoolPatch,
    canEdit,
    clientId,
    currentUser,
    handleDocumentPersistenceError,
    placePool,
    saveTripPlaceIdeaDocument,
    setPlacePool,
    toast,
    tripId
  ]);

  const handleApplyAiEventRecommendation = useCallback((recommendation) => {
    if (!canEdit) {
      toast({ variant: 'warning', title: '無法套用推薦', description: '目前是唯讀權限，不能加入行程。' });
      return null;
    }

    const validDayNumbers = itinerary
      .map((day) => Number(day?.day))
      .filter((dayNumber) => Number.isFinite(dayNumber) && dayNumber > 0);
    const suggestedDay = Number(recommendation?.suggestedDay || selectedDay);
    const targetDay = validDayNumbers.includes(suggestedDay) ? suggestedDay : selectedDay;
    const nextEvent = handleAppendEventDocument(createEventFromAiRecommendation(recommendation), targetDay);

    if (nextEvent) {
      toast({
        variant: 'success',
        title: `已排入 ${getTripDayLabelByNumber(itinerary, targetDay, tripDetails)}`,
        description: nextEvent.title || '推薦行程'
      });
    }

    return nextEvent;
  }, [
    canEdit,
    handleAppendEventDocument,
    itinerary,
    selectedDay,
    toast
  ]);

  const editingEventPrevLocation = useMemo(() => {
    if (!editingEvent || !currentDayData?.events?.length) {
      return tripDetails?.accommodation?.address || tripDetails?.accommodation?.name || '';
    }

    const eventIndex = currentDayData.events.findIndex((event) => event.id === editingEvent.id);
    if (eventIndex > 0) {
      const prevEvent = currentDayData.events[eventIndex - 1];
      return prevEvent?.locationPlace || prevEvent?.location || '';
    }

    return tripDetails?.accommodation?.address || tripDetails?.accommodation?.name || '';
  }, [currentDayData, editingEvent, tripDetails]);

  const tripWorkspaceValue = useMemo(() => ({
    tripId,
    tripDetails,
    setTripDetails: handleTripDetailsChange,
    itinerary,
    setItinerary,
    checklists,
    applyChecklistsPatch,
    setChecklists,
    expenses,
    applyExpensesPatch,
    setExpenses,
    shoppingList,
    applyShoppingListPatch,
    setShoppingList,
    shoppingCategories,
    applyShoppingCategoriesPatch,
    setShoppingCategories,
    placePool,
    applyPlacePoolPatch,
    setPlacePool,
    collaboration,
    setCollaboration: handleCollaborationChange,
    currentUser,
    clientId,
    userProfile,
    updateDisplayName,
    logout,
    handleDocumentPersistenceError,
    isSharedSession: false,
    accessRole,
    canEdit,
    isReadOnly,
    members,
    memberTravelers,
    onlineMembers,
    presenceByUid,
    presenceUi,
    otherOnlineMembers: presenceUi.otherOnlineMembers,
    onlineByTab: presenceUi.onlineByTab,
    editingByEventId: presenceUi.editingByEventId,
    editingByTarget: presenceUi.editingByTarget,
    presenceSummaryText: presenceUi.summaryText,
    presenceError,
    placeVotesByPlaceId,
    checklistStatusByListId,
    shoppingItemStatusById,
    realtimeEditingByTarget,
    recentActivities,
    isRealtimeEnabled,
    realtimeError,
    updatePresenceEditingTarget,
    updateRealtimeEditingTarget,
    publishChecklistItemStatus,
    publishShoppingItemStatus,
    saveTripChecklistItemDocument,
    deleteTripChecklistItemDocument,
    moveTripChecklistItemDocument,
    saveTripShoppingItemDocument,
    deleteTripShoppingItemDocument,
    moveTripShoppingItemDocument,
    saveTripExpenseDocument,
    deleteTripExpenseDocument,
    saveTripPlaceIdeaDocument,
    deleteTripPlaceIdeaDocument,
    saveTripShoppingCategoryDocument,
    deleteTripShoppingCategoryDocument,
    syncConflict,
    resolveConflict,
    exchangeRate,
    shoppingListRef,
    expenseTrackerRef,
    setIsShoppingModalOpen,
    setIsExpenseModalOpen,
    selectedDay,
    setSelectedDay,
    currentDayData,
    currentDayTitle,
    currentDayDate,
    currentDayDisplayTitle,
    currentDayLabel,
    tripDisplayDates,
    budgetInfo,
    budgetTarget,
    remainingBudget,
    budgetProgress,
    enableGPS,
    currentLocation,
    selectedEventLocation,
    showSecondaryModules,
    toggleSecondaryModules,
    isEditingDayMeta,
    dayMetaDraft,
    setDayMetaDraft,
    startDayMetaEdit,
    cancelDayMetaEdit,
    saveDayMeta,
    openAiRecommendations: tripAi.openPanel,
    openAddModal,
    openEditModal,
    handleDeleteEvent: handleDeleteEventDocument,
    handleMoveEvent: handleMoveEventDocument,
    handleMoveEventToAdjacentDay: handleMoveEventToAdjacentDayDocument,
    handleAppendEvent: handleAppendEventDocument,
    handleOpenGoogleMaps
  }), [
    tripId,
    tripDetails,
    handleTripDetailsChange,
    itinerary,
    checklists,
    applyChecklistsPatch,
    expenses,
    applyExpensesPatch,
    shoppingList,
    applyShoppingListPatch,
    shoppingCategories,
    applyShoppingCategoriesPatch,
    placePool,
    applyPlacePoolPatch,
    collaboration,
    handleCollaborationChange,
    currentUser,
    clientId,
    userProfile,
    updateDisplayName,
    logout,
    handleDocumentPersistenceError,
    accessRole,
    canEdit,
    isReadOnly,
    members,
    memberTravelers,
    onlineMembers,
    presenceByUid,
    presenceUi,
    presenceError,
    placeVotesByPlaceId,
    checklistStatusByListId,
    shoppingItemStatusById,
    realtimeEditingByTarget,
    recentActivities,
    isRealtimeEnabled,
    realtimeError,
    updatePresenceEditingTarget,
    updateRealtimeEditingTarget,
    publishChecklistItemStatus,
    publishShoppingItemStatus,
    syncConflict,
    resolveConflict,
    selectedDay,
    currentDayData,
    currentDayTitle,
    currentDayDate,
    currentDayDisplayTitle,
    currentDayLabel,
    tripDisplayDates,
    budgetInfo,
    budgetTarget,
    remainingBudget,
    budgetProgress,
    exchangeRate,
    enableGPS,
    currentLocation,
    selectedEventLocation,
    showSecondaryModules,
    isEditingDayMeta,
    dayMetaDraft,
    tripAi.openPanel,
    handleAppendEventDocument
  ]);

  if (isLoading) {
    return (
      <div className="tp-page-shell flex min-h-screen items-center justify-center p-4 font-sans">
        <LoadingState className="w-full max-w-sm" />
      </div>
    );
  }

  if (accessError) {
    const description = legacyShareToken
      ? '舊邀請連結已停用。請向主辦人索取邀請碼。'
      : accessError;
    return (
      <div className="tp-page-shell flex min-h-screen items-center justify-center p-4 font-sans">
        <ErrorState
          title="無法開啟旅程"
          description={description}
          actionLabel="回旅程列表"
          onAction={() => navigate('/')}
          className="w-full max-w-md"
        />
      </div>
    );
  }

  const isAnyModalOpen = isEditModalOpen || isSettingsOpen || isExpenseModalOpen || isShoppingModalOpen || tripHandbook.isOpen;
  const showMoreBackButton = MORE_CHILD_TABS.has(activeTab);

  return (
    <TripWorkspaceProvider value={tripWorkspaceValue}>
    <div
      id="main-content"
      tabIndex={-1}
      className={`tp-page-shell tp-workspace-shell tp-mobile-detail-theme-${mobileDetailTheme.id} min-h-screen font-sans interface-size-${interfaceSize} transition-colors`}
      style={{
        "--footer-nav-height": "calc(5.2rem + env(safe-area-inset-bottom))",
        ...mobileDetailTheme.style
      }}
    >
      <div className="tp-atlas-side-rail" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <section
        className={`tp-mobile-detail-shell ${shouldShowCoverBackground ? 'has-cover' : 'has-generated-map'}`}
        style={mobileDetailHeroStyle}
        aria-label="Trip mobile overview"
      >
        <header className="tp-mobile-detail-hero">
          <div className="tp-mobile-detail-photo" aria-hidden="true" />
          {!shouldShowCoverBackground && (
            <div className="tp-mobile-detail-route" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          )}

          <div className="tp-mobile-detail-topbar">
            <button
              type="button"
              className="tp-mobile-detail-icon-button"
              onClick={handleBackToTrips}
              aria-label="Back to trips"
              title="Back to trips"
            >
              <ChevronLeft size={23} />
            </button>
            <span>{mobileDetailActiveLabel}</span>
            <button
              type="button"
              className="tp-mobile-detail-icon-button"
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Trip settings"
              title="Trip settings"
            >
              <Settings size={20} />
            </button>
          </div>

          <div className="tp-mobile-detail-copy">
            <span className="tp-mobile-detail-kicker">{mobileDetailStatusLabel}</span>
            <h1>{tripDetails?.title || 'Untitled trip'}</h1>
            <div className="tp-mobile-detail-meta">
              <span>
                <CalendarDays size={15} />
                {tripDisplayDates || '未設定日期'}
              </span>
              <span>
                <UsersRound size={15} />
                {mobileDetailTravelerCount}
              </span>
            </div>
            <div className="tp-mobile-detail-chips">
              {isSaving || isSavingTripDetails ? (
                <span role="status" aria-live="polite">儲存中</span>
              ) : (
                <WeatherWidget
                  variant="chip"
                  date={currentDayWeatherDate}
                  firstEventLocation={currentDayWeatherLocation}
                  accommodation={tripDetails?.accommodation?.address
                    || tripDetails?.accommodation?.name
                    || tripDetails?.title
                    || '東京'}
                />
              )}
            </div>
          </div>
        </header>
      </section>

      <div className="tp-detail-desktop-header">
        <Header
          details={tripDetails}
          onGoToTrips={handleBackToTrips}
          onSettingsOpen={() => setIsSettingsOpen(true)}
          isSaving={isSaving || isSavingTripDetails}
          coverImageUrl={coverImageUrl}
          shouldShowCoverBackground={shouldShowCoverBackground}
          presenceUi={presenceUi}
        />
      </div>

      <PageContainer className="tp-detail-page-frame tp-atlas-page-frame pb-40 lg:pb-44">
        <div className="tp-workspace-shell-content tp-mobile-detail-sheet">
          <div className="tp-v4-workspace-grid">
            <DesktopWorkspaceRail
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />

            <main className="tp-v4-workspace-main" id="trip-workspace-main">
              <nav className="tp-mobile-detail-tabs" aria-label="旅程頁面導覽">
                {MOBILE_DETAIL_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = tab.id === 'more'
                    ? activeTab === 'more' || MORE_CHILD_TABS.has(activeTab)
                    : activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      className={isActive ? 'is-active' : ''}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <Icon size={15} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="tp-v4-state-stack">
                <PermissionBanner isReadOnly={isReadOnly} />
                <SyncStatusBanner
                  isSaving={isSaving || isSavingTripDetails}
                  saveError={saveError}
                  syncConflict={Boolean(syncConflict)}
                  syncConflictSummary={syncConflictSummary}
                  onUseRemote={() => resolveConflict('remote')}
                  onKeepLocal={() => resolveConflict('local')}
                  remoteActionLabel="使用最新內容"
                  localActionLabel="保留我的內容"
                />
              </div>

              <DesktopMapOverview activeTab={activeTab} />

              {showMoreBackButton && (
                <div className="mx-auto mb-4 flex max-w-4xl px-5 sm:px-7 lg:hidden">
                  <button
                    type="button"
                    onClick={() => setActiveTab('more')}
                    className="touch-target inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 transition hover:bg-sky-50 hover:text-brand-800 active:scale-95 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                    aria-label="回到更多"
                    title="回到更多"
                  >
                    <ChevronLeft size={22} />
                  </button>
                </div>
              )}

              <section className={`tp-mobile-detail-stage tp-mobile-detail-stage-${activeTab}`} aria-label={`${mobileDetailActiveLabel} content`}>
            <Suspense fallback={<ModuleFallback />}>
            {activeTab === 'today' && (
              <TodayTab onTabChange={setActiveTab} />
            )}

            {activeTab === 'summary' && (
              <SummaryTab
                onTabChange={setActiveTab}
                onAddEvent={openAddModal}
                onOpenHandbook={tripHandbook.openPanel}
              />
            )}

            {activeTab === 'itinerary' && (
              <ItineraryTab onTabChange={setActiveTab} />
            )}

            {activeTab === 'ideas' && (
              <IdeasTab />
            )}

            {(activeTab === 'more' || activeTab === 'companions') && (
              <MoreTab
                section={activeTab === 'companions' ? 'companions' : 'home'}
                onTabChange={setActiveTab}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenHandbook={tripHandbook.openPanel}
              />
            )}

            {activeTab === 'preTrip' && (
              <PreTripTab />
            )}

            {activeTab === 'packing' && (
              <PackingTab />
            )}

            {activeTab === 'flights' && (
              <LogisticsTab />
            )}

            {activeTab === 'shopping' && (
              <ShoppingTab />
            )}

            {activeTab === 'expenses' && (
              <ExpensesTab />
            )}
            </Suspense>
              </section>
            </main>

            <DesktopPlannerPanel activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
        </div>
      </PageContainer>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingEvent(null);
          setIsEventViewMode(false);
        }}
        title={editingEvent ? (isEventViewMode ? '行程詳情' : '編輯行程') : '新增行程'}
        size="lg"
      >
        <Suspense fallback={<ModuleFallback label="載入行程編輯器中..." />}>
          {isEventViewMode && editingEvent ? (
            <EventDetailView
              event={editingEvent}
              prevLocation={editingEventPrevLocation}
              onEdit={canEdit ? () => setIsEventViewMode(false) : undefined}
              onClose={() => {
                setIsEditModalOpen(false);
                setEditingEvent(null);
                setIsEventViewMode(false);
              }}
              onOpenGoogleMaps={handleOpenGoogleMaps}
            />
          ) : (
            <EditEventForm
              event={editingEvent}
              onSave={handleSaveEventDocument}
              readOnly={isReadOnly}
              onRequestEdit={canEdit ? () => setIsEventViewMode(false) : undefined}
              onCancel={() => {
                setIsEditModalOpen(false);
                setEditingEvent(null);
                setIsEventViewMode(false);
              }}
            />
          )}
        </Suspense>
      </Modal>

      {/* 設定面板 */}
      {isSettingsOpen && (
        <Suspense fallback={null}>
          <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        enableGPS={enableGPS}
        onGPSToggle={() => setEnableGPS(!enableGPS)}
        travelers={memberTravelers}
        travelersReadOnly
        onUpdateTravelers={() => {}}
        currentTheme={currentTheme}
        onThemeChange={setCurrentTheme}
        interfaceSize={interfaceSize}
        onInterfaceSizeChange={setInterfaceSize}
        exchangeRate={exchangeRate}
        onExchangeRateChange={setExchangeRate}
        onUpdateRate={handleManualRateUpdate}
        lastUpdateDate={lastUpdateDate}
        isRateUpdating={isRateUpdating}
        rateUpdateError={rateUpdateError}
        coverImage={tripDetails?.coverImage || ''}
        onCoverImageChange={(nextCoverImage) =>
          handleTripDetailsChange((prev) => ({
            ...prev,
            coverImage: nextCoverImage
          }))
        }
          />
        </Suspense>
      )}

      {tripHandbook.isOpen && (
        <Suspense fallback={null}>
          <TripHandbookModal
        isOpen={tripHandbook.isOpen}
        onClose={tripHandbook.closePanel}
        canEdit={canEdit}
        handbook={tripHandbook.response}
        tripDetails={tripDetails}
        coverImage={tripDetails?.coverImage || ''}
        isLoading={tripHandbook.isLoading}
        isLoadingSaved={tripHandbook.isLoadingSaved}
        isExporting={tripHandbook.isExporting}
        error={tripHandbook.error}
        onGenerate={tripHandbook.generate}
        onExportPdf={() => tripHandbook.exportPdf({
          coverImage: tripDetails?.coverImage || '',
          tripTitle: tripDetails?.title || '',
          tripDetails
        })}
          />
        </Suspense>
      )}

      {activeTab === 'itinerary' && (
        <div className={`tp-itinerary-action-dock fixed bottom-[var(--footer-nav-height)] left-0 right-0 z-40 px-4 pb-2 transition-all duration-200 sm:left-auto sm:right-6 sm:w-[min(430px,calc(100vw-3rem))] sm:px-0 lg:bottom-28 ${isAnyModalOpen ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}>
          <div className="tp-panel mx-auto max-w-4xl p-3 shadow-lg sm:max-w-none">
            <div className="sm:hidden">
              <Button
                onClick={openAddModal}
                disabled={!canEdit}
                className="w-full"
              >
                <Plus size={17} />
                新增行程
              </Button>
            </div>
            <div className="hidden grid-cols-2 gap-2 sm:grid">
              <Button
                onClick={openAddModal}
                disabled={!canEdit}
                className="w-full min-w-0 whitespace-nowrap !px-1 text-xs sm:!px-2"
              >
                <Plus size={16} />
                新增
              </Button>
              <Button
                variant="secondary"
                onClick={saveNow}
                disabled={!canEdit}
                className="w-full min-w-0 whitespace-nowrap !px-1 text-xs sm:!px-2"
              >
                <Save size={16} />
                儲存
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'shopping' && (
        <div className={`fixed bottom-[var(--footer-nav-height)] left-0 right-0 z-40 px-4 pb-2 transition-all duration-200 sm:left-auto sm:right-6 sm:w-[min(430px,calc(100vw-3rem))] sm:px-0 lg:bottom-28 ${isAnyModalOpen ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}>
          <div className="tp-panel mx-auto max-w-4xl p-3 shadow-lg sm:max-w-none">
            <Button
              onClick={() => shoppingListRef.current?.openAddForm?.()}
              disabled={!canEdit}
              className="w-full"
            >
              <Plus size={16} />
              新增購物項目
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className={`fixed bottom-[var(--footer-nav-height)] left-0 right-0 z-40 px-4 pb-2 transition-all duration-200 sm:left-auto sm:right-6 sm:w-[min(430px,calc(100vw-3rem))] sm:px-0 lg:bottom-28 ${isAnyModalOpen ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}>
          <div className="tp-panel mx-auto max-w-4xl p-3 shadow-lg sm:max-w-none">
            <Button
              onClick={() => expenseTrackerRef.current?.openAddForm?.()}
              disabled={!canEdit}
              className="w-full"
            >
              <Plus size={16} />
              新增支出
            </Button>
          </div>
        </div>
      )}

      <Suspense fallback={null}>
        <TripAiRecommendationPanel
          isOpen={tripAi.isOpen}
          mode={tripAi.mode}
          response={tripAi.response}
          isLoading={tripAi.isLoading}
          error={tripAi.error}
          canEdit={canEdit}
          itinerary={itinerary}
          tripDetails={tripDetails}
          isHidden={isAnyModalOpen}
          isCompanionHidden={tripAi.isCompanionHidden}
          onOpen={tripAi.openPanel}
          onClose={tripAi.closePanel}
          onHideCompanion={tripAi.hideCompanion}
          onSummon={tripAi.summonCompanion}
          onModeChange={tripAi.setMode}
          onGenerate={tripAi.generate}
          onApplyPlace={handleApplyAiPlaceRecommendation}
          onApplyEvent={handleApplyAiEventRecommendation}
        />
      </Suspense>

      <BottomNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isModalOpen={isAnyModalOpen}
        presenceByTab={presenceUi.onlineByTab}
      />

      {/* GPS 位置監視 - 當啟用 GPS 時顯示狀態 */}
      {enableGPS && (
        <div className="tp-panel fixed bottom-4 right-4 z-30 max-w-xs p-3 text-sm shadow-lg">
          {isLocating ? (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-brand-500 ring-4 ring-brand-500/15"></div>
              <span className="text-slate-600 dark:text-slate-300">定位中...</span>
            </div>
          ) : locationError ? (
            <div className="flex items-center gap-2">
              <span className="text-red-600">定位失敗：{locationError}</span>
            </div>
          ) : currentLocation ? (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">GPS</span>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{currentLocation.locationName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">精準度：{Math.round(currentLocation.accuracy)}m</p>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
    </TripWorkspaceProvider>
  );
};

export default TripDetailPage;
