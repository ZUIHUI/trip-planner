import { db, functions } from './firebase';
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
import { httpsCallable } from 'firebase/functions';
import {
  buildTripDocumentFromAppState,
  buildTripListItem,
  normalizeTripDocumentForApp
} from '../domain/tripSchema';
import {
  buildTripEventDocument,
  normalizeTripEventDocumentForApp
} from '../utils/tripEventDocuments';
import {
  buildChecklistItemDocument,
  buildShoppingItemDocument,
  normalizeChecklistItemDocumentForApp,
  normalizeShoppingItemDocumentForApp
} from '../utils/tripItemDocuments';
import {
  buildShoppingCategoryDocument,
  buildTripExpenseDocument,
  buildTripPlaceIdeaDocument,
  normalizeShoppingCategoryDocumentForApp,
  normalizeTripExpenseDocumentForApp,
  normalizeTripPlaceIdeaDocumentForApp
} from '../utils/tripCollectionDocuments';

const PRIMARY_OWNER_EMAIL = (import.meta.env.VITE_PRIMARY_OWNER_EMAIL || 'sky32439@gmail.com').toLowerCase();

const getUserEmail = (user) => String(user?.email || '').toLowerCase();

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
const getTripEventCollectionRef = (tripId) => collection(db, 'trips', tripId, 'events');
const getTripEventDocRef = (tripId, eventId) => doc(db, 'trips', tripId, 'events', String(eventId));
const getTripChecklistItemCollectionRef = (tripId) => collection(db, 'trips', tripId, 'checklistItems');
const getTripChecklistItemDocRef = (tripId, itemId) => doc(db, 'trips', tripId, 'checklistItems', String(itemId));
const getTripShoppingItemCollectionRef = (tripId) => collection(db, 'trips', tripId, 'shoppingItems');
const getTripShoppingItemDocRef = (tripId, itemId) => doc(db, 'trips', tripId, 'shoppingItems', String(itemId));
const getTripExpenseCollectionRef = (tripId) => collection(db, 'trips', tripId, 'expenses');
const getTripExpenseDocRef = (tripId, expenseId) => doc(db, 'trips', tripId, 'expenses', String(expenseId));
const getTripPlaceIdeaCollectionRef = (tripId) => collection(db, 'trips', tripId, 'placeIdeas');
const getTripPlaceIdeaDocRef = (tripId, placeId) => doc(db, 'trips', tripId, 'placeIdeas', String(placeId));
const getTripShoppingCategoryCollectionRef = (tripId) => collection(db, 'trips', tripId, 'shoppingCategories');
const getTripShoppingCategoryDocRef = (tripId, categoryId) => doc(db, 'trips', tripId, 'shoppingCategories', String(categoryId));

const commitInChunks = async (operations, chunkSize = 240) => {
  for (let index = 0; index < operations.length; index += chunkSize) {
    const batch = writeBatch(db);
    operations.slice(index, index + chunkSize).forEach((operation) => operation(batch));
    await batch.commit();
  }
};

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

export const subscribeTripEventDocuments = (tripId, onData, onError) => {
  if (!tripId) return () => {};
  return onSnapshot(
    getTripEventCollectionRef(tripId),
    (snapshot) => {
      onData(snapshot.docs.map((snapshotDoc) => normalizeTripEventDocumentForApp({
        id: snapshotDoc.id,
        ...snapshotDoc.data()
      })));
    },
    onError
  );
};

export const subscribeTripChecklistItemDocuments = (tripId, onData, onError) => {
  if (!tripId) return () => {};
  return onSnapshot(
    getTripChecklistItemCollectionRef(tripId),
    (snapshot) => {
      onData(snapshot.docs.map((snapshotDoc) => normalizeChecklistItemDocumentForApp({
        id: snapshotDoc.id,
        ...snapshotDoc.data()
      })));
    },
    onError
  );
};

