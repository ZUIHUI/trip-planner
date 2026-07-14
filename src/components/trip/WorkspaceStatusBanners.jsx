import React from 'react';
import { AlertTriangle, Cloud, LockKeyhole, RefreshCw } from 'lucide-react';
import { Button } from '../ui';

export const PermissionBanner = ({ isReadOnly = false }) => {
  if (!isReadOnly) return null;

  return (
    <aside className="tp-v4-state-banner tp-v4-state-banner-permission" role="status" aria-live="polite">
      <span className="tp-v4-state-banner-icon" aria-hidden="true">
        <LockKeyhole size={18} />
      </span>
      <div>
        <strong>目前為唯讀模式</strong>
        <p>你可以查看所有內容；若要一起編輯，請主辦人重新分享可編輯邀請碼。</p>
      </div>
    </aside>
  );
};

export const SyncStatusBanner = ({
  isSaving = false,
  saveError = '',
  syncConflict = false,
  syncConflictSummary = '',
  onUseRemote,
  onKeepLocal,
  remoteActionLabel = '使用最新內容',
  localActionLabel = '保留我的內容'
}) => {
  if (!isSaving && !saveError && !syncConflict) return null;

  if (isSaving && !saveError && !syncConflict) {
    return (
      <aside className="tp-v4-state-banner tp-v4-state-banner-sync" role="status" aria-live="polite">
        <span className="tp-v4-state-banner-icon" aria-hidden="true">
          <RefreshCw size={18} className="animate-spin" />
        </span>
        <div>
          <strong>正在同步最新變更</strong>
          <p>可以繼續規劃，完成後會自動更新給旅伴。</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="tp-v4-state-banner tp-v4-state-banner-warning" role="alert" aria-live="assertive">
      <span className="tp-v4-state-banner-icon" aria-hidden="true">
        {syncConflict ? <Cloud size={18} /> : <AlertTriangle size={18} />}
      </span>
      <div className="min-w-0 flex-1">
        <strong>{syncConflict ? '旅伴剛更新了這趟旅程' : '同步暫時中斷'}</strong>
        <p>{syncConflict ? '請選擇要使用最新內容，或保留目前裝置上的版本。' : saveError}</p>
        {syncConflict && syncConflictSummary && (
          <small>{syncConflictSummary}</small>
        )}
        {syncConflict && (
          <div className="tp-v4-state-banner-actions">
            <Button size="sm" variant="secondary" onClick={onUseRemote}>{remoteActionLabel}</Button>
            <Button size="sm" onClick={onKeepLocal}>{localActionLabel}</Button>
          </div>
        )}
      </div>
    </aside>
  );
};
