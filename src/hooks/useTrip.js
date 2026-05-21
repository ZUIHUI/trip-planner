import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ensureTripAccess,
  loadTrip,
  saveTrip,
  subscribeTrip,
  subscribeTripMembers
} from '../services/tripService';
import { normalizeTripDateFields } from '../utils/tripDates';
import { buildTripDocumentFromAppState, normalizeTripDocumentForApp } from '../domain/tripSchema';

const LEGACY_STORAGE_KEY = 'trip_planner_data';
const STORAGE_KEY_PREFIX = 'trip_planner_data_';
const CLIENT_ID_KEY = 'trip_planner_client_id';

const getStorageKey = (tripId, uid) => `${STORAGE_KEY_PREFIX}${uid || 'guest'}_${tripId}`;

const getClientId = () => {
  try {
    const existing = sessionStorage.getItem(CLIENT_ID_KEY);
    if (existing) return existing;
    const next = `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(CLIENT_ID_KEY, next);
    return next;
  } catch {
    return `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
};

const extractTripYear = (tripDetails) => {
  const rangeStart = tripDetails?.dateRange?.start;
  if (typeof rangeStart === 'string' && rangeStart.trim()) {
    const matchedStartYear = rangeStart.match(/\b(19|20)\d{2}\b/);
    if (matchedStartYear) return Number(matchedStartYear[0]);
  }

  const datesText = tripDetails?.dates;
  if (typeof datesText !== 'string') return null;
  const matchedYear = datesText.match(/\b(19|20)\d{2}\b/);
  return matchedYear ? Number(matchedYear[0]) : null;
};

const parseMonthDay = (dateText) => {
  if (typeof dateText !== 'string') return null;
  const matchedDate = dateText.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!matchedDate) return null;
  const month = Number(matchedDate[1]);
  const day = Number(matchedDate[2]);
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;
  return { month, day };
};

const ensureItineraryComplete = (itinerary, tripDetails) => {
  if (!itinerary || itinerary.length === 0) return itinerary;
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const tripYear = extractTripYear(tripDetails) || new Date().getFullYear();

  return itinerary.map((day, index) => {
    if (!day.weekday && day.date) {
      const parsedMonthDay = parseMonthDay(day.date);
      if (!parsedMonthDay) return { ...day, day: day.day || index + 1 };
      const date = new Date(tripYear, parsedMonthDay.month - 1, parsedMonthDay.day);
      return {
        ...day,
        day: day.day || index + 1,
        weekday: weekdays[date.getDay()]
      };
    }
    return { ...day, day: day.day || index + 1 };
  });
};

const defaultCollaboration = {
  enabled: false,
  shareToken: '',
  permission: 'view',
  votesEnabled: true,
  createdAt: '',
  updatedAt: ''
};

const buildFallbackData = (initialTripDetails, initialItinerary) => ({
  tripDetails: initialTripDetails,
  itinerary: initialItinerary,
  checklists: { preTrip: [], packing: [] },
  expenses: [],
  placePool: [],
  collaboration: defaultCollaboration,
  access: {},
  syncMeta: { revision: 0 }
});

const applyNormalizedData = ({
  data,
  fallbackData,
  initialTripDetails,
  initialItinerary,
  setters
}) => {
  const normalized = normalizeTripDocumentForApp(data || fallbackData, fallbackData);
  const normalizedTripDetails = normalizeTripDateFields(normalized.tripDetails || initialTripDetails);
  setters.setTripDetails(normalizedTripDetails);
  setters.setItinerary(ensureItineraryComplete(normalized.itinerary || initialItinerary, normalizedTripDetails));
  setters.setChecklists(normalized.checklists || { preTrip: [], packing: [] });
  setters.setExpenses(normalized.expenses || []);
  setters.setPlacePool(normalized.placePool || []);
  setters.setCollaboration(normalized.collaboration || defaultCollaboration);
  setters.setAccess(normalized.access || {});
  setters.setSyncMeta(normalized.syncMeta || { revision: 0 });
  return normalized;
};

