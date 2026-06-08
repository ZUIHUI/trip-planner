import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ensureTripRealtimeAccess,
  hasTripRealtimeDatabase,
  isTripRealtimePermissionError,
  subscribeTripRealtime,
  updateTripChecklistStatus,
  updateTripRealtimeEditing,
  updateTripShoppingStatus
} from '../services/tripRealtimeService';
import { normalizeTripRealtimeValue } from '../utils/tripRealtime';

const TRIP_REALTIME_START_TIMEOUT_MS = 12000;
const TRIP_REALTIME_SYNC_ERROR = '即時同步暫時無法使用，正式資料仍會保存。';

const emptyRealtimeState = normalizeTripRealtimeValue({});

const withOptimisticChecklistStatus = (state, { listId, itemId, done, updatedAt }) => {
  const checklistStatusByListId = state?.checklistStatusByListId || {};
  const listStatus = checklistStatusByListId[listId] || {};

  return {
    ...state,
    checklistStatusByListId: {
      ...checklistStatusByListId,
      [listId]: {
        ...listStatus,
        [itemId]: {
          done: Boolean(done),
          updatedAt
        }
      }
    }
  };
};

const withOptimisticShoppingStatus = (state, { itemId, purchased, updatedAt }) => ({
  ...state,
  shoppingItemStatusById: {
    ...(state?.shoppingItemStatusById || {}),
    [itemId]: {
      purchased: Boolean(purchased),
      updatedAt
    }
  }
});

const withTimeout = (promise, timeoutMs) => new Promise((resolve, reject) => {
  const timer = window.setTimeout(() => reject(new Error('trip-realtime-timeout')), timeoutMs);
  promise
    .then((result) => {
      window.clearTimeout(timer);
      resolve(result);
    })
    .catch((error) => {
      window.clearTimeout(timer);
      reject(error);
    });
});

export const useTripRealtime = ({
  tripId,
  currentUser,
  accessRole,
  activeTab,
  enabled = true
}) => {
  const uid = currentUser?.uid || '';
  const activeTabRef = useRef(activeTab || 'summary');
  const accessInFlightRef = useRef(null);
  const [realtimeState, setRealtimeState] = useState(emptyRealtimeState);
  const [realtimeError, setRealtimeError] = useState('');
  const isEnabled = Boolean(enabled && hasTripRealtimeDatabase() && tripId && uid && accessRole);

  useEffect(() => {
    activeTabRef.current = activeTab || 'summary';
  }, [activeTab]);

  const ensureAccess = useCallback(async () => {
    if (!tripId) return { ready: false, role: '' };

    if (!accessInFlightRef.current) {
      accessInFlightRef.current = withTimeout(
        ensureTripRealtimeAccess({ tripId }),
        TRIP_REALTIME_START_TIMEOUT_MS
      ).finally(() => {
        accessInFlightRef.current = null;
      });
    }

    return accessInFlightRef.current;
  }, [tripId]);

  useEffect(() => {
    if (!isEnabled) {
      setRealtimeState(emptyRealtimeState);
      setRealtimeError('');
      return undefined;
    }

    let cancelled = false;
    let unsubscribe = null;
    let accessRefreshAttempts = 0;

    const handleError = async (error) => {
      if (cancelled) return;

      if (isTripRealtimePermissionError(error) && accessRefreshAttempts < 1) {
        accessRefreshAttempts += 1;
        try {
          await ensureAccess();
          if (cancelled) return;
          setRealtimeError('');
          unsubscribe?.();
          unsubscribe = subscribeTripRealtime(
            tripId,
            (snapshot) => {
              if (!cancelled) {
                setRealtimeState(normalizeTripRealtimeValue(snapshot.val() || {}));
                setRealtimeError('');
              }
            },
            handleError
          );
          return;
        } catch {
          // Background realtime state can safely degrade without alarming the user.
        }
      }

      setRealtimeError('');
    };

    const start = async () => {
      try {
        const access = await ensureAccess();
        if (cancelled) return;
        if (!access?.ready) throw new Error('trip-realtime-access-not-ready');

        unsubscribe = subscribeTripRealtime(
          tripId,
          (snapshot) => {
            if (!cancelled) {
              setRealtimeState(normalizeTripRealtimeValue(snapshot.val() || {}));
              setRealtimeError('');
            }
          },
          handleError
        );
      } catch {
        if (!cancelled) {
          setRealtimeError('');
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      unsubscribe?.();
      void updateTripRealtimeEditing({
        tripId,
        uid,
        activeTab: activeTabRef.current,
        target: ''
      }).catch(() => {});
    };
  }, [ensureAccess, isEnabled, tripId, uid]);

  const updateRealtimeEditingTarget = useCallback(async (target = '', label = '') => {
    if (!isEnabled) return false;

    try {
      await ensureAccess();
      await updateTripRealtimeEditing({
        tripId,
        uid,
        activeTab: activeTabRef.current,
        target,
        label
      });
      setRealtimeError('');
      return true;
    } catch (error) {
      if (isTripRealtimePermissionError(error)) {
        try {
          await ensureAccess();
          await updateTripRealtimeEditing({
            tripId,
            uid,
            activeTab: activeTabRef.current,
            target,
            label
          });
          setRealtimeError('');
          return true;
        } catch {
          // Editing presence is a background affordance.
        }
      }
      setRealtimeError('');
      return false;
    }
  }, [ensureAccess, isEnabled, tripId, uid]);

  const publishChecklistItemStatus = useCallback(async ({ listId, itemId, done }) => {
    if (!isEnabled) return false;

    setRealtimeState((current) => withOptimisticChecklistStatus(current, {
      listId,
      itemId,
      done,
      updatedAt: Date.now()
    }));

    try {
      await ensureAccess();
      await updateTripChecklistStatus({ tripId, listId, itemId, uid, done });
      setRealtimeError('');
      return true;
    } catch {
      setRealtimeError(TRIP_REALTIME_SYNC_ERROR);
      return false;
    }
  }, [ensureAccess, isEnabled, tripId, uid]);

  const publishShoppingItemStatus = useCallback(async ({ itemId, purchased }) => {
    if (!isEnabled) return false;

    setRealtimeState((current) => withOptimisticShoppingStatus(current, {
      itemId,
      purchased,
      updatedAt: Date.now()
    }));

    try {
      await ensureAccess();
      await updateTripShoppingStatus({ tripId, itemId, uid, purchased });
      setRealtimeError('');
      return true;
    } catch {
      setRealtimeError(TRIP_REALTIME_SYNC_ERROR);
      return false;
    }
  }, [ensureAccess, isEnabled, tripId, uid]);

  return useMemo(() => ({
    ...realtimeState,
    isRealtimeEnabled: isEnabled,
    realtimeError,
    updateRealtimeEditingTarget,
    publishChecklistItemStatus,
    publishShoppingItemStatus
  }), [
    realtimeState,
    isEnabled,
    realtimeError,
    updateRealtimeEditingTarget,
    publishChecklistItemStatus,
    publishShoppingItemStatus
  ]);
};
