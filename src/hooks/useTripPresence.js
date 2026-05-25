import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createPresenceClientId,
  ensureTripPresenceAccess,
  getConnectedRef,
  hasRealtimeDatabase,
  isPresencePermissionError,
  startPresenceConnection,
  stopPresenceConnection,
  subscribeToTripPresence,
  updatePresenceConnection
} from '../services/presenceService';
import { onValue } from 'firebase/database';

const PRESENCE_HEARTBEAT_MS = 25000;
const PRESENCE_STALE_MS = 75000;
const PRESENCE_RECHECK_MS = 15000;
const PRESENCE_START_TIMEOUT_MS = 12000;
const PRESENCE_SYNC_ERROR = '在線狀態暫時無法同步';

const normalizeConnection = (connection = {}) => ({
  state: connection.state || 'offline',
  activeTab: connection.activeTab || '',
  editingTarget: connection.editingTarget || '',
  startedAt: Number(connection.startedAt || 0),
  lastActiveAt: Number(connection.lastActiveAt || 0)
});

const getConnectionActivityAt = (connection = {}) => (
  Number(connection.lastActiveAt || connection.startedAt || 0)
);

const isFreshConnection = (connection, now = Date.now()) => {
  const activityAt = getConnectionActivityAt(connection);
  return connection.state === 'online'
    && activityAt > 0
    && now - activityAt <= PRESENCE_STALE_MS;
};

const normalizePresenceValue = (value = {}, now = Date.now()) => {
  const byUid = {};
  const onlineMembers = [];

  Object.entries(value).forEach(([uid, entry]) => {
    const connections = entry?.connections || {};
    const activeConnections = Object.entries(connections)
      .map(([clientId, connection]) => ({ clientId, ...normalizeConnection(connection) }))
      .filter((connection) => isFreshConnection(connection, now))
      .sort((a, b) => getConnectionActivityAt(b) - getConnectionActivityAt(a));

    const current = activeConnections[0] || null;
    const presence = {
      uid,
      profile: entry?.profile || {},
      online: activeConnections.length > 0,
      connectionCount: activeConnections.length,
      activeTab: current?.activeTab || '',
      editingTarget: current?.editingTarget || '',
      lastActiveAt: getConnectionActivityAt(current),
      connections: activeConnections
    };

    byUid[uid] = presence;
    if (presence.online) {
      onlineMembers.push(presence);
    }
  });

  return {
    presenceByUid: byUid,
    onlineMembers: onlineMembers.sort((a, b) => Number(b.lastActiveAt || 0) - Number(a.lastActiveAt || 0))
  };
};

const normalizePresenceSnapshot = (snapshot) => (
  normalizePresenceValue(snapshot.val() || {})
);