export const useTrip = (tripId, initialTripDetails, initialItinerary, {
  currentUser,
  userProfile,
  shareToken = ''
} = {}) => {
  const safeTripId = typeof tripId === 'string' ? tripId.trim() : '';
  const uid = currentUser?.uid || '';
  const storageKey = safeTripId && uid ? getStorageKey(safeTripId, uid) : null;
  const fallbackData = useMemo(
    () => buildFallbackData(initialTripDetails, initialItinerary),
    [initialTripDetails, initialItinerary]
  );
  const clientIdRef = useRef(getClientId());
  const autoSaveTimeoutRef = useRef(null);
  const hasLocalChangesRef = useRef(false);
  const applyingRemoteRef = useRef(false);
  const baseRevisionRef = useRef(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [accessError, setAccessError] = useState('');
  const [accessRole, setAccessRole] = useState('');
  const [members, setMembers] = useState([]);
  const [syncConflict, setSyncConflict] = useState(null);
  const [tripDetails, setTripDetailsState] = useState(initialTripDetails);
  const [itinerary, setItineraryState] = useState(initialItinerary);
  const [checklists, setChecklistsState] = useState({ preTrip: [], packing: [] });
  const [expenses, setExpensesState] = useState([]);
  const [placePool, setPlacePoolState] = useState([]);
  const [collaboration, setCollaborationState] = useState(defaultCollaboration);
  const [access, setAccess] = useState({});
  const [syncMeta, setSyncMeta] = useState({ revision: 0 });

  const canEdit = accessRole === 'owner' || accessRole === 'editor' || accessRole === 'edit';
  const isReadOnly = Boolean(accessRole && !canEdit);

  const markLocalChange = useCallback(() => {
    if (!canEdit) {
      setSaveError('你目前只能查看這趟旅程，不能修改。');
      return false;
    }
    hasLocalChangesRef.current = true;
    return true;
  }, [canEdit]);

  const wrapSetter = useCallback((setter) => (nextValue) => {
    if (!markLocalChange()) return;
    setter(nextValue);
  }, [markLocalChange]);

  const setTripDetails = useMemo(() => wrapSetter(setTripDetailsState), [wrapSetter]);
  const setItinerary = useMemo(() => wrapSetter(setItineraryState), [wrapSetter]);
  const setChecklists = useMemo(() => wrapSetter(setChecklistsState), [wrapSetter]);
  const setExpenses = useMemo(() => wrapSetter(setExpensesState), [wrapSetter]);
  const setPlacePool = useMemo(() => wrapSetter(setPlacePoolState), [wrapSetter]);
  const setCollaboration = useMemo(() => wrapSetter(setCollaborationState), [wrapSetter]);

  const rawSetters = useMemo(() => ({
    setTripDetails: setTripDetailsState,
    setItinerary: setItineraryState,
    setChecklists: setChecklistsState,
    setExpenses: setExpensesState,
    setPlacePool: setPlacePoolState,
    setCollaboration: setCollaborationState,
    setAccess,
    setSyncMeta
  }), []);

  useEffect(() => {
    if (!safeTripId || !uid || !storageKey) {
      setIsLoading(false);
      setAccessError(!uid ? '請先登入' : '這趟旅程不存在或連結有誤。');
      return undefined;
    }

    let cancelled = false;
    let unsubscribeTrip = null;
    let unsubscribeMembers = null;

    const initialize = async () => {
      setIsLoading(true);
      setAccessError('');
      setSaveError(null);

      try {
        const legacyRaw = !localStorage.getItem(storageKey) ? localStorage.getItem(LEGACY_STORAGE_KEY) : null;
        const localRaw = localStorage.getItem(storageKey) || legacyRaw;
        if (localRaw) {
          const localData = JSON.parse(localRaw);
          applyingRemoteRef.current = true;
          applyNormalizedData({
            data: localData,
            fallbackData,
            initialTripDetails,
            initialItinerary,
            setters: rawSetters
          });
          applyingRemoteRef.current = false;
        }
      } catch (error) {
        console.warn('讀取本機旅程快取失敗:', error);
      }

      try {
        const accessResult = await ensureTripAccess({
          tripId: safeTripId,
          user: currentUser,
          profile: userProfile,
          shareToken
        });
        if (cancelled) return;
        setAccessRole(accessResult.role || '');

        unsubscribeTrip = subscribeTrip(
          safeTripId,
          (remoteData) => {
            if (!remoteData || cancelled) return;
            const remoteSync = remoteData.syncMeta || {};
            const isOwnWrite = remoteSync.updatedByClientId && remoteSync.updatedByClientId === clientIdRef.current;

            if (hasLocalChangesRef.current && !isOwnWrite) {
              setSyncConflict({ remoteData });
              return;
            }

            applyingRemoteRef.current = true;
            const normalized = applyNormalizedData({
              data: remoteData,
              fallbackData,
              initialTripDetails,
              initialItinerary,
              setters: rawSetters
            });
            applyingRemoteRef.current = false;
            baseRevisionRef.current = Number(normalized.syncMeta?.revision || 0);
            hasLocalChangesRef.current = false;
            setSyncConflict(null);
            setIsLoading(false);

            try {
              localStorage.setItem(storageKey, JSON.stringify(normalized));
            } catch (error) {
              console.warn('寫入本機旅程快取失敗:', error);
            }
          },
          (error) => {
            console.error('旅程即時同步失敗:', error);
            setAccessError(error.message || '暫時無法載入最新旅程內容，請稍後再試。');
            setIsLoading(false);
          }
        );

        unsubscribeMembers = subscribeTripMembers(
          safeTripId,
          (nextMembers) => {
            if (cancelled) return;
            setMembers(nextMembers);
            const self = nextMembers.find((member) => member.uid === uid);
            if (self?.role) setAccessRole(self.role);
          },
          (error) => console.warn('成員同步失敗:', error)
        );
      } catch (error) {
        if (cancelled) return;
        console.error('旅程存取驗證失敗:', error);
        setAccessError(error.message || '你目前無法開啟這趟旅程。');
        setIsLoading(false);
      }
    };

    initialize();

    return () => {
      cancelled = true;
      unsubscribeTrip?.();
      unsubscribeMembers?.();
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [
    safeTripId,
    uid,
    storageKey,
    currentUser,
    userProfile,
    shareToken,
    fallbackData,
    initialTripDetails,
    initialItinerary,
    rawSetters
  ]);

  useEffect(() => {
    if (!safeTripId || !uid || isLoading || !canEdit || applyingRemoteRef.current || !hasLocalChangesRef.current) {
      return undefined;
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSaving(true);
        setSaveError(null);
        const normalizedTripDetails = normalizeTripDateFields(tripDetails);
        const dataToSave = buildTripDocumentFromAppState(safeTripId, {
          tripDetails: normalizedTripDetails,
          itinerary,
          checklists,
          expenses,
          placePool,
          collaboration,
          access,
          syncMeta
        });

        if (storageKey) {
          localStorage.setItem(storageKey, JSON.stringify(dataToSave));
        }

        await saveTrip(safeTripId, dataToSave, {
          user: currentUser,
          profile: userProfile,
          baseRevision: baseRevisionRef.current,
          clientId: clientIdRef.current
        });
      } catch (error) {
        if (error.code === 'trip/conflict') {
          setSyncConflict({ remoteData: error.remoteData });
          setSaveError('另一位旅伴剛更新了旅程，請選擇要使用哪一版。');
        } else {
          console.error('自動儲存失敗:', error);
          setSaveError(error.message || '儲存失敗');
        }
      } finally {
        setIsSaving(false);
      }
    }, 1000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [
    tripDetails,
    itinerary,
    checklists,
    expenses,
    placePool,
    collaboration,
    access,
    syncMeta,
    safeTripId,
    uid,
    storageKey,
    isLoading,
    canEdit,
    currentUser,
    userProfile
  ]);

  const manualRefresh = async () => {
    if (!safeTripId) return false;
    const remoteData = await loadTrip(safeTripId);
    if (!remoteData) return false;
    applyingRemoteRef.current = true;
    const normalized = applyNormalizedData({
      data: remoteData,
      fallbackData,
      initialTripDetails,
      initialItinerary,
      setters: rawSetters
    });
    applyingRemoteRef.current = false;
    baseRevisionRef.current = Number(normalized.syncMeta?.revision || 0);
    hasLocalChangesRef.current = false;
    return true;
  };

  const saveNow = async ({ force = false } = {}) => {
    if (!safeTripId || !canEdit) {
      setSaveError('你目前不能編輯這趟旅程。');
      return false;
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      const dataToSave = buildTripDocumentFromAppState(safeTripId, {
        tripDetails: normalizeTripDateFields(tripDetails),
        itinerary,
        checklists,
        expenses,
        placePool,
        collaboration,
        access,
        syncMeta
      });
      await saveTrip(safeTripId, dataToSave, {
        user: currentUser,
        profile: userProfile,
        baseRevision: baseRevisionRef.current,
        clientId: clientIdRef.current,
        force
      });
      return true;
    } catch (error) {
      if (error.code === 'trip/conflict') {
        setSyncConflict({ remoteData: error.remoteData });
        setSaveError('另一位旅伴剛更新了旅程，請選擇要使用哪一版。');
      } else {
        setSaveError(error.message || '手動儲存失敗');
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const resolveConflict = async (mode) => {
    if (!syncConflict?.remoteData) return false;

    if (mode === 'remote') {
      applyingRemoteRef.current = true;
      const normalized = applyNormalizedData({
        data: syncConflict.remoteData,
        fallbackData,
        initialTripDetails,
        initialItinerary,
        setters: rawSetters
      });
      applyingRemoteRef.current = false;
      baseRevisionRef.current = Number(normalized.syncMeta?.revision || 0);
      hasLocalChangesRef.current = false;
      setSyncConflict(null);
      setSaveError(null);
      return true;
    }

    baseRevisionRef.current = Number(syncConflict.remoteData.syncMeta?.revision || baseRevisionRef.current);
    setSyncConflict(null);
    hasLocalChangesRef.current = true;
    return saveNow({ force: true });
  };

  return {
    isLoading,
    isSaving,
    saveError,
    accessError,
    accessRole,
    canEdit,
    isReadOnly,
    members,
    syncConflict,
    resolveConflict,
    tripDetails,
    setTripDetails,
    itinerary,
    setItinerary,
    checklists,
    setChecklists,
    expenses,
    setExpenses,
    placePool,
    setPlacePool,
    collaboration,
    setCollaboration,
    access,
    syncMeta,
    manualRefresh,
    saveNow
  };
};
