import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createPresenceClientId,
  getConnectedRef,
  hasRealtimeDatabase,
  startPresenceConnection,
  stopPresenceConnection,
  subscribeToTripPresence,
  updatePresenceConnection
} from '../services/presenceService';
import { onValue } from 'firebase/database';

const PRESENCE_HEARTBEAT_MS = 25000;
const PRESENCE_STALE_MS = 75000;
const PRESENCE_RECHECK_MS = 15000;

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
      return undefined;
    }

    let cancelled = false;
    let startInFlight = false;
    let isConnected = false;

    const publishPresenceValue = (value) => {
      const normalized = normalizePresenceValue(value || {});
      setPresenceByUid(normalized.presenceByUid);
      setOnlineMembers(normalized.onlineMembers);
    };

    const startConnection = async () => {
      if (cancelled || startInFlight) return;
      startInFlight = true;

      try {
        await startPresenceConnection({
          tripId,
          user: currentUser,
          profile: userProfile,
          clientId: clientIdRef.current,
          activeTab: latestStateRef.current.activeTab,
          editingTarget: latestStateRef.current.editingTarget
        });
        if (cancelled || !isConnected) return;
        setConnectionReady(true);
        setPresenceError('');
      } catch (error) {
        if (!cancelled) {
          setPresenceError(error?.message || 'Presence connection failed');
        }
      } finally {
        startInFlight = false;
      }
    };

    const connectedUnsubscribe = onValue(getConnectedRef(), (snapshot) => {
      if (cancelled) return;

      if (snapshot.val() === true) {
        isConnected = true;
        void startConnection();
        return;
      }

      isConnected = false;
      setConnectionReady(false);
    });

    const presenceUnsubscribe = subscribeToTripPresence(
      tripId,
      (snapshot) => {
        latestPresenceValueRef.current = snapshot.val() || {};
        const normalized = normalizePresenceSnapshot(snapshot);
        setPresenceByUid(normalized.presenceByUid);
        setOnlineMembers(normalized.onlineMembers);
      },
      (error) => {
        setPresenceError(error?.message || 'Presence read failed');
      }
    );

    const recheckTimer = window.setInterval(() => {
      publishPresenceValue(latestPresenceValueRef.current);
    }, PRESENCE_RECHECK_MS);

    return () => {
      cancelled = true;
      setConnectionReady(false);
      window.clearInterval(recheckTimer);
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

    const pushHeartbeat = () => {
      void updatePresenceConnection({
        tripId,
        uid,
        clientId: clientIdRef.current,
        activeTab: latestStateRef.current.activeTab,
        editingTarget: latestStateRef.current.editingTarget
      }).catch((error) => {
        setPresenceError(error?.message || 'Presence update failed');
      });
    };

    pushHeartbeat();
    const heartbeatTimer = window.setInterval(pushHeartbeat, PRESENCE_HEARTBEAT_MS);
    const handleFocus = () => pushHeartbeat();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pushHeartbeat();
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
    void updatePresenceConnection({
      tripId,
      uid,
      clientId: clientIdRef.current,
      activeTab,
      editingTarget
    }).catch((error) => {
      setPresenceError(error?.message || 'Presence update failed');
    });
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