export const subscribeTripShoppingItemDocuments = (tripId, onData, onError) => {
  if (!tripId) return () => {};
  return onSnapshot(
    getTripShoppingItemCollectionRef(tripId),
    (snapshot) => {
      onData(snapshot.docs.map((snapshotDoc) => normalizeShoppingItemDocumentForApp({
        id: snapshotDoc.id,
        ...snapshotDoc.data()
      })));
    },
    onError
  );
};

export const subscribeTripExpenseDocuments = (tripId, onData, onError) => {
  if (!tripId) return () => {};
  return onSnapshot(
    getTripExpenseCollectionRef(tripId),
    (snapshot) => {
      onData(snapshot.docs.map((snapshotDoc) => normalizeTripExpenseDocumentForApp({
        id: snapshotDoc.id,
        ...snapshotDoc.data()
      })));
    },
    onError
  );
};

export const subscribeTripPlaceIdeaDocuments = (tripId, onData, onError) => {
  if (!tripId) return () => {};
  return onSnapshot(
    getTripPlaceIdeaCollectionRef(tripId),
    (snapshot) => {
      onData(snapshot.docs.map((snapshotDoc) => normalizeTripPlaceIdeaDocumentForApp({
        id: snapshotDoc.id,
        ...snapshotDoc.data()
      })));
    },
    onError
  );
};

export const subscribeTripShoppingCategoryDocuments = (tripId, onData, onError) => {
  if (!tripId) return () => {};
  return onSnapshot(
    getTripShoppingCategoryCollectionRef(tripId),
    (snapshot) => {
      onData(snapshot.docs.map((snapshotDoc) => normalizeShoppingCategoryDocumentForApp({
        id: snapshotDoc.id,
        ...snapshotDoc.data()
      })));
    },
    onError
  );
};

const writeTripEventDocument = async ({
  tripId,
  event,
  dayNumber,
  orderKey,
  user,
  clientId = '',
  deleted = false
}) => {
  requireUser(user);
  const eventId = String(event?.id || '').trim();
  if (!tripId || !eventId) throw new Error('Missing trip event id');

  const eventRef = getTripEventDocRef(tripId, eventId);
  const now = new Date().toISOString();
  const payload = buildTripEventDocument({
    event,
    dayNumber,
    orderKey,
    user,
    clientId,
    deleted,
    now
  });
  const snapshot = await getDoc(eventRef);

  if (snapshot.exists()) {
    await updateDoc(eventRef, payload);
  } else {
    await setDoc(eventRef, {
      ...payload,
      createdAt: now
    }, { merge: true });
  }

  return normalizeTripEventDocumentForApp(payload);
};

export const saveTripEventDocument = async ({
  tripId,
  event,
  dayNumber,
  orderKey,
  user,
  clientId = ''
}) => writeTripEventDocument({
  tripId,
  event,
  dayNumber,
  orderKey,
  user,
  clientId,
  deleted: false
});

export const deleteTripEventDocument = async ({
  tripId,
  event,
  eventId,
  user,
  clientId = ''
}) => {
  const safeEvent = {
    ...(event || {}),
    id: String(eventId || event?.id || '').trim()
  };
  return writeTripEventDocument({
    tripId,
    event: safeEvent,
    dayNumber: Number(event?.dayNumber || event?.day || 1),
    orderKey: Number(event?.orderKey || 0),
    user,
    clientId,
    deleted: true
  });
};

export const moveTripEventDocument = async ({
  tripId,
  event,
  dayNumber,
  orderKey,
  user,
  clientId = ''
}) => {
  requireUser(user);
  const eventId = String(event?.id || '').trim();
  if (!tripId || !eventId) throw new Error('Missing trip event id');

  const eventRef = getTripEventDocRef(tripId, eventId);
  const now = new Date().toISOString();

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(eventRef);
    const payload = buildTripEventDocument({
      event: {
        ...(snapshot.exists() ? snapshot.data() : {}),
        ...event,
        id: eventId
      },
      dayNumber,
      orderKey,
      user,
      clientId,
      deleted: false,
      now
    });

    if (snapshot.exists()) {
      transaction.update(eventRef, payload);
    } else {
      transaction.set(eventRef, {
        ...payload,
        createdAt: now
      }, { merge: true });
    }

    return normalizeTripEventDocumentForApp(payload);
  });
};

