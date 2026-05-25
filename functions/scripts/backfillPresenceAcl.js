const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const index = trimmed.indexOf('=');
    if (index <= 0) return;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
};

const repoRoot = path.resolve(__dirname, '..', '..');
loadEnvFile(path.join(repoRoot, '.env'));
loadEnvFile(path.join(repoRoot, '.env.local'));

const databaseURL = process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL;
const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.VITE_FIREBASE_PROJECT_ID;
const dryRun = process.argv.includes('--dry-run');

const normalizeRole = (role) => {
  if (role === 'owner') return 'owner';
  if (role === 'editor' || role === 'edit') return 'editor';
  return 'view';
};

if (!databaseURL) {
  throw new Error('Missing FIREBASE_DATABASE_URL or VITE_FIREBASE_DATABASE_URL.');
}

admin.initializeApp({
  projectId,
  databaseURL,
  credential: admin.credential.applicationDefault()
});

const firestore = admin.firestore();
const realtimeDb = admin.database();

const run = async () => {
  const snapshot = await firestore.collectionGroup('members').get();
  const updates = {};

  snapshot.docs.forEach((memberDoc) => {
    const tripRef = memberDoc.ref.parent.parent;
    if (!tripRef) return;
    const member = memberDoc.data() || {};
    const uid = member.uid || memberDoc.id;
    updates[`presenceAcl/${tripRef.id}/${uid}`] = {
      uid,
      role: normalizeRole(member.role),
      updatedAt: admin.database.ServerValue.TIMESTAMP,
      source: 'backfill'
    };
    updates[`tripRealtimeAcl/${tripRef.id}/${uid}`] = {
      uid,
      role: normalizeRole(member.role),
      updatedAt: admin.database.ServerValue.TIMESTAMP,
      source: 'backfill'
    };
  });

  const count = Object.keys(updates).length;
  const memberCount = count / 2;
  if (dryRun) {
    console.log(`[dry-run] Would backfill ${memberCount} presence/realtime ACL member entries.`);
    return;
  }

  if (count > 0) {
    await realtimeDb.ref().update(updates);
  }
  console.log(`Backfilled ${memberCount} presence/realtime ACL member entries.`);
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
