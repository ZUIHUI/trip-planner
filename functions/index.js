const { onDocumentDeleted, onDocumentWritten } = require('firebase-functions/v2/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

admin.initializeApp();

const firestore = admin.firestore();
const realtimeDb = admin.database();
const serverTimestamp = admin.database.ServerValue.TIMESTAMP;
const PRIMARY_OWNER_EMAIL = (process.env.PRIMARY_OWNER_EMAIL || 'sky32439@gmail.com').toLowerCase();

const normalizeRole = (role) => {
  if (role === 'owner') return 'owner';
  if (role === 'editor' || role === 'edit') return 'editor';
  return 'view';
};

const getAuthEmail = (request) => String(request.auth?.token?.email || '').toLowerCase();

const getOwnerName = (request) => (
  String(request.data?.displayName || '').trim() ||
  String(request.auth?.token?.name || '').trim() ||
  String(request.auth?.token?.email || '').split('@')[0] ||
  'Owner'
);

const commitInChunks = async (writes) => {
  const chunkSize = 240;
  for (let index = 0; index < writes.length; index += chunkSize) {
    const batch = firestore.batch();
    writes.slice(index, index + chunkSize).forEach((write) => write(batch));
    await batch.commit();
  }
};

exports.claimExistingTrips = onCall(async (request) => {
  const uid = request.auth?.uid || '';
  const email = getAuthEmail(request);
  const forceOwned = request.data?.forceOwned === true;

  if (!uid) {
    throw new HttpsError('unauthenticated', '請先登入後再綁定既有旅程。');
  }

  if (!PRIMARY_OWNER_EMAIL || email !== PRIMARY_OWNER_EMAIL) {
    throw new HttpsError('permission-denied', '只有主要帳號可以綁定既有旅程。');
  }

  const now = new Date().toISOString();
  const ownerName = getOwnerName(request);
  const photoURL = String(request.data?.photoURL || request.auth?.token?.picture || '');
  const snapshot = await firestore.collection('trips').get();
  const writes = [];
  const claimedTripIds = [];
  const reassignedTripIds = [];
  const syncedTripIds = [];
  const skippedTripIds = [];

  snapshot.docs.forEach((tripDoc) => {
    const data = tripDoc.data() || {};
    const currentOwnerUid = typeof data.access?.ownerUid === 'string'
      ? data.access.ownerUid.trim()
      : '';
    const currentOwnerEmail = typeof data.access?.ownerEmail === 'string'
      ? data.access.ownerEmail.trim()
      : '';

    if (currentOwnerUid && !forceOwned) {
      skippedTripIds.push(`${tripDoc.id} (${currentOwnerEmail || currentOwnerUid})`);
      return;
    }

    const isReassigningOwnedTrip = Boolean(currentOwnerUid && currentOwnerUid !== uid);
    const isSyncingOwnedTrip = currentOwnerUid === uid;
    if (isSyncingOwnedTrip) {
      syncedTripIds.push(tripDoc.id);
    } else if (isReassigningOwnedTrip) {
      reassignedTripIds.push(tripDoc.id);
    } else {
      claimedTripIds.push(tripDoc.id);
    }

    writes.push((batch) => {
      batch.set(tripDoc.ref, {
        access: {
          ownerUid: uid,
          ownerEmail: email,
          ownerName,
          migratedAt: now
        },
        updatedAt: now
      }, { merge: true });

      batch.set(tripDoc.ref.collection('members').doc(uid), {
        uid,
        email,
        displayName: ownerName,
        photoURL,
        role: 'owner',
        shareToken: '',
        joinedAt: now,
        updatedAt: now,
        source: isSyncingOwnedTrip
          ? 'owner-sync-ui'
          : (isReassigningOwnedTrip ? 'owner-repair-ui' : 'owner-claim-ui')
      }, { merge: true });

      if (isReassigningOwnedTrip) {
        batch.delete(tripDoc.ref.collection('members').doc(currentOwnerUid));
      }
    });
  });

  writes.push((batch) => {
    batch.set(firestore.doc('appMeta/ownerMigration'), {
      primaryOwnerEmail: PRIMARY_OWNER_EMAIL,
      primaryOwnerUid: uid,
      claimed: claimedTripIds.length,
      reassigned: reassignedTripIds.length,
      synced: syncedTripIds.length,
      skipped: skippedTripIds.length,
      claimedTripIds,
      reassignedTripIds,
      syncedTripIds,
      skippedTripIds,
      forceOwned,
      source: 'claimExistingTrips',
      updatedAt: now
    }, { merge: true });
  });

  await commitInChunks(writes);

  return {
    claimed: claimedTripIds.length,
    reassigned: reassignedTripIds.length,
    synced: syncedTripIds.length,
    skipped: skippedTripIds.length,
    claimedTripIds,
    reassignedTripIds,
    syncedTripIds,
    skippedTripIds
  };
});

exports.syncPresenceAclOnMemberWrite = onDocumentWritten(
  'trips/{tripId}/members/{uid}',
  async (event) => {
    const { tripId, uid } = event.params;
    const beforeExists = event.data.before.exists;
    const afterExists = event.data.after.exists;
    const aclRef = realtimeDb.ref(`presenceAcl/${tripId}/${uid}`);
    const userPresenceRef = realtimeDb.ref(`tripPresence/${tripId}/${uid}`);

    if (!afterExists) {
      await Promise.all([
        aclRef.remove(),
        userPresenceRef.remove()
      ]);
      return;
    }

    const member = event.data.after.data() || {};
    await aclRef.set({
      uid,
      role: normalizeRole(member.role),
      updatedAt: serverTimestamp,
      source: beforeExists ? 'member-update' : 'member-create'
    });
  }
);

exports.cleanupPresenceOnTripDelete = onDocumentDeleted(
  'trips/{tripId}',
  async (event) => {
    const { tripId } = event.params;
    await Promise.all([
      realtimeDb.ref(`presenceAcl/${tripId}`).remove(),
      realtimeDb.ref(`tripPresence/${tripId}`).remove()
    ]);
  }
);
