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
      await setDoc(doc(db, 'trips/trip-secure/members/readerUid'), member('readerUid', 'view'));
      await setDoc(doc(db, 'trips/trip-secure/handbooks/latest'), {
        schemaVersion: 1,
        generatedAt: now,
        handbook: {
          cover: { title: 'Private handbook' }
        },
        updatedAt: now
      });
    });

    const anonymousDb = testEnv.unauthenticatedContext().firestore();
    const ownerDb = testEnv.authenticatedContext('ownerUid', { email: 'owner@example.com' }).firestore();
    const editorDb = testEnv.authenticatedContext('editorUid', { email: 'editor@example.com' }).firestore();
    const viewerDb = testEnv.authenticatedContext('viewerUid', { email: 'viewer@example.com' }).firestore();
    const readerDb = testEnv.authenticatedContext('readerUid', { email: 'reader@example.com' }).firestore();

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

    await assertSucceeds(setDoc(doc(editorDb, 'trips/trip-secure/details/meta'), {
      id: 'meta',
      section: 'meta',
      schemaVersion: 1,
      title: 'Edited Trip',
      status: 'planning',
      coverImage: '',
      dateRange: { start: '2026-05-01', end: '2026-05-03' },
      dates: '2026/05/01 - 2026/05/03',
      updatedAt: now,
      updatedByUid: 'editorUid',
      updatedByClientId: 'rules-test'
    }));

    await assertSucceeds(setDoc(doc(editorDb, 'trips/trip-secure/details/logistics'), {
      id: 'logistics',
      section: 'logistics',
      schemaVersion: 1,
      accommodation: { name: 'Hotel A' },
      flights: { outbound: { code: 'BR198' } },
      updatedAt: now,
      updatedByUid: 'editorUid',
      updatedByClientId: 'rules-test'
    }));

    await assertSucceeds(setDoc(doc(editorDb, 'trips/trip-secure/details/finance'), {
      id: 'finance',
      section: 'finance',
      schemaVersion: 1,
      budget: { total: '2000' },
      updatedAt: now,
      updatedByUid: 'editorUid',
      updatedByClientId: 'rules-test'
    }));

    await assertFails(setDoc(doc(readerDb, 'trips/trip-secure/details/meta'), {
      id: 'meta',
      section: 'meta',
      schemaVersion: 1,
      title: 'Viewer Edit',
      updatedAt: now,
      updatedByUid: 'viewerUid',
      updatedByClientId: 'rules-test'
    }));

    await assertFails(setDoc(doc(editorDb, 'trips/trip-secure/details/meta'), {
      id: 'meta',
      section: 'logistics',
      schemaVersion: 1,
      title: 'Mismatched',
      updatedAt: now,
      updatedByUid: 'editorUid',
      updatedByClientId: 'rules-test'
    }));

    await assertSucceeds(setDoc(doc(ownerDb, 'trips/trip-secure/settings/collaboration'), {
      id: 'collaboration',
      setting: 'collaboration',
      schemaVersion: 1,
      enabled: true,
      shareToken: '',
      permission: 'view',
      votesEnabled: false,
      createdAt: now,
      updatedAt: now,
      updatedByUid: 'ownerUid',
      updatedByClientId: 'rules-test'
    }));

    await assertFails(setDoc(doc(editorDb, 'trips/trip-secure/settings/collaboration'), {
      id: 'collaboration',
      setting: 'collaboration',
      schemaVersion: 1,
      enabled: true,
      permission: 'edit',
      votesEnabled: true,
      updatedAt: now,
      updatedByUid: 'editorUid',
      updatedByClientId: 'rules-test'
    }));

    await assertFails(setDoc(doc(ownerDb, 'trips/trip-secure/settings/collaboration'), {
      id: 'collaboration',
      setting: 'collaboration',
      schemaVersion: 1,
      permission: 'owner',
      updatedAt: now,
      updatedByUid: 'ownerUid',
      updatedByClientId: 'rules-test'
    }));

    await assertSucceeds(setDoc(doc(editorDb, 'trips/trip-secure/days/day-1'), {
      id: 'day-1',
      schemaVersion: 1,
      dayNumber: 1,
      title: 'Arrival',
      date: '2026-05-01',
      weekday: 'Fri',
      updatedAt: now,
      updatedByUid: 'editorUid',
      updatedByClientId: 'rules-test'
    }));

    await assertFails(setDoc(doc(readerDb, 'trips/trip-secure/days/day-1'), {
      id: 'day-1',
      schemaVersion: 1,
      dayNumber: 1,
      title: 'Viewer Edit',
      updatedAt: now,
      updatedByUid: 'viewerUid',
      updatedByClientId: 'rules-test'
    }));

    await assertFails(setDoc(doc(editorDb, 'trips/trip-secure/days/day-1'), {
      id: 'day-2',
      schemaVersion: 1,
      dayNumber: 1,
      title: 'Mismatched',
      updatedAt: now,
      updatedByUid: 'editorUid',
      updatedByClientId: 'rules-test'
    }));

    await assertSucceeds(setDoc(doc(editorDb, 'trips/trip-secure/events/event-1'), {
      id: 'event-1',
      schemaVersion: 1,
      dayNumber: 1,
      orderKey: 1000,
      time: '09:30',
      type: 'sightseeing',
      title: 'Airport transfer',
      desc: '',
      location: 'TPE',
      locationPlace: {
        name: 'TPE',
        address: 'Taiwan Taoyuan International Airport',
        placeId: '',
        lat: null,
        lng: null
      },
      urgent: false,
      transport: {},
      cost: '',
      currency: 'JPY',
      url: '',
      memos: [],
      deleted: false,
      createdAt: now,
      updatedAt: now,
      updatedByUid: 'editorUid',
      updatedByClientId: 'rules-test'
    }));

    await assertFails(setDoc(doc(readerDb, 'trips/trip-secure/events/event-viewer'), {
      id: 'event-viewer',
      schemaVersion: 1,
      dayNumber: 1,
      orderKey: 2000,
      title: 'Viewer event',
      updatedAt: now,
      updatedByUid: 'viewerUid',
      updatedByClientId: 'rules-test'
    }));

    await assertFails(setDoc(doc(editorDb, 'trips/trip-secure/events/event-extra'), {
      id: 'event-extra',
      schemaVersion: 1,
      dayNumber: 1,
      orderKey: 3000,
      title: 'Bad event',
      unexpected: true,
      updatedAt: now,
      updatedByUid: 'editorUid',
      updatedByClientId: 'rules-test'
    }));

    await assertSucceeds(setDoc(doc(editorDb, 'trips/trip-secure/checklistItems/checklist-1'), {
      id: 'checklist-1',
      schemaVersion: 1,
      listId: 'preTrip',
      orderKey: 1000,
      text: 'Passport',
      done: false,
      category: 'documents',
      assignedTo: null,
      day: null,
      deleted: false,
      createdAt: now,
      updatedAt: now,
      updatedByUid: 'editorUid',
      updatedByClientId: 'rules-test'
    }));

    await assertSucceeds(setDoc(doc(editorDb, 'trips/trip-secure/shoppingItems/shopping-1'), {
      id: 'shopping-1',
      schemaVersion: 1,
      orderKey: 1000,
      name: 'Adapter',
      category: 'Gear',
      shop: '',
      quantity: 1,
      notes: '',
      image: null,
      purchased: false,
      deleted: false,
      createdAt: now,
      updatedAt: now,
      updatedByUid: 'editorUid',
      updatedByClientId: 'rules-test'
    }));

    await assertSucceeds(setDoc(doc(editorDb, 'trips/trip-secure/expenses/expense-1'), {
      id: 'expense-1',
      schemaVersion: 1,
      orderKey: 1000,
      title: 'Train',
      amount: 1200,
      currency: 'JPY',
      date: '2026-05-01',
      category: 'transport',
      payer: 'Editor',
      splitType: 'all',
      involved: ['Owner', 'Editor'],
      isSettled: false,
      note: '',
      deleted: false,
      createdAt: now,
      updatedAt: now,
      updatedByUid: 'editorUid',
      updatedByClientId: 'rules-test'
    }));

    await assertSucceeds(setDoc(doc(editorDb, 'trips/trip-secure/placeIdeas/place-1'), {
      id: 'place-1',
      schemaVersion: 1,
      orderKey: 1000,
      name: 'Tokyo Tower',
      address: 'Tokyo Tower',
      placeId: '',
      lat: null,
      lng: null,
      note: '',
      status: 'idea',
      plannedDay: null,
      addedAt: now,
      plannedAt: '',
      votes: [],
      deleted: false,
      createdAt: now,
      updatedAt: now,
      updatedByUid: 'editorUid',
      updatedByClientId: 'rules-test'
    }));

    await assertSucceeds(setDoc(doc(editorDb, 'trips/trip-secure/shoppingCategories/category-Gear'), {
      id: 'category-Gear',
      schemaVersion: 1,
      name: 'Gear',
      orderKey: 1000,
      deleted: false,
      createdAt: now,
      updatedAt: now,
      updatedByUid: 'editorUid',
      updatedByClientId: 'rules-test'
    }));

    await assertFails(setDoc(doc(readerDb, 'trips/trip-secure/checklistItems/checklist-viewer'), {
      id: 'checklist-viewer',
      schemaVersion: 1,
      listId: 'preTrip',
      orderKey: 1000,
      text: 'Viewer item',
      updatedAt: now,
      updatedByUid: 'viewerUid',
      updatedByClientId: 'rules-test'
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

    await assertSucceeds(getDoc(doc(ownerDb, 'userPushSubscriptions/ownerUid/devices/device-1')));
    await assertFails(getDoc(doc(editorDb, 'userPushSubscriptions/ownerUid/devices/device-1')));
    await assertFails(setDoc(doc(ownerDb, 'userPushSubscriptions/ownerUid/devices/device-1'), {
      endpointHash: 'hash',
      updatedAt: now
    }));

    await assertSucceeds(getDoc(doc(ownerDb, 'userNotificationSettings/ownerUid/tripPrefs/trip-secure')));
    await assertFails(getDoc(doc(viewerDb, 'userNotificationSettings/ownerUid/tripPrefs/trip-secure')));
    await assertFails(setDoc(doc(ownerDb, 'userNotificationSettings/ownerUid/tripPrefs/trip-secure'), {
      enabled: true,
      updatedAt: now
    }));

    await assertFails(getDoc(doc(ownerDb, 'googleLookupRateLimits/ownerUid')));
    await assertFails(setDoc(doc(ownerDb, 'googleLookupRateLimits/ownerUid'), {
      count: 1,
      resetAt: now
    }));
    await assertFails(deleteDoc(doc(ownerDb, 'googleLookupRateLimits/ownerUid')));
    await assertFails(getDoc(doc(ownerDb, 'aiRecommendationRateLimits/ownerUid')));
    await assertFails(setDoc(doc(ownerDb, 'aiRecommendationRateLimits/ownerUid'), {
      attempts: 1,
      windowStartedAtMs: 1767225600000,
      updatedAt: now
    }));
    await assertFails(deleteDoc(doc(ownerDb, 'aiRecommendationRateLimits/ownerUid')));
    await assertFails(getDoc(doc(ownerDb, 'aiHandbookRateLimits/ownerUid')));
    await assertFails(setDoc(doc(ownerDb, 'aiHandbookRateLimits/ownerUid'), {
      attempts: 1,
      windowStartedAtMs: 1767225600000,
      updatedAt: now
    }));
    await assertFails(deleteDoc(doc(ownerDb, 'aiHandbookRateLimits/ownerUid')));
    await assertFails(getDoc(doc(ownerDb, 'trips/trip-secure/handbooks/latest')));
    await assertFails(setDoc(doc(ownerDb, 'trips/trip-secure/handbooks/latest'), {
      schemaVersion: 1,
      generatedAt: now,
      handbook: { cover: { title: 'Client write' } },
      updatedAt: now
    }));
    await assertFails(getDoc(doc(ownerDb, 'notificationDeliveries/delivery-1')));
    await assertFails(setDoc(doc(ownerDb, 'notificationDeliveries/delivery-1'), {
      status: 'sent',
      updatedAt: now
    }));

    console.log('Firestore rules security scenarios passed.');
  } finally {
    await testEnv.cleanup();
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