const writeTripChecklistItemDocument = async ({
  tripId,
  item,
  listId,
  orderKey,
  user,
  clientId = '',
  deleted = false
}) => {
  requireUser(user);
  const itemId = String(item?.id || '').trim();
  if (!tripId || !itemId) throw new Error('Missing checklist item id');

  const itemRef = getTripChecklistItemDocRef(tripId, itemId);
  const now = new Date().toISOString();
  const payload = buildChecklistItemDocument({
    item,
    listId,
    orderKey,
    user,
    clientId,
    deleted,
    now
  });
  const snapshot = await getDoc(itemRef);

  if (snapshot.exists()) {
    await updateDoc(itemRef, payload);
  } else {
    await setDoc(itemRef, {
      ...payload,
      createdAt: now
    }, { merge: true });
  }

  return normalizeChecklistItemDocumentForApp(payload);
};

export const saveTripChecklistItemDocument = async ({
  tripId,
  item,
  listId,
  orderKey,
  user,
  clientId = ''
}) => writeTripChecklistItemDocument({
  tripId,
  item,
  listId,
  orderKey,
  user,
  clientId,
  deleted: false
});

export const deleteTripChecklistItemDocument = async ({
  tripId,
  item,
  itemId,
  listId,
  user,
  clientId = ''
}) => {
  const safeItem = {
    ...(item || {}),
    id: String(itemId || item?.id || '').trim()
  };
  return writeTripChecklistItemDocument({
    tripId,
    item: safeItem,
    listId: listId || item?.listId || 'preTrip',
    orderKey: Number(item?.orderKey || 0),
    user,
    clientId,
    deleted: true
  });
};

export const moveTripChecklistItemDocument = async ({
  tripId,
  item,
  listId,
  orderKey,
  user,
  clientId = ''
}) => {
  requireUser(user);
  const itemId = String(item?.id || '').trim();
  if (!tripId || !itemId) throw new Error('Missing checklist item id');

  const itemRef = getTripChecklistItemDocRef(tripId, itemId);
  const now = new Date().toISOString();

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(itemRef);
    const payload = buildChecklistItemDocument({
      item: {
        ...(snapshot.exists() ? snapshot.data() : {}),
        ...item,
        id: itemId
      },
      listId,
      orderKey,
      user,
      clientId,
      deleted: false,
      now
    });

    if (snapshot.exists()) {
      transaction.update(itemRef, payload);
    } else {
      transaction.set(itemRef, {
        ...payload,
        createdAt: now
      }, { merge: true });
    }

    return normalizeChecklistItemDocumentForApp(payload);
  });
};

const writeTripShoppingItemDocument = async ({
  tripId,
  item,
  orderKey,
  user,
  clientId = '',
  deleted = false
}) => {
  requireUser(user);
  const itemId = String(item?.id || '').trim();
  if (!tripId || !itemId) throw new Error('Missing shopping item id');

  const itemRef = getTripShoppingItemDocRef(tripId, itemId);
  const now = new Date().toISOString();
  const payload = buildShoppingItemDocument({
    item,
    orderKey,
    user,
    clientId,
    deleted,
    now
  });
  const snapshot = await getDoc(itemRef);

  if (snapshot.exists()) {
    await updateDoc(itemRef, payload);
  } else {
    await setDoc(itemRef, {
      ...payload,
      createdAt: now
    }, { merge: true });
  }

  return normalizeShoppingItemDocumentForApp(payload);
};

