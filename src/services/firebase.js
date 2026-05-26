import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getFunctions } from 'firebase/functions';
import { logger } from '../utils/logger';

// Firebase web config is public by design. These defaults keep Vercel builds
// working when dashboard env vars are missing; provider API keys stay server-only.
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

const getEnvValue = (key, fallback) => import.meta.env[key] || fallback;

const getRuntimeAuthDomain = () => {
  const configuredAuthDomain = getEnvValue(
    'VITE_FIREBASE_AUTH_DOMAIN',
    firebaseConfigDefaults.authDomain
  );

  if (typeof window === 'undefined') {
    return configuredAuthDomain;
  }

  const host = window.location.hostname;
  const shouldUseCurrentHost = import.meta.env.VITE_FIREBASE_USE_CURRENT_DOMAIN_AUTH === 'true'
    || host.endsWith('.vercel.app');

  return shouldUseCurrentHost ? host : configuredAuthDomain;
};

const firebaseConfig = {
  apiKey: getEnvValue('VITE_FIREBASE_API_KEY', firebaseConfigDefaults.apiKey),
  authDomain: getRuntimeAuthDomain(),
  databaseURL: getEnvValue('VITE_FIREBASE_DATABASE_URL', firebaseConfigDefaults.databaseURL),
  projectId: getEnvValue('VITE_FIREBASE_PROJECT_ID', firebaseConfigDefaults.projectId),
  storageBucket: getEnvValue('VITE_FIREBASE_STORAGE_BUCKET', firebaseConfigDefaults.storageBucket),
  messagingSenderId: getEnvValue(
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    firebaseConfigDefaults.messagingSenderId
  ),
  appId: getEnvValue('VITE_FIREBASE_APP_ID', firebaseConfigDefaults.appId),
  measurementId: getEnvValue('VITE_FIREBASE_MEASUREMENT_ID', firebaseConfigDefaults.measurementId)
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = firebaseConfig.databaseURL ? getDatabase(app) : null;
export const functions = getFunctions(app);

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
