import React, { useState } from 'react';
import { Download, Share2, Smartphone, X } from 'lucide-react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { Button } from './ui';
import { cx } from './ui/utils';

const getGuideText = (platform) => {
  if (platform === 'ios') {
    return '在 Safari 點分享按鈕，選「加入主畫面」。之後從主畫面開啟，登入狀態會更穩定。';
  }

  if (platform === 'android') {
    return '如果沒有跳出安裝提示，請打開瀏覽器選單，選「安裝應用程式」或「新增至主畫面」。';
  }

  return '打開瀏覽器選單，選「新增至主畫面」。之後可以像 App 一樣從主畫面開啟。';
};

const InstallAppPrompt = ({ className = '' }) => {
  const {
    canPromptInstall,
    platform,
    promptInstall,
    dismissPrompt,
    shouldShowPrompt
  } = useInstallPrompt();
  const [showGuide, setShowGuide] = useState(false);
  const [message, setMessage] = useState('');

  if (!shouldShowPrompt) return null;

  const handlePrimaryAction = async () => {
    setMessage('');

    if (canPromptInstall) {
      const result = await promptInstall();
      if (result?.outcome === 'accepted') {
        setMessage('已開始加入主畫面。');
        return;
      }
      if (result?.outcome === 'dismissed') {
        setMessage('已取消加入主畫面，你可以稍後再試。');
        return;
      }
    }

    setShowGuide((open) => !open);
  };

  return (
    <section
      className={cx(
        'rounded-lg border border-sky-100 bg-white p-3 shadow-sm dark:border-sky-900/60 dark:bg-slate-900',
        className
      )}
      aria-label="加入主畫面提示"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="tp-icon-chip bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300">
          <Smartphone size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-slate-950 dark:text-white">
            加入主畫面，之後用起來更像 App
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
            手機上從主畫面開啟，比瀏覽器分頁更適合保留登入與查看邀請碼。
          </p>
        </div>
        <button
          type="button"
          onClick={dismissPrompt}
          className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          aria-label="稍後提醒"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button type="button" size="sm" onClick={handlePrimaryAction} className="justify-center">
          {canPromptInstall ? <Download size={15} /> : <Share2 size={15} />}
          {canPromptInstall ? '加入主畫面' : '查看方式'}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={dismissPrompt} className="justify-center">
          稍後
        </Button>
      </div>

      {showGuide && (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
          {getGuideText(platform)}
        </p>
      )}

      {message && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200">
          {message}
        </p>
      )}
    </section>
  );
};

export default InstallAppPrompt;