export const saveTripShoppingItemDocument = async ({
  tripId,
  item,
  orderKey,
  user,
  clientId = ''
}) => writeTripShoppingItemDocument({
  tripId,
  item,
  orderKey,
  user,
  clientId,
  deleted: false
});

export const deleteTripShoppingItemDocument = async ({
  tripId,
  item,
  itemId,
  user,
  clientId = ''
}) => {
  const safeItem = {
    ...(item || {}),
    id: String(itemId || item?.id || '').trim()
  };
  return writeTripShoppingItemDocument({
    tripId,
    item: safeItem,
    orderKey: Number(item?.orderKey || 0),
    user,
    clientId,
    deleted: true
  });
};

export const moveTripShoppingItemDocument = async ({
  tripId,
  item,
  orderKey,
  user,
  clientId = ''
}) => {
  requireUser(user);
  const itemId = String(item?.id || '').trim();
  if (!tripId || !itemId) throw new Error('Missing shopping item id');

  const itemRef = getTripShoppingItemDocRef(tripId, itemId);
  const now = new Date().toISOString();

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(itemRef);
    const payload = buildShoppingItemDocument({
      item: {
        ...(snapshot.exists() ? snapshot.data() : {}),
        ...item,
        id: itemId
      },
      orderKey,
      user,
      clientId,
      deleted: false,
      now
    });

    if (snapshot.exists()) {
      transaction.update(itemRef, payload);
    } else {
      transaction.set(itemRef, {
        ...payload,
        createdAt: now
      }, { merge: true });
    }

    return normalizeShoppingItemDocumentForApp(payload);
  });
};

const writeTripExpenseDocument = async ({
  tripId,
  expense,
  orderKey,
  user,
  clientId = '',
  deleted = false
}) => {
  requireUser(user);
  const expenseId = String(expense?.id || '').trim();
  if (!tripId || !expenseId) throw new Error('Missing expense id');

  const expenseRef = getTripExpenseDocRef(tripId, expenseId);
  const now = new Date().toISOString();
  const payload = buildTripExpenseDocument({
    expense,
    orderKey,
    user,
    clientId,
    deleted,
    now
  });
  const snapshot = await getDoc(expenseRef);

  if (snapshot.exists()) {
    await updateDoc(expenseRef, payload);
  } else {
    await setDoc(expenseRef, {
      ...payload,
      createdAt: now
    }, { merge: true });
  }

  return normalizeTripExpenseDocumentForApp(payload);
};

export const saveTripExpenseDocument = async ({
  tripId,
  expense,
  orderKey,
  user,
  clientId = ''
}) => writeTripExpenseDocument({
  tripId,
  expense,
  orderKey,
  user,
  clientId,
  deleted: false
});

export const deleteTripExpenseDocument = async ({
  tripId,
  expense,
  expenseId,
  user,
  clientId = ''
}) => {
  const safeExpense = {
    ...(expense || {}),
    id: String(expenseId || expense?.id || '').trim()
  };
  return writeTripExpenseDocument({
    tripId,
    expense: safeExpense,
    orderKey: Number(expense?.orderKey || 0),
    user,
    clientId,
    deleted: true
  });
};

const writeTripPlaceIdeaDocument = async ({
  tripId,
  place,
  orderKey,
  user,
  clientId = '',
  deleted = false
}) => {
  requireUser(user);
  const placeId = String(place?.id || '').trim();
  if (!tripId || !placeId) throw new Error('Missing place idea id');

  const placeRef = getTripPlaceIdeaDocRef(tripId, placeId);
  const now = new Date().toISOString();
  const payload = buildTripPlaceIdeaDocument({
    place,
    orderKey,
    user,
    clientId,
    deleted,
    now
  });
  const snapshot = await getDoc(placeRef);

  if (snapshot.exists()) {
    await updateDoc(placeRef, payload);
  } else {
    await setDoc(placeRef, {
      ...payload,
      createdAt: now
    }, { merge: true });
  }

  return normalizeTripPlaceIdeaDocumentForApp(payload);
};

