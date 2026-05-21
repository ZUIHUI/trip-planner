import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const getRuntimeAuthDomain = () => {
  const configuredAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;

  if (typeof window === 'undefined') {
    return configuredAuthDomain;
  }

  const host = window.location.hostname;
  const shouldUseCurrentHost = import.meta.env.VITE_FIREBASE_USE_CURRENT_DOMAIN_AUTH === 'true'
    || host.endsWith('.vercel.app');

  return shouldUseCurrentHost ? host : configuredAuthDomain;
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: getRuntimeAuthDomain(),
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = firebaseConfig.databaseURL ? getDatabase(app) : null;

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
    console.warn('Firebase Analytics 初始化略過:', error);
    return null;
  }
};

export default app;
