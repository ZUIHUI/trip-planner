import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  browserSessionPersistence,
  isSignInWithEmailLink,
  onAuthStateChanged,
  getRedirectResult,
  sendSignInLinkToEmail,
  setPersistence,
  signInWithCustomToken,
  signInWithEmailLink,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile
} from 'firebase/auth';
import { auth, getCloudFunctions, getFirestoreDb } from '../services/firebase';
import { logger } from '../utils/logger';

const AuthContext = createContext(null);
const EMAIL_FOR_SIGN_IN_KEY = 'trip_planner_email_for_sign_in';
const REDIRECT_AFTER_SIGN_IN_KEY = 'trip_planner_redirect_after_sign_in';
const REMEMBER_DEVICE_KEY = 'trip_planner_remember_device';

const getProfileName = (user) => (
  user?.displayName ||
  String(user?.email || '').split('@')[0] ||
  'Traveler'
);

const normalizeRedirectPath = (redirectPath = '/') => {
  const fallback = '/';
  const rawPath = String(redirectPath || fallback).trim();

  if (!rawPath || rawPath.startsWith('//') || /^https?:\/\//i.test(rawPath)) {
    return fallback;
  }

  return rawPath.startsWith('/') ? rawPath : fallback;
};

const readRememberDevicePreference = () => {
  try {
    return localStorage.getItem(REMEMBER_DEVICE_KEY) !== 'false';
  } catch {
    return true;
  }
};

const writeRememberDevicePreference = (rememberDevice) => {
  try {
    localStorage.setItem(REMEMBER_DEVICE_KEY, rememberDevice ? 'true' : 'false');
  } catch {
    // Storage may be unavailable in private browser modes.
  }
};

