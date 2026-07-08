const { onDocumentDeleted, onDocumentWritten } = require('firebase-functions/v2/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const webPush = require('web-push');
const {
  buildGooglePlaceSearchQueries,
  buildTripRecommendationSnapshot,
  normalizeMode,
  normalizeExternalGoogleCandidate,
  normalizeRecommendationResponse,
  recommendationPrompt,
  recommendationResponseSchema
} = require('./tripRecommendations');
const {
  buildTripHandbookSnapshot,
  handbookPrompt,
  handbookResponseSchema,
  normalizeHandbookResponse
} = require('./tripHandbook');
const {
  DEFAULT_NOTIFICATION_LEAD_TIMES,
  DEFAULT_TIME_ZONE,
  buildTripNotificationCandidates,
  buildWebPushPayload,
  normalizeCategories,
  normalizeTimeText,
  normalizeTimeZone
} = require('./tripNotificationReminders');

admin.initializeApp();

const firestore = admin.firestore();
const realtimeDb = admin.database();
const serverTimestamp = admin.database.ServerValue.TIMESTAMP;
const PRIMARY_OWNER_EMAIL = (process.env.PRIMARY_OWNER_EMAIL || 'sky32439@gmail.com').toLowerCase();
const GMAIL_SMTP_USER = defineSecret('GMAIL_SMTP_USER');
const GMAIL_SMTP_APP_PASSWORD = defineSecret('GMAIL_SMTP_APP_PASSWORD');
const EMAIL_CODE_PEPPER = defineSecret('EMAIL_CODE_PEPPER');
const INVITE_CODE_PEPPER = defineSecret('INVITE_CODE_PEPPER');
const FLIGHTAPI_IO_KEY = defineSecret('FLIGHTAPI_IO_KEY');
const GOOGLE_GEOCODING_API_KEY = defineSecret('GOOGLE_GEOCODING_API_KEY');
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const WEB_PUSH_VAPID_PUBLIC_KEY = defineSecret('WEB_PUSH_VAPID_PUBLIC_KEY');
const WEB_PUSH_VAPID_PRIVATE_KEY = defineSecret('WEB_PUSH_VAPID_PRIVATE_KEY');
const WEB_PUSH_VAPID_SUBJECT = defineSecret('WEB_PUSH_VAPID_SUBJECT');
const WEB_PUSH_SECRET_DEFINITIONS = [
  WEB_PUSH_VAPID_PUBLIC_KEY,
  WEB_PUSH_VAPID_PRIVATE_KEY,
  WEB_PUSH_VAPID_SUBJECT
];
const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;
const EMAIL_CODE_SEND_COOLDOWN_MS = 60 * 1000;
const EMAIL_CODE_VERIFICATION_LOCK_MS = 60 * 1000;
const EMAIL_CODE_MAX_ATTEMPTS = 5;
const INVITE_CODE_RATE_WINDOW_MS = 5 * 60 * 1000;
const INVITE_CODE_MAX_ATTEMPTS = 12;
const FLIGHT_LOOKUP_RATE_WINDOW_MS = 10 * 60 * 1000;
const FLIGHT_LOOKUP_MAX_ATTEMPTS = 20;
const GOOGLE_LOOKUP_RATE_WINDOW_MS = 10 * 60 * 1000;
const GOOGLE_LOOKUP_MAX_ATTEMPTS = 120;
const AI_RECOMMENDATION_RATE_WINDOW_MS = 10 * 60 * 1000;
const AI_RECOMMENDATION_MAX_ATTEMPTS = 10;
const AI_HANDBOOK_RATE_WINDOW_MS = 10 * 60 * 1000;
const AI_HANDBOOK_MAX_ATTEMPTS = 5;
const INVITE_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const DEFAULT_EMAIL_FROM_NAME = 'Trip Planner';
const FLIGHTAPI_BASE_URL = 'https://api.flightapi.io/airline';
const OPENAI_RESPONSES_ENDPOINT = 'https://api.openai.com/v1/responses';
const GOOGLE_GEOCODING_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json';
const GOOGLE_PLACES_AUTOCOMPLETE_ENDPOINT = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const GOOGLE_PLACE_DETAILS_ENDPOINT = 'https://maps.googleapis.com/maps/api/place/details/json';
const OPENAI_IMAGES_ENDPOINT = 'https://api.openai.com/v1/images/generations';
const CANONICAL_APP_ORIGIN = 'https://trip-planner-36455.firebaseapp.com';
const WEB_PUSH_DEVICE_ENDPOINT_MAX_LENGTH = 2000;
const WEB_PUSH_KEY_MAX_LENGTH = 512;
const WEB_PUSH_DELIVERY_LOOK_BEHIND_MINUTES = 20;
const TRIP_HANDBOOK_DOC_ID = 'latest';
const TRIP_HANDBOOK_IMAGE_STORAGE_PREFIX = 'trip-handbooks';
const TRIP_HANDBOOK_IMAGE_MAX_RESPONSE_BYTES = 900 * 1024;
const TRIP_HANDBOOK_IMAGE_TIMEOUT_MS = 120 * 1000;
const COLLABORATION_NOTIFICATION_COLLECTIONS = Object.freeze({
  events: {
    label: '行程',
    fallback: '一個行程',
    titleFields: ['title', 'location']
  },
  days: {
    label: '日期',
    fallback: '一天安排',
    titleFields: ['title', 'date']
  },
  details: {
    label: '旅程資訊',
    fallback: '旅程資訊',
    titleFields: ['title'],
    sectionLabels: {
      meta: '基本資料',
      logistics: '交通住宿',
      finance: '預算'
    }
  },
  checklistItems: {
    label: '待辦',
    fallback: '一個待辦',
    titleFields: ['text', 'category']
  },
  shoppingItems: {
    label: '購物',
    fallback: '一個購物項目',
    titleFields: ['name', 'category']
  },
  expenses: {
    label: '花費',
    fallback: '一筆花費',
    titleFields: ['title', 'payer']
  },
  placeIdeas: {
    label: '想去地點',
    fallback: '一個地點',
    titleFields: ['name', 'address']
  },
  shoppingCategories: {
    label: '購物分類',
    fallback: '一個分類',
    titleFields: ['name']
  }
});

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

const normalizeClientId = (value, fallback = 'server') => {
  const normalized = String(value || '')
    .trim()
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .slice(0, 200);
  return normalized || fallback;
};

const normalizeVoteValue = (value, fallback = 1) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  if (number > 0) return 1;
  if (number < 0) return -1;
  return 0;
};

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

const getEmailFromAddress = (smtpUser) => (
  process.env.EMAIL_FROM || `${DEFAULT_EMAIL_FROM_NAME} <${smtpUser}>`
);

const sendEmailCode = async ({ email, code }) => {
  const smtpUser = String(GMAIL_SMTP_USER.value() || '').trim();
  const smtpPassword = String(GMAIL_SMTP_APP_PASSWORD.value() || '').replace(/\s+/g, '');

  if (!smtpUser || !smtpPassword) {
    throw new HttpsError('failed-precondition', 'Email 寄送服務尚未完成 Gmail SMTP 設定。');
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: smtpUser,
      pass: smtpPassword
    }
  });

  try {
    return await transporter.sendMail({
      from: getEmailFromAddress(smtpUser),
      to: email,
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
    });
  } catch (error) {
    console.error('Gmail SMTP email send failed', {
      code: error?.code || '',
      command: error?.command || '',
      responseCode: error?.responseCode || '',
      message: error?.message || ''
    });

    const isConfigurationError = error?.code === 'EAUTH'
      || error?.responseCode === 535
      || error?.responseCode === 534
      || error?.responseCode === 530;

    if (isConfigurationError) {
      throw new HttpsError('failed-precondition', 'Email 寄送服務尚未完成 Gmail SMTP 設定。');
    }

    const isRateLimitError = error?.responseCode === 421
      || error?.responseCode === 450
      || error?.responseCode === 452
      || error?.responseCode === 454;

    throw new HttpsError(
      isRateLimitError ? 'resource-exhausted' : 'internal',
      isRateLimitError
        ? 'Gmail 寄送額度暫時受限，請稍後再試。'
        : '驗證碼寄送失敗，請稍後再試。'
    );
  }
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

const writePresenceAcl = async ({ tripId, uid, role, source }) => {
  await realtimeDb.ref(`presenceAcl/${tripId}/${uid}`).set({
    uid,
    role: normalizeRole(role),
    updatedAt: serverTimestamp,
    source
  });
};

const writeTripRealtimeAcl = async ({ tripId, uid, role, source }) => {
  await realtimeDb.ref(`tripRealtimeAcl/${tripId}/${uid}`).set({
    uid,
    role: normalizeRole(role),
    updatedAt: serverTimestamp,
    source
  });
};

const writeRealtimeAccess = async ({ tripId, uid, role, source }) => Promise.all([
  writePresenceAcl({ tripId, uid, role, source }),
  writeTripRealtimeAcl({ tripId, uid, role, source })
]);

const getTripRoleForUid = async ({ tripId, uid }) => {
  const tripRef = firestore.collection('trips').doc(tripId);
  const memberRef = tripRef.collection('members').doc(uid);
  const [tripSnap, memberSnap] = await Promise.all([
    tripRef.get(),
    memberRef.get()
  ]);

  if (!tripSnap.exists) {
    throw new HttpsError('not-found', 'Trip not found.');
  }

  const trip = tripSnap.data() || {};
  const role = trip.access?.ownerUid === uid
    ? 'owner'
    : (memberSnap.exists ? normalizeRole(memberSnap.data()?.role) : '');

  if (!role) {
    throw new HttpsError('permission-denied', 'You do not have access to this trip.');
  }

  return { tripRef, memberRef, trip, member: memberSnap.exists ? memberSnap.data() || {} : {}, role };
};

const syncRealtimePlaceVotes = async ({ tripId, placeId, votes }) => {
  const voteMap = {};
  (Array.isArray(votes) ? votes : []).forEach((vote) => {
    if (!vote?.voterId) return;
    voteMap[vote.voterId] = {
      voterId: vote.voterId,
      name: String(vote.name || 'Member').slice(0, 120),
      value: normalizeVoteValue(vote.value, 1),
      votedAt: vote.votedAt || new Date().toISOString(),
      updatedAt: serverTimestamp
    };
  });

  const placeVotesRef = realtimeDb.ref(`tripRealtime/${tripId}/placeVotes/${placeId}`);
  if (!Object.keys(voteMap).length) {
    await placeVotesRef.remove();
    return;
  }

  await placeVotesRef.set({
    votes: voteMap,
    updatedAt: serverTimestamp
  });
};