export const saveTripPlaceIdeaDocument = async ({
  tripId,
  place,
  orderKey,
  user,
  clientId = ''
}) => writeTripPlaceIdeaDocument({
  tripId,
  place,
  orderKey,
  user,
  clientId,
  deleted: false
});

export const deleteTripPlaceIdeaDocument = async ({
  tripId,
  place,
  placeId,
  user,
  clientId = ''
}) => {
  const safePlace = {
    ...(place || {}),
    id: String(placeId || place?.id || '').trim()
  };
  return writeTripPlaceIdeaDocument({
    tripId,
    place: safePlace,
    orderKey: Number(place?.orderKey || 0),
    user,
    clientId,
    deleted: true
  });
};

const writeTripShoppingCategoryDocument = async ({
  tripId,
  category,
  name,
  orderKey,
  user,
  clientId = '',
  deleted = false
}) => {
  requireUser(user);
  const payload = buildShoppingCategoryDocument({
    category,
    name,
    orderKey,
    user,
    clientId,
    deleted
  });
  const categoryId = String(payload.id || category?.id || '').trim();
  if (!tripId || !categoryId) throw new Error('Missing shopping category id');

  const categoryRef = getTripShoppingCategoryDocRef(tripId, categoryId);
  const now = new Date().toISOString();
  const document = {
    ...payload,
    updatedAt: now
  };
  const snapshot = await getDoc(categoryRef);

  if (snapshot.exists()) {
    await updateDoc(categoryRef, document);
  } else {
    await setDoc(categoryRef, {
      ...document,
      createdAt: now
    }, { merge: true });
  }

  return normalizeShoppingCategoryDocumentForApp(document);
};

export const saveTripShoppingCategoryDocument = async ({
  tripId,
  category,
  name,
  orderKey,
  user,
  clientId = ''
}) => writeTripShoppingCategoryDocument({
  tripId,
  category,
  name,
  orderKey,
  user,
  clientId,
  deleted: false
});

export const deleteTripShoppingCategoryDocument = async ({
  tripId,
  category,
  categoryId,
  name,
  user,
  clientId = ''
}) => writeTripShoppingCategoryDocument({
  tripId,
  category: {
    ...(category || {}),
    id: String(categoryId || category?.id || '').trim(),
    name: name || category?.name || ''
  },
  name,
  orderKey: Number(category?.orderKey || 0),
  user,
  clientId,
  deleted: true
});

export const getTripMemberRole = async (tripId, uid) => {
  if (!uid) return '';
  const memberSnap = await getDoc(getMemberDocRef(tripId, uid));
  return memberSnap.exists() ? memberSnap.data()?.role || '' : '';
};

export const updateTripMemberProfile = async ({ tripId, user, displayName = '', photoURL = '' }) => {
  requireUser(user);
  if (!tripId) return false;

  await updateDoc(getMemberDocRef(tripId, user.uid), {
    uid: user.uid,
    email: user.email || '',
    displayName: String(displayName || '').trim() || getUserName(user),
    photoURL: photoURL || user.photoURL || '',
    updatedAt: new Date().toISOString()
  });
  return true;
};

export const updateCurrentUserMemberProfiles = async ({ user, displayName = '', photoURL = '' } = {}) => {
  requireUser(user);
  const snapshot = await getDocs(query(collectionGroup(db, 'members'), where('uid', '==', user.uid)));
  const safeDisplayName = String(displayName || '').trim() || getUserName(user);
  const operations = snapshot.docs.map((snapshotDoc) => (batch) => {
    batch.update(snapshotDoc.ref, {
      uid: user.uid,
      email: user.email || '',
      displayName: safeDisplayName,
      photoURL: photoURL || user.photoURL || '',
      updatedAt: new Date().toISOString()
    });
  });

  await commitInChunks(operations);
  return { updated: snapshot.size };
};

