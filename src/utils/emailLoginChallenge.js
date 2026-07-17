export const EMAIL_LOGIN_CHALLENGE_STORAGE_KEY = 'trip_planner_email_login_challenge';

const getDefaultStorage = () => {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
};

export const normalizeEmailLoginChallenge = (value, now = Date.now()) => {
  const challengeId = String(value?.challengeId || '').trim();
  const email = String(value?.email || '').trim().toLowerCase();
  const expiresAt = String(value?.expiresAt || '').trim();
  const expiresAtMs = Date.parse(expiresAt);

  if (!challengeId || !email || !Number.isFinite(expiresAtMs) || expiresAtMs <= now) {
    return null;
  }

  return { challengeId, email, expiresAt };
};

export const readEmailLoginChallenge = (
  storage = getDefaultStorage(),
  now = Date.now()
) => {
  if (!storage) return null;

  try {
    const challenge = normalizeEmailLoginChallenge(
      JSON.parse(storage.getItem(EMAIL_LOGIN_CHALLENGE_STORAGE_KEY) || 'null'),
      now
    );

    if (!challenge) {
      storage.removeItem(EMAIL_LOGIN_CHALLENGE_STORAGE_KEY);
    }

    return challenge;
  } catch {
    return null;
  }
};

export const saveEmailLoginChallenge = (
  value,
  storage = getDefaultStorage(),
  now = Date.now()
) => {
  const challenge = normalizeEmailLoginChallenge(value, now);
  if (!challenge) return null;

  try {
    storage?.setItem(EMAIL_LOGIN_CHALLENGE_STORAGE_KEY, JSON.stringify(challenge));
  } catch {
    // The live React state still advances when browser storage is unavailable.
  }

  return challenge;
};

export const clearEmailLoginChallenge = (storage = getDefaultStorage()) => {
  try {
    storage?.removeItem(EMAIL_LOGIN_CHALLENGE_STORAGE_KEY);
  } catch {
    // Storage may be unavailable in private or embedded browser modes.
  }
};
