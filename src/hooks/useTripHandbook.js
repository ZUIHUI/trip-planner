import { useCallback, useEffect, useState } from 'react';
import { requestSavedTripHandbook, requestTripHandbook } from '../services/tripHandbookService';
import { exportTripHandbookPdf } from '../utils/tripHandbookPdf';

export const useTripHandbook = ({
  tripId,
  canEdit = false,
  toast
} = {}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const [hasLoadedSaved, setHasLoadedSaved] = useState(false);

  useEffect(() => {
    setResponse(null);
    setError('');
    setHasLoadedSaved(false);
  }, [tripId]);

  const loadSaved = useCallback(async () => {
    if (!tripId || hasLoadedSaved || isLoadingSaved) return response;

    setIsLoadingSaved(true);
    try {
      const savedResponse = await requestSavedTripHandbook({ tripId });
      setHasLoadedSaved(true);
      if (savedResponse) {
        setResponse(savedResponse);
      }
      return savedResponse;
    } catch {
      setHasLoadedSaved(true);
      return null;
    } finally {
      setIsLoadingSaved(false);
    }
  }, [hasLoadedSaved, isLoadingSaved, response, tripId]);

  const openPanel = useCallback(() => {
    setIsOpen(true);
    loadSaved();
  }, [loadSaved]);

  const closePanel = useCallback(() => {
    setIsOpen(false);
  }, []);

  const generate = useCallback(async () => {
    if (!canEdit) {
      const message = '只有可編輯旅程的成員可以產生旅遊手冊。';
      setError(message);
      toast?.({ variant: 'warning', title: '無法產生旅遊手冊', description: message });
      return null;
    }

    setIsLoading(true);
    setError('');

    try {
      const nextResponse = await requestTripHandbook({ tripId });
      setResponse(nextResponse);
      setHasLoadedSaved(true);
      toast?.({ variant: 'success', title: '旅遊手冊已保存', description: '已更新這趟旅程的最新版手冊。' });
      return nextResponse;
    } catch (requestError) {
      const message = requestError?.message || '旅遊手冊暫時無法產生，請稍後再試。';
      setError(message);
      toast?.({ variant: 'warning', title: '旅遊手冊失敗', description: message });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [canEdit, toast, tripId]);

  const exportPdf = useCallback(async ({
    coverImage = '',
    tripTitle = ''
  } = {}) => {
    if (!response) return null;

    setIsExporting(true);
    try {
      const handbookCoverImage =
        response.visuals?.coverImageDataUrl ||
        response.visuals?.coverImageUrl ||
        coverImage;
      const result = await exportTripHandbookPdf({
        handbook: response,
        coverImage: handbookCoverImage,
        filename: `${tripTitle || response.cover?.title || '旅遊手冊'}-旅遊手冊`
      });
      toast?.({ variant: 'success', title: 'PDF 已匯出', description: result.filename });
      return result;
    } catch (exportError) {
      const message = exportError?.message || 'PDF 匯出失敗，請稍後再試。';
      toast?.({ variant: 'warning', title: 'PDF 匯出失敗', description: message });
      return null;
    } finally {
      setIsExporting(false);
    }
  }, [response, toast]);

  return {
    isOpen,
    response,
    isLoading,
    isLoadingSaved,
    isExporting,
    error,
    openPanel,
    closePanel,
    loadSaved,
    generate,
    exportPdf
  };
};