export const ensureTripAccess = async ({ tripId, user, profile }) => {
  requireUser(user);

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
      if (!PRIMARY_OWNER_EMAIL || getUserEmail(user) !== PRIMARY_OWNER_EMAIL) {
        throw new Error('這趟旅程還在舊資料格式，請用主要帳號登入後再開啟。');
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

    throw new Error('你還沒有加入這趟旅程，請回首頁輸入邀請碼加入。');
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
      const error = new Error('旅程內容已更新');
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

export const createTripInviteCode = async ({ tripId, permission = 'view', user }) => {
  requireUser(user);
  const callable = httpsCallable(functions, 'createTripInviteCode');
  const response = await callable({
    tripId,
    permission: permission === 'edit' ? 'edit' : 'view'
  });
  return response.data || {};
};

export const getTripInviteCode = async ({ tripId, user }) => {
  requireUser(user);
  const callable = httpsCallable(functions, 'getTripInviteCode');
  const response = await callable({ tripId });
  return response.data || {};
};

export const disableTripInviteCode = async ({ tripId, user }) => {
  requireUser(user);
  const callable = httpsCallable(functions, 'disableTripInviteCode');
  const response = await callable({ tripId });
  return response.data || {};
};

export const redeemTripInviteCode = async ({ code, user, profile }) => {
  requireUser(user);
  const callable = httpsCallable(functions, 'redeemTripInviteCode');
  const response = await callable({
    code,
    displayName: getUserName(user, profile),
    photoURL: user.photoURL || ''
  });
  return response.data || {};
};

export const togglePlaceVote = async ({ tripId, placeId, user, profile, clientId = '', value }) => {
  requireUser(user);
  const callable = httpsCallable(functions, 'togglePlaceVote');
  const payload = {
    tripId,
    placeId,
    clientId,
    displayName: getUserName(user, profile)
  };

  if (value !== undefined) {
    payload.value = value;
  }

  try {
    const response = await callable(payload);
    return response.data || {};
  } catch (error) {
    const code = String(error?.code || '').toLowerCase();
    const message = String(error?.message || '');
    if (
      code.includes('permission')
      || /missing or insufficient permissions/i.test(message)
      || /permission[-_\s]?denied/i.test(message)
    ) {
      throw new Error('目前無法更新想去回應，請確認你仍在這趟旅程中，或重新整理後再試。');
    }
    throw error;
  }
};

export const claimOwnerlessTrips = async ({ user, profile } = {}) => {
  requireUser(user);
  if (!PRIMARY_OWNER_EMAIL || getUserEmail(user) !== PRIMARY_OWNER_EMAIL) {
    throw new Error('只有主要帳號可以整理既有旅程。');
  }

  const callable = httpsCallable(functions, 'claimExistingTrips');
  const response = await callable({
    forceOwned: true,
    displayName: getUserName(user, profile),
    photoURL: user.photoURL || ''
  });

  return response.data || { claimed: 0, reassigned: 0, synced: 0, skipped: 0 };
  /*
  if (!PRIMARY_OWNER_EMAIL || getUserEmail(user) !== PRIMARY_OWNER_EMAIL) {
    throw new Error('目前帳號不是主要資料擁有者');
  }

  const snapshot = await getDocs(collection(db, 'trips'));
  const operations = [];
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
    operations.push((batch) => {
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
  });

  operations.push((batch) => {
    batch.set(doc(db, 'appMeta', 'ownerMigration'), {
      primaryOwnerEmail: PRIMARY_OWNER_EMAIL,
      claimed,
      skipped,
      updatedAt: now
    }, { merge: true });
  });
  await commitInChunks(operations);

  return { claimed, skipped };
  */
};

export const isPrimaryOwnerAccount = (user) => Boolean(PRIMARY_OWNER_EMAIL && getUserEmail(user) === PRIMARY_OWNER_EMAIL);
