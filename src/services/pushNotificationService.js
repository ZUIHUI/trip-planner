import { getCloudFunctions, getFirestoreDb } from './firebase';

const SERVICE_WORKER_URL = '/service-worker.js';
const PUSH_DEVICE_STORAGE_KEY = 'tripPlanner.pushDeviceId';

const DEFAULT_CATEGORIES = {
  dailySummary: true,
  event: true,
  flight: true,
  checklist: true,
  collaboration: true
};

const getWindow = () => (typeof window === 'undefined' ? null : window);

const getNavigator = () => {
  const win = getWindow();
  return win?.navigator || null;
};

const getPlatform = () => {
  const navigator = getNavigator();
  const userAgent = navigator?.userAgent || '';
  const platform = navigator?.platform || '';
  const isAndroid = /Android/i.test(userAgent);
  const isAppleMobile = /iPhone|iPad|iPod/i.test(userAgent);
  const isIpadOs = platform === 'MacIntel' && navigator?.maxTouchPoints > 1;

  if (isAndroid) return 'android';
  if (isAppleMobile || isIpadOs) return 'ios';
  return 'desktop';
};

const getDisplayMode = () => {
  const win = getWindow();
  if (!win) return 'browser';
  if (win.matchMedia?.('(display-mode: standalone)').matches || win.navigator?.standalone === true) {
    return 'standalone';
  }
  if (win.matchMedia?.('(display-mode: fullscreen)').matches) return 'fullscreen';
  if (win.matchMedia?.('(display-mode: minimal-ui)').matches) return 'minimal-ui';
  return 'browser';
};

const getTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Taipei';
  } catch {
    return 'Asia/Taipei';
  }
};

const isLocalSecureHost = (hostname = '') => (
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
);

export const getPushSupportState = () => {
  const win = getWindow();
  const navigator = getNavigator();
  const platform = getPlatform();
  const displayMode = getDisplayMode();
  const secure = Boolean(win?.isSecureContext || isLocalSecureHost(win?.location?.hostname));
  const hasCoreSupport = Boolean(
    win &&
    navigator &&
    secure &&
    'serviceWorker' in navigator &&
    'PushManager' in win &&
    'Notification' in win
  );

  return {
    isSupported: hasCoreSupport,
    platform,
    displayMode,
    isStandalone: displayMode === 'standalone' || displayMode === 'fullscreen',
    needsStandaloneInstall: hasCoreSupport && platform === 'ios' && displayMode !== 'standalone',
    permission: win?.Notification?.permission || 'unsupported'
  };
};

export const getNotificationPermission = () => {
  const win = getWindow();
  return win?.Notification?.permission || 'unsupported';
};

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

const callPushFunction = async (name, payload = {}) => {
  const [{ httpsCallable }, functions] = await Promise.all([
    import('firebase/functions'),
    getCloudFunctions()
  ]);
  const callable = httpsCallable(functions, name);
  const response = await callable(payload);
  return response.data || {};
};

const getWebPushPublicKey = async () => {
  const data = await callPushFunction('getWebPushConfig');
  return String(data.publicKey || '').trim();
};

const getPushRegistration = async () => {
  const navigator = getNavigator();
  if (!navigator?.serviceWorker) {
    throw new Error('這個瀏覽器不支援手機提醒。');
  }

  return navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: '/' });
};

const getSubscriptionPayload = (subscription) => {
  if (!subscription) return null;
  const json = subscription.toJSON();
  return {
    endpoint: json.endpoint,
    expirationTime: json.expirationTime ?? null,
    keys: {
      p256dh: json.keys?.p256dh || '',
      auth: json.keys?.auth || ''
    }
  };
};

const rememberDeviceId = (deviceId) => {
  try {
    if (deviceId) {
      localStorage.setItem(PUSH_DEVICE_STORAGE_KEY, deviceId);
    }
  } catch {
    // Device id persistence is only used to make later disable calls friendlier.
  }
};

export const readRememberedPushDeviceId = () => {
  try {
    return localStorage.getItem(PUSH_DEVICE_STORAGE_KEY) || '';
  } catch {
    return '';
  }
};

export const loadTripNotificationPreference = async ({ uid, tripId }) => {
  if (!uid || !tripId) return null;
  const [{ doc, getDoc }, db] = await Promise.all([
    import('firebase/firestore'),
    getFirestoreDb()
  ]);
  const prefRef = doc(db, 'userNotificationSettings', uid, 'tripPrefs', tripId);
  const snapshot = await getDoc(prefRef);
  return snapshot.exists() ? snapshot.data() : null;
};

export const enableTripNotifications = async ({ tripId }) => {
  const support = getPushSupportState();
  if (!support.isSupported) {
    throw new Error('這個瀏覽器不支援手機提醒。');
  }
  if (support.needsStandaloneInstall) {
    throw new Error('iPhone 需先加入主畫面後再開啟提醒。');
  }
  if (getNotificationPermission() === 'denied') {
    throw new Error('通知權限已被封鎖，請到瀏覽器或系統設定重新允許。');
  }

  const permission = await window.Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('尚未允許通知權限。');
  }

  const publicKey = await getWebPushPublicKey();
  if (!publicKey) {
    throw new Error('推播金鑰尚未設定。');
  }

  const registration = await getPushRegistration();
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });
  }

  const metadata = {
    platform: support.platform,
    displayMode: support.displayMode,
    timezone: getTimeZone(),
    userAgent: getNavigator()?.userAgent || ''
  };
  const device = await callPushFunction('registerPushDevice', {
    subscription: getSubscriptionPayload(subscription),
    ...metadata
  });

  rememberDeviceId(device.deviceId);

  const preference = await callPushFunction('setTripNotificationPreference', {
    tripId,
    enabled: true,
    categories: DEFAULT_CATEGORIES,
    timezone: metadata.timezone
  });

  return {
    device,
    preference,
    permission
  };
};

export const disableTripNotifications = async ({ tripId }) => (
  callPushFunction('setTripNotificationPreference', {
    tripId,
    enabled: false,
    categories: DEFAULT_CATEGORIES,
    timezone: getTimeZone()
  })
);

export const unregisterRememberedPushDevice = async () => {
  const deviceId = readRememberedPushDeviceId();
  if (!deviceId) return null;
  return callPushFunction('unregisterPushDevice', { deviceId });
};