const isPopupUnavailableError = (error) => {
  const code = String(error?.code || '').replace(/^auth\//, '');
  return code === 'popup-blocked' || code === 'operation-not-supported-in-this-environment';
};

const buildProfileFromUser = (user, patch = {}) => ({
  uid: user.uid,
  email: user.email || patch.email || '',
  displayName: patch.displayName ?? getProfileName(user),
  photoURL: user.photoURL || patch.photoURL || '',
  providerIds: user.providerData?.map((provider) => provider.providerId).filter(Boolean) || [],
  updatedAt: new Date().toISOString(),
  ...patch
});

const readStoredRedirect = () => {
  try {
    return normalizeRedirectPath(localStorage.getItem(REDIRECT_AFTER_SIGN_IN_KEY) || '/');
  } catch {
    return '/';
  }
};

const readRedirectFromEmailLink = (href) => {
  try {
    return normalizeRedirectPath(new URL(href).searchParams.get('redirect') || '/');
  } catch {
    return '/';
  }
};

const syncUserProfile = async (user, patch = {}) => {
  if (!user?.uid) return null;
  const [{ doc, getDoc, setDoc }, db] = await Promise.all([
    import('firebase/firestore'),
    getFirestoreDb()
  ]);
  const profileRef = doc(db, 'userProfiles', user.uid);
  const snapshot = await getDoc(profileRef);
  const now = new Date().toISOString();
  const existing = snapshot.exists() ? snapshot.data() : {};
  const nextProviderIds = Array.from(new Set([
    ...(Array.isArray(existing.providerIds) ? existing.providerIds : []),
    ...buildProfileFromUser(user).providerIds,
    ...(Array.isArray(patch.providerIds) ? patch.providerIds : [])
  ].filter(Boolean)));
  const nextProfile = {
    ...existing,
    ...buildProfileFromUser(user, patch),
    providerIds: nextProviderIds,
    createdAt: existing.createdAt || now,
    updatedAt: now
  };
  await setDoc(profileRef, nextProfile, { merge: true });
  return nextProfile;
};

const callAuthFunction = async (name, payload) => {
  const [{ httpsCallable }, functions] = await Promise.all([
    import('firebase/functions'),
    getCloudFunctions()
  ]);
  const callable = httpsCallable(functions, name);
  const response = await callable(payload);
  return response.data || {};
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getRedirectResult(auth)
      .then(async (credential) => {
        if (!credential?.user || cancelled) return;
        const profile = await syncUserProfile(credential.user);
        if (!cancelled) setUserProfile(profile);
      })
      .catch((error) => {
        if (!cancelled) {
          logger.warn('Google redirect sign-in failed:', error);
          setAuthError(error?.message || 'Google 登入失敗，請稍後再試。');
        }
      });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user || null);
      setAuthError('');

      if (!user) {
        setUserProfile(null);
        setIsAuthLoading(false);
        return;
      }

      try {
        const profile = await syncUserProfile(user);
        setUserProfile(profile);
      } catch (error) {
        logger.warn('同步使用者資料失敗', error);
        setUserProfile(buildProfileFromUser(user));
      } finally {
        setIsAuthLoading(false);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const applyAuthPersistence = useCallback(async (rememberDevice = true) => {
    const shouldRemember = rememberDevice !== false;
    writeRememberDevicePreference(shouldRemember);
    await setPersistence(
      auth,
      shouldRemember ? browserLocalPersistence : browserSessionPersistence
    );
  }, []);

  const requestEmailCode = useCallback(async (email, redirectPath = '/') => {
    const safeEmail = String(email || '').trim().toLowerCase();
    if (!safeEmail) {
      throw new Error('請輸入 Email');
    }

    const safeRedirectPath = normalizeRedirectPath(redirectPath);
    const data = await callAuthFunction('requestEmailLoginCode', {
      email: safeEmail,
      redirectPath: safeRedirectPath
    });

    localStorage.setItem(EMAIL_FOR_SIGN_IN_KEY, safeEmail);
    localStorage.setItem(REDIRECT_AFTER_SIGN_IN_KEY, safeRedirectPath);
    return data;
  }, []);

  const verifyEmailCode = useCallback(async ({
    email,
    code,
    challengeId,
    rememberDevice = true,
    redirectPath = '/'
  }) => {
    const safeEmail = String(email || '').trim().toLowerCase();
    const safeCode = String(code || '').replace(/\D/g, '');
    const safeRedirectPath = normalizeRedirectPath(redirectPath);

    if (!safeEmail || !safeCode || !challengeId) {
      throw new Error('請輸入 Email 與驗證碼');
    }

    await applyAuthPersistence(rememberDevice);
    const data = await callAuthFunction('verifyEmailLoginCode', {
      email: safeEmail,
      code: safeCode,
      challengeId
    });

    if (!data.customToken) {
      throw new Error('無法完成登入，請重新取得驗證碼');
    }

    const credential = await signInWithCustomToken(auth, data.customToken);
    localStorage.removeItem(EMAIL_FOR_SIGN_IN_KEY);
    localStorage.setItem(REDIRECT_AFTER_SIGN_IN_KEY, safeRedirectPath);
    const profile = await syncUserProfile(credential.user, {
      email: data.email || credential.user.email || safeEmail,
      displayName: data.displayName || getProfileName(credential.user),
      providerIds: ['email-code']
    });
    setUserProfile(profile);
    return credential.user;
  }, [applyAuthPersistence]);

  const sendMagicLink = useCallback(async (email, redirectPath = '/', rememberDevice = true) => {
    const safeEmail = String(email || '').trim();
    if (!safeEmail) {
      throw new Error('請輸入 Email');
    }

    await applyAuthPersistence(rememberDevice);
    const safeRedirectPath = normalizeRedirectPath(redirectPath);
    const url = new URL('/login', window.location.origin);
    url.searchParams.set('redirect', safeRedirectPath);

    await sendSignInLinkToEmail(auth, safeEmail, {
      url: url.toString(),
      handleCodeInApp: true
    });

    localStorage.setItem(EMAIL_FOR_SIGN_IN_KEY, safeEmail);
    localStorage.setItem(REDIRECT_AFTER_SIGN_IN_KEY, safeRedirectPath);
  }, [applyAuthPersistence]);

  const completeEmailLink = useCallback(async (
    email,
    href = window.location.href,
    rememberDevice = readRememberDevicePreference()
  ) => {
    const storedEmail = localStorage.getItem(EMAIL_FOR_SIGN_IN_KEY) || '';
    const safeEmail = String(email || storedEmail).trim();

    if (!isSignInWithEmailLink(auth, href)) {
      return null;
    }

    if (!safeEmail) {
      throw new Error('請輸入收到登入信的 Email，才能完成驗證。');
    }

    await applyAuthPersistence(rememberDevice);
    const credential = await signInWithEmailLink(auth, safeEmail, href);
    localStorage.removeItem(EMAIL_FOR_SIGN_IN_KEY);
    localStorage.setItem(REDIRECT_AFTER_SIGN_IN_KEY, readRedirectFromEmailLink(href));
    const profile = await syncUserProfile(credential.user);
    setUserProfile(profile);
    return credential.user;
  }, [applyAuthPersistence]);

  const signInWithGoogle = useCallback(async (redirectPath = '/', rememberDevice = true) => {
    await applyAuthPersistence(rememberDevice);
    localStorage.setItem(REDIRECT_AFTER_SIGN_IN_KEY, normalizeRedirectPath(redirectPath));
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    let credential;
    try {
      credential = await signInWithPopup(auth, provider);
    } catch (error) {
      if (!isPopupUnavailableError(error)) throw error;
      await signInWithRedirect(auth, provider);
      return null;
    }
    const profile = await syncUserProfile(credential.user);
    setUserProfile(profile);
    return credential.user;
  }, [applyAuthPersistence]);

  const updateDisplayName = useCallback(async (displayName) => {
    const safeName = String(displayName || '').trim();
    if (!auth.currentUser) return null;
    await updateProfile(auth.currentUser, { displayName: safeName || null });
    const profile = await syncUserProfile(auth.currentUser, {
      displayName: safeName || getProfileName(auth.currentUser)
    });
    setUserProfile(profile);
    return profile;
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setCurrentUser(null);
    setUserProfile(null);
  }, []);

  const value = useMemo(() => ({
    currentUser,
    userProfile,
    isAuthLoading,
    authError,
    setAuthError,
    requestEmailCode,
    verifyEmailCode,
    sendMagicLink,
    completeEmailLink,
    signInWithGoogle,
    updateDisplayName,
    logout,
    isEmailLink: (href = window.location.href) => isSignInWithEmailLink(auth, href),
    getRedirectAfterSignIn: readStoredRedirect,
    clearRedirectAfterSignIn: () => localStorage.removeItem(REDIRECT_AFTER_SIGN_IN_KEY),
    getRememberDevicePreference: readRememberDevicePreference,
    setRememberDevicePreference: writeRememberDevicePreference
  }), [
    currentUser,
    userProfile,
    isAuthLoading,
    authError,
    requestEmailCode,
    verifyEmailCode,
    sendMagicLink,
    completeEmailLink,
    signInWithGoogle,
    updateDisplayName,
    logout
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
};
