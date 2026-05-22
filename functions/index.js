const { onDocumentDeleted, onDocumentWritten } = require('firebase-functions/v2/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const crypto = require('crypto');

admin.initializeApp();

const firestore = admin.firestore();
const realtimeDb = admin.database();
const serverTimestamp = admin.database.ServerValue.TIMESTAMP;
const PRIMARY_OWNER_EMAIL = (process.env.PRIMARY_OWNER_EMAIL || 'sky32439@gmail.com').toLowerCase();
const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
const EMAIL_CODE_PEPPER = defineSecret('EMAIL_CODE_PEPPER');
const INVITE_CODE_PEPPER = defineSecret('INVITE_CODE_PEPPER');
const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;
const EMAIL_CODE_RESEND_COOLDOWN_MS = 60 * 1000;
const EMAIL_CODE_MAX_ATTEMPTS = 5;
const INVITE_CODE_RATE_WINDOW_MS = 5 * 60 * 1000;
const INVITE_CODE_MAX_ATTEMPTS = 12;
const INVITE_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const DEFAULT_EMAIL_FROM = 'Trip Planner <onboarding@resend.dev>';

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

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const hashValue = (value) => crypto
  .createHash('sha256')
  .update(value)
  .digest('hex');

const hashLoginCode = ({ challengeId, email, code }) => crypto
  .createHmac('sha256', EMAIL_CODE_PEPPER.value())
  .update(`${challengeId}:${email}:${code}`)
  .digest('hex');

const safeCompareHex = (left, right) => {
  if (!left || !right || left.length !== right.length) return false;
  return crypto.timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
};

const generateEmailCode = () => String(crypto.randomInt(100000, 1000000));

const getEmailFromAddress = () => process.env.EMAIL_FROM || DEFAULT_EMAIL_FROM;

const sendEmailCode = async ({ email, code }) => {
  const apiKey = RESEND_API_KEY.value();
  if (!apiKey) {
    throw new HttpsError('failed-precondition', 'Email 寄送服務尚未設定。');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'User-Agent': 'trip-planner-functions',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: getEmailFromAddress(),
      to: [email],
      subject: `${code} 是你的 Trip Planner 驗證碼`,
      text: `你的 Trip Planner 驗證碼是 ${code}，10 分鐘內有效。若不是你本人操作，可以忽略這封信。`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
          <h2 style="margin:0 0 12px">Trip Planner 登入驗證碼</h2>
          <p>請在登入畫面輸入以下 6 位數驗證碼：</p>
          <p style="font-size:32px;font-weight:800;letter-spacing:6px;margin:18px 0">${code}</p>
          <p>這組驗證碼 10 分鐘內有效。</p>
          <p style="color:#6b7280;font-size:13px">若不是你本人操作，可以忽略這封信。</p>
        </div>
      `
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('Resend email send failed', payload);
    const resendMessage = String(payload?.message || payload?.error?.message || '');
    const isDefaultSenderLimit = response.status === 403
      && /resend\.dev|testing emails|verify a domain/i.test(resendMessage);
    throw new HttpsError(
      isDefaultSenderLimit ? 'failed-precondition' : 'internal',
      isDefaultSenderLimit
        ? '目前的測試寄件地址只能寄給 Resend 帳號本人。其他旅伴請先用 Google 登入，或完成寄件網域設定。'
        : '驗證碼寄送失敗，請稍後再試。'
    );
  }

  return payload;
};

const normalizeInviteCode = (code) => String(code || '')
  .toUpperCase()
  .replace(/[^A-Z0-9]/g, '')
  .replace(/[O0]/g, 'Q')
  .replace(/[I1]/g, '7');

const formatInviteCode = (code) => {
  const normalized = normalizeInviteCode(code).slice(0, 8);
  return normalized.length > 4 ? `${normalized.slice(0, 4)}-${normalized.slice(4)}` : normalized;
};

const generateInviteCode = () => {
  let code = '';
  for (let index = 0; index < 8; index += 1) {
    code += INVITE_CODE_ALPHABET[crypto.randomInt(0, INVITE_CODE_ALPHABET.length)];
  }
  return formatInviteCode(code);
};

const hashInviteCode = (code) => crypto
  .createHmac('sha256', INVITE_CODE_PEPPER.value())
  .update(normalizeInviteCode(code))
  .digest('hex');

const requireSignedIn = (request) => {
  const uid = request.auth?.uid || '';
  if (!uid) {
    throw new HttpsError('unauthenticated', '請先登入。');
  }
  return uid;
};

const getTripForOwner = async (tripId, uid) => {
  const tripRef = firestore.collection('trips').doc(tripId);
  const tripSnap = await tripRef.get();

  if (!tripSnap.exists) {
    throw new HttpsError('not-found', '找不到這趟旅程。');
  }

  const trip = tripSnap.data() || {};
  if (trip.access?.ownerUid !== uid) {
    throw new HttpsError('permission-denied', '只有主辦人可以管理邀請碼。');
  }

  return { tripRef, trip };
};

const normalizeInvitePermission = (permission) => (permission === 'edit' ? 'edit' : 'view');

const generateUniqueInviteCode = async () => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateInviteCode();
    const codeHash = hashInviteCode(code);
    const existing = await firestore
      .collection('tripInviteCodes')
      .where('codeHash', '==', codeHash)
      .limit(1)
      .get();

    if (existing.empty) {
      return { code, codeHash };
    }
  }

  throw new HttpsError('resource-exhausted', '暫時無法建立邀請碼，請稍後再試。');
};

const getCurrentInviteForTrip = async (trip) => {
  const inviteId = String(trip.invite?.currentInviteId || '').trim();
  if (!inviteId) return null;

  const inviteSnap = await firestore.collection('tripInviteCodes').doc(inviteId).get();
  if (!inviteSnap.exists) return null;
  return {
    id: inviteSnap.id,
    ...inviteSnap.data()
  };
};

const buildMemberPayloadFromRequest = ({ request, role, inviteId, inviteCode }) => {
  const now = new Date().toISOString();
  return {
    uid: request.auth.uid,
    email: request.auth.token.email || '',
    displayName:
      String(request.data?.displayName || '').trim()
      || String(request.auth.token.name || '').trim()
      || String(request.auth.token.email || '').split('@')[0]
      || '旅伴',
    photoURL: String(request.data?.photoURL || request.auth.token.picture || ''),
    role,
    shareToken: '',
    inviteId,
    inviteCode: formatInviteCode(inviteCode),
    joinedAt: now,
    updatedAt: now,
    source: 'invite-code'
  };
};

const assertInviteRedeemRateLimit = async (uid) => {
  const now = Date.now();
  const rateRef = firestore.collection('inviteCodeRateLimits').doc(uid);
  let waitSeconds = 0;

  await firestore.runTransaction(async (transaction) => {
    const snap = await transaction.get(rateRef);
    const data = snap.exists ? snap.data() : {};
    const windowStartedAtMs = Number(data.windowStartedAtMs || 0);
    const attempts = Number(data.attempts || 0);
    const isSameWindow = windowStartedAtMs && now - windowStartedAtMs < INVITE_CODE_RATE_WINDOW_MS;

    if (isSameWindow && attempts >= INVITE_CODE_MAX_ATTEMPTS) {
      waitSeconds = Math.ceil((INVITE_CODE_RATE_WINDOW_MS - (now - windowStartedAtMs)) / 1000);
      return;
    }

    transaction.set(rateRef, {
      attempts: isSameWindow ? attempts + 1 : 1,
      windowStartedAtMs: isSameWindow ? windowStartedAtMs : now,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });

  if (waitSeconds > 0) {
    throw new HttpsError('resource-exhausted', `邀請碼嘗試太頻繁，請 ${waitSeconds} 秒後再試。`);
  }
};

const getOrCreateEmailUser = async (email) => {
  try {
    const existingUser = await admin.auth().getUserByEmail(email);
    if (!existingUser.emailVerified) {
      return admin.auth().updateUser(existingUser.uid, { emailVerified: true });
    }
    return existingUser;
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') {
      throw error;
    }

    return admin.auth().createUser({
      email,
      emailVerified: true,
      displayName: email.split('@')[0]
    });
  }
};

exports.requestEmailLoginCode = onCall(
  { secrets: [RESEND_API_KEY, EMAIL_CODE_PEPPER] },
  async (request) => {
    const email = normalizeEmail(request.data?.email);
    if (!isValidEmail(email)) {
      throw new HttpsError('invalid-argument', 'Email 格式不正確。');
    }

    const now = Date.now();
    const expiresAtMs = now + EMAIL_CODE_TTL_MS;
    const challengeRef = firestore.collection('emailLoginChallenges').doc();
    const rateRef = firestore.collection('emailLoginRateLimits').doc(hashValue(email));
    const code = generateEmailCode();
    const codeHash = hashLoginCode({ challengeId: challengeRef.id, email, code });
    let retryAfterSeconds = 0;

    await firestore.runTransaction(async (transaction) => {
      const rateSnap = await transaction.get(rateRef);
      const rateData = rateSnap.exists ? rateSnap.data() : {};
      const lastSentAtMs = Number(rateData.lastSentAtMs || 0);
      const waitMs = EMAIL_CODE_RESEND_COOLDOWN_MS - (now - lastSentAtMs);

      if (lastSentAtMs && waitMs > 0) {
        retryAfterSeconds = Math.ceil(waitMs / 1000);
        return;
      }

      transaction.set(challengeRef, {
        email,
        emailHash: hashValue(email),
        codeHash,
        attempts: 0,
        consumed: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAtMs: now,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        sentAtMs: now,
        expiresAt: new Date(expiresAtMs).toISOString(),
        expiresAtMs,
        source: 'email-code'
      });

      transaction.set(rateRef, {
        emailHash: hashValue(email),
        lastSentAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSentAtMs: now,
        sentCount: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });

    if (retryAfterSeconds > 0) {
      throw new HttpsError('resource-exhausted', `請 ${retryAfterSeconds} 秒後再寄送驗證碼。`);
    }

    try {
      await sendEmailCode({ email, code });
    } catch (error) {
      await challengeRef.set({
        sendFailedAt: admin.firestore.FieldValue.serverTimestamp(),
        sendFailedMessage: error.message || 'send failed'
      }, { merge: true });
      throw error;
    }

    return {
      challengeId: challengeRef.id,
      expiresAt: new Date(expiresAtMs).toISOString(),
      resendAvailableAt: new Date(now + EMAIL_CODE_RESEND_COOLDOWN_MS).toISOString()
    };
  }
);

exports.verifyEmailLoginCode = onCall(
  { secrets: [EMAIL_CODE_PEPPER] },
  async (request) => {
    const email = normalizeEmail(request.data?.email);
    const code = String(request.data?.code || '').replace(/\D/g, '');
    const challengeId = String(request.data?.challengeId || '').trim();

    if (!isValidEmail(email) || !/^\d{6}$/.test(code) || !challengeId) {
      throw new HttpsError('invalid-argument', '請輸入 Email 與 6 位數驗證碼。');
    }

    const challengeRef = firestore.collection('emailLoginChallenges').doc(challengeId);
    let verificationError = null;

    await firestore.runTransaction(async (transaction) => {
      const snap = await transaction.get(challengeRef);
      const data = snap.exists ? snap.data() : null;
      const now = Date.now();

      if (!data || data.email !== email) {
        verificationError = new HttpsError('not-found', '驗證碼不存在，請重新取得。');
        return;
      }

      if (data.consumed) {
        verificationError = new HttpsError('failed-precondition', '這組驗證碼已使用過，請重新取得。');
        return;
      }

      if (Number(data.expiresAtMs || 0) < now) {
        transaction.set(challengeRef, {
          expiredAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        verificationError = new HttpsError('deadline-exceeded', '驗證碼已過期，請重新取得。');
        return;
      }

      const attempts = Number(data.attempts || 0);
      if (attempts >= EMAIL_CODE_MAX_ATTEMPTS) {
        verificationError = new HttpsError('resource-exhausted', '錯誤次數過多，請重新取得驗證碼。');
        return;
      }

      const expectedHash = hashLoginCode({ challengeId, email, code });
      if (!safeCompareHex(expectedHash, data.codeHash)) {
        transaction.set(challengeRef, {
          attempts: attempts + 1,
          lastAttemptAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        const remaining = Math.max(EMAIL_CODE_MAX_ATTEMPTS - attempts - 1, 0);
        verificationError = new HttpsError(
          'permission-denied',
          remaining > 0 ? `驗證碼不正確，還可以再試 ${remaining} 次。` : '錯誤次數過多，請重新取得驗證碼。'
        );
        return;
      }

      transaction.set(challengeRef, {
        attempts: attempts + 1,
        consumed: true,
        consumedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });

    if (verificationError) {
      throw verificationError;
    }

    const userRecord = await getOrCreateEmailUser(email);
    const customToken = await admin.auth().createCustomToken(userRecord.uid);

    return {
      customToken,
      uid: userRecord.uid,
      email: userRecord.email || email,
      displayName: userRecord.displayName || email.split('@')[0]
    };
  }
);

exports.createTripInviteCode = onCall(
  { secrets: [INVITE_CODE_PEPPER] },
  async (request) => {
    const uid = requireSignedIn(request);
    const tripId = String(request.data?.tripId || '').trim();
    const permission = normalizeInvitePermission(request.data?.permission);

    if (!tripId) {
      throw new HttpsError('invalid-argument', '缺少旅程資訊。');
    }

    const { tripRef, trip } = await getTripForOwner(tripId, uid);
    const existingInvite = await getCurrentInviteForTrip(trip);
    const { code, codeHash } = await generateUniqueInviteCode();
    const inviteRef = firestore.collection('tripInviteCodes').doc();
    const now = new Date().toISOString();

    await firestore.runTransaction(async (transaction) => {
      if (existingInvite?.id && existingInvite.enabled) {
        transaction.set(firestore.collection('tripInviteCodes').doc(existingInvite.id), {
          enabled: false,
          disabledAt: now,
          updatedAt: now,
          replacedByInviteId: inviteRef.id
        }, { merge: true });
      }

      transaction.set(inviteRef, {
        code,
        codeHash,
        tripId,
        permission,
        enabled: true,
        createdByUid: uid,
        createdAt: now,
        updatedAt: now,
        disabledAt: '',
        useCount: 0,
        lastUsedAt: ''
      });

      transaction.set(tripRef, {
        invite: {
          enabled: true,
          permission,
          currentInviteId: inviteRef.id,
          updatedAt: now
        },
        updatedAt: now
      }, { merge: true });
    });

    return {
      inviteId: inviteRef.id,
      code,
      permission,
      enabled: true
    };
  }
);

exports.getTripInviteCode = onCall(
  { secrets: [INVITE_CODE_PEPPER] },
  async (request) => {
    const uid = requireSignedIn(request);
    const tripId = String(request.data?.tripId || '').trim();

    if (!tripId) {
      throw new HttpsError('invalid-argument', '缺少旅程資訊。');
    }

    const { trip } = await getTripForOwner(tripId, uid);
    const invite = await getCurrentInviteForTrip(trip);

    if (!invite || !invite.enabled) {
      return {
        inviteId: invite?.id || '',
        code: '',
        permission: normalizeInvitePermission(trip.invite?.permission),
        enabled: false
      };
    }

    return {
      inviteId: invite.id,
      code: invite.code || '',
      permission: normalizeInvitePermission(invite.permission),
      enabled: true,
      createdAt: invite.createdAt || '',
      updatedAt: invite.updatedAt || ''
    };
  }
);

exports.disableTripInviteCode = onCall(
  { secrets: [INVITE_CODE_PEPPER] },
  async (request) => {
    const uid = requireSignedIn(request);
    const tripId = String(request.data?.tripId || '').trim();

    if (!tripId) {
      throw new HttpsError('invalid-argument', '缺少旅程資訊。');
    }

    const { tripRef, trip } = await getTripForOwner(tripId, uid);
    const invite = await getCurrentInviteForTrip(trip);
    const now = new Date().toISOString();

    await firestore.runTransaction(async (transaction) => {
      if (invite?.id) {
        transaction.set(firestore.collection('tripInviteCodes').doc(invite.id), {
          enabled: false,
          disabledAt: now,
          updatedAt: now
        }, { merge: true });
      }

      transaction.set(tripRef, {
        invite: {
          enabled: false,
          permission: normalizeInvitePermission(invite?.permission || trip.invite?.permission),
          currentInviteId: invite?.id || trip.invite?.currentInviteId || '',
          updatedAt: now
        },
        updatedAt: now
      }, { merge: true });
    });

    return {
      inviteId: invite?.id || '',
      enabled: false
    };
  }
);

exports.redeemTripInviteCode = onCall(
  { secrets: [INVITE_CODE_PEPPER] },
  async (request) => {
    const uid = requireSignedIn(request);
    const normalizedCode = normalizeInviteCode(request.data?.code);

    if (!/^[A-Z0-9]{8}$/.test(normalizedCode)) {
      throw new HttpsError('invalid-argument', '邀請碼格式不正確。');
    }

    await assertInviteRedeemRateLimit(uid);

    const codeHash = hashInviteCode(normalizedCode);
    const inviteSnapshot = await firestore
      .collection('tripInviteCodes')
      .where('codeHash', '==', codeHash)
      .limit(1)
      .get();

    if (inviteSnapshot.empty) {
      throw new HttpsError('not-found', '找不到這組邀請碼，請確認後再試。');
    }

    const inviteDoc = inviteSnapshot.docs[0];
    const invite = inviteDoc.data() || {};
    if (!invite.enabled) {
      throw new HttpsError('failed-precondition', '這組邀請碼已停用，請向主辦人索取新的邀請碼。');
    }

    const tripId = String(invite.tripId || '').trim();
    if (!tripId) {
      throw new HttpsError('failed-precondition', '這組邀請碼缺少旅程資訊。');
    }

    const role = invite.permission === 'edit' ? 'editor' : 'view';
    const tripRef = firestore.collection('trips').doc(tripId);
    const memberRef = tripRef.collection('members').doc(uid);
    let resultRole = role;
    let alreadyMember = false;
    let tripTitle = '';

    await firestore.runTransaction(async (transaction) => {
      const [tripSnap, memberSnap] = await Promise.all([
        transaction.get(tripRef),
        transaction.get(memberRef)
      ]);

      if (!tripSnap.exists) {
        throw new HttpsError('not-found', '找不到這趟旅程。');
      }

      const trip = tripSnap.data() || {};
      tripTitle = trip.meta?.title || trip.tripDetails?.title || '未命名旅程';

      if (trip.invite?.enabled === false || trip.invite?.currentInviteId !== inviteDoc.id) {
        throw new HttpsError('failed-precondition', '這組邀請碼已失效，請向主辦人索取新的邀請碼。');
      }

      if (memberSnap.exists) {
        alreadyMember = true;
        resultRole = memberSnap.data()?.role || role;
      } else if (trip.access?.ownerUid === uid) {
        alreadyMember = true;
        resultRole = 'owner';
        transaction.set(memberRef, buildMemberPayloadFromRequest({
          request,
          role: 'owner',
          inviteId: inviteDoc.id,
          inviteCode: normalizedCode
        }), { merge: true });
      } else {
        transaction.set(memberRef, buildMemberPayloadFromRequest({
          request,
          role,
          inviteId: inviteDoc.id,
          inviteCode: normalizedCode
        }), { merge: true });
      }

      transaction.set(inviteDoc.ref, {
        useCount: admin.firestore.FieldValue.increment(1),
        lastUsedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    });

    return {
      tripId,
      tripTitle,
      role: resultRole,
      alreadyMember
    };
  }
);

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
