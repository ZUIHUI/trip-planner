const fs = require('fs');
const path = require('path');

let rulesTesting = null;
try {
  rulesTesting = require('@firebase/rules-unit-testing');
} catch {
  console.error('Missing @firebase/rules-unit-testing. Run npm install before npm run storage:rules:test.');
  process.exit(1);
}

const {
  assertFails,
  initializeTestEnvironment
} = rulesTesting;

const root = process.cwd();
const rulesPath = path.join(root, 'storage.rules');
const projectId = 'trip-planner-storage-rules-test';
const seedPath = 'trip-handbooks/trip-secure/latest-cover.jpg';

const parseEmulatorHost = () => {
  const raw = process.env.FIREBASE_STORAGE_EMULATOR_HOST || '127.0.0.1:9199';
  const [host, portText] = raw.split(':');
  return { host, port: Number(portText || 9199) };
};

const run = async () => {
  const { host, port } = parseEmulatorHost();
  const testEnv = await initializeTestEnvironment({
    projectId,
    storage: {
      host,
      port,
      rules: fs.readFileSync(rulesPath, 'utf8')
    }
  });

  try {
    await testEnv.clearStorage();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .storage()
        .ref(seedPath)
        .putString('server-created handbook image', 'raw', {
          contentType: 'text/plain'
        });
    });

    const anonymousStorage = testEnv.unauthenticatedContext().storage();
    const ownerStorage = testEnv.authenticatedContext('ownerUid', { email: 'owner@example.com' }).storage();

    await assertFails(anonymousStorage.ref().listAll());
    await assertFails(anonymousStorage.ref(seedPath).getMetadata());
    await assertFails(anonymousStorage.ref(seedPath).putString('anonymous upload', 'raw'));

    await assertFails(ownerStorage.ref().listAll());
    await assertFails(ownerStorage.ref(seedPath).getMetadata());
    await assertFails(ownerStorage.ref(seedPath).delete());
    await assertFails(ownerStorage.ref('user-uploads/ownerUid/test.txt').putString('client upload', 'raw'));

    console.log('Storage rules security scenarios passed.');
  } finally {
    await testEnv.cleanup();
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
