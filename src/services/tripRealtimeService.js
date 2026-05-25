import {
  off,
  onDisconnect,
  onValue,
  ref,
  remove,
  serverTimestamp,
  set
} from 'firebase/database';
import { httpsCallable } from 'firebase/functions';
import { functions, rtdb } from './firebase';

export const hasTripRealtimeDatabase = () => Boolean(rtdb);

export const getTripRealtimeRef = (tripId) => ref(rtdb, `tripRealtime/${tripId}`);
export const getTripRealtimeEditingRef = (tripId, uid) => ref(rtdb, `tripRealtime/${tripId}/editing/${uid}`);
export const getTripChecklistStatusRef = (tripId, listId, itemId, uid) => (
  ref(rtdb, `tripRealtime/${tripId}/checklistStatus/${listId}/${itemId}/${uid}`)
);
export const getTripShoppingStatusRef = (tripId, itemId, uid) => (
  ref(rtdb, `tripRealtime/${tripId}/shoppingStatus/${itemId}/${uid}`)
);

export const subscribeTripRealtime = (tripId, callback, onError) => {
  if (!rtdb || !tripId) return () => {};
  return onValue(getTripRealtimeRef(tripId), callback, onError);
};

export const ensureTripRealtimeAccess = async ({ tripId }) => {
  if (!tripId) return { ready: false, role: '' };
  const callable = httpsCallable(functions, 'ensureTripRealtimeAccess');
  const response = await callable({ tripId });
  return response.data || { ready: false, role: '' };
};

export const isTripRealtimePermissionError = (error) => {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  return code.includes('permission')
    || message.includes('permission_denied')
    || message.includes('permission denied');
};

export const updateTripRealtimeEditing = async ({
  tripId,
  uid,
  activeTab,
  target = '',
  label = ''
}) => {
  if (!rtdb || !tripId || !uid) return false;
  const editingRef = getTripRealtimeEditingRef(tripId, uid);

  if (!target) {
    off(editingRef);
    await remove(editingRef);
    return true;
  }

  await onDisconnect(editingRef).remove();
  await set(editingRef, {
    target: String(target || '').slice(0, 160),
    label: String(label || '').slice(0, 160),
    activeTab: String(activeTab || 'summary').slice(0, 40),
    updatedAt: serverTimestamp()
  });
  return true;
};

export const updateTripChecklistStatus = async ({
  tripId,
  listId,
  itemId,
  uid,
  done
}) => {
  if (!rtdb || !tripId || !listId || !itemId || !uid) return false;
  await set(getTripChecklistStatusRef(tripId, listId, itemId, uid), {
    done: Boolean(done),
    updatedAt: serverTimestamp()
  });
  return true;
};

export const updateTripShoppingStatus = async ({
  tripId,
  itemId,
  uid,
  purchased
}) => {
  if (!rtdb || !tripId || !itemId || !uid) return false;
  await set(getTripShoppingStatusRef(tripId, itemId, uid), {
    purchased: Boolean(purchased),
    updatedAt: serverTimestamp()
  });
  return true;
};
