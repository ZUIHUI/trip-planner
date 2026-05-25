const fs = require('fs');
const path = require('path');

let rulesTesting = null;
try {
  rulesTesting = require('@firebase/rules-unit-testing');
} catch {
  console.error('Missing @firebase/rules-unit-testing. Run npm install before npm run rules:test.');
  process.exit(1);
}

const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} = rulesTesting;

const {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc
} = require('firebase/firestore');

const root = process.cwd();
const rulesPath = path.join(root, 'firestore.rules');
const now = '2026-01-01T00:00:00.000Z';

const parseEmulatorHost = () => {
  const raw = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  const [host, portText] = raw.split(':');
  return { host, port: Number(portText || 8080) };
};

const member = (uid, role) => ({
  uid,
  email: `${uid}@example.com`,
  displayName: uid,
  photoURL: '',
  role,
  shareToken: '',
  inviteId: '',
  inviteCode: '',
  joinedAt: now,
  updatedAt: now,
  source: 'rules-test'
});

const baseTrip = {
  id: 'trip-secure',
  schemaVersion: 2,
  meta: {
    title: 'Security Trip',
    status: 'planning',
    dateRange: { start: '', end: '' },
    coverImage: ''
  },
  planning: {
    checklists: { preTrip: [], packing: [] },
    collaboration: { enabled: false },
    placePool: [],
    shoppingList: [],
    shoppingCategories: []
  },
  itinerary: [
    {
      id: 'day-1',
      day: 1,
      title: 'Day 1',
      date: '',
      events: []
    }
  ],
  shoppingList: [],
  shoppingCategories: [],
  collaboration: {
    enabled: false,
    shareToken: '',
    permission: 'view',
    votesEnabled: true,
    createdAt: '',
    updatedAt: ''
  },
  access: {
    ownerUid: 'ownerUid',
    ownerEmail: 'owner@example.com',
    ownerName: 'Owner',
    migratedAt: ''
  },
  syncMeta: {
    revision: 0,
    updatedByUid: 'ownerUid',
    updatedByClientId: 'rules-test',
    updatedAt: now
  },
  invite: {
    currentInviteId: '',
    permission: 'view',
    enabled: false
  },
  savedAt: now,
  createdAt: now,
  updatedAt: now
};

const nextSyncMeta = (uid, revision) => ({
  revision,
  updatedByUid: uid,
  updatedByClientId: 'rules-test',
  updatedAt: now
});

const run = async () => {
  const { host, port } = parseEmulatorHost();
  const testEnv = await initializeTestEnvironment({
    projectId: 'trip-planner-rules-test',
    firestore: {
      host,
      port,
      rules: fs.readFileSync(rulesPath, 'utf8')
    }
  });

  try {
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'trips/trip-secure'), baseTrip);
      await setDoc(doc(db, 'trips/trip-secure/members/ownerUid'), member('ownerUid', 'owner'));
      await setDoc(doc(db, 'trips/trip-secure/members/editorUid'), member('editorUid', 'editor'));
      await setDoc(doc(db, 'trips/trip-secure/members/viewerUid'), member('viewerUid', 'view'));
    });

    const anonymousDb = testEnv.unauthenticatedContext().firestore();
    const ownerDb = testEnv.authenticatedContext('ownerUid', { email: 'owner@example.com' }).firestore();
    const editorDb = testEnv.authenticatedContext('editorUid', { email: 'editor@example.com' }).firestore();
    const viewerDb = testEnv.authenticatedContext('viewerUid', { email: 'viewer@example.com' }).firestore();

    await assertFails(getDoc(doc(anonymousDb, 'trips/trip-secure')));
    await assertFails(setDoc(doc(anonymousDb, 'trips/trip-anon'), {
      ...baseTrip,
      id: 'trip-anon'
    }));

    await assertSucceeds(getDoc(doc(viewerDb, 'trips/trip-secure')));
    await assertFails(updateDoc(doc(viewerDb, 'trips/trip-secure'), {
      shoppingList: [{ id: 'item-1', name: 'Adapter' }],
      syncMeta: nextSyncMeta('viewerUid', 1),
      updatedAt: now
    }));

    await assertSucceeds(updateDoc(doc(editorDb, 'trips/trip-secure'), {
      shoppingList: [{ id: 'item-1', name: 'Adapter' }],
      shoppingCategories: [{ id: 'cat-1', name: 'Gear' }],
      itinerary: [
        {
          id: 'day-1',
          day: 1,
          title: 'Day 1',
          date: '',
          events: [{ id: 'event-1', title: 'Check in' }]
        }
      ],
      syncMeta: nextSyncMeta('editorUid', 1),
      updatedAt: now
    }));

    await assertFails(updateDoc(doc(editorDb, 'trips/trip-secure'), {
      access: {
        ownerUid: 'editorUid',
        ownerEmail: 'editor@example.com',
        ownerName: 'Editor',
        migratedAt: ''
      },
      syncMeta: nextSyncMeta('editorUid', 2),
      updatedAt: now
    }));

    await assertFails(updateDoc(doc(editorDb, 'trips/trip-secure'), {
      invite: {
        currentInviteId: 'invite-1',
        permission: 'edit',
        enabled: true
      },
      syncMeta: nextSyncMeta('editorUid', 2),
      updatedAt: now
    }));

    await assertFails(updateDoc(doc(editorDb, 'trips/trip-secure/members/viewerUid'), {
      role: 'editor',
      updatedAt: now
    }));

    await assertSucceeds(updateDoc(doc(ownerDb, 'trips/trip-secure/members/viewerUid'), {
      role: 'editor',
      updatedAt: now
    }));

    await assertSucceeds(updateDoc(doc(ownerDb, 'trips/trip-secure'), {
      invite: {
        currentInviteId: 'invite-1',
        permission: 'edit',
        enabled: true
      },
      syncMeta: nextSyncMeta('ownerUid', 3),
      updatedAt: now
    }));

    await assertSucceeds(setDoc(doc(ownerDb, 'userProfiles/ownerUid'), {
      uid: 'ownerUid',
      email: 'owner@example.com',
      displayName: 'Owner',
      photoURL: '',
      providerIds: ['password'],
      createdAt: now,
      updatedAt: now
    }));

    await assertFails(setDoc(doc(editorDb, 'userProfiles/ownerUid'), {
      uid: 'ownerUid',
      email: 'owner@example.com',
      displayName: 'Owner',
      photoURL: '',
      providerIds: [],
      createdAt: now,
      updatedAt: now
    }));

    await assertFails(setDoc(doc(ownerDb, 'userProfiles/ownerUid'), {
      uid: 'ownerUid',
      email: 'owner@example.com',
      displayName: 'x'.repeat(121),
      photoURL: '',
      providerIds: [],
      createdAt: now,
      updatedAt: now
    }));

    await assertFails(getDoc(doc(ownerDb, 'flightLookupRateLimits/ownerUid')));
    await assertFails(deleteDoc(doc(ownerDb, 'flightLookupRateLimits/ownerUid')));

    console.log('Firestore rules security scenarios passed.');
  } finally {
    await testEnv.cleanup();
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
