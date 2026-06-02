import app from './firebase';
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
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
import {
  normalizeTripDetailsMetaPatch,
  normalizeTripDetailsPatch
} from '../utils/tripDetailsPatch';
import {
  TRIP_DETAIL_SECTION_IDS,
  normalizeTripDetailDocumentForApp
} from '../utils/tripDetailDocuments';
import {
  buildRootItineraryDaysMirror,
  buildRootItineraryMirror,
  buildTripDayDocument,
  makeTripDayDocumentId,
  normalizeTripDayDocumentForApp
} from '../utils/tripDayDocuments';
import {
  TRIP_SETTING_IDS,
  normalizeTripCollaborationSettings,
  normalizeTripSettingDocumentForApp
} from '../utils/tripSettingDocuments';
import { TRIP_DOCUMENT_TOUCH_OPERATIONS } from '../utils/tripSync';
import { getLatestIsoTimestamp } from '../utils/tripTimestamps';
import { logger } from '../utils/logger';

const db = getFirestore(app);
const functions = getFunctions(app);
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

const asObject = (value) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}
);
const cleanString = (value, fallback = '') => (typeof value === 'string' ? value : fallback);
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(asObject(value), key);
const withoutUndefined = (value) => {
  if (Array.isArray(value)) return value.map(withoutUndefined);
  if (!value || typeof value !== 'object') return value;
  return Object.entries(value).reduce((acc, [key, entryValue]) => {
    if (entryValue !== undefined) {
      acc[key] = withoutUndefined(entryValue);
    }
    return acc;
  }, {});
};

const buildTripFieldUpdateMeta = ({
  user,
  clientId = '',
  operation = 'trip-details',
  entityId = '',
  now = new Date().toISOString()
}) => ({
  savedAt: now,
  updatedAt: now,
  'meta.updatedAt': now,
  'syncMeta.revision': increment(1),
  'syncMeta.updatedByUid': cleanString(user?.uid),
  'syncMeta.updatedByClientId': cleanString(clientId),
  'syncMeta.updatedByOperation': cleanString(operation),
  'syncMeta.updatedEntityId': cleanString(entityId),
  'syncMeta.updatedAt': now
});

const buildTripDetailDocumentMeta = ({
  section,
  user,
  clientId = '',
  now = new Date().toISOString()
}) => ({
  id: section,
  section,
  schemaVersion: 1,
  updatedAt: now,
  updatedByUid: cleanString(user?.uid),
  updatedByClientId: cleanString(clientId)
});

const buildTripSettingDocumentMeta = ({
  setting,
  user,
  clientId = '',
  now = new Date().toISOString()
}) => ({
  id: setting,
  setting,
  schemaVersion: 1,
  updatedAt: now,
  updatedByUid: cleanString(user?.uid),
  updatedByClientId: cleanString(clientId)
});

const getTripDocRef = (tripId) => doc(db, 'trips', tripId);
const getMemberDocRef = (tripId, uid) => doc(db, 'trips', tripId, 'members', uid);
const getTripDetailCollectionRef = (tripId) => collection(db, 'trips', tripId, 'details');
const getTripDetailDocRef = (tripId, section) => doc(db, 'trips', tripId, 'details', String(section));
const getTripSettingCollectionRef = (tripId) => collection(db, 'trips', tripId, 'settings');
const getTripSettingDocRef = (tripId, setting) => doc(db, 'trips', tripId, 'settings', String(setting));
const getTripDayCollectionRef = (tripId) => collection(db, 'trips', tripId, 'days');
const getTripDayDocRef = (tripId, dayNumber) => doc(db, 'trips', tripId, 'days', makeTripDayDocumentId(dayNumber));
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

const getTripActivityCollectionRefs = (tripId) => [
  getTripDetailCollectionRef(tripId),
  getTripSettingCollectionRef(tripId),
  getTripDayCollectionRef(tripId),
  getTripEventCollectionRef(tripId),
  getTripChecklistItemCollectionRef(tripId),
  getTripShoppingItemCollectionRef(tripId),
  getTripExpenseCollectionRef(tripId),
  getTripPlaceIdeaCollectionRef(tripId),
  getTripShoppingCategoryCollectionRef(tripId)
];

