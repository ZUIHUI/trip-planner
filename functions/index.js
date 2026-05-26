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
const FLIGHTAPI_IO_KEY = defineSecret('FLIGHTAPI_IO_KEY');
const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;
const EMAIL_CODE_RESEND_COOLDOWN_MS = 60 * 1000;
const EMAIL_CODE_MAX_ATTEMPTS = 5;
const INVITE_CODE_RATE_WINDOW_MS = 5 * 60 * 1000;
const INVITE_CODE_MAX_ATTEMPTS = 12;
const FLIGHT_LOOKUP_RATE_WINDOW_MS = 10 * 60 * 1000;
const FLIGHT_LOOKUP_MAX_ATTEMPTS = 20;
const INVITE_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const DEFAULT_EMAIL_FROM = 'Trip Planner <onboarding@resend.dev>';
const FLIGHTAPI_BASE_URL = 'https://api.flightapi.io/airline';

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

  await realtimeDb.ref(`tripRealtime/${tripId}/placeVotes/${placeId}`).set({
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
  let result = null;

  await firestore.runTransaction(async (transaction) => {
    const [tripSnap, memberSnap] = await Promise.all([
      transaction.get(tripRef),
      transaction.get(memberRef)
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

    if (placeIndex < 0) {
      throw new HttpsError('not-found', '找不到這個地點。');
    }

    const now = new Date().toISOString();
    const place = placePool[placeIndex] || {};
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
    const nextPlacePool = placePool.map((item, index) => (
      index === placeIndex
        ? {
            ...item,
            votes: nextVotes
          }
        : item
    ));
    const revision = Number(trip.syncMeta?.revision || 0) + 1;

    transaction.update(tripRef, {
      'planning.placePool': nextPlacePool,
      placePool: nextPlacePool,
      'meta.updatedAt': now,
      updatedAt: now,
      'syncMeta.revision': revision,
      'syncMeta.updatedByUid': uid,
      'syncMeta.updatedByClientId': clientId,
      'syncMeta.updatedByOperation': 'place-vote',
      'syncMeta.updatedEntityId': placeId,
      'syncMeta.updatedAt': now
    });

    result = {
      placeId,
      voted,
      placeName: String(place.name || place.address || '').slice(0, 160),
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
