import {
  off,
  onDisconnect,
  onValue,
  ref,
  remove,
  serverTimestamp,
  set,
  update
} from 'firebase/database';
import { httpsCallable } from 'firebase/functions';
import { functions, rtdb } from './firebase';
import { PRESENCE_CLIENT_ID_KEY } from '../utils/storageKeys';

export const hasRealtimeDatabase = () => Boolean(rtdb);

export const createPresenceClientId = () => {
  try {
    const existing = sessionStorage.getItem(PRESENCE_CLIENT_ID_KEY);
    if (existing) return existing;
    const next = `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(PRESENCE_CLIENT_ID_KEY, next);
    return next;
  } catch {
    return `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
};

export const buildPresenceProfile = (user, profile = {}) => ({
  uid: user.uid,
  displayName: profile.displayName || user.displayName || user.email || 'Member',
  email: user.email || '',
  photoURL: profile.photoURL || user.photoURL || ''
});

export const getTripPresenceRef = (tripId) => ref(rtdb, `tripPresence/${tripId}`);
export const getPresenceProfileRef = (tripId, uid) => ref(rtdb, `tripPresence/${tripId}/${uid}/profile`);
export const getPresenceConnectionRef = (tripId, uid, clientId) => (
  ref(rtdb, `tripPresence/${tripId}/${uid}/connections/${clientId}`)
);

export const getConnectedRef = () => ref(rtdb, '.info/connected');

export const subscribeToTripPresence = (tripId, callback, onError) => {
  if (!rtdb || !tripId) return () => {};
  const presenceRef = getTripPresenceRef(tripId);
  return onValue(presenceRef, callback, onError);
};

export const ensureTripPresenceAccess = async ({ tripId }) => {
  if (!tripId) return { ready: false, role: '' };
  const callable = httpsCallable(functions, 'ensureTripPresenceAccess');
  const response = await callable({ tripId });
  return response.data || { ready: false, role: '' };
};

export const isPresencePermissionError = (error) => {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  return code.includes('permission')
    || message.includes('permission_denied')
    || message.includes('permission denied');
};

export const startPresenceConnection = async ({
  tripId,
  user,
  profile,
  clientId,
  activeTab,
  editingTarget = ''
}) => {
  if (!rtdb || !tripId || !user?.uid || !clientId) return false;

  const profileRef = getPresenceProfileRef(tripId, user.uid);
  const connectionRef = getPresenceConnectionRef(tripId, user.uid, clientId);
  await set(profileRef, buildPresenceProfile(user, profile));
  await onDisconnect(connectionRef).remove();
  await set(connectionRef, {
    state: 'online',
    activeTab: activeTab || 'summary',
    editingTarget: editingTarget || '',
    startedAt: serverTimestamp(),
    lastActiveAt: serverTimestamp()
  });
  return true;
};

export const updatePresenceConnection = async ({
  tripId,
  uid,
  clientId,
  activeTab,
  editingTarget = ''
}) => {
  if (!rtdb || !tripId || !uid || !clientId) return false;
  await update(getPresenceConnectionRef(tripId, uid, clientId), {
    activeTab: activeTab || 'summary',
    editingTarget: editingTarget || '',
    lastActiveAt: serverTimestamp()
  });
  return true;
};

export const stopPresenceConnection = async ({ tripId, uid, clientId }) => {
  if (!rtdb || !tripId || !uid || !clientId) return false;
  const connectionRef = getPresenceConnectionRef(tripId, uid, clientId);
  off(connectionRef);
  await remove(connectionRef);
  return true;
};
