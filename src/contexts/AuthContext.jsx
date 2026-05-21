import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signOut,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

const AuthContext = createContext(null);
const EMAIL_FOR_SIGN_IN_KEY = 'trip_planner_email_for_sign_in';
const REDIRECT_AFTER_SIGN_IN_KEY = 'trip_planner_redirect_after_sign_in';

const getProfileName = (user) => (
  user?.displayName ||
  String(user?.email || '').split('@')[0] ||
  '旅伴'
);

const buildProfileFromUser = (user, patch = {}) => ({
  uid: user.uid,
  email: user.email || '',
  displayName: patch.displayName ?? getProfileName(user),
  photoURL: user.photoURL || '',
  providerIds: user.providerData?.map((provider) => provider.providerId).filter(Boolean) || [],
  updatedAt: new Date().toISOString(),
  ...patch
});

const readStoredRedirect = () => {
  try {
    return localStorage.getItem(REDIRECT_AFTER_SIGN_IN_KEY) || '/';
  } catch {
    return '/';
  }
};

const syncUserProfile = async (user, patch = {}) => {
  if (!user?.uid) return null;
  const profileRef = doc(db, 'userProfiles', user.uid);
  const snapshot = await getDoc(profileRef);
  const now = new Date().toISOString();
  const existing = snapshot.exists() ? snapshot.data() : {};
  const nextProfile = {
    ...existing,
    ...buildProfileFromUser(user, patch),
    createdAt: existing.createdAt || now,
    updatedAt: now
  };
  await setDoc(profileRef, nextProfile, { merge: true });
  return nextProfile;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
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
        console.warn('同步使用者資料失敗:', error);
        setUserProfile(buildProfileFromUser(user));
      } finally {
        setIsAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const sendMagicLink = useCallback(async (email, redirectPath = '/') => {
    const safeEmail = String(email || '').trim();
    if (!safeEmail) {
      throw new Error('請輸入 Email');
    }

    const url = new URL('/login', window.location.origin);
    url.searchParams.set('redirect', redirectPath || '/');

    await sendSignInLinkToEmail(auth, safeEmail, {
      url: url.toString(),
      handleCodeInApp: true
    });

    localStorage.setItem(EMAIL_FOR_SIGN_IN_KEY, safeEmail);
    localStorage.setItem(REDIRECT_AFTER_SIGN_IN_KEY, redirectPath || '/');
  }, []);

  const completeEmailLink = useCallback(async (email, href = window.location.href) => {
    const storedEmail = localStorage.getItem(EMAIL_FOR_SIGN_IN_KEY) || '';
    const safeEmail = String(email || storedEmail).trim();

    if (!isSignInWithEmailLink(auth, href)) {
      return null;
    }

    if (!safeEmail) {
      throw new Error('請再次輸入 Email 以完成登入');
    }

    const credential = await signInWithEmailLink(auth, safeEmail, href);
    localStorage.removeItem(EMAIL_FOR_SIGN_IN_KEY);
    const profile = await syncUserProfile(credential.user);
    setUserProfile(profile);
    return credential.user;
  }, []);

  const signInWithGoogle = useCallback(async (redirectPath = '/') => {
    localStorage.setItem(REDIRECT_AFTER_SIGN_IN_KEY, redirectPath || '/');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const credential = await signInWithPopup(auth, provider);
    const profile = await syncUserProfile(credential.user);
    setUserProfile(profile);
    return credential.user;
  }, []);

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
    sendMagicLink,
    completeEmailLink,
    signInWithGoogle,
    updateDisplayName,
    logout,
    isEmailLink: (href = window.location.href) => isSignInWithEmailLink(auth, href),
    getRedirectAfterSignIn: readStoredRedirect,
    clearRedirectAfterSignIn: () => localStorage.removeItem(REDIRECT_AFTER_SIGN_IN_KEY)
  }), [
    currentUser,
    userProfile,
    isAuthLoading,
    authError,
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
