export const isPermissionDeniedError = (error) => (
  error?.code === 'permission-denied' ||
  String(error?.code || '').toLowerCase().includes('permission') ||
  String(error?.message || '').toLowerCase().includes('missing or insufficient permissions') ||
  /permission[-_\s]?denied/i.test(String(error?.message || ''))
);

export const getSaveErrorMessage = (error, fallback = '儲存失敗') => {
  if (isPermissionDeniedError(error)) {
    return '權限不足，這次變更沒有儲存。請重新整理確認你仍有編輯權限。';
  }
  return error?.message || fallback;
};

export const getPermissionDeniedToast = (label = '這次變更') => ({
  variant: 'warning',
  title: '儲存權限不足',
  description: `${label}被權限規則拒絕，已停止自動重試。請重新整理後再試一次。`
});
