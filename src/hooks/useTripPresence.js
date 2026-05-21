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

const normalizeConnection = (connection = {}) => ({
  state: connection.state || 'offline',
  activeTab: connection.activeTab || '',
  editingTarget: connection.editingTarget || '',
  startedAt: Number(connection.startedAt || 0),
  lastActiveAt: Number(connection.lastActiveAt || 0)
});

const normalizePresenceSnapshot = (snapshot) => {
  const value = snapshot.val() || {};
  const byUid = {};
  const onlineMembers = [];

  Object.entries(value).forEach(([uid, entry]) => {
    const connections = entry?.connections || {};
    const activeConnections = Object.entries(connections)
      .map(([clientId, connection]) => ({ clientId, ...normalizeConnection(connection) }))
      .filter((connection) => connection.state === 'online')
      .sort((a, b) => Number(b.lastActiveAt || 0) - Number(a.lastActiveAt || 0));

    const current = activeConnections[0] || null;
    const presence = {
      uid,
      profile: entry?.profile || {},
      online: activeConnections.length > 0,
      connectionCount: activeConnections.length,
      activeTab: current?.activeTab || '',
      editingTarget: current?.editingTarget || '',
      lastActiveAt: current?.lastActiveAt || 0,
      connections: activeConnections
    };

    byUid[uid] = presence;
    if (presence.online) {
      onlineMembers.push(presence);
    }
  });

  return {
    presenceByUid: byUid,
    onlineMembers
  };
};

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
      setPresenceByUid({});
      setOnlineMembers([]);
      return undefined;
    }

    let cancelled = false;
    let connectionStarted = false;

    const connectedUnsubscribe = onValue(getConnectedRef(), async (snapshot) => {
      if (cancelled || snapshot.val() !== true || connectionStarted) return;
      connectionStarted = true;

      try {
        await startPresenceConnection({
          tripId,
          user: currentUser,
          profile: userProfile,
          clientId: clientIdRef.current,
          activeTab: latestStateRef.current.activeTab,
          editingTarget: latestStateRef.current.editingTarget
        });
        setConnectionReady(true);
        setPresenceError('');
      } catch (error) {
        setPresenceError(error?.message || 'Presence connection failed');
      }
    });

    const presenceUnsubscribe = subscribeToTripPresence(
      tripId,
      (snapshot) => {
        const normalized = normalizePresenceSnapshot(snapshot);
        setPresenceByUid(normalized.presenceByUid);
        setOnlineMembers(normalized.onlineMembers);
      },
      (error) => {
        setPresenceError(error?.message || 'Presence read failed');
      }
    );

    return () => {
      cancelled = true;
      setConnectionReady(false);
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