const getTripLatestActivityAt = async (tripId) => {
  if (!tripId) return '';

  const timestamps = await Promise.all(getTripActivityCollectionRefs(tripId).map(async (collectionRef) => {
    try {
      const snapshot = await getDocs(query(collectionRef, orderBy('updatedAt', 'desc'), limit(1)));
      return snapshot.docs[0]?.data()?.updatedAt || '';
    } catch (error) {
      logger.warn('Trip activity timestamp lookup failed.', error);
      return '';
    }
  }));

  return getLatestIsoTimestamp(timestamps);
};

const getTripListMetaDetail = async (tripId) => {
  if (!tripId) return null;

  try {
    const snapshot = await getDoc(getTripDetailDocRef(tripId, TRIP_DETAIL_SECTION_IDS.meta));
    if (!snapshot.exists()) return null;
    const rawData = snapshot.data() || {};
    const normalized = normalizeTripDetailDocumentForApp({
      id: snapshot.id,
      ...rawData
    });

    return {
      ...normalized,
      hasTitle: hasOwn(rawData, 'title'),
      hasStatus: hasOwn(rawData, 'status'),
      hasCoverImage: hasOwn(rawData, 'coverImage'),
      hasDateFields: hasOwn(rawData, 'dateRange') || hasOwn(rawData, 'dates')
    };
  } catch (error) {
    logger.warn('Trip list meta detail lookup failed.', error);
    return null;
  }
};

const enrichTripListItemWithActivity = async (item) => {
  const [latestActivityAt, metaDetail] = await Promise.all([
    getTripLatestActivityAt(item?.id),
    getTripListMetaDetail(item?.id)
  ]);
  const latestUpdatedAt = getLatestIsoTimestamp(item?.updatedAt, latestActivityAt, metaDetail?.updatedAt);
  const metaPatch = metaDetail
    ? {
        title: metaDetail.hasTitle ? (metaDetail.title || item?.title) : item?.title,
        status: metaDetail.hasStatus ? (metaDetail.status || item?.status) : item?.status,
        coverImage: metaDetail.hasCoverImage ? metaDetail.coverImage : item?.coverImage,
        dateRange: metaDetail.hasDateFields ? metaDetail.dateRange : item?.dateRange
      }
    : {};

  return {
    ...item,
    ...metaPatch,
    updatedAt: latestUpdatedAt || item?.updatedAt
  };
};

const touchTripRootUpdatedAt = async ({
  tripId,
  user,
  clientId = '',
  operation,
  entityId = '',
  now = new Date().toISOString()
}) => {
  try {
    await updateDoc(getTripDocRef(tripId), buildTripFieldUpdateMeta({
      user,
      clientId,
      operation,
      entityId,
      now
    }));
  } catch (error) {
    logger.warn('Trip root timestamp touch failed after split document write.', error);
  }
};

const updateTripRootMirrorFields = async ({
  tripId,
  fields,
  user,
  clientId = '',
  operation = 'trip-details',
  entityId = '',
  now = new Date().toISOString()
}) => {
  try {
    await updateDoc(getTripDocRef(tripId), {
      ...withoutUndefined(fields),
      ...buildTripFieldUpdateMeta({
        user,
        clientId,
        operation,
        entityId,
        now
      })
    });
  } catch (error) {
    logger.warn('Trip root mirror update failed after split detail write.', error);
  }
};

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

export const subscribeTripDetailDocuments = (tripId, onData, onError) => {
  if (!tripId) return () => {};
  return onSnapshot(
    getTripDetailCollectionRef(tripId),
    (snapshot) => {
      onData(snapshot.docs.map((snapshotDoc) => normalizeTripDetailDocumentForApp({
        id: snapshotDoc.id,
        ...snapshotDoc.data()
      })));
    },
    onError
  );
};

export const subscribeTripSettingDocuments = (tripId, onData, onError) => {
  if (!tripId) return () => {};
  return onSnapshot(
    getTripSettingCollectionRef(tripId),
    (snapshot) => {
      onData(snapshot.docs.map((snapshotDoc) => normalizeTripSettingDocumentForApp({
        id: snapshotDoc.id,
        ...snapshotDoc.data()
      })));
    },
    onError
  );
};

