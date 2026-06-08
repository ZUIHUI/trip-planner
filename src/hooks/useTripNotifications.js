import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  disableTripNotifications,
  enableTripNotifications,
  getNotificationPermission,
  getPushSupportState,
  loadTripNotificationPreference
} from '../services/pushNotificationService';

const getInitialState = () => ({
  support: getPushSupportState(),
  permission: getNotificationPermission(),
  preference: null,
  isLoading: true,
  isBusy: false,
  error: ''
});

export const useTripNotifications = ({ tripId, currentUser } = {}) => {
  const uid = currentUser?.uid || '';
  const [state, setState] = useState(getInitialState);

  const refresh = useCallback(async () => {
    const support = getPushSupportState();
    const permission = getNotificationPermission();

    if (!uid || !tripId) {
      setState((previous) => ({
        ...previous,
        support,
        permission,
        preference: null,
        isLoading: false
      }));
      return;
    }

    try {
      const preference = await loadTripNotificationPreference({ uid, tripId });
      setState((previous) => ({
        ...previous,
        support,
        permission,
        preference,
        isLoading: false,
        error: ''
      }));
    } catch (error) {
      setState((previous) => ({
        ...previous,
        support,
        permission,
        isLoading: false,
        error: error?.message || '提醒狀態讀取失敗。'
      }));
    }
  }, [tripId, uid]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      await refresh();
      if (cancelled) return;
    };

    run();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refresh]);

  const enable = useCallback(async () => {
    setState((previous) => ({ ...previous, isBusy: true, error: '' }));
    try {
      await enableTripNotifications({ tripId });
      await refresh();
      setState((previous) => ({ ...previous, isBusy: false, error: '' }));
    } catch (error) {
      setState((previous) => ({
        ...previous,
        support: getPushSupportState(),
        permission: getNotificationPermission(),
        isBusy: false,
        error: error?.message || '提醒開啟失敗。'
      }));
    }
  }, [refresh, tripId]);

  const disable = useCallback(async () => {
    setState((previous) => ({ ...previous, isBusy: true, error: '' }));
    try {
      await disableTripNotifications({ tripId });
      await refresh();
      setState((previous) => ({ ...previous, isBusy: false, error: '' }));
    } catch (error) {
      setState((previous) => ({
        ...previous,
        isBusy: false,
        error: error?.message || '提醒關閉失敗。'
      }));
    }
  }, [refresh, tripId]);

  const status = useMemo(() => {
    if (!uid) return 'signed-out';
    if (!state.support.isSupported) return 'unsupported';
    if (state.support.needsStandaloneInstall) return 'needs-install';
    if (state.permission === 'denied') return 'blocked';
    if (state.preference?.enabled && state.permission === 'granted') return 'enabled';
    return 'available';
  }, [state.permission, state.preference?.enabled, state.support.isSupported, state.support.needsStandaloneInstall, uid]);

  return {
    ...state,
    status,
    enable,
    disable
  };
};

export default useTripNotifications;
