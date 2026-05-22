import { useCallback, useEffect, useMemo, useState } from 'react';

const DISMISS_STORAGE_KEY = 'tripPlanner.installPromptDismissedAt';
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const getWindow = () => (typeof window === 'undefined' ? null : window);

const getUserAgent = () => {
  const win = getWindow();
  return win?.navigator?.userAgent || '';
};

const getPlatform = () => {
  const userAgent = getUserAgent();
  const win = getWindow();
  const navigatorPlatform = win?.navigator?.platform || '';
  const isAndroid = /Android/i.test(userAgent);
  const isAppleMobile = /iPhone|iPad|iPod/i.test(userAgent);
  const isIpadOs = navigatorPlatform === 'MacIntel' && win?.navigator?.maxTouchPoints > 1;

  if (isAndroid) return 'android';
  if (isAppleMobile || isIpadOs) return 'ios';

  const isTouchMobile = Boolean(win?.navigator?.maxTouchPoints > 1 && win?.innerWidth <= 820);
  return isTouchMobile ? 'mobile' : 'desktop';
};

const getIsStandalone = () => {
  const win = getWindow();
  if (!win) return false;

  return Boolean(
    win.matchMedia?.('(display-mode: standalone)').matches ||
    win.navigator?.standalone === true
  );
};

const getDismissed = () => {
  const win = getWindow();
  if (!win) return true;

  try {
    const dismissedAt = Number(win.localStorage.getItem(DISMISS_STORAGE_KEY) || 0);
    if (!dismissedAt) return false;

    const isStillDismissed = Date.now() - dismissedAt < DISMISS_TTL_MS;
    if (!isStillDismissed) {
      win.localStorage.removeItem(DISMISS_STORAGE_KEY);
    }
    return isStillDismissed;
  } catch {
    return false;
  }
};

export const useInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [platform, setPlatform] = useState('desktop');
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);

  const refreshPromptState = useCallback(() => {
    setPlatform(getPlatform());
    setIsStandalone(getIsStandalone());
    setIsDismissed(getDismissed());
  }, []);

  useEffect(() => {
    const win = getWindow();
    if (!win) return undefined;

    refreshPromptState();

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      refreshPromptState();
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      try {
        win.localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
      } catch {
        // Install completion should still hide the prompt for this session.
      }
      setIsDismissed(true);
      refreshPromptState();
    };

    const standaloneMedia = win.matchMedia?.('(display-mode: standalone)');

    win.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    win.addEventListener('appinstalled', handleAppInstalled);
    win.addEventListener('resize', refreshPromptState);
    standaloneMedia?.addEventListener?.('change', refreshPromptState);

    return () => {
      win.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      win.removeEventListener('appinstalled', handleAppInstalled);
      win.removeEventListener('resize', refreshPromptState);
      standaloneMedia?.removeEventListener?.('change', refreshPromptState);
    };
  }, [refreshPromptState]);

  const dismissPrompt = useCallback(() => {
    const win = getWindow();
    try {
      win?.localStorage?.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
    } catch {
      // Dismissal persistence is a comfort feature only.
    }
    setIsDismissed(true);
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      return { outcome: 'unavailable' };
    }

    await deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    setDeferredPrompt(null);

    if (result?.outcome === 'accepted') {
      dismissPrompt();
    }

    return result || { outcome: 'dismissed' };
  }, [deferredPrompt, dismissPrompt]);

  return useMemo(() => {
    const isMobileBrowser = platform !== 'desktop';
    const shouldShowPrompt = isMobileBrowser && !isStandalone && !isDismissed;

    return {
      canPromptInstall: Boolean(deferredPrompt),
      isStandalone,
      platform,
      promptInstall,
      dismissPrompt,
      shouldShowPrompt
    };
  }, [deferredPrompt, dismissPrompt, isDismissed, isStandalone, platform, promptInstall]);
};

export default useInstallPrompt;