export const subscribeTripDayDocuments = (tripId, onData, onError) => {
  if (!tripId) return () => {};
  return onSnapshot(
    getTripDayCollectionRef(tripId),
    (snapshot) => {
      onData(snapshot.docs.map((snapshotDoc) => normalizeTripDayDocumentForApp({
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
  await touchTripRootUpdatedAt({
    tripId,
    user,
    clientId,
    operation: TRIP_DOCUMENT_TOUCH_OPERATIONS.event,
    entityId: eventId,
    now
  });

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

  const result = await runTransaction(db, async (transaction) => {
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
  await touchTripRootUpdatedAt({
    tripId,
    user,
    clientId,
    operation: TRIP_DOCUMENT_TOUCH_OPERATIONS.event,
    entityId: eventId,
    now
  });
  return result;
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
  await touchTripRootUpdatedAt({
    tripId,
    user,
    clientId,
    operation: TRIP_DOCUMENT_TOUCH_OPERATIONS.checklistItem,
    entityId: itemId,
    now
  });

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

  const result = await runTransaction(db, async (transaction) => {
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
  await touchTripRootUpdatedAt({
    tripId,
    user,
    clientId,
    operation: TRIP_DOCUMENT_TOUCH_OPERATIONS.checklistItem,
    entityId: itemId,
    now
  });
  return result;
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
  await touchTripRootUpdatedAt({
    tripId,
    user,
    clientId,
    operation: TRIP_DOCUMENT_TOUCH_OPERATIONS.shoppingItem,
    entityId: itemId,
    now
  });

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

  const result = await runTransaction(db, async (transaction) => {
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
  await touchTripRootUpdatedAt({
    tripId,
    user,
    clientId,
    operation: TRIP_DOCUMENT_TOUCH_OPERATIONS.shoppingItem,
    entityId: itemId,
    now
  });
  return result;
};

export const updateTripMetaFields = async ({
  tripId,
  tripDetails,
  user,
  clientId = ''
}) => {
  requireUser(user);
  if (!tripId) throw new Error('Missing trip id');
  const meta = normalizeTripDetailsMetaPatch(tripDetails);
  const now = new Date().toISOString();
  const detailRef = getTripDetailDocRef(tripId, TRIP_DETAIL_SECTION_IDS.meta);

  await setDoc(detailRef, withoutUndefined({
    ...buildTripDetailDocumentMeta({
      section: TRIP_DETAIL_SECTION_IDS.meta,
      user,
      clientId,
      now
    }),
    title: meta.title,
    status: meta.status,
    coverImage: meta.coverImage,
    dateRange: withoutUndefined(meta.dateRange),
    dates: meta.dates
  }), { merge: true });

  await updateTripRootMirrorFields({
    tripId,
    user,
    clientId,
    operation: 'trip-meta',
    now,
    fields: {
      'meta.title': meta.title,
      'meta.status': meta.status,
      'meta.coverImage': meta.coverImage,
      'meta.dateRange': withoutUndefined(meta.dateRange),
      'tripDetails.title': meta.title,
      'tripDetails.status': meta.status,
      'tripDetails.coverImage': meta.coverImage,
      'tripDetails.dateRange': withoutUndefined(meta.dateRange),
      'tripDetails.dates': meta.dates
    }
  });

  return meta;
};

export const updateTripAccommodationFields = async ({
  tripId,
  accommodation,
  user,
  clientId = ''
}) => {
  requireUser(user);
  if (!tripId) throw new Error('Missing trip id');
  const nextAccommodation = withoutUndefined(asObject(accommodation));
  const now = new Date().toISOString();

  await setDoc(getTripDetailDocRef(tripId, TRIP_DETAIL_SECTION_IDS.logistics), withoutUndefined({
    ...buildTripDetailDocumentMeta({
      section: TRIP_DETAIL_SECTION_IDS.logistics,
      user,
      clientId,
      now
    }),
    accommodation: nextAccommodation
  }), { merge: true });

  await updateTripRootMirrorFields({
    tripId,
    user,
    clientId,
    operation: 'trip-accommodation',
    now,
    fields: {
      'logistics.accommodation': nextAccommodation,
      'tripDetails.accommodation': nextAccommodation
    }
  });

  return nextAccommodation;
};

export const updateTripFlightsFields = async ({
  tripId,
  flights,
  user,
  clientId = ''
}) => {
  requireUser(user);
  if (!tripId) throw new Error('Missing trip id');
  const nextFlights = withoutUndefined(asObject(flights));
  const now = new Date().toISOString();

  await setDoc(getTripDetailDocRef(tripId, TRIP_DETAIL_SECTION_IDS.logistics), withoutUndefined({
    ...buildTripDetailDocumentMeta({
      section: TRIP_DETAIL_SECTION_IDS.logistics,
      user,
      clientId,
      now
    }),
    flights: nextFlights
  }), { merge: true });

  await updateTripRootMirrorFields({
    tripId,
    user,
    clientId,
    operation: 'trip-flights',
    now,
    fields: {
      'logistics.flights': nextFlights,
      'tripDetails.flights': nextFlights
    }
  });

  return nextFlights;
};

export const updateTripBudgetFields = async ({
  tripId,
  budget,
  user,
  clientId = ''
}) => {
  requireUser(user);
  if (!tripId) throw new Error('Missing trip id');
  const nextBudget = withoutUndefined(asObject(budget));
  const now = new Date().toISOString();

  await setDoc(getTripDetailDocRef(tripId, TRIP_DETAIL_SECTION_IDS.finance), withoutUndefined({
    ...buildTripDetailDocumentMeta({
      section: TRIP_DETAIL_SECTION_IDS.finance,
      user,
      clientId,
      now
    }),
    budget: nextBudget
  }), { merge: true });

  await updateTripRootMirrorFields({
    tripId,
    user,
    clientId,
    operation: 'trip-budget',
    now,
    fields: {
      'finance.budget': nextBudget,
      'tripDetails.budget': nextBudget
    }
  });

  return nextBudget;
};

export const updateTripDetailsFields = async ({
  tripId,
  tripDetails,
  user,
  clientId = ''
}) => {
  requireUser(user);
  if (!tripId) throw new Error('Missing trip id');
  const normalized = normalizeTripDetailsPatch(tripDetails);
  const meta = normalizeTripDetailsMetaPatch(normalized);
  const accommodation = withoutUndefined(normalized.accommodation);
  const flights = withoutUndefined(normalized.flights);
  const budget = withoutUndefined(normalized.budget);
  const now = new Date().toISOString();
  const batch = writeBatch(db);

  batch.set(getTripDetailDocRef(tripId, TRIP_DETAIL_SECTION_IDS.meta), withoutUndefined({
    ...buildTripDetailDocumentMeta({
      section: TRIP_DETAIL_SECTION_IDS.meta,
      user,
      clientId,
      now
    }),
    title: meta.title,
    status: meta.status,
    coverImage: meta.coverImage,
    dateRange: withoutUndefined(meta.dateRange),
    dates: meta.dates
  }), { merge: true });

  batch.set(getTripDetailDocRef(tripId, TRIP_DETAIL_SECTION_IDS.logistics), withoutUndefined({
    ...buildTripDetailDocumentMeta({
      section: TRIP_DETAIL_SECTION_IDS.logistics,
      user,
      clientId,
      now
    }),
    accommodation,
    flights
  }), { merge: true });

  batch.set(getTripDetailDocRef(tripId, TRIP_DETAIL_SECTION_IDS.finance), withoutUndefined({
    ...buildTripDetailDocumentMeta({
      section: TRIP_DETAIL_SECTION_IDS.finance,
      user,
      clientId,
      now
    }),
    budget
  }), { merge: true });

  await batch.commit();

  await updateTripRootMirrorFields({
    tripId,
    user,
    clientId,
    operation: 'trip-details',
    now,
    fields: {
      'meta.title': meta.title,
      'meta.status': meta.status,
      'meta.coverImage': meta.coverImage,
      'meta.dateRange': withoutUndefined(meta.dateRange),
      'tripDetails.title': meta.title,
      'tripDetails.status': meta.status,
      'tripDetails.coverImage': meta.coverImage,
      'tripDetails.dateRange': withoutUndefined(meta.dateRange),
      'tripDetails.dates': meta.dates,
      'logistics.accommodation': accommodation,
      'tripDetails.accommodation': accommodation,
      'logistics.flights': flights,
      'tripDetails.flights': flights,
      'finance.budget': budget,
      'tripDetails.budget': budget
    }
  });

  return normalized;
};

export const updateTripCollaborationSettings = async ({
  tripId,
  collaboration,
  user,
  clientId = ''
}) => {
  requireUser(user);
  if (!tripId) throw new Error('Missing trip id');
  const now = new Date().toISOString();
  const nextCollaboration = withoutUndefined(normalizeTripCollaborationSettings({
    ...collaboration,
    updatedAt: collaboration?.updatedAt || now
  }));
  const batch = writeBatch(db);

  batch.set(getTripSettingDocRef(tripId, TRIP_SETTING_IDS.collaboration), withoutUndefined({
    ...buildTripSettingDocumentMeta({
      setting: TRIP_SETTING_IDS.collaboration,
      user,
      clientId,
      now
    }),
    ...nextCollaboration
  }), { merge: true });

  batch.update(getTripDocRef(tripId), {
    'planning.collaboration': nextCollaboration,
    collaboration: nextCollaboration,
    ...buildTripFieldUpdateMeta({ user, clientId, operation: 'trip-collaboration', now })
  });
  await batch.commit();

  return nextCollaboration;
};

export const updateTripDayFields = async ({
  tripId,
  day,
  dayNumber,
  itinerary = [],
  user,
  clientId = ''
}) => {
  requireUser(user);
  const safeDayNumber = Number(dayNumber || day?.day || day?.dayNumber);
  if (!tripId || !Number.isFinite(safeDayNumber) || safeDayNumber <= 0) {
    throw new Error('Missing trip day');
  }

  const now = new Date().toISOString();
  const payload = buildTripDayDocument({
    day,
    dayNumber: safeDayNumber,
    user,
    clientId,
    now
  });
  const rootItinerary = withoutUndefined(buildRootItineraryMirror(itinerary));
  const rootItineraryDays = withoutUndefined(buildRootItineraryDaysMirror(rootItinerary));
  const batch = writeBatch(db);

  batch.set(getTripDayDocRef(tripId, safeDayNumber), {
    ...payload,
    createdAt: day?.createdAt || now
  }, { merge: true });

  batch.update(getTripDocRef(tripId), {
    itinerary: rootItinerary,
    itineraryDays: rootItineraryDays,
    ...buildTripFieldUpdateMeta({ user, clientId, operation: 'trip-day', now })
  });
  await batch.commit();

  return normalizeTripDayDocumentForApp(payload);
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
  await touchTripRootUpdatedAt({
    tripId,
    user,
    clientId,
    operation: TRIP_DOCUMENT_TOUCH_OPERATIONS.expense,
    entityId: expenseId,
    now
  });

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
  await touchTripRootUpdatedAt({
    tripId,
    user,
    clientId,
    operation: TRIP_DOCUMENT_TOUCH_OPERATIONS.placeIdea,
    entityId: placeId,
    now
  });

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
  await touchTripRootUpdatedAt({
    tripId,
    user,
    clientId,
    operation: TRIP_DOCUMENT_TOUCH_OPERATIONS.shoppingCategory,
    entityId: categoryId,
    now
  });

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
  await Promise.all(ownedSnapshot.docs.map(async (snapshotDoc) => {
    const item = await enrichTripListItemWithActivity({
      ...buildTripListItem(snapshotDoc.id, snapshotDoc.data()),
      accessRole: 'owner'
    });
    tripsById.set(snapshotDoc.id, item);
  }));

  const memberSnapshot = await getDocs(query(collectionGroup(db, 'members'), where('uid', '==', user.uid)));
  await Promise.all(memberSnapshot.docs.map(async (memberDoc) => {
    const tripRef = memberDoc.ref.parent.parent;
    if (!tripRef || tripsById.has(tripRef.id)) return;
    const tripSnap = await getDoc(tripRef);
    if (tripSnap.exists()) {
      const item = await enrichTripListItemWithActivity({
        ...buildTripListItem(tripSnap.id, tripSnap.data()),
        accessRole: memberDoc.data()?.role || 'view'
      });
      tripsById.set(tripSnap.id, item);
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
