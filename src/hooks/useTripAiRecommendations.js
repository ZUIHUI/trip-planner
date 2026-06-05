import { useCallback, useState } from 'react';
import { requestTripRecommendations } from '../services/tripAiService';

const validModes = new Set(['placeIdeas', 'dayPlan']);

const normalizeMode = (mode) => (validModes.has(mode) ? mode : 'placeIdeas');

export const useTripAiRecommendations = ({
  tripId,
  selectedDay,
  canEdit = false,
  toast
} = {}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('placeIdeas');
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const openPanel = useCallback((nextMode = mode) => {
    setMode(normalizeMode(nextMode));
    setIsOpen(true);
  }, [mode]);

  const closePanel = useCallback(() => {
    setIsOpen(false);
  }, []);

  const generate = useCallback(async (nextMode = mode) => {
    const safeMode = normalizeMode(nextMode);
    setMode(safeMode);

    if (!canEdit) {
      const message = '只有可編輯旅程的成員可以產生 AI 推薦。';
      setError(message);
      toast?.({ variant: 'warning', title: '無法產生 AI 推薦', description: message });
      return null;
    }

    setIsLoading(true);
    setError('');

    try {
      const nextResponse = await requestTripRecommendations({
        tripId,
        selectedDay,
        mode: safeMode
      });
      setResponse(nextResponse);
      return nextResponse;
    } catch (requestError) {
      const message = requestError?.message || 'AI 推薦暫時無法產生，請稍後再試。';
      setError(message);
      toast?.({ variant: 'warning', title: 'AI 推薦失敗', description: message });
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
    setMode: (nextMode) => setMode(normalizeMode(nextMode)),
    openPanel,
    closePanel,
    generate
  };
};
