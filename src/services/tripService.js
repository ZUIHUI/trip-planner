import { db } from './firebase';
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import {
  buildTripDocumentFromAppState,
  buildTripListItem,
  normalizeTripDocumentForApp
} from '../domain/tripSchema';

const PRIMARY_OWNER_EMAIL = import.meta.env.VITE_PRIMARY_OWNER_EMAIL || '';

const getUserName = (user, profile = {}) => (
  profile.displayName ||
  user?.displayName ||
  String(user?.email || '').split('@')[0] ||
  '旅伴'
);

const requireUser = (user) => {
  if (!user?.uid) {
    throw new Error('請先登入');
  }
};

const memberPayload = ({ user, profile, role, shareToken = '' }) => ({
  uid: user.uid,
  email: user.email || '',
  displayName: getUserName(user, profile),
  photoURL: user.photoURL || '',
  role,
  shareToken,
  joinedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

const getTripDocRef = (tripId) => doc(db, 'trips', tripId);
const getMemberDocRef = (tripId, uid) => doc(db, 'trips', tripId, 'members', uid);

export const loadTrip = async (tripId) => {
  const ref = getTripDocRef(tripId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return normalizeTripDocumentForApp({ id: snap.id, ...snap.data() });
};

export const subscribeTrip = (tripId, onData, onError) => {
  const ref = getTripDocRef(tripId);
  return onSnapshot(
    ref,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }
      onData(normalizeTripDocumentForApp({ id: snapshot.id, ...snapshot.data() }));
    },
    onError
  );
};

export const subscribeTripMembers = (tripId, onData, onError) => {
  const ref = collection(db, 'trips', tripId, 'members');
  return onSnapshot(
    ref,
    (snapshot) => {
      onData(snapshot.docs.map((snapshotDoc) => ({
        id: snapshotDoc.id,
        ...snapshotDoc.data()
      })));
    },
    onError
  );
};

export const getTripMemberRole = async (tripId, uid) => {
  if (!uid) return '';
  const memberSnap = await getDoc(getMemberDocRef(tripId, uid));
  return memberSnap.exists() ? memberSnap.data()?.role || '' : '';
};

export const ensureTripAccess = async ({ tripId, user, profile, shareToken = '' }) => {
  requireUser(user);

  if (shareToken) {
    return redeemShareToken({ tripId, shareToken, user, profile });
  }

  const tripRef = getTripDocRef(tripId);
  const memberRef = getMemberDocRef(tripId, user.uid);

  return runTransaction(db, async (transaction) => {
    const tripSnap = await transaction.get(tripRef);
    if (!tripSnap.exists()) {
      throw new Error('找不到旅程');
    }

    const tripData = tripSnap.data();
    const ownerUid = tripData?.access?.ownerUid || '';

    if (!ownerUid) {
      if (!PRIMARY_OWNER_EMAIL || user.email !== PRIMARY_OWNER_EMAIL) {
        throw new Error('這趟旅程尚未綁定 Owner，只有主要帳號可以接管既有資料。');
      }

      const now = new Date().toISOString();
      transaction.set(tripRef, {
        access: {
          ownerUid: user.uid,
          ownerEmail: user.email || '',
          ownerName: getUserName(user, profile),
          migratedAt: now
        },
        updatedAt: now
      }, { merge: true });
      transaction.set(memberRef, memberPayload({ user, profile, role: 'owner' }), { merge: true });
      return { role: 'owner', claimedOwner: true };
    }

    if (ownerUid === user.uid) {
      transaction.set(memberRef, memberPayload({ user, profile, role: 'owner' }), { merge: true });
      return { role: 'owner', claimedOwner: false };
    }

    const memberSnap = await transaction.get(memberRef);
    if (memberSnap.exists()) {
      return { role: memberSnap.data()?.role || 'view', claimedOwner: false };
    }

    throw new Error('你沒有這趟旅程的存取權限');
  });
};

export const createTrip = async (tripId, tripData, { user, profile } = {}) => {
  requireUser(user);
  const batch = writeBatch(db);
  const now = new Date().toISOString();
  const tripRef = getTripDocRef(tripId);
  const memberRef = getMemberDocRef(tripId, user.uid);
  const tripDocument = buildTripDocumentFromAppState(tripId, {
    ...tripData,
    access: {
      ownerUid: user.uid,
      ownerEmail: user.email || '',
      ownerName: getUserName(user, profile),
      migratedAt: ''
    },
    syncMeta: {
      revision: 0,
      updatedByUid: user.uid,
      updatedByClientId: '',
      updatedAt: now
    }
  });

  batch.set(tripRef, tripDocument);
  batch.set(memberRef, memberPayload({ user, profile, role: 'owner' }), { merge: true });
  await batch.commit();
  return true;
};

export const listTrips = async ({ user } = {}) => {
  requireUser(user);
  const tripsById = new Map();
  const ownedSnapshot = await getDocs(query(collection(db, 'trips'), where('access.ownerUid', '==', user.uid)));
  ownedSnapshot.docs.forEach((snapshotDoc) => {
    tripsById.set(snapshotDoc.id, {
      ...buildTripListItem(snapshotDoc.id, snapshotDoc.data()),
      accessRole: 'owner'
    });
  });

  const memberSnapshot = await getDocs(query(collectionGroup(db, 'members'), where('uid', '==', user.uid)));
  await Promise.all(memberSnapshot.docs.map(async (memberDoc) => {
    const tripRef = memberDoc.ref.parent.parent;
    if (!tripRef || tripsById.has(tripRef.id)) return;
    const tripSnap = await getDoc(tripRef);
    if (tripSnap.exists()) {
      tripsById.set(tripSnap.id, {
        ...buildTripListItem(tripSnap.id, tripSnap.data()),
        accessRole: memberDoc.data()?.role || 'view'
      });
    }
  }));

  return Array.from(tripsById.values());
};

export const deleteTrip = async (tripId) => {
  await deleteDoc(getTripDocRef(tripId));
  return true;
};

export const saveTrip = async (
  tripId,
  tripData,
  { user, profile, baseRevision = 0, clientId = '', force = false } = {}
) => {
  requireUser(user);
  const tripRef = getTripDocRef(tripId);
  const now = new Date().toISOString();

  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(tripRef);
    if (!snap.exists()) {
      throw new Error('找不到旅程');
    }

    const existingData = snap.data();
    const remoteRevision = Number(existingData?.syncMeta?.revision || 0);
    if (!force && remoteRevision !== Number(baseRevision || 0)) {
      const error = new Error('遠端旅程已更新');
      error.code = 'trip/conflict';
      error.remoteData = normalizeTripDocumentForApp({ id: snap.id, ...existingData });
      throw error;
    }

    const nextDocument = buildTripDocumentFromAppState(tripId, {
      ...tripData,
      access: existingData.access,
      syncMeta: {
        revision: remoteRevision + 1,
        updatedByUid: user.uid,
        updatedByClientId: clientId,
        updatedAt: now
      }
    }, existingData);
    transaction.set(tripRef, nextDocument, { merge: true });
    return {
      revision: remoteRevision + 1
    };
  });
};