const appendRealtimeActivity = async ({ tripId, activity }) => {
  const activityRef = realtimeDb.ref(`tripRealtime/${tripId}/activityLog`);
  await activityRef.push({
    ...activity,
    createdAt: serverTimestamp,
    updatedAt: serverTimestamp
  });

  const snapshot = await activityRef.orderByChild('createdAt').once('value');
  const keys = [];
  snapshot.forEach((child) => {
    keys.push(child.key);
  });

  const staleKeys = keys.slice(0, Math.max(0, keys.length - 80));
  await Promise.all(staleKeys.map((key) => activityRef.child(key).remove()));
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

const getMemberDisplayName = ({ request, member = {} }) => (
  String(request.data?.displayName || '').trim()
  || String(member.displayName || '').trim()
  || String(request.auth?.token?.name || '').trim()
  || String(request.auth?.token?.email || '').split('@')[0]
  || '旅伴'
);

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

const assertFlightLookupRateLimit = async (uid) => {
  const now = Date.now();
  const rateRef = firestore.collection('flightLookupRateLimits').doc(uid);
  let waitSeconds = 0;

  await firestore.runTransaction(async (transaction) => {
    const snap = await transaction.get(rateRef);
    const data = snap.exists ? snap.data() : {};
    const windowStartedAtMs = Number(data.windowStartedAtMs || 0);
    const attempts = Number(data.attempts || 0);
    const isSameWindow = windowStartedAtMs && now - windowStartedAtMs < FLIGHT_LOOKUP_RATE_WINDOW_MS;

    if (isSameWindow && attempts >= FLIGHT_LOOKUP_MAX_ATTEMPTS) {
      waitSeconds = Math.ceil((FLIGHT_LOOKUP_RATE_WINDOW_MS - (now - windowStartedAtMs)) / 1000);
      return;
    }

    transaction.set(rateRef, {
      attempts: isSameWindow ? attempts + 1 : 1,
      windowStartedAtMs: isSameWindow ? windowStartedAtMs : now,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });

  if (waitSeconds > 0) {
    throw new HttpsError('resource-exhausted', `航班查詢太頻繁，請 ${waitSeconds} 秒後再試。`);
  }
};

const assertGoogleLookupRateLimit = async (uid) => {
  const now = Date.now();
  const rateRef = firestore.collection('googleLookupRateLimits').doc(uid);
  let waitSeconds = 0;

  await firestore.runTransaction(async (transaction) => {
    const snap = await transaction.get(rateRef);
    const data = snap.exists ? snap.data() : {};
    const windowStartedAtMs = Number(data.windowStartedAtMs || 0);
    const attempts = Number(data.attempts || 0);
    const isSameWindow = windowStartedAtMs && now - windowStartedAtMs < GOOGLE_LOOKUP_RATE_WINDOW_MS;

    if (isSameWindow && attempts >= GOOGLE_LOOKUP_MAX_ATTEMPTS) {
      waitSeconds = Math.ceil((GOOGLE_LOOKUP_RATE_WINDOW_MS - (now - windowStartedAtMs)) / 1000);
      return;
    }

    transaction.set(rateRef, {
      attempts: isSameWindow ? attempts + 1 : 1,
      windowStartedAtMs: isSameWindow ? windowStartedAtMs : now,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });

  if (waitSeconds > 0) {
    throw new HttpsError('resource-exhausted', `Google place lookup rate limit reached. Try again in ${waitSeconds} seconds.`);
  }
};

const assertAiRecommendationRateLimit = async (uid) => {
  const now = Date.now();
  const rateRef = firestore.collection('aiRecommendationRateLimits').doc(uid);
  let waitSeconds = 0;

  await firestore.runTransaction(async (transaction) => {
    const snap = await transaction.get(rateRef);
    const data = snap.exists ? snap.data() : {};
    const windowStartedAtMs = Number(data.windowStartedAtMs || 0);
    const attempts = Number(data.attempts || 0);
    const isSameWindow = windowStartedAtMs && now - windowStartedAtMs < AI_RECOMMENDATION_RATE_WINDOW_MS;

    if (isSameWindow && attempts >= AI_RECOMMENDATION_MAX_ATTEMPTS) {
      waitSeconds = Math.ceil((AI_RECOMMENDATION_RATE_WINDOW_MS - (now - windowStartedAtMs)) / 1000);
      return;
    }

    transaction.set(rateRef, {
      attempts: isSameWindow ? attempts + 1 : 1,
      windowStartedAtMs: isSameWindow ? windowStartedAtMs : now,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });

  if (waitSeconds > 0) {
    throw new HttpsError('resource-exhausted', `智慧推薦產生太頻繁，請 ${waitSeconds} 秒後再試。`);
  }
};

const assertAiHandbookRateLimit = async (uid) => {
  const now = Date.now();
  const rateRef = firestore.collection('aiHandbookRateLimits').doc(uid);
  let waitSeconds = 0;

  await firestore.runTransaction(async (transaction) => {
    const snap = await transaction.get(rateRef);
    const data = snap.exists ? snap.data() : {};
    const windowStartedAtMs = Number(data.windowStartedAtMs || 0);
    const attempts = Number(data.attempts || 0);
    const isSameWindow = windowStartedAtMs && now - windowStartedAtMs < AI_HANDBOOK_RATE_WINDOW_MS;

    if (isSameWindow && attempts >= AI_HANDBOOK_MAX_ATTEMPTS) {
      waitSeconds = Math.ceil((AI_HANDBOOK_RATE_WINDOW_MS - (now - windowStartedAtMs)) / 1000);
      return;
    }

    transaction.set(rateRef, {
      attempts: isSameWindow ? attempts + 1 : 1,
      windowStartedAtMs: isSameWindow ? windowStartedAtMs : now,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });

  if (waitSeconds > 0) {
    throw new HttpsError('resource-exhausted', `旅遊手冊產生太頻繁，請 ${waitSeconds} 秒後再試。`);
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

const normalizeFlightCode = (rawCode = '') => String(rawCode).trim().toUpperCase().replace(/\s+/g, '');
const normalizeAirportCode = (rawCode = '') => String(rawCode || '').trim().toUpperCase();
const isAirportCode = (rawCode = '') => /^[A-Z]{3}$/.test(normalizeAirportCode(rawCode));

const parseFlightCode = (rawCode = '') => {
  const code = normalizeFlightCode(rawCode);
  const match = code.match(/^([A-Z0-9]{2})(\d{1,5}[A-Z]?)$/);
  if (!match) return null;
  return { code, name: match[1], num: match[2] };
};

const normalizeLookupDate = (rawDate = '') => {
  const value = String(rawDate || '').trim();
  if (!value) return '';

  const slashDate = value.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (slashDate) {
    return `${slashDate[1]}${slashDate[2].padStart(2, '0')}${slashDate[3].padStart(2, '0')}`;
  }

  const dashDate = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (dashDate) {
    return `${dashDate[1]}${dashDate[2].padStart(2, '0')}${dashDate[3].padStart(2, '0')}`;
  }

  return /^\d{8}$/.test(value) ? value : '';
};

const formatLookupDate = (yyyymmdd = '') => {
  const match = String(yyyymmdd).match(/^\d{4}(\d{2})(\d{2})$/);
  return match ? `${Number(match[1])}/${Number(match[2])}` : '';
};

const toFlightTimeText = (raw) => {
  const value = String(raw || '').trim();
  if (!value) return '';

  const isoMatch = value.match(/T(\d{2}):(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}:${isoMatch[2]}`;

  const meridiemMatch = value.match(/\b(\d{1,2}):(\d{2})\s*(AM|PM)\b/i);
  if (meridiemMatch) {
    const hour = Number(meridiemMatch[1]);
    const minute = meridiemMatch[2];
    const meridiem = meridiemMatch[3].toUpperCase();
    const normalizedHour = meridiem === 'PM'
      ? (hour === 12 ? 12 : hour + 12)
      : (hour === 12 ? 0 : hour);
    return `${String(normalizedHour).padStart(2, '0')}:${minute}`;
  }

  const timeMatch = value.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  return timeMatch ? `${String(Number(timeMatch[1])).padStart(2, '0')}:${timeMatch[2]}` : value;
};

const readFlightText = (...values) => {
  const value = values.find((item) => typeof item === 'string' && item.trim());
  return value ? value.trim() : '';
};

const getFlightField = (source, ...keys) => {
  if (!source || typeof source !== 'object') return '';
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

const asFlightArray = (value) => {
  if (Array.isArray(value)) return value;
  return value == null ? [] : [value];
};

const findFlightLeg = (payload, key) => {
  for (const container of asFlightArray(payload)) {
    const leg = asFlightArray(container?.[key]).find((item) => item && typeof item === 'object');
    if (leg) return leg;
  }
  return null;
};

const extractFlightTerminal = (raw) => {
  const value = String(raw || '').trim();
  if (!value) return '';
  const [terminal] = value.split(/\s+-\s+/);
  return terminal?.trim() || '';
};

const buildFlightRecord = (payload, flightCode, carrierCode, lookupDate) => {
  const items = asFlightArray(payload);
  const firstItem = items[0] || {};
  const departure = findFlightLeg(items, 'departure');
  const arrival = findFlightLeg(items, 'arrival');

  if (!departure && !arrival) return null;

  const departureTime = readFlightText(
    departure?.offGroundTime,
    departure?.outGateTime,
    getFlightField(departure, 'Takeoff Time:', 'Takeoff Time', 'Actual Time:', 'Actual Time'),
    getFlightField(departure, 'Scheduled Time:', 'Scheduled Time'),
    departure?.scheduledTime,
    departure?.estimatedTime,
    departure?.departureDateTime,
    departure?.scheduledDateTime,
    departure?.estimatedDateTime
  );
  const arrivalTime = readFlightText(
    arrival?.inGateTime,
    arrival?.onGroundTime,
    getFlightField(arrival, 'At Gate Time:', 'At Gate Time', 'Actual Time:', 'Actual Time'),
    getFlightField(arrival, 'Scheduled Time:', 'Scheduled Time'),
    arrival?.scheduledTime,
    arrival?.estimatedTime,
    arrival?.arrivalDateTime,
    arrival?.scheduledDateTime,
    arrival?.estimatedDateTime
  );

  return {
    code: flightCode,
    airline: readFlightText(firstItem?.airline?.name, firstItem?.airlineName, firstItem?.airline, carrierCode),
    date: formatLookupDate(lookupDate),
    departureTime: toFlightTimeText(departureTime),
    arrivalTime: toFlightTimeText(arrivalTime),
    dep: readFlightText(departure?.airportCode, departure?.airportIata, departure?.iata, getFlightField(departure, 'Airport:', 'Airport')),
    arr: readFlightText(arrival?.airportCode, arrival?.airportIata, arrival?.iata, getFlightField(arrival, 'Airport:', 'Airport')),
    depTerminal: readFlightText(extractFlightTerminal(getFlightField(departure, 'Terminal - Gate:', 'Terminal - Gate')), departure?.terminal),
    arrTerminal: readFlightText(extractFlightTerminal(getFlightField(arrival, 'Terminal - Gate:', 'Terminal - Gate')), arrival?.terminal)
  };
};

const flightProviderMessage = (status) => {
  if (status === 401 || status === 403) return '航班查詢服務設定尚未完成，請稍後再試或手動填寫。';
  if (status === 404 || status === 410) return '查無此日期的航班資料，已保留目前手動輸入內容。';
  if (status === 429) return '航班查詢次數已達上限，請稍後再試或手動填寫。';
  return '航班查詢暫時無法使用，請稍後再試或手動填寫。';
};

const GOOGLE_PLACE_STATUS = {
  idle: 'idle',
  missingApiKey: 'missing_api_key',
  loadingFailed: 'loading_failed',
  apiNotActivated: 'api_not_activated',
  apiTargetBlocked: 'api_target_blocked',
  billingOrKeyError: 'billing_or_key_error',
  requestFailed: 'request_failed',
  empty: 'empty',
  success: 'success'
};

const normalizeGoogleLookupText = (value, maxLength = 240) => String(value || '')
  .trim()
  .replace(/[\u0000-\u001f\u007f]/g, '')
  .slice(0, maxLength);

const normalizeGooglePlaceTypes = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeGoogleLookupText(item, 60))
    .filter((item) => /^[a-zA-Z0-9_()|]+$/.test(item))
    .slice(0, 3);
};

const readGoogleCoordinate = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const getGoogleApiKey = () => GOOGLE_GEOCODING_API_KEY.value();

const googleProviderErrorCode = (status) => {
  if (status === 'OVER_QUERY_LIMIT') return 'resource-exhausted';
  if (status === 'REQUEST_DENIED') return 'failed-precondition';
  if (status === 'INVALID_REQUEST') return 'invalid-argument';
  return 'unavailable';
};

const googleProviderStatus = (status) => {
  if (status === 'REQUEST_DENIED') return GOOGLE_PLACE_STATUS.billingOrKeyError;
  if (status === 'OVER_QUERY_LIMIT') return GOOGLE_PLACE_STATUS.requestFailed;
  if (status === 'INVALID_REQUEST') return GOOGLE_PLACE_STATUS.requestFailed;
  return GOOGLE_PLACE_STATUS.loadingFailed;
};

const fetchGoogleJson = async (endpoint, params) => {
  let response = null;
  let payload = null;

  try {
    response = await fetch(`${endpoint}?${params.toString()}`);
    payload = await response.json().catch(() => ({}));
  } catch (error) {
    console.error('Google API request failed', {
      endpoint,
      code: error?.code || '',
      message: error?.message || ''
    });
    throw new HttpsError('unavailable', 'Google place service is unavailable.');
  }

  if (!response.ok) {
    console.error('Google API HTTP error', {
      endpoint,
      status: response.status,
      providerStatus: payload?.status || ''
    });
    throw new HttpsError('unavailable', 'Google place service returned an error.');
  }

  const providerStatus = payload?.status || '';
  if (providerStatus && providerStatus !== 'OK' && providerStatus !== 'ZERO_RESULTS') {
    console.error('Google API provider error', {
      endpoint,
      providerStatus,
      errorMessage: payload?.error_message || ''
    });
    throw new HttpsError(
      googleProviderErrorCode(providerStatus),
      payload?.error_message || 'Google place service returned an error.',
      { googlePlacesStatus: googleProviderStatus(providerStatus), providerStatus }
    );
  }

  return payload;
};

const normalizeGooglePrediction = (prediction) => {
  const formatting = prediction?.structured_formatting || {};
  const description = normalizeGoogleLookupText(prediction?.description, 300);
  return {
    source: 'server',
    placeId: normalizeGoogleLookupText(prediction?.place_id, 180),
    description,
    mainText: normalizeGoogleLookupText(formatting.main_text, 180) || description,
    secondaryText: normalizeGoogleLookupText(formatting.secondary_text, 220),
    types: Array.isArray(prediction?.types) ? prediction.types.slice(0, 12) : []
  };
};

const normalizeGoogleDetails = (place, fallbackText = '') => {
  const location = place?.geometry?.location || {};
  const fallback = normalizeGoogleLookupText(fallbackText, 240);
  const name = normalizeGoogleLookupText(place?.name, 240) || fallback;
  const address = normalizeGoogleLookupText(place?.formatted_address, 300) || name || fallback;

  return {
    name,
    address,
    placeId: normalizeGoogleLookupText(place?.place_id, 180),
    lat: readGoogleCoordinate(location.lat),
    lng: readGoogleCoordinate(location.lng),
    types: Array.isArray(place?.types)
      ? place.types.map((type) => normalizeGoogleLookupText(type, 48)).filter(Boolean).slice(0, 8)
      : []
  };
};

const getConfiguredGoogleApiKey = () => {
  const apiKey = getGoogleApiKey();
  if (!apiKey) {
    throw new HttpsError(
      'failed-precondition',
      'Google place service is not configured.',
      { googlePlacesStatus: GOOGLE_PLACE_STATUS.missingApiKey }
    );
  }
  return apiKey;
};

const getConfiguredOpenAIKey = () => {
  const apiKey = String(OPENAI_API_KEY.value() || '').trim();
  if (!apiKey) {
    throw new HttpsError('failed-precondition', '智慧推薦服務尚未設定服務金鑰。');
  }
  return apiKey;
};

const readCollectionDocuments = async (collectionRef) => {
  const snapshot = await collectionRef.get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  }));
};

const loadTripRecommendationSource = async (tripRef, trip) => {
  const [
    details,
    days,
    events,
    placeIdeas,
    checklistItems,
    expenses
  ] = await Promise.all([
    readCollectionDocuments(tripRef.collection('details')),
    readCollectionDocuments(tripRef.collection('days')),
    readCollectionDocuments(tripRef.collection('events')),
    readCollectionDocuments(tripRef.collection('placeIdeas')),
    readCollectionDocuments(tripRef.collection('checklistItems')),
    readCollectionDocuments(tripRef.collection('expenses'))
  ]);

  return {
    trip,
    details,
    days,
    events,
    placeIdeas,
    checklistItems,
    expenses
  };
};

const loadTripHandbookSource = async (tripRef, trip) => {
  const [
    details,
    days,
    events,
    placeIdeas,
    checklistItems,
    shoppingItems,
    expenses
  ] = await Promise.all([
    readCollectionDocuments(tripRef.collection('details')),
    readCollectionDocuments(tripRef.collection('days')),
    readCollectionDocuments(tripRef.collection('events')),
    readCollectionDocuments(tripRef.collection('placeIdeas')),
    readCollectionDocuments(tripRef.collection('checklistItems')),
    readCollectionDocuments(tripRef.collection('shoppingItems')),
    readCollectionDocuments(tripRef.collection('expenses'))
  ]);

  return {
    trip,
    details,
    days,
    events,
    placeIdeas,
    checklistItems,
    shoppingItems,
    expenses
  };
};

const getTripHandbookDocRef = (tripRef) => tripRef.collection('handbooks').doc(TRIP_HANDBOOK_DOC_ID);

const getTimeoutSignal = (timeoutMs) => (
  typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
    ? AbortSignal.timeout(timeoutMs)
    : undefined
);

const makeStorageSafeSegment = (value, fallback = 'trip') => {
  const cleaned = String(value || '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
  return cleaned || fallback;
};

const makeFirebaseStorageDownloadUrl = ({ bucketName, filePath, token }) => (
  `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(filePath)}?alt=media&token=${encodeURIComponent(token)}`
);

const imageDataUrlFromBuffer = (buffer, contentType = 'image/jpeg') => {
  if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > TRIP_HANDBOOK_IMAGE_MAX_RESPONSE_BYTES) {
    return '';
  }
  return `data:${contentType};base64,${buffer.toString('base64')}`;
};

const stripHandbookVisualData = (visuals = {}) => {
  const copy = { ...visuals };
  delete copy.coverImageDataUrl;
  return copy;
};

const getTripHandbookImagePath = (tripId) => (
  `${TRIP_HANDBOOK_IMAGE_STORAGE_PREFIX}/${makeStorageSafeSegment(tripId)}/latest-cover.jpg`
);

const buildTripHandbookImagePrompt = ({ snapshot = {}, handbook = {} }) => {
  const trip = snapshot.trip || {};
  const itinerary = Array.isArray(snapshot.itinerary) ? snapshot.itinerary : [];
  const placeIdeas = Array.isArray(snapshot.placeIdeas) ? snapshot.placeIdeas : [];
  const highlights = Array.isArray(handbook.overview?.highlights) ? handbook.overview.highlights : [];
  const eventCues = itinerary.flatMap((day) => (
    Array.isArray(day.events) ? day.events : []
  )).flatMap((event) => [event.title, event.location, event.type]).filter(Boolean);
  const placeCues = placeIdeas.flatMap((place) => [place.name, place.address]).filter(Boolean);
  const cues = [
    trip.title,
    trip.dates,
    trip.accommodation?.name,
    trip.accommodation?.address,
    ...eventCues,
    ...placeCues,
    ...highlights
  ]
    .map((item) => normalizeGoogleLookupText(item, 80))
    .filter(Boolean)
    .slice(0, 18);

  return [
    'Create one lively illustrated cover image for a personal travel handbook.',
    'Use only these trip cues; do not add factual claims, readable labels, opening hours, prices, weather, route durations, logos, brand marks, or UI screenshots.',
    `Trip title: ${normalizeGoogleLookupText(trip.title || handbook.cover?.title || 'Travel handbook', 100)}`,
    `Trip dates: ${normalizeGoogleLookupText(trip.dates || handbook.cover?.dateText || '', 80) || 'not specified'}`,
    `Visual cues: ${cues.join(', ') || 'travel map, suitcase, tickets, camera, cheerful city scenery'}`,
    'Style: bright modern editorial travel illustration, polished and playful, rich but clean colors, no readable text, no watermark, no identifiable people.',
    'Composition: square cover artwork that still looks good when cropped wide; include travel objects and destination-inspired scenery as a cheerful collage.'
  ].join('\n');
};

const getRuntimeValue = (secret, envName, fallback = '') => {
  try {
    const value = String(secret.value() || '').trim();
    if (value) return value;
  } catch {
    // Local checks and unbound functions can fall back to environment values.
  }

  return String(process.env[envName] || fallback || '').trim();
};

const getConfiguredWebPushPublicKey = () => {
  const publicKey = getRuntimeValue(WEB_PUSH_VAPID_PUBLIC_KEY, 'WEB_PUSH_VAPID_PUBLIC_KEY');
  if (!publicKey) {
    throw new HttpsError('failed-precondition', 'Web Push is not configured.');
  }
  return publicKey;
};

const getConfiguredWebPushDetails = () => {
  const publicKey = getConfiguredWebPushPublicKey();
  const privateKey = getRuntimeValue(WEB_PUSH_VAPID_PRIVATE_KEY, 'WEB_PUSH_VAPID_PRIVATE_KEY');
  const subject = getRuntimeValue(
    WEB_PUSH_VAPID_SUBJECT,
    'WEB_PUSH_VAPID_SUBJECT',
    `mailto:${PRIMARY_OWNER_EMAIL}`
  );

  if (!privateKey) {
    throw new HttpsError('failed-precondition', 'Web Push private key is not configured.');
  }

  return { publicKey, privateKey, subject };
};

const configureWebPush = () => {
  const { publicKey, privateKey, subject } = getConfiguredWebPushDetails();
  webPush.setVapidDetails(subject, publicKey, privateKey);
};

const cleanPushString = (value, maxLength) => String(value || '')
  .trim()
  .replace(/[\u0000-\u001f\u007f]/g, '')
  .slice(0, maxLength);

const normalizePushSubscription = (subscription = {}) => {
  const source = subscription && typeof subscription === 'object' ? subscription : {};
  const keys = source.keys && typeof source.keys === 'object' ? source.keys : {};
  const endpoint = cleanPushString(source.endpoint, WEB_PUSH_DEVICE_ENDPOINT_MAX_LENGTH);
  const p256dh = cleanPushString(keys.p256dh, WEB_PUSH_KEY_MAX_LENGTH);
  const auth = cleanPushString(keys.auth, WEB_PUSH_KEY_MAX_LENGTH);

  if (!endpoint || !endpoint.startsWith('https://') || !p256dh || !auth) {
    throw new HttpsError('invalid-argument', 'A valid Web Push subscription is required.');
  }

  const expirationTime = source.expirationTime == null ? null : Number(source.expirationTime);
  return {
    endpoint,
    expirationTime: Number.isFinite(expirationTime) ? expirationTime : null,
    keys: { p256dh, auth }
  };
};

const normalizeLeadTimePreferences = (leadTimes = {}) => {
  const source = leadTimes && typeof leadTimes === 'object' ? leadTimes : {};
  const eventMinutes = Number(source.eventMinutes);
  const flightHours = Array.isArray(source.flightHours)
    ? source.flightHours.map(Number).filter((value) => Number.isFinite(value) && value > 0 && value <= 72)
    : [];
  const checklistDays = Array.isArray(source.checklistDays)
    ? source.checklistDays.map(Number).filter((value) => Number.isFinite(value) && value >= 0 && value <= 14)
    : [];

  return {
    eventMinutes: Number.isFinite(eventMinutes) && eventMinutes >= 5 && eventMinutes <= 1440
      ? eventMinutes
      : DEFAULT_NOTIFICATION_LEAD_TIMES.eventMinutes,
    flightHours: flightHours.length ? flightHours : DEFAULT_NOTIFICATION_LEAD_TIMES.flightHours,
    checklistDays: checklistDays.length ? checklistDays : DEFAULT_NOTIFICATION_LEAD_TIMES.checklistDays
  };
};

const getPushDeviceRef = (uid, deviceId) => (
  firestore
    .collection('userPushSubscriptions')
    .doc(uid)
    .collection('devices')
    .doc(deviceId)
);

const getTripNotificationPreferenceRef = (uid, tripId) => (
  firestore
    .collection('userNotificationSettings')
    .doc(uid)
    .collection('tripPrefs')
    .doc(tripId)
);

const makePushDeviceId = (endpoint) => hashValue(endpoint).slice(0, 48);

const getActivePushDevices = async (uid) => {
  const snapshot = await firestore
    .collection('userPushSubscriptions')
    .doc(uid)
    .collection('devices')
    .get();

  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((device) => (
      !device.disabledAt &&
      device.subscription?.endpoint &&
      device.subscription?.keys?.p256dh &&
      device.subscription?.keys?.auth
    ));
};

const loadTripNotificationSource = async (tripRef, trip) => {
  const [
    details,
    days,
    events,
    checklistItems
  ] = await Promise.all([
    readCollectionDocuments(tripRef.collection('details')),
    readCollectionDocuments(tripRef.collection('days')),
    readCollectionDocuments(tripRef.collection('events')),
    readCollectionDocuments(tripRef.collection('checklistItems'))
  ]);

  return {
    trip,
    details,
    days,
    events,
    checklistItems
  };
};

const toCanonicalNotificationUrl = (url) => {
  try {
    const target = new URL(String(url || '/'), CANONICAL_APP_ORIGIN);
    if (target.origin !== CANONICAL_APP_ORIGIN) {
      return `${CANONICAL_APP_ORIGIN}/`;
    }
    return target.toString();
  } catch {
    return `${CANONICAL_APP_ORIGIN}/`;
  }
};

const claimNotificationDelivery = async ({ uid, candidate, now }) => {
  const deliveryId = hashValue(`${uid}:${candidate.dedupeId}`);
  const deliveryRef = firestore.collection('notificationDeliveries').doc(deliveryId);
  const shouldSend = await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(deliveryRef);
    if (snapshot.exists) return false;

    transaction.set(deliveryRef, {
      uid,
      tripId: candidate.tripId,
      category: candidate.category,
      dedupeId: candidate.dedupeId,
      dueAt: candidate.dueAt,
      title: candidate.title,
      status: 'pending',
      createdAt: now,
      updatedAt: now
    });
    return true;
  });

  return shouldSend ? deliveryRef : null;
};

const updateNotificationDelivery = async (deliveryRef, patch) => {
  if (!deliveryRef) return;
  await deliveryRef.set({
    ...patch,
    updatedAt: new Date().toISOString()
  }, { merge: true });
};

const markPushDeviceFailure = async ({ uid, deviceId, error }) => {
  const statusCode = Number(error?.statusCode || error?.status);
  const terminal = statusCode === 404 || statusCode === 410;
  const patch = {
    failureCount: admin.firestore.FieldValue.increment(1),
    lastFailureAt: new Date().toISOString(),
    lastFailureStatus: Number.isFinite(statusCode) ? statusCode : null,
    lastFailureMessage: cleanPushString(error?.message, 240)
  };

  if (terminal) {
    patch.disabledAt = new Date().toISOString();
    patch.disabledReason = `web-push-${statusCode}`;
  }

  await getPushDeviceRef(uid, deviceId).set(patch, { merge: true });
};

const sendNotificationCandidateToDevices = async ({ uid, candidate, devices }) => {
  const payload = buildWebPushPayload({
    ...candidate,
    url: toCanonicalNotificationUrl(candidate.url)
  });
  let sentCount = 0;
  let failedCount = 0;

  for (const device of devices) {
    try {
      await webPush.sendNotification(device.subscription, payload, {
        TTL: 60 * 60 * 24,
        urgency: candidate.category === 'flight' ? 'high' : 'normal'
      });
      sentCount += 1;
      await getPushDeviceRef(uid, device.id).set({
        lastSentAt: new Date().toISOString(),
        failureCount: 0
      }, { merge: true });
    } catch (error) {
      failedCount += 1;
      console.error('Web Push send failed', {
        uid,
        deviceId: device.id,
        statusCode: error?.statusCode || error?.status || '',
        message: error?.message || ''
      });
      await markPushDeviceFailure({ uid, deviceId: device.id, error });
    }
  }

  return { sentCount, failedCount };
};

const asPlainObject = (value) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}
);

const getChangeSnapshotData = (snapshot) => (
  snapshot?.exists ? asPlainObject(snapshot.data()) : {}
);

const getCollaborationWriteAction = ({ beforeData, afterData, beforeExists, afterExists }) => {
  if (!beforeExists && afterExists) return 'created';
  if (beforeExists && !afterExists) return 'deleted';
  if (!beforeData.deleted && afterData.deleted) return 'deleted';
  if (beforeData.deleted && !afterData.deleted) return 'created';
  return 'updated';
};

const getCollaborationActionText = (action) => {
  if (action === 'created') return '新增';
  if (action === 'deleted') return '刪除';
  return '更新';
};

const getCollaborationChecklistMeta = (data = {}) => {
  const listId = cleanPushString(data.listId, 40);
  if (listId === 'packing') {
    const category = cleanPushString(data.category, 40);
    if (category === 'clothing') {
      return {
        label: '行李衣物',
        fallback: '一件行李衣物',
        entityKind: 'packing-clothing',
        listId,
        category
      };
    }

    return {
      label: '行李',
      fallback: '一件行李物品',
      entityKind: 'packing',
      listId,
      category
    };
  }

  return {
    label: '待辦',
    fallback: '一個待辦',
    entityKind: 'pre-trip-todo',
    listId: listId || 'preTrip',
    category: cleanPushString(data.category, 40)
  };
};

const getCollaborationCollectionConfig = ({ collectionId, data = {} }) => {
  const config = COLLABORATION_NOTIFICATION_COLLECTIONS[collectionId] || {};
  if (collectionId === 'checklistItems') {
    return {
      ...config,
      ...getCollaborationChecklistMeta(data)
    };
  }

  return config;
};

const getCollaborationDayLabel = (data = {}) => {
  const dayNumber = Number(data.dayNumber || data.day);
  return Number.isFinite(dayNumber) && dayNumber > 0 ? `第 ${dayNumber} 天` : '';
};

const getCollaborationActorUid = (beforeData, afterData) => cleanPushString(
  afterData.updatedByUid || beforeData.updatedByUid,
  200
);

const getCollaborationMemberName = (member = {}, uid = '') => {
  const email = cleanPushString(member.email, 160);
  return cleanPushString(
    member.displayName || member.name || (email ? email.split('@')[0] : '') || uid || '旅伴',
    80
  );
};

const getCollaborationEntityTitle = ({ collectionId, documentId, data }) => {
  const config = getCollaborationCollectionConfig({ collectionId, data });

  if (collectionId === 'details') {
    const section = cleanPushString(data.section || data.id || documentId, 80);
    return config.sectionLabels?.[section] || config.fallback || section;
  }

  if (collectionId === 'events') {
    const dayLabel = getCollaborationDayLabel(data);
    const time = cleanPushString(data.time || data.startTime, 20);
    const title = cleanPushString(data.title || data.location, 100);
    const eventTitle = [time, title].filter(Boolean).join(' ') || config.fallback;
    const eventSummary = [dayLabel, eventTitle].filter(Boolean).join(' · ');
    if (eventSummary) return eventSummary;
  }

  if (collectionId === 'days') {
    const dayLabel = getCollaborationDayLabel(data);
    const dayTitle = cleanPushString(data.title || data.date, 100);
    const eventTitle = [dayLabel, dayTitle].filter(Boolean).join(' · ');
    if (eventTitle) return eventTitle;
  }

  const fields = Array.isArray(config.titleFields) ? config.titleFields : [];
  for (const field of fields) {
    const value = data[field];
    if (typeof value === 'string' && value.trim()) {
      return cleanPushString(value, 100);
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }

  return config.fallback || cleanPushString(documentId, 100) || '一個項目';
};

const buildCollaborationActivity = ({
  tripId,
  collectionId,
  documentId,
  action,
  data,
  actorUid,
  actorName
}) => {
  const config = getCollaborationCollectionConfig({ collectionId, data });
  const label = config.label || '旅程內容';
  const actionText = getCollaborationActionText(action);
  const entityTitle = getCollaborationEntityTitle({ collectionId, documentId, data });
  const body = cleanPushString(entityTitle, 180);

  return {
    type: 'collaboration-update',
    tripId,
    actorUid,
    actorName,
    action,
    actionText,
    collectionId,
    documentId,
    label,
    entityKind: config.entityKind || collectionId,
    listId: config.listId || '',
    category: config.category || '',
    entityTitle: body,
    title: cleanPushString(`${actorName} ${actionText}了${label}`, 100),
    body,
    url: `/trip/${tripId}`
  };
};

const publishTripCollaborationActivity = async (event, collectionId) => {
  const tripId = cleanPushString(event.params?.tripId, 200);
  const documentId = cleanPushString(event.params?.documentId, 200);
  if (!tripId || !documentId || !COLLABORATION_NOTIFICATION_COLLECTIONS[collectionId]) return;

  const beforeExists = Boolean(event.data?.before?.exists);
  const afterExists = Boolean(event.data?.after?.exists);
  if (!beforeExists && !afterExists) return;

  const beforeData = getChangeSnapshotData(event.data?.before);
  const afterData = getChangeSnapshotData(event.data?.after);
  const action = getCollaborationWriteAction({ beforeData, afterData, beforeExists, afterExists });
  const data = action === 'deleted' ? beforeData : afterData;
  const actorUid = getCollaborationActorUid(beforeData, afterData);
  if (!actorUid) return;

  const tripRef = firestore.collection('trips').doc(tripId);
  const [tripSnap, membersSnapshot] = await Promise.all([
    tripRef.get(),
    tripRef.collection('members').get()
  ]);
  if (!tripSnap.exists) return;

  const trip = tripSnap.data() || {};
  const membersByUid = new Map();
  membersSnapshot.docs.forEach((doc) => {
    const member = doc.data() || {};
    membersByUid.set(doc.id, { uid: doc.id, ...member });
  });

  const ownerUid = cleanPushString(trip.access?.ownerUid, 200);
  if (ownerUid && !membersByUid.has(ownerUid)) {
    membersByUid.set(ownerUid, {
      uid: ownerUid,
      displayName: trip.access?.ownerName || '',
      email: trip.access?.ownerEmail || ''
    });
  }

  const actorName = getCollaborationMemberName(membersByUid.get(actorUid), actorUid);
  const activity = buildCollaborationActivity({
    tripId,
    collectionId,
    documentId,
    action,
    data,
    actorUid,
    actorName
  });

  await appendRealtimeActivity({ tripId, activity });
};

const onTripCollaborationDocumentWritten = (document, collectionId) => onDocumentWritten(
  document,
  async (event) => publishTripCollaborationActivity(event, collectionId)
);

const fetchGooglePlaceCandidatesForRecommendation = async ({ apiKey, snapshot }) => {
  const queries = buildGooglePlaceSearchQueries(snapshot);
  const byPlaceId = new Map();

  for (const query of queries) {
    if (byPlaceId.size >= 8) break;

    const autocompleteParams = new URLSearchParams({
      input: query,
      key: apiKey,
      language: 'zh-TW'
    });
    const autocompletePayload = await fetchGoogleJson(GOOGLE_PLACES_AUTOCOMPLETE_ENDPOINT, autocompleteParams);
    const predictions = Array.isArray(autocompletePayload?.predictions)
      ? autocompletePayload.predictions.map(normalizeGooglePrediction).filter((item) => item.placeId).slice(0, 2)
      : [];

    for (const prediction of predictions) {
      if (byPlaceId.size >= 8) break;
      if (byPlaceId.has(prediction.placeId)) continue;

      const detailsParams = new URLSearchParams({
        place_id: prediction.placeId,
        fields: 'place_id,name,formatted_address,geometry,types',
        key: apiKey,
        language: 'zh-TW'
      });
      const detailsPayload = await fetchGoogleJson(GOOGLE_PLACE_DETAILS_ENDPOINT, detailsParams);
      const candidate = normalizeExternalGoogleCandidate({
        query,
        ...normalizeGoogleDetails(detailsPayload?.result || {}, prediction.description || query)
      }, byPlaceId.size);

      if (candidate?.placeId) {
        byPlaceId.set(candidate.placeId, candidate);
      }
    }
  }

  return Array.from(byPlaceId.values());
};

const buildExternalPlaceCandidateContext = async ({ uid, mode, snapshot }) => {
  if (mode !== 'placeIdeas') {
    return { status: 'not_applicable', candidates: [] };
  }

  try {
    await assertGoogleLookupRateLimit(uid);
    const apiKey = getGoogleApiKey();
    if (!apiKey) {
      return { status: GOOGLE_PLACE_STATUS.missingApiKey, candidates: [] };
    }

    const candidates = await fetchGooglePlaceCandidatesForRecommendation({ apiKey, snapshot });
    return {
      status: candidates.length ? 'success' : 'empty',
      candidates
    };
  } catch (error) {
    console.warn('AI place recommendation Google fallback', {
      code: error?.code || '',
      message: error?.message || ''
    });
    return {
      status: error?.details?.googlePlacesStatus || error?.code || 'fallback',
      candidates: []
    };
  }
};

const extractOpenAIResponseText = (payload) => {
  if (typeof payload?.output_text === 'string') {
    return payload.output_text;
  }

  const output = Array.isArray(payload?.output) ? payload.output : [];
  const parts = [];

  output.forEach((item) => {
    if (typeof item?.content === 'string') {
      parts.push(item.content);
      return;
    }

    if (!Array.isArray(item?.content)) return;
    item.content.forEach((contentPart) => {
      if (typeof contentPart?.text === 'string') {
        parts.push(contentPart.text);
      }
    });
  });

  return parts.join('\n').trim();
};

const openAIProviderErrorCode = (status) => {
  if (status === 401 || status === 403) return 'failed-precondition';
  if (status === 429) return 'resource-exhausted';
  if (status >= 400 && status < 500) return 'invalid-argument';
  return 'unavailable';
};

const callOpenAITripRecommendations = async ({ apiKey, mode, snapshot }) => {
  const model = String(process.env.OPENAI_MODEL || 'gpt-5.5').trim() || 'gpt-5.5';
  let response = null;
  let payload = null;

  try {
    response = await fetch(OPENAI_RESPONSES_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        instructions: 'You are a practical Traditional Chinese travel-planning assistant inside a collaborative trip planner app.',
        input: recommendationPrompt({ mode, snapshot }),
        reasoning: { effort: 'low' },
        max_output_tokens: 2200,
        text: {
          verbosity: 'low',
          format: {
            type: 'json_schema',
            name: 'trip_recommendations',
            strict: true,
            schema: recommendationResponseSchema
          }
        }
      })
    });
    payload = await response.json().catch(() => ({}));
  } catch (error) {
    console.error('OpenAI recommendation request failed', {
      code: error?.code || '',
      message: error?.message || ''
    });
    throw new HttpsError('unavailable', '智慧推薦暫時無法連線，請稍後再試。');
  }

  if (!response.ok) {
    console.error('OpenAI recommendation HTTP error', {
      status: response.status,
      message: payload?.error?.message || ''
    });
    throw new HttpsError(
      openAIProviderErrorCode(response.status),
      response.status === 429
        ? '智慧推薦額度暫時受限，請稍後再試。'
        : '智慧推薦服務暫時無法完成請求。'
    );
  }

  const text = extractOpenAIResponseText(payload);
  if (!text) {
    throw new HttpsError('data-loss', '智慧推薦回傳格式不完整，請稍後再試。');
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('OpenAI recommendation JSON parse failed', {
      message: error?.message || '',
      responseId: payload?.id || ''
    });
    throw new HttpsError('data-loss', '智慧推薦回傳格式不正確，請稍後再試。');
  }
};

const callOpenAITripHandbook = async ({ apiKey, snapshot }) => {
  const model = String(process.env.OPENAI_MODEL || 'gpt-5.5').trim() || 'gpt-5.5';
  let response = null;
  let payload = null;

  try {
    response = await fetch(OPENAI_RESPONSES_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        instructions: 'You are a practical Traditional Chinese travel handbook editor inside a collaborative trip planner app.',
        input: handbookPrompt({ snapshot }),
        reasoning: { effort: 'low' },
        max_output_tokens: 4200,
        text: {
          verbosity: 'low',
          format: {
            type: 'json_schema',
            name: 'trip_handbook',
            strict: true,
            schema: handbookResponseSchema
          }
        }
      })
    });
    payload = await response.json().catch(() => ({}));
  } catch (error) {
    console.error('OpenAI handbook request failed', {
      code: error?.code || '',
      message: error?.message || ''
    });
    throw new HttpsError('unavailable', '旅遊手冊暫時無法連線，請稍後再試。');
  }

  if (!response.ok) {
    console.error('OpenAI handbook HTTP error', {
      status: response.status,
      message: payload?.error?.message || ''
    });
    throw new HttpsError(
      openAIProviderErrorCode(response.status),
      response.status === 429
        ? '旅遊手冊額度暫時受限，請稍後再試。'
        : '旅遊手冊服務暫時無法完成請求。'
    );
  }

  const text = extractOpenAIResponseText(payload);
  if (!text) {
    throw new HttpsError('data-loss', '旅遊手冊回傳格式不完整，請稍後再試。');
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('OpenAI handbook JSON parse failed', {
      message: error?.message || '',
      responseId: payload?.id || ''
    });
    throw new HttpsError('data-loss', '旅遊手冊回傳格式不正確，請稍後再試。');
  }
};

const extractOpenAIImageBase64 = (payload) => {
  const first = Array.isArray(payload?.data) ? payload.data[0] : null;
  if (typeof first?.b64_json === 'string') return first.b64_json;
  if (typeof first?.result === 'string') return first.result;
  if (typeof payload?.result === 'string') return payload.result;
  return '';
};

const callOpenAITripHandbookImage = async ({ apiKey, snapshot, handbook }) => {
  const model = String(process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2').trim() || 'gpt-image-2';
  const prompt = buildTripHandbookImagePrompt({ snapshot, handbook });
  let response = null;
  let payload = null;

  try {
    response = await fetch(OPENAI_IMAGES_ENDPOINT, {
      method: 'POST',
      signal: getTimeoutSignal(TRIP_HANDBOOK_IMAGE_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        prompt,
        size: '1024x1024',
        quality: 'low',
        output_format: 'jpeg',
        output_compression: 68,
        n: 1
      })
    });
    payload = await response.json().catch(() => ({}));
  } catch (error) {
    console.warn('OpenAI handbook image request failed', {
      code: error?.code || '',
      message: error?.message || ''
    });
    return null;
  }

  if (!response.ok) {
    console.warn('OpenAI handbook image HTTP error', {
      status: response.status,
      code: payload?.error?.code || '',
      message: payload?.error?.message || ''
    });
    return null;
  }

  const base64 = extractOpenAIImageBase64(payload);
  if (!base64) {
    console.warn('OpenAI handbook image response missing image data', {
      responseId: payload?.id || ''
    });
    return null;
  }

  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length) return null;

  return {
    buffer,
    contentType: 'image/jpeg',
    dataUrl: imageDataUrlFromBuffer(buffer, 'image/jpeg'),
    model
  };
};

const storeTripHandbookCoverImage = async ({ tripId, image }) => {
  if (!image?.buffer?.length) return null;

  try {
    const bucket = admin.storage().bucket();
    const filePath = getTripHandbookImagePath(tripId);
    const downloadToken = crypto.randomUUID();

    await bucket.file(filePath).save(image.buffer, {
      resumable: false,
      metadata: {
        contentType: image.contentType,
        cacheControl: 'public, max-age=31536000',
        metadata: {
          firebaseStorageDownloadTokens: downloadToken
        }
      }
    });

    return {
      coverImageStatus: 'generated',
      coverImageUrl: makeFirebaseStorageDownloadUrl({
        bucketName: bucket.name,
        filePath,
        token: downloadToken
      }),
      coverImagePath: filePath,
      coverImageContentType: image.contentType,
      coverImageAlt: '自動生成的旅遊手冊封面插圖',
      coverImageModel: image.model,
      coverImageDataUrl: image.dataUrl,
      coverImageGeneratedAt: new Date().toISOString()
    };
  } catch (error) {
    console.warn('Trip handbook image storage failed', {
      code: error?.code || '',
      message: error?.message || ''
    });
    return {
      coverImageStatus: 'generated-unsaved',
      coverImageUrl: '',
      coverImagePath: '',
      coverImageContentType: image.contentType,
      coverImageAlt: '自動生成的旅遊手冊封面插圖',
      coverImageModel: image.model,
      coverImageDataUrl: image.dataUrl,
      coverImageGeneratedAt: new Date().toISOString()
    };
  }
};

const generateTripHandbookVisuals = async ({ apiKey, tripId, snapshot, handbook }) => {
  const image = await callOpenAITripHandbookImage({
    apiKey,
    snapshot,
    handbook
  });

  if (!image) {
    return {
      coverImageStatus: 'fallback',
      coverImageUrl: '',
      coverImagePath: '',
      coverImageContentType: '',
      coverImageAlt: '旅遊手冊封面插圖',
      coverImageModel: '',
      coverImageDataUrl: '',
      coverImageGeneratedAt: ''
    };
  }

  return storeTripHandbookCoverImage({ tripId, image });
};

const readStoredTripHandbookCoverDataUrl = async ({ tripId, visuals = {} }) => {
  const filePath = normalizeGoogleLookupText(visuals.coverImagePath, 260);
  const expectedPrefix = `${TRIP_HANDBOOK_IMAGE_STORAGE_PREFIX}/${makeStorageSafeSegment(tripId)}/`;
  if (!filePath || !filePath.startsWith(expectedPrefix)) return '';

  try {
    const bucket = admin.storage().bucket();
    const [buffer] = await bucket.file(filePath).download();
    const contentType = normalizeGoogleLookupText(visuals.coverImageContentType, 60) || 'image/jpeg';
    return imageDataUrlFromBuffer(buffer, contentType);
  } catch (error) {
    console.warn('Trip handbook image download failed', {
      code: error?.code || '',
      message: error?.message || ''
    });
    return '';
  }
};

exports.getWebPushConfig = onCall(
  { secrets: [WEB_PUSH_VAPID_PUBLIC_KEY] },
  async (request) => {
    requireSignedIn(request);
    return {
      publicKey: getConfiguredWebPushPublicKey()
    };
  }
);

exports.registerPushDevice = onCall(async (request) => {
  const uid = requireSignedIn(request);
  const subscription = normalizePushSubscription(request.data?.subscription);
  const endpointHash = hashValue(subscription.endpoint);
  const deviceId = makePushDeviceId(subscription.endpoint);
  const deviceRef = getPushDeviceRef(uid, deviceId);
  const now = new Date().toISOString();
  const snapshot = await deviceRef.get();

  await deviceRef.set({
    uid,
    deviceId,
    endpointHash,
    subscription,
    platform: cleanPushString(request.data?.platform, 80),
    displayMode: cleanPushString(request.data?.displayMode, 40),
    timezone: normalizeTimeZone(request.data?.timezone || DEFAULT_TIME_ZONE),
    userAgent: cleanPushString(request.data?.userAgent, 500),
    disabledAt: null,
    disabledReason: '',
    lastSeenAt: now,
    updatedAt: now,
    ...(snapshot.exists ? {} : { createdAt: now })
  }, { merge: true });

  return {
    deviceId,
    endpointHash
  };
});

exports.unregisterPushDevice = onCall(async (request) => {
  const uid = requireSignedIn(request);
  const deviceId = cleanPushString(request.data?.deviceId, 80);
  if (!deviceId || deviceId.includes('/')) {
    throw new HttpsError('invalid-argument', 'deviceId is required.');
  }

  await getPushDeviceRef(uid, deviceId).set({
    disabledAt: new Date().toISOString(),
    disabledReason: 'user-disabled',
    updatedAt: new Date().toISOString()
  }, { merge: true });

  return { deviceId, disabled: true };
});

exports.setTripNotificationPreference = onCall(async (request) => {
  const uid = requireSignedIn(request);
  const tripId = cleanPushString(request.data?.tripId, 200);
  if (!tripId || tripId.includes('/')) {
    throw new HttpsError('invalid-argument', 'tripId is required.');
  }

  await getTripRoleForUid({ tripId, uid });

  const enabled = request.data?.enabled !== false;
  const categories = normalizeCategories(request.data?.categories);
  const leadTimes = normalizeLeadTimePreferences(request.data?.leadTimes);
  const timezone = normalizeTimeZone(request.data?.timezone || DEFAULT_TIME_ZONE);
  const now = new Date().toISOString();

  await getTripNotificationPreferenceRef(uid, tripId).set({
    uid,
    tripId,
    enabled,
    categories,
    leadTimes,
    timezone,
    updatedAt: now,
    ...(enabled ? { disabledAt: null } : { disabledAt: now })
  }, { merge: true });

  return {
    tripId,
    enabled,
    categories,
    leadTimes,
    timezone
  };
});

exports.sendDueTripNotifications = onSchedule(
  {
    schedule: 'every 15 minutes',
    timeZone: 'UTC',
    secrets: WEB_PUSH_SECRET_DEFINITIONS
  },
  async () => {
    try {
      configureWebPush();
    } catch (error) {
      console.warn('Web Push is not configured; skipping scheduled notifications.', error?.message || error);
      return;
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const preferencesSnapshot = await firestore
      .collectionGroup('tripPrefs')
      .where('enabled', '==', true)
      .get();

    for (const preferenceDoc of preferencesSnapshot.docs) {
      const uid = preferenceDoc.ref.parent.parent?.id || '';
      const tripId = preferenceDoc.id;
      if (!uid || !tripId) continue;

      const preference = preferenceDoc.data() || {};
      const tripRef = firestore.collection('trips').doc(tripId);
      const tripSnap = await tripRef.get();
      if (!tripSnap.exists) continue;

      try {
        await getTripRoleForUid({ tripId, uid });
      } catch (error) {
        await preferenceDoc.ref.set({
          enabled: false,
          disabledAt: nowIso,
          disabledReason: 'trip-access-removed',
          updatedAt: nowIso
        }, { merge: true });
        continue;
      }

      const devices = await getActivePushDevices(uid);
      const source = await loadTripNotificationSource(tripRef, {
        id: tripSnap.id,
        ...tripSnap.data()
      });
      const candidates = buildTripNotificationCandidates({
        tripId,
        ...source,
        preference,
        now,
        timeZone: preference.timezone || DEFAULT_TIME_ZONE,
        lookBehindMinutes: WEB_PUSH_DELIVERY_LOOK_BEHIND_MINUTES,
        lookAheadMinutes: 0
      });

      for (const candidate of candidates) {
        const deliveryRef = await claimNotificationDelivery({ uid, candidate, now: nowIso });
        if (!deliveryRef) continue;

        if (!devices.length) {
          await updateNotificationDelivery(deliveryRef, {
            status: 'no-active-devices',
            sentCount: 0,
            failedCount: 0
          });
          continue;
        }

        const result = await sendNotificationCandidateToDevices({ uid, candidate, devices });
        await updateNotificationDelivery(deliveryRef, {
          status: result.sentCount > 0 ? 'sent' : 'failed',
          sentCount: result.sentCount,
          failedCount: result.failedCount
        });
      }
    }
  }
);

exports.searchGooglePlaces = onCall(
  { secrets: [GOOGLE_GEOCODING_API_KEY] },
  async (request) => {
    const uid = requireSignedIn(request);
    await assertGoogleLookupRateLimit(uid);

    const apiKey = getConfiguredGoogleApiKey();
    const input = normalizeGoogleLookupText(request.data?.input, 180);
    if (input.length < 2) {
      return {
        provider: 'google_places',
        status: GOOGLE_PLACE_STATUS.idle,
        predictions: []
      };
    }

    const params = new URLSearchParams({
      input,
      key: apiKey,
      language: 'zh-TW'
    });

    const placeTypes = normalizeGooglePlaceTypes(request.data?.placeTypes);
    if (placeTypes.length) {
      params.set('types', placeTypes[0]);
    }

    const payload = await fetchGoogleJson(GOOGLE_PLACES_AUTOCOMPLETE_ENDPOINT, params);
    const predictions = Array.isArray(payload?.predictions)
      ? payload.predictions.map(normalizeGooglePrediction).filter((item) => item.placeId || item.description)
      : [];

    return {
      provider: 'google_places',
      status: predictions.length ? GOOGLE_PLACE_STATUS.success : GOOGLE_PLACE_STATUS.empty,
      predictions
    };
  }
);

exports.getGooglePlaceDetails = onCall(
  { secrets: [GOOGLE_GEOCODING_API_KEY] },
  async (request) => {
    const uid = requireSignedIn(request);
    await assertGoogleLookupRateLimit(uid);

    const apiKey = getConfiguredGoogleApiKey();
    const placeId = normalizeGoogleLookupText(request.data?.placeId, 180);
    const fallbackText = normalizeGoogleLookupText(request.data?.fallbackText, 240);
    if (!placeId) {
      throw new HttpsError('invalid-argument', 'Google place id is required.');
    }

    const params = new URLSearchParams({
      place_id: placeId,
      fields: 'place_id,name,formatted_address,geometry,types',
      key: apiKey,
      language: 'zh-TW'
    });

    const payload = await fetchGoogleJson(GOOGLE_PLACE_DETAILS_ENDPOINT, params);
    return {
      provider: 'google_places',
      place: normalizeGoogleDetails(payload?.result || {}, fallbackText)
    };
  }
);

exports.geocodeGooglePlace = onCall(
  { secrets: [GOOGLE_GEOCODING_API_KEY] },
  async (request) => {
    const uid = requireSignedIn(request);
    await assertGoogleLookupRateLimit(uid);

    const apiKey = getConfiguredGoogleApiKey();
    const query = normalizeGoogleLookupText(request.data?.query, 240);
    if (!query) {
      throw new HttpsError('invalid-argument', 'Google geocoding query is required.');
    }

    const params = new URLSearchParams({
      address: query,
      key: apiKey,
      language: 'zh-TW'
    });

    const payload = await fetchGoogleJson(GOOGLE_GEOCODING_ENDPOINT, params);
    const firstResult = Array.isArray(payload?.results) ? payload.results[0] : null;
    if (!firstResult) {
      return {
        success: false,
        reason: payload?.status || 'not_found',
        query
      };
    }

    const place = normalizeGoogleDetails(firstResult, query);
    return {
      success: true,
      query,
      placeId: place.placeId,
      formattedAddress: place.address || query,
      lat: place.lat,
      lng: place.lng
    };
  }
);

exports.generateTripRecommendations = onCall(
  { secrets: [OPENAI_API_KEY, GOOGLE_GEOCODING_API_KEY] },
  async (request) => {
    const uid = requireSignedIn(request);
    const tripId = normalizeGoogleLookupText(request.data?.tripId, 180);
    const mode = normalizeMode(request.data?.mode);

    if (!tripId) {
      throw new HttpsError('invalid-argument', '請提供旅程資訊。');
    }

    if (!mode) {
      throw new HttpsError('invalid-argument', '智慧推薦模式不正確。');
    }

    const { tripRef, trip, role } = await getTripRoleForUid({ tripId, uid });
    if (role !== 'owner' && role !== 'editor') {
      throw new HttpsError('permission-denied', '只有可編輯旅程的成員可以產生智慧推薦。');
    }

    await assertAiRecommendationRateLimit(uid);

    const apiKey = getConfiguredOpenAIKey();
    const source = await loadTripRecommendationSource(tripRef, trip);
    const baseSnapshot = buildTripRecommendationSnapshot(source, {
      mode,
      selectedDay: request.data?.selectedDay,
      userIdea: request.data?.userIdea
    });
    const externalContext = await buildExternalPlaceCandidateContext({
      uid,
      mode,
      snapshot: baseSnapshot
    });
    const snapshot = buildTripRecommendationSnapshot(source, {
      mode,
      selectedDay: request.data?.selectedDay,
      userIdea: request.data?.userIdea,
      externalLookupStatus: externalContext.status,
      externalCandidates: externalContext.candidates
    });

    const aiPayload = await callOpenAITripRecommendations({
      apiKey,
      mode,
      snapshot
    });
    const normalized = normalizeRecommendationResponse(aiPayload, {
      mode,
      selectedDay: snapshot.selectedDay,
      validDayNumbers: snapshot.validDayNumbers
    });

    return {
      generatedAt: new Date().toISOString(),
      ...normalized
    };
  }
);

exports.generateTripHandbook = onCall(
  { secrets: [OPENAI_API_KEY], timeoutSeconds: 180, memory: '512MiB' },
  async (request) => {
    const uid = requireSignedIn(request);
    const tripId = normalizeGoogleLookupText(request.data?.tripId, 180);

    if (!tripId) {
      throw new HttpsError('invalid-argument', '請提供旅程資訊。');
    }

    const { tripRef, trip, role } = await getTripRoleForUid({ tripId, uid });
    if (role !== 'owner' && role !== 'editor') {
      throw new HttpsError('permission-denied', '只有可編輯旅程的成員可以產生旅遊手冊。');
    }

    await assertAiHandbookRateLimit(uid);

    const apiKey = getConfiguredOpenAIKey();
    const source = await loadTripHandbookSource(tripRef, trip);
    const snapshot = buildTripHandbookSnapshot(source);
    const aiPayload = await callOpenAITripHandbook({
      apiKey,
      snapshot
    });
    const normalized = normalizeHandbookResponse(aiPayload, snapshot);
    const visuals = await generateTripHandbookVisuals({
      apiKey,
      tripId,
      snapshot,
      handbook: normalized
    });
    const generatedAt = new Date().toISOString();
    const result = {
      generatedAt,
      ...normalized,
      visuals
    };
    const storedResult = {
      ...result,
      visuals: stripHandbookVisualData(visuals)
    };

    await getTripHandbookDocRef(tripRef).set({
      schemaVersion: 1,
      generatedAt,
      handbook: storedResult,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return result;
  }
);

exports.getTripHandbook = onCall(
  async (request) => {
    const uid = requireSignedIn(request);
    const tripId = normalizeGoogleLookupText(request.data?.tripId, 180);

    if (!tripId) {
      throw new HttpsError('invalid-argument', '請提供旅程資訊。');
    }

    const { tripRef } = await getTripRoleForUid({ tripId, uid });
    const handbookSnap = await getTripHandbookDocRef(tripRef).get();
    if (!handbookSnap.exists) {
      return { exists: false };
    }

    const data = handbookSnap.data() || {};
    const handbook = data.handbook || {};
    const normalized = normalizeHandbookResponse(handbook, {});
    const coverImageDataUrl = await readStoredTripHandbookCoverDataUrl({
      tripId,
      visuals: normalized.visuals
    });

    return {
      exists: true,
      generatedAt: String(handbook.generatedAt || data.generatedAt || ''),
      ...normalized,
      visuals: {
        ...normalized.visuals,
        coverImageDataUrl
      }
    };
  }
);

exports.lookupFlight = onCall(
  { secrets: [FLIGHTAPI_IO_KEY] },
  async (request) => {
    const uid = requireSignedIn(request);

    const apiKey = FLIGHTAPI_IO_KEY.value();
    if (!apiKey) {
      throw new HttpsError('failed-precondition', '航班查詢服務尚未設定完成。');
    }

    const parsedCode = parseFlightCode(request.data?.code);
    if (!parsedCode) {
      throw new HttpsError('invalid-argument', '航班代號格式不正確，請輸入例如 BR198、JX802 或 7C1101。');
    }

    const date = normalizeLookupDate(request.data?.date);
    if (!date) {
      throw new HttpsError('invalid-argument', '航班查詢日期格式不正確，請使用旅程日期或手動填寫。');
    }

    const departureAirport = normalizeAirportCode(request.data?.depap);
    if (request.data?.depap && !isAirportCode(departureAirport)) {
      throw new HttpsError('invalid-argument', '出發機場請輸入 3 碼 IATA 代碼，例如 TPE。');
    }

    const arrivalAirport = normalizeAirportCode(request.data?.arrap);
    if (request.data?.arrap && !isAirportCode(arrivalAirport)) {
      throw new HttpsError('invalid-argument', '抵達機場請輸入 3 碼 IATA 代碼，例如 NRT。');
    }

    await assertFlightLookupRateLimit(uid);

    const query = new URLSearchParams({
      num: parsedCode.num,
      name: parsedCode.name,
      date
    });
    if (departureAirport) query.set('depap', departureAirport);

    let payload = null;
    let response = null;
    try {
      response = await fetch(`${FLIGHTAPI_BASE_URL}/${encodeURIComponent(apiKey)}?${query.toString()}`);
      const contentType = response.headers.get('content-type') || '';
      payload = contentType.includes('application/json')
        ? await response.json()
        : await response.text();
    } catch {
      throw new HttpsError('unavailable', '航班查詢暫時無法連線，請稍後再試或手動填寫。');
    }

    if (!response.ok) {
      throw new HttpsError(
        response.status === 429 ? 'resource-exhausted' : 'unavailable',
        flightProviderMessage(response.status)
      );
    }

    const results = Array.isArray(payload) ? payload : payload?.data || payload?.results || [];
    if (!Array.isArray(results) || results.length === 0) {
      throw new HttpsError('not-found', '查無此日期的航班資料，已保留目前手動輸入內容。');
    }

    const flight = buildFlightRecord(results, parsedCode.code, parsedCode.name, date);
    if (!flight) {
      throw new HttpsError('data-loss', '航班資料不完整，請手動確認。');
    }

    if (arrivalAirport && normalizeAirportCode(flight.arr) !== arrivalAirport) {
      const actualRoute = `${flight.dep || '未取得'} -> ${flight.arr || '未取得'}`;
      throw new HttpsError(
        'failed-precondition',
        `查到的航段為 ${actualRoute}，與選擇的抵達機場 ${arrivalAirport} 不符。`,
        { flight }
      );
    }

    return {
      provider: 'flightapi.io',
      flight
    };
  }
);

exports.requestEmailLoginCode = onCall(
  { secrets: [GMAIL_SMTP_USER, GMAIL_SMTP_APP_PASSWORD, EMAIL_CODE_PEPPER] },
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
      const waitMs = EMAIL_CODE_SEND_COOLDOWN_MS - (now - lastSentAtMs);

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
      resendAvailableAt: new Date(now + EMAIL_CODE_SEND_COOLDOWN_MS).toISOString()
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

      const verificationStartedAtMs = Number(data.verificationStartedAtMs || 0);
      const verificationLocked = data.verificationInProgress
        && verificationStartedAtMs
        && now - verificationStartedAtMs < EMAIL_CODE_VERIFICATION_LOCK_MS;
      if (verificationLocked) {
        verificationError = new HttpsError('failed-precondition', '這組驗證碼正在驗證中，請稍候再試。');
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
        verificationInProgress: true,
        verificationStartedAt: admin.firestore.FieldValue.serverTimestamp(),
        verificationStartedAtMs: now,
        lastAttemptAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });

    if (verificationError) {
      throw verificationError;
    }

    let userRecord;
    let customToken;
    try {
      userRecord = await getOrCreateEmailUser(email);
      customToken = await admin.auth().createCustomToken(userRecord.uid);
      await challengeRef.set({
        consumed: true,
        consumedAt: admin.firestore.FieldValue.serverTimestamp(),
        verificationInProgress: false,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Email login verification failed after code acceptance', {
        code: error?.code || '',
        message: error?.message || ''
      });
      await challengeRef.set({
        verificationInProgress: false,
        verificationFailedAt: admin.firestore.FieldValue.serverTimestamp(),
        verificationFailedMessage: error?.message || 'verification failed'
      }, { merge: true }).catch(() => {});

      const isTokenPermissionError = error?.code === 'auth/insufficient-permission'
        || /signBlob/i.test(String(error?.message || ''));
      throw new HttpsError(
        isTokenPermissionError ? 'failed-precondition' : 'internal',
        isTokenPermissionError
          ? '登入服務權限尚未完成設定，請稍後再試。'
          : '登入驗證暫時失敗，請稍後再試。'
      );
    }

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

exports.ensureTripPresenceAccess = onCall(async (request) => {
  const uid = requireSignedIn(request);
  const tripId = String(request.data?.tripId || '').trim();

  if (!tripId) {
    throw new HttpsError('invalid-argument', 'Trip id is required.');
  }

  const { role } = await getTripRoleForUid({ tripId, uid });
  await writeRealtimeAccess({
    tripId,
    uid,
    role,
    source: 'ensure-presence-access'
  });

  return {
    ready: true,
    role
  };
});

exports.ensureTripRealtimeAccess = onCall(async (request) => {
  const uid = requireSignedIn(request);
  const tripId = String(request.data?.tripId || '').trim();

  if (!tripId) {
    throw new HttpsError('invalid-argument', 'Trip id is required.');
  }

  const { role } = await getTripRoleForUid({ tripId, uid });
  await writeTripRealtimeAcl({
    tripId,
    uid,
    role,
    source: 'ensure-trip-realtime-access'
  });

  return {
    ready: true,
    role
  };
});

exports.togglePlaceVote = onCall(async (request) => {
  const uid = requireSignedIn(request);
  const tripId = String(request.data?.tripId || '').trim();
  const placeId = String(request.data?.placeId || '').trim();
  const clientId = normalizeClientId(request.data?.clientId, 'server:togglePlaceVote');
  const hasExplicitVoteValue = Object.prototype.hasOwnProperty.call(request.data || {}, 'value');
  const requestedVoteValue = normalizeVoteValue(request.data?.value, 1);

  if (!tripId || !placeId) {
    throw new HttpsError('invalid-argument', '請提供旅程與地點。');
  }

  const tripRef = firestore.collection('trips').doc(tripId);
  const memberRef = tripRef.collection('members').doc(uid);
  const placeIdeaRef = tripRef.collection('placeIdeas').doc(placeId);
  let result = null;

  await firestore.runTransaction(async (transaction) => {
    const [tripSnap, memberSnap, placeIdeaSnap] = await Promise.all([
      transaction.get(tripRef),
      transaction.get(memberRef),
      transaction.get(placeIdeaRef)
    ]);

    if (!tripSnap.exists) {
      throw new HttpsError('not-found', '找不到這趟旅程。');
    }

    const trip = tripSnap.data() || {};
    const isOwner = trip.access?.ownerUid === uid;
    if (!isOwner && !memberSnap.exists) {
      throw new HttpsError('permission-denied', '你還沒有加入這趟旅程。');
    }

    const collaboration = trip.planning?.collaboration || trip.collaboration || {};
    if (collaboration.votesEnabled === false) {
      throw new HttpsError('failed-precondition', '這趟旅程目前沒有開放想去回應。');
    }

    const placePool = Array.isArray(trip.planning?.placePool)
      ? trip.planning.placePool
      : (Array.isArray(trip.placePool) ? trip.placePool : []);
    const placeIndex = placePool.findIndex((place) => String(place?.id || '') === placeId);
    const placeIdea = placeIdeaSnap.exists ? (placeIdeaSnap.data() || {}) : null;

    if ((!placeIdea || placeIdea.deleted === true) && placeIndex < 0) {
      throw new HttpsError('not-found', '找不到這個地點。');
    }

    const now = new Date().toISOString();
    const place = placeIdea || placePool[placeIndex] || {};
    const votes = Array.isArray(place.votes) ? place.votes : [];
    const existingVote = votes.find((vote) => vote?.voterId === uid);
    const existingVoteValue = existingVote ? normalizeVoteValue(existingVote.value, 1) : null;
    const votesWithoutCurrentUser = votes.filter((vote) => vote?.voterId !== uid);
    const nextVoteValue = hasExplicitVoteValue
      ? (existingVote && existingVoteValue === requestedVoteValue ? null : requestedVoteValue)
      : (existingVote && existingVoteValue > 0 ? null : 1);
    const nextVotes = nextVoteValue === null
      ? votesWithoutCurrentUser
      : [
          ...votesWithoutCurrentUser,
          {
            voterId: uid,
            name: getMemberDisplayName({
              request,
              member: memberSnap.exists ? memberSnap.data() : {}
            }),
            value: nextVoteValue,
            votedAt: now
          }
        ];
    const voted = nextVoteValue !== null && nextVoteValue > 0;
    const hasVote = nextVoteValue !== null;
    const positiveVoteCount = nextVotes.filter((vote) => Number(vote?.value || 0) > 0).length;
    const maybeVoteCount = nextVotes.filter((vote) => Number(vote?.value || 0) === 0).length;
    const negativeVoteCount = nextVotes.filter((vote) => Number(vote?.value || 0) < 0).length;
    const voteScore = nextVotes.reduce((total, vote) => total + normalizeVoteValue(vote?.value, 0), 0);
    const nextPlace = {
      ...place,
      id: placeId,
      votes: nextVotes
    };
    const nextPlaceDocument = {
      id: placeId,
      schemaVersion: Number(place.schemaVersion || 1),
      orderKey: Number(place.orderKey || ((placeIndex >= 0 ? placeIndex : 0) + 1) * 1000),
      name: String(place.name || place.address || ''),
      address: String(place.address || place.name || ''),
      placeId: String(place.placeId || ''),
      lat: typeof place.lat === 'number' ? place.lat : null,
      lng: typeof place.lng === 'number' ? place.lng : null,
      note: String(place.note || ''),
      status: String(place.status || 'idea'),
      plannedDay: typeof place.plannedDay === 'number' ? place.plannedDay : null,
      addedAt: String(place.addedAt || now),
      plannedAt: String(place.plannedAt || ''),
      votes: nextVotes,
      deleted: false,
      updatedAt: now,
      updatedByUid: uid,
      updatedByClientId: clientId
    };
    const nextPlacePool = placeIndex >= 0
      ? placePool.map((item, index) => (
        index === placeIndex
          ? {
              ...item,
              votes: nextVotes
            }
          : item
      ))
      : placePool;
    const revision = Number(trip.syncMeta?.revision || 0) + 1;

    const tripUpdate = {
      'meta.updatedAt': now,
      updatedAt: now,
      'syncMeta.revision': revision,
      'syncMeta.updatedByUid': uid,
      'syncMeta.updatedByClientId': clientId,
      'syncMeta.updatedByOperation': 'place-vote',
      'syncMeta.updatedEntityId': placeId,
      'syncMeta.updatedAt': now
    };

    if (placeIndex >= 0) {
      tripUpdate['planning.placePool'] = nextPlacePool;
      tripUpdate.placePool = nextPlacePool;
    }

    if (placeIdeaSnap.exists) {
      transaction.update(placeIdeaRef, nextPlaceDocument);
    } else {
      transaction.set(placeIdeaRef, {
        ...nextPlaceDocument,
        createdAt: String(place.createdAt || place.addedAt || now)
      }, { merge: true });
    }

    transaction.update(tripRef, tripUpdate);

    result = {
      placeId,
      voted,
      placeName: String(nextPlace.name || nextPlace.address || '').slice(0, 160),
      actorName: getMemberDisplayName({
        request,
        member: memberSnap.exists ? memberSnap.data() : {}
      }),
      votes: nextVotes,
      voteValue: nextVoteValue,
      hasVote,
      voteCount: positiveVoteCount,
      maybeVoteCount,
      negativeVoteCount,
      voteScore,
      revision
    };
  });

  if (result) {
    try {
      await Promise.all([
        syncRealtimePlaceVotes({
          tripId,
          placeId,
          votes: result.votes
        }),
        appendRealtimeActivity({
          tripId,
          activity: {
            type: 'place-vote',
            actorUid: uid,
            actorName: result.actorName,
            placeId,
            placeName: result.placeName,
            voted: result.voted,
            hasVote: result.hasVote,
            voteValue: result.voteValue
          }
        })
      ]);
    } catch (error) {
      console.error('Failed to sync realtime vote state', {
        tripId,
        placeId,
        uid,
        code: error?.code || ''
      });
    }
  }

  return result;
});

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

exports.notifyTripEventWrite = onTripCollaborationDocumentWritten(
  'trips/{tripId}/events/{documentId}',
  'events'
);

exports.notifyTripDayWrite = onTripCollaborationDocumentWritten(
  'trips/{tripId}/days/{documentId}',
  'days'
);

exports.notifyTripDetailWrite = onTripCollaborationDocumentWritten(
  'trips/{tripId}/details/{documentId}',
  'details'
);

exports.notifyTripChecklistItemWrite = onTripCollaborationDocumentWritten(
  'trips/{tripId}/checklistItems/{documentId}',
  'checklistItems'
);

exports.notifyTripShoppingItemWrite = onTripCollaborationDocumentWritten(
  'trips/{tripId}/shoppingItems/{documentId}',
  'shoppingItems'
);

exports.notifyTripExpenseWrite = onTripCollaborationDocumentWritten(
  'trips/{tripId}/expenses/{documentId}',
  'expenses'
);

exports.notifyTripPlaceIdeaWrite = onTripCollaborationDocumentWritten(
  'trips/{tripId}/placeIdeas/{documentId}',
  'placeIdeas'
);

exports.notifyTripShoppingCategoryWrite = onTripCollaborationDocumentWritten(
  'trips/{tripId}/shoppingCategories/{documentId}',
  'shoppingCategories'
);

exports.syncPresenceAclOnMemberWrite = onDocumentWritten(
  'trips/{tripId}/members/{uid}',
  async (event) => {
    const { tripId, uid } = event.params;
    const beforeExists = event.data.before.exists;
    const afterExists = event.data.after.exists;
    const presenceAclRef = realtimeDb.ref(`presenceAcl/${tripId}/${uid}`);
    const realtimeAclRef = realtimeDb.ref(`tripRealtimeAcl/${tripId}/${uid}`);
    const userPresenceRef = realtimeDb.ref(`tripPresence/${tripId}/${uid}`);
    const userEditingRef = realtimeDb.ref(`tripRealtime/${tripId}/editing/${uid}`);

    if (!afterExists) {
      await Promise.all([
        presenceAclRef.remove(),
        realtimeAclRef.remove(),
        userPresenceRef.remove(),
        userEditingRef.remove()
      ]);
      return;
    }

    const member = event.data.after.data() || {};
    await writeRealtimeAccess({
      tripId,
      uid,
      role: normalizeRole(member.role),
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
      realtimeDb.ref(`tripPresence/${tripId}`).remove(),
      realtimeDb.ref(`tripRealtimeAcl/${tripId}`).remove(),
      realtimeDb.ref(`tripRealtime/${tripId}`).remove()
    ]);
  }
);
