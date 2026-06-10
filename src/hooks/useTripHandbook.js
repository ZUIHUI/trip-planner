import { useCallback, useState } from 'react';
import { requestTripHandbook } from '../services/tripHandbookService';

const PRINTING_BODY_CLASS = 'trip-handbook-printing';

export const useTripHandbook = ({
  tripId,
  canEdit = false,
  toast
} = {}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const openPanel = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setIsOpen(false);
  }, []);

  const generate = useCallback(async () => {
    if (!canEdit) {
      const message = '只有可編輯旅程的成員可以產生 AI 旅遊手冊。';
      setError(message);
      toast?.({ variant: 'warning', title: '無法產生旅遊手冊', description: message });
      return null;
    }

    setIsLoading(true);
    setError('');

    try {
      const nextResponse = await requestTripHandbook({ tripId });
      setResponse(nextResponse);
      return nextResponse;
    } catch (requestError) {
      const message = requestError?.message || 'AI 旅遊手冊暫時無法產生，請稍後再試。';
      setError(message);
      toast?.({ variant: 'warning', title: '旅遊手冊失敗', description: message });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [canEdit, toast, tripId]);

  const print = useCallback(() => {
    if (!response || typeof window === 'undefined' || typeof document === 'undefined') return;

    const cleanup = () => {
      document.body.classList.remove(PRINTING_BODY_CLASS);
      window.removeEventListener('afterprint', cleanup);
    };

    document.body.classList.add(PRINTING_BODY_CLASS);
    window.addEventListener('afterprint', cleanup);
    window.setTimeout(() => {
      window.print();
      window.setTimeout(cleanup, 1200);
    }, 60);
  }, [response]);

  return {
    isOpen,
    response,
    isLoading,
    error,
    openPanel,
    closePanel,
    generate,
    print
  };
};