export const updateShoppingList = async (tripId, shoppingList) => {
  await setDoc(
    getTripDocRef(tripId),
    {
      planning: { shoppingList },
      shoppingList,
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );
};

export const updateShoppingCategories = async (tripId, shoppingCategories) => {
  await setDoc(
    getTripDocRef(tripId),
    {
      planning: { shoppingCategories },
      shoppingCategories,
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );
};

export const createTripShare = async ({ tripId, permission = 'view', user }) => {
  requireUser(user);
  const token = `share-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const now = new Date().toISOString();
  const normalizedPermission = permission === 'edit' ? 'edit' : 'view';
  await setDoc(doc(db, 'tripShares', token), {
    token,
    tripId,
    permission: normalizedPermission,
    enabled: true,
    createdByUid: user.uid,
    createdAt: now,
    updatedAt: now
  });
  return { token, permission: normalizedPermission };
};

export const updateTripSharePermission = async ({ token, permission }) => {
  if (!token) return false;
  await updateDoc(doc(db, 'tripShares', token), {
    permission: permission === 'edit' ? 'edit' : 'view',
    enabled: true,
    updatedAt: new Date().toISOString()
  });
  return true;
};

export const disableTripShare = async (token) => {
  if (!token) return false;
  await updateDoc(doc(db, 'tripShares', token), {
    enabled: false,
    updatedAt: new Date().toISOString()
  });
  return true;
};

export const redeemShareToken = async ({ tripId, shareToken, user, profile }) => {
  requireUser(user);
  const shareRef = doc(db, 'tripShares', shareToken);
  const memberRef = getMemberDocRef(tripId, user.uid);

  return runTransaction(db, async (transaction) => {
    const shareSnap = await transaction.get(shareRef);
    if (!shareSnap.exists()) {
      throw new Error('分享連結不存在');
    }

    const share = shareSnap.data();
    if (!share.enabled || share.tripId !== tripId) {
      throw new Error('分享連結已停用或不符合此旅程');
    }

    const role = share.permission === 'edit' ? 'editor' : 'view';
    transaction.set(memberRef, memberPayload({ user, profile, role, shareToken }), { merge: true });
    return { role, claimedOwner: false };
  });
};

export const claimOwnerlessTrips = async ({ user, profile } = {}) => {
  requireUser(user);
  if (!PRIMARY_OWNER_EMAIL || user.email !== PRIMARY_OWNER_EMAIL) {
    throw new Error('目前帳號不是主要資料擁有者');
  }

  const snapshot = await getDocs(collection(db, 'trips'));
  const batch = writeBatch(db);
  const now = new Date().toISOString();
  let claimed = 0;
  let skipped = 0;

  snapshot.docs.forEach((snapshotDoc) => {
    const data = snapshotDoc.data();
    if (data?.access?.ownerUid) {
      skipped += 1;
      return;
    }

    claimed += 1;
    batch.set(snapshotDoc.ref, {
      access: {
        ownerUid: user.uid,
        ownerEmail: user.email || '',
        ownerName: getUserName(user, profile),
        migratedAt: now
      },
      updatedAt: now
    }, { merge: true });
    batch.set(getMemberDocRef(snapshotDoc.id, user.uid), memberPayload({ user, profile, role: 'owner' }), { merge: true });
  });

  batch.set(doc(db, 'appMeta', 'ownerMigration'), {
    primaryOwnerEmail: PRIMARY_OWNER_EMAIL,
    claimed,
    skipped,
    updatedAt: now
  }, { merge: true });
  await batch.commit();

  return { claimed, skipped };
};

export const isPrimaryOwnerAccount = (user) => Boolean(PRIMARY_OWNER_EMAIL && user?.email === PRIMARY_OWNER_EMAIL);
