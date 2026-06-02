const fs = require('fs');
const path = require('path');

let rulesTesting = null;
try {
  rulesTesting = require('@firebase/rules-unit-testing');
} catch {
  console.error('Missing @firebase/rules-unit-testing. Run npm install before npm run database:rules:test.');
  process.exit(1);
}

const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} = rulesTesting;

const {
  get,
  ref,
  set
} = require('firebase/database');

const root = process.cwd();
const rulesPath = path.join(root, 'database.rules.json');
const tripId = 'trip-secure';
const now = 1767225600000;

const parseEmulatorHost = () => {
  const raw = process.env.FIREBASE_DATABASE_EMULATOR_HOST || '127.0.0.1:9000';
  const [host, portText] = raw.split(':');
  return { host, port: Number(portText || 9000) };
};

const aclMember = (role) => ({
  role,
  updatedAt: now
});

const presenceProfile = (uid) => ({
  uid,
  displayName: uid,
  email: `${uid}@example.com`,
  photoURL: ''
});

const seedAcl = async (db) => {
  await set(ref(db, `presenceAcl/${tripId}/ownerUid`), aclMember('owner'));
  await set(ref(db, `presenceAcl/${tripId}/editorUid`), aclMember('editor'));
  await set(ref(db, `presenceAcl/${tripId}/viewerUid`), aclMember('view'));
  await set(ref(db, `tripRealtimeAcl/${tripId}/ownerUid`), aclMember('owner'));
  await set(ref(db, `tripRealtimeAcl/${tripId}/editorUid`), aclMember('editor'));
  await set(ref(db, `tripRealtimeAcl/${tripId}/viewerUid`), aclMember('view'));
};

const run = async () => {
  const { host, port } = parseEmulatorHost();
  const testEnv = await initializeTestEnvironment({
    projectId: 'trip-planner-rtdb-rules-test',
    database: {
      host,
      port,
      rules: fs.readFileSync(rulesPath, 'utf8')
    }
  });

  try {
    await testEnv.clearDatabase();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await seedAcl(context.database());
    });

    const anonymousDb = testEnv.unauthenticatedContext().database();
    const ownerDb = testEnv.authenticatedContext('ownerUid', { email: 'owner@example.com' }).database();
    const editorDb = testEnv.authenticatedContext('editorUid', { email: 'editor@example.com' }).database();
    const viewerDb = testEnv.authenticatedContext('viewerUid', { email: 'viewer@example.com' }).database();
    const strangerDb = testEnv.authenticatedContext('strangerUid', { email: 'stranger@example.com' }).database();

    await assertFails(get(ref(anonymousDb, `tripPresence/${tripId}`)));
    await assertFails(get(ref(strangerDb, `tripPresence/${tripId}`)));
    await assertFails(get(ref(strangerDb, `tripRealtime/${tripId}`)));

    await assertSucceeds(get(ref(ownerDb, `tripPresence/${tripId}`)));
    await assertSucceeds(get(ref(viewerDb, `tripRealtime/${tripId}`)));

    await assertFails(get(ref(ownerDb, `presenceAcl/${tripId}/ownerUid`)));
    await assertFails(get(ref(ownerDb, `tripRealtimeAcl/${tripId}/ownerUid`)));
    await assertFails(set(ref(ownerDb, `presenceAcl/${tripId}/ownerUid`), aclMember('owner')));
    await assertFails(set(ref(ownerDb, `tripRealtimeAcl/${tripId}/ownerUid`), aclMember('owner')));

    await assertSucceeds(set(ref(ownerDb, `tripPresence/${tripId}/ownerUid/profile`), presenceProfile('ownerUid')));
    await assertFails(set(ref(ownerDb, `tripPresence/${tripId}/editorUid/profile`), presenceProfile('editorUid')));
    await assertSucceeds(set(ref(editorDb, `tripPresence/${tripId}/editorUid/connections/client-1`), {
      state: 'online',
      activeTab: 'today',
      editingTarget: '',
      startedAt: now,
      lastActiveAt: now
    }));

    await assertFails(set(ref(viewerDb, `tripRealtime/${tripId}/checklistStatus/preTrip/item-1/viewerUid`), {
      done: true,
      updatedAt: now
    }));
    await assertFails(set(ref(viewerDb, `tripRealtime/${tripId}/shoppingStatus/item-1/viewerUid`), {
      purchased: true,
      updatedAt: now
    }));

    await assertSucceeds(set(ref(editorDb, `tripRealtime/${tripId}/checklistStatus/preTrip/item-1/editorUid`), {
      done: true,
      updatedAt: now
    }));
    await assertSucceeds(set(ref(ownerDb, `tripRealtime/${tripId}/shoppingStatus/item-1/ownerUid`), {
      purchased: true,
      updatedAt: now
    }));

    await assertFails(set(ref(editorDb, `tripRealtime/${tripId}/placeVotes/place-1/editorUid`), {
      vote: true,
      updatedAt: now
    }));
    await assertFails(set(ref(ownerDb, `tripRealtime/${tripId}/activityLog/activity-1`), {
      type: 'client-write',
      createdAt: now
    }));

    console.log('Realtime Database rules security scenarios passed.');
  } finally {
    await testEnv.cleanup();
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
