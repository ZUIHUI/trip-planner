const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const DEFAULT_OWNER_EMAIL = 'sky32439@gmail.com';

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

const readArg = (name) => {
  const prefix = `--${name}=`;
  const matched = process.argv.find((arg) => arg.startsWith(prefix));
  return matched ? matched.slice(prefix.length) : '';
};

const repoRoot = path.resolve(__dirname, '..', '..');
loadEnvFile(path.join(repoRoot, '.env'));
loadEnvFile(path.join(repoRoot, '.env.local'));

const dryRun = process.argv.includes('--dry-run');
const forceOwned = process.argv.includes('--force-owned');
const keepPreviousOwnerMember = process.argv.includes('--keep-previous-owner-member');
const ownerEmail = (
  readArg('email') ||
  process.env.PRIMARY_OWNER_EMAIL ||
  process.env.VITE_PRIMARY_OWNER_EMAIL ||
  DEFAULT_OWNER_EMAIL
).trim();
const serviceAccountPath = readArg('service-account') || process.env.GOOGLE_APPLICATION_CREDENTIALS || '';
const projectId = (
  readArg('project') ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  process.env.VITE_FIREBASE_PROJECT_ID
);

if (!ownerEmail) {
  throw new Error('Missing owner email. Pass --email=owner@example.com.');
}

const credential = serviceAccountPath
  ? admin.credential.cert(require(path.resolve(serviceAccountPath)))
  : admin.credential.applicationDefault();

admin.initializeApp({
  projectId,
  credential
});

const firestore = admin.firestore();

const getOwnerName = (userRecord) => (
  userRecord.displayName ||
  String(userRecord.email || '').split('@')[0] ||
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

const run = async () => {
  const userRecord = await admin.auth().getUserByEmail(ownerEmail);
  const now = new Date().toISOString();
  const ownerName = getOwnerName(userRecord);
  const snapshot = await firestore.collection('trips').get();
  const writes = [];
  const claimedTripIds = [];
  const reassignedTripIds = [];
  const skippedTripIds = [];
  let skipped = 0;

  snapshot.docs.forEach((tripDoc) => {
    const data = tripDoc.data() || {};
    const currentOwnerUid = data.access && typeof data.access.ownerUid === 'string'
      ? data.access.ownerUid.trim()
      : '';
    const currentOwnerEmail = data.access && typeof data.access.ownerEmail === 'string'
      ? data.access.ownerEmail.trim()
      : '';

    if (currentOwnerUid && currentOwnerUid !== userRecord.uid && !forceOwned) {
      skipped += 1;
      skippedTripIds.push(`${tripDoc.id} (${currentOwnerEmail || currentOwnerUid})`);
      return;
    }

    if (currentOwnerUid === userRecord.uid) {
      skipped += 1;
      skippedTripIds.push(`${tripDoc.id} (already owned by ${ownerEmail})`);
      return;
    }

    const isReassigningOwnedTrip = Boolean(currentOwnerUid && currentOwnerUid !== userRecord.uid);

    if (isReassigningOwnedTrip) {
      reassignedTripIds.push(`${tripDoc.id} (${currentOwnerEmail || currentOwnerUid})`);
    } else {
      claimedTripIds.push(tripDoc.id);
    }
    writes.push((batch) => {
      batch.set(tripDoc.ref, {
        access: {
          ownerUid: userRecord.uid,
          ownerEmail: userRecord.email || ownerEmail,
          ownerName,
          migratedAt: now
        },
        updatedAt: now
      }, { merge: true });

      batch.set(tripDoc.ref.collection('members').doc(userRecord.uid), {
        uid: userRecord.uid,
        email: userRecord.email || ownerEmail,
        displayName: ownerName,
        photoURL: userRecord.photoURL || '',
        role: 'owner',
        shareToken: '',
        joinedAt: now,
        updatedAt: now,
        source: 'owner-claim'
      }, { merge: true });

      if (isReassigningOwnedTrip && !keepPreviousOwnerMember) {
        batch.delete(tripDoc.ref.collection('members').doc(currentOwnerUid));
      }
    });
  });

  writes.push((batch) => {
    batch.set(firestore.doc('appMeta/ownerMigration'), {
      primaryOwnerEmail: ownerEmail,
      primaryOwnerUid: userRecord.uid,
      claimed: claimedTripIds.length,
      reassigned: reassignedTripIds.length,
      skipped,
      claimedTripIds,
      reassignedTripIds,
      skippedTripIds,
      forceOwned,
      dryRun,
      updatedAt: now
    }, { merge: true });
  });

  if (dryRun) {
    console.log(`[dry-run] Owner ${ownerEmail} (${userRecord.uid}) would claim ${claimedTripIds.length} ownerless trips and reassign ${reassignedTripIds.length} owned trips; skipped ${skipped}.`);
    if (claimedTripIds.length) {
      console.log(`Ownerless trip IDs: ${claimedTripIds.join(', ')}`);
    }
    if (reassignedTripIds.length) {
      console.log(`Reassigned trip IDs: ${reassignedTripIds.join(', ')}`);
    }
    if (skippedTripIds.length) {
      console.log(`Skipped trip IDs: ${skippedTripIds.join(', ')}`);
    }
    return;
  }

  await commitInChunks(writes);
  console.log(`Owner ${ownerEmail} (${userRecord.uid}) claimed ${claimedTripIds.length} ownerless trips and reassigned ${reassignedTripIds.length} owned trips; skipped ${skipped}.`);
  if (claimedTripIds.length) {
    console.log(`Ownerless trip IDs: ${claimedTripIds.join(', ')}`);
  }
  if (reassignedTripIds.length) {
    console.log(`Reassigned trip IDs: ${reassignedTripIds.join(', ')}`);
  }
  if (skippedTripIds.length) {
    console.log(`Skipped trip IDs: ${skippedTripIds.join(', ')}`);
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