const withTimeout = (promise, timeoutMs) => new Promise((resolve, reject) => {
  const timer = window.setTimeout(() => reject(new Error('presence-timeout')), timeoutMs);
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

export const useTripPresence = ({
  tripId,
  currentUser,
  userProfile,
  accessRole,
  activeTab,
  enabled = true
}) => {
  const clientIdRef = useRef(createPresenceClientId());
  const latestStateRef = useRef({ activeTab, editingTarget: '' });
  const latestPresenceValueRef = useRef({});
  const [editingTarget, setEditingTarget] = useState('');
  const [presenceByUid, setPresenceByUid] = useState({});
  const [onlineMembers, setOnlineMembers] = useState([]);
  const [presenceError, setPresenceError] = useState('');
  const [connectionReady, setConnectionReady] = useState(false);
  const uid = currentUser?.uid || '';
  const isEnabled = Boolean(enabled && hasRealtimeDatabase() && tripId && uid && accessRole);

  useEffect(() => {
    latestStateRef.current = { activeTab, editingTarget };
  }, [activeTab, editingTarget]);

  useEffect(() => {
    if (!isEnabled) {
      latestPresenceValueRef.current = {};
      setPresenceByUid({});
      setOnlineMembers([]);
      setPresenceError('');
      setConnectionReady(false);
      return undefined;
    }

    let cancelled = false;
    let connectedUnsubscribe = null;
    let presenceUnsubscribe = null;
    let recheckTimer = null;
    let startInFlight = false;
    let accessInFlight = null;
    let accessRefreshAttempts = 0;
    let isConnected = false;

    const publishPresenceValue = (value) => {
      const normalized = normalizePresenceValue(value || {});
      setPresenceByUid(normalized.presenceByUid);
      setOnlineMembers(normalized.onlineMembers);
    };

    const publishLocalSelfPresence = () => {
      const now = Date.now();
      const activeConnection = {
        state: 'online',
        activeTab: latestStateRef.current.activeTab || 'summary',
        editingTarget: latestStateRef.current.editingTarget || '',
        startedAt: now,
        lastActiveAt: now
      };
      const profile = {
        uid,
        displayName: userProfile?.displayName || currentUser?.displayName || currentUser?.email || 'Member',
        email: currentUser?.email || '',
        photoURL: userProfile?.photoURL || currentUser?.photoURL || ''
      };
      const nextPresenceValue = {
        ...(latestPresenceValueRef.current || {}),
        [uid]: {
          ...((latestPresenceValueRef.current || {})[uid] || {}),
          profile,
          connections: {
            ...(((latestPresenceValueRef.current || {})[uid]?.connections) || {}),
            [clientIdRef.current]: activeConnection
          }
        }
      };

      latestPresenceValueRef.current = nextPresenceValue;
      publishPresenceValue(nextPresenceValue);
    };

    const ensurePresenceAccess = async () => {
      if (!accessInFlight) {
        accessInFlight = withTimeout(
          ensureTripPresenceAccess({ tripId }),
          PRESENCE_START_TIMEOUT_MS
        )
          .then((result) => {
            if (!result?.ready) {
              throw new Error(PRESENCE_SYNC_ERROR);
            }
            return result;
          })
          .finally(() => {
            accessInFlight = null;
          });
      }
      return accessInFlight;
    };

    const handlePresenceError = async (error) => {
      if (cancelled) return;

      if (isPresencePermissionError(error) && accessRefreshAttempts < 1) {
        accessRefreshAttempts += 1;
        try {
          await ensurePresenceAccess();
          if (cancelled) return;
          setPresenceError('');
          presenceUnsubscribe?.();
          subscribePresence();
          if (isConnected) {
            void startConnection();
          }
          return;
        } catch {
          // Fall through to the friendly sync error below.
        }
      }

      setPresenceError(PRESENCE_SYNC_ERROR);
    };

    const subscribePresence = () => {
      presenceUnsubscribe = subscribeToTripPresence(
        tripId,
        (snapshot) => {
          latestPresenceValueRef.current = snapshot.val() || {};
          const normalized = normalizePresenceSnapshot(snapshot);
          setPresenceByUid(normalized.presenceByUid);
          setOnlineMembers(normalized.onlineMembers);
          setPresenceError('');
        },
        handlePresenceError
      );
    };

    const startConnection = async () => {
      if (cancelled || startInFlight) return;
      startInFlight = true;
      let shouldRetryAfterAccess = false;

      try {
        await withTimeout(
          startPresenceConnection({
            tripId,
            user: currentUser,
            profile: userProfile,
            clientId: clientIdRef.current,
            activeTab: latestStateRef.current.activeTab,
            editingTarget: latestStateRef.current.editingTarget
          }),
          PRESENCE_START_TIMEOUT_MS
        );
        if (cancelled) return;
        publishLocalSelfPresence();
        setConnectionReady(true);
        setPresenceError('');
      } catch (error) {
        if (isPresencePermissionError(error) && accessRefreshAttempts < 2) {
          accessRefreshAttempts += 1;
          try {
            await ensurePresenceAccess();
            shouldRetryAfterAccess = true;
          } catch {
            if (!cancelled) {
              setPresenceError(PRESENCE_SYNC_ERROR);
            }
          }
        } else if (!cancelled) {
          setPresenceError(PRESENCE_SYNC_ERROR);
        }
      } finally {
        startInFlight = false;
      }

      if (shouldRetryAfterAccess && !cancelled) {
        void startConnection();
      }
    };

    const initializePresence = async () => {
      try {
        await ensurePresenceAccess();
        if (cancelled) return;
        setPresenceError('');

        connectedUnsubscribe = onValue(
          getConnectedRef(),
          (snapshot) => {
            if (cancelled) return;

            if (snapshot.val() === true) {
              isConnected = true;
              void startConnection();
              return;
            }

            isConnected = false;
            setConnectionReady(false);
          },
          handlePresenceError
        );

        subscribePresence();
        recheckTimer = window.setInterval(() => {
          publishPresenceValue(latestPresenceValueRef.current);
        }, PRESENCE_RECHECK_MS);
        void startConnection();
      } catch (error) {
        if (!cancelled) {
          setPresenceError(PRESENCE_SYNC_ERROR);
        }
      }
    };

    void initializePresence();

    return () => {
      cancelled = true;
      setConnectionReady(false);
      if (recheckTimer) {
        window.clearInterval(recheckTimer);
      }
      connectedUnsubscribe?.();
      presenceUnsubscribe?.();
      void stopPresenceConnection({
        tripId,
        uid,
        clientId: clientIdRef.current
      }).catch(() => {});
    };
  }, [isEnabled, tripId, uid, currentUser, userProfile]);

  useEffect(() => {
    if (!isEnabled || !connectionReady) return undefined;

    const pushHeartbeat = async (retryOnPermission = true) => {
      try {
        await updatePresenceConnection({
          tripId,
          uid,
          clientId: clientIdRef.current,
          activeTab: latestStateRef.current.activeTab,
          editingTarget: latestStateRef.current.editingTarget
        });
        setPresenceError('');
      } catch (error) {
        if (retryOnPermission && isPresencePermissionError(error)) {
          try {
            await ensureTripPresenceAccess({ tripId });
            await pushHeartbeat(false);
            return;
          } catch {
            // Fall through to the friendly sync error below.
          }
        }
        setPresenceError(PRESENCE_SYNC_ERROR);
      }
    };

    const queueHeartbeat = () => {
      void pushHeartbeat();
    };

    queueHeartbeat();
    const heartbeatTimer = window.setInterval(queueHeartbeat, PRESENCE_HEARTBEAT_MS);
    const handleFocus = () => queueHeartbeat();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        queueHeartbeat();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(heartbeatTimer);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isEnabled, connectionReady, tripId, uid]);

  useEffect(() => {
    if (!isEnabled || !connectionReady) return;

    const pushStateUpdate = async (retryOnPermission = true) => {
      try {
        await updatePresenceConnection({
          tripId,
          uid,
          clientId: clientIdRef.current,
          activeTab,
          editingTarget
        });
        setPresenceError('');
      } catch (error) {
        if (retryOnPermission && isPresencePermissionError(error)) {
          try {
            await ensureTripPresenceAccess({ tripId });
            await pushStateUpdate(false);
            return;
          } catch {
            // Fall through to the friendly sync error below.
          }
        }
        setPresenceError(PRESENCE_SYNC_ERROR);
      }
    };

    void pushStateUpdate();
  }, [isEnabled, connectionReady, tripId, uid, activeTab, editingTarget]);

  const updatePresenceEditingTarget = useCallback((target = '') => {
    setEditingTarget(String(target || '').slice(0, 160));
  }, []);

  return useMemo(() => ({
    onlineMembers,
    presenceByUid,
    presenceError,
    updatePresenceEditingTarget
  }), [
    onlineMembers,
    presenceByUid,
    presenceError,
    updatePresenceEditingTarget
  ]);
};
