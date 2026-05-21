const { onDocumentDeleted, onDocumentWritten } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

admin.initializeApp();

const realtimeDb = admin.database();
const serverTimestamp = admin.database.ServerValue.TIMESTAMP;

const normalizeRole = (role) => {
  if (role === 'owner') return 'owner';
  if (role === 'editor' || role === 'edit') return 'editor';
  return 'view';
};

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
