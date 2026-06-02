import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { logger } from '../utils/logger';

// Firebase web config is public by design. Keep this project's config pinned so
// a provider API key accidentally added to Vercel cannot break Firebase Auth.
const firebaseConfigDefaults = {
  apiKey: 'AIzaSyAKNaAr-ZH85jusPoiw5HPqMbv_j2W9Mp0',
  authDomain: 'trip-planner-36455.firebaseapp.com',
  databaseURL: 'https://trip-planner-36455-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'trip-planner-36455',
  storageBucket: 'trip-planner-36455.firebasestorage.app',
  messagingSenderId: '160404293548',
  appId: '1:160404293548:web:9147eadd5665bbce691c09',
  measurementId: 'G-H1NYSN3EYE'
};

const getRuntimeAuthDomain = () => {
  if (typeof window === 'undefined') {
    return firebaseConfigDefaults.authDomain;
  }

  const shouldUseCurrentHost = import.meta.env.VITE_FIREBASE_USE_CURRENT_DOMAIN_AUTH === 'true';

  return shouldUseCurrentHost ? window.location.hostname : firebaseConfigDefaults.authDomain;
};

const firebaseConfig = {
  ...firebaseConfigDefaults,
  authDomain: getRuntimeAuthDomain(),
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

let firestoreDbPromise = null;
let cloudFunctionsPromise = null;

export const hasRealtimeDatabaseConfig = () => Boolean(firebaseConfig.databaseURL);

export const getFirestoreDb = () => {
  if (!firestoreDbPromise) {
    firestoreDbPromise = import('firebase/firestore')
      .then(({ getFirestore }) => getFirestore(app));
  }
  return firestoreDbPromise;
};

export const getCloudFunctions = () => {
  if (!cloudFunctionsPromise) {
    cloudFunctionsPromise = import('firebase/functions')
      .then(({ getFunctions }) => getFunctions(app));
  }
  return cloudFunctionsPromise;
};

export const getFirebaseAnalytics = async () => {
  try {
    if (!firebaseConfig.measurementId || typeof window === 'undefined') {
      return null;
    }

    const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
    if (import.meta.env.DEV || isLocalHost) {
      return null;
    }

    const { getAnalytics, isSupported } = await import('firebase/analytics');
    const supported = await isSupported();
    return supported ? getAnalytics(app) : null;
  } catch (error) {
    logger.warn('Firebase Analytics 初始化略過:', error);
    return null;
  }
};

export default app;
