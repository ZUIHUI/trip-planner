import { useCallback, useState } from 'react';
import { requestTripRecommendations } from '../services/tripAiService';

const COMPANION_HIDDEN_STORAGE_KEY = 'tripPlanner.aiCompanionHidden';
const validModes = new Set(['dayPlan']);

const normalizeMode = (mode) => (validModes.has(mode) ? mode : 'dayPlan');

const readCompanionHidden = () => {
  if (typeof window === 'undefined') return false;

  try {
    return window.localStorage.getItem(COMPANION_HIDDEN_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const persistCompanionHidden = (hidden) => {
  if (typeof window === 'undefined') return;

  try {
    if (hidden) {
      window.localStorage.setItem(COMPANION_HIDDEN_STORAGE_KEY, '1');
    } else {
      window.localStorage.removeItem(COMPANION_HIDDEN_STORAGE_KEY);
    }
  } catch {
    // Local storage is a nice-to-have preference; the companion still works without it.
  }
};

export const useTripAiRecommendations = ({
  tripId,
  selectedDay,
  canEdit = false,
  toast
} = {}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('dayPlan');
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCompanionHidden, setIsCompanionHidden] = useState(readCompanionHidden);

  const openPanel = useCallback((nextMode = mode) => {
    setMode(normalizeMode(nextMode));
    setIsCompanionHidden(false);
    persistCompanionHidden(false);
    setIsOpen(true);
  }, [mode]);

  const closePanel = useCallback(() => {
    setIsOpen(false);
  }, []);

  const hideCompanion = useCallback(() => {
    setIsCompanionHidden(true);
    persistCompanionHidden(true);
    setIsOpen(false);
  }, []);

  const summonCompanion = useCallback((nextMode = mode) => {
    setMode(normalizeMode(nextMode));
    setIsCompanionHidden(false);
    persistCompanionHidden(false);
    setIsOpen(true);
  }, [mode]);

  const generate = useCallback(async (nextMode = mode, options = {}) => {
    const requestOptions = nextMode && typeof nextMode === 'object' ? nextMode : options;
    const requestedMode = nextMode && typeof nextMode === 'object' ? nextMode.mode : nextMode;
    const safeMode = normalizeMode(requestedMode);
    setMode(safeMode);

    if (!canEdit) {
      const message = '只有可編輯旅程的成員可以整理推薦。';
      setError(message);
      toast?.({ variant: 'warning', title: '無法整理推薦', description: message });
      return null;
    }

    setIsLoading(true);
    setError('');

    try {
      const nextResponse = await requestTripRecommendations({
        tripId,
        selectedDay,
        mode: safeMode,
        userIdea: requestOptions.userIdea
      });
      setResponse(nextResponse);
      return nextResponse;
    } catch (requestError) {
      const message = requestError?.message || '暫時整理不出推薦，請稍後再試。';
      setError(message);
      toast?.({ variant: 'warning', title: '推薦產生失敗', description: message });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [canEdit, mode, selectedDay, toast, tripId]);

  return {
    isOpen,
    mode,
    response,
    isLoading,
    error,
    isCompanionHidden,
    setMode: (nextMode) => setMode(normalizeMode(nextMode)),
    openPanel,
    closePanel,
    hideCompanion,
    summonCompanion,
    generate
  };
};
