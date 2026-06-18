import React, { forwardRef } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Calendar, Home, MapPin, RefreshCw, Settings } from 'lucide-react';
import { getTripDisplayDates } from '../utils/tripDates';
import { Badge, Button, PageContainer } from './ui';
import { PresenceAvatar, PresenceStatusDot } from './PresenceStatus';

const statusConfig = {
  planning: { label: '規劃中', variant: 'warning' },
  ongoing: { label: '旅途中', variant: 'success' },
  done: { label: '已完成', variant: 'muted' }
};

const PresencePill = ({ presenceUi, cover = false }) => {
  const nextSummaryText = presenceUi?.summaryText || '在線狀態同步中';
  const selfStatus = presenceUi?.selfStatus || {};
  const selfState = selfStatus.status || (presenceUi?.selfOnline ? 'online' : 'syncing');
  const activePeople = presenceUi?.otherOnlineMembers?.slice(0, 3) || [];
  const nextTitle = activePeople.length
    ? activePeople.map((person) => `${person.name}: ${person.detailText || person.statusLabel || '在線'}`).join('\n')
    : nextSummaryText;
  const nextBaseClass = cover
    ? 'border-white/25 bg-white/15 text-white'
    : 'border-brand-100 bg-white/85 text-slate-700 shadow-[0_14px_30px_-26px_rgba(37,99,235,0.46)] dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-200';

  return (
    <motion.div
      className={`tp-motion-panel inline-flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-bold shadow-sm ${nextBaseClass}`}
      title={nextTitle}
      aria-label={nextSummaryText}
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 460, damping: 34, mass: 0.6 }}
    >
      <PresenceStatusDot status={selfState} size="sm" label={selfStatus.statusLabel || nextSummaryText} />
      {activePeople.length > 0 && (
        <div className="flex -space-x-1.5">
          {activePeople.map((person) => (
            <PresenceAvatar
              key={person.uid}
              person={person}
              size="sm"
              className={cover ? 'border-white/50 bg-black/25 text-white' : ''}
            />
          ))}
        </div>
      )}
      <span className="max-w-[8.5rem] truncate sm:max-w-[11rem]">{nextSummaryText}</span>
    </motion.div>
  );
};

const Header = forwardRef(({
  details,
  onSettingsOpen,
  onGoToTrips,
  isSaving,
  children,
  coverImageUrl,
  shouldShowCoverBackground,
  presenceUi
}, ref) => {
  const displayDates = getTripDisplayDates(details);
  const status = statusConfig[details?.status] || statusConfig.planning;

  const headerStyle = shouldShowCoverBackground
    ? {
        backgroundImage: `linear-gradient(120deg, rgba(12, 74, 110, 0.68), rgba(14, 165, 170, 0.36), rgba(236, 72, 153, 0.28)), url(${coverImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }
    : undefined;

  return (
    <motion.header
      ref={ref}
      className="sticky top-0 z-30 border-b border-brand-100/80 bg-white/[0.9] shadow-[0_18px_38px_-32px_rgba(37,99,235,0.38)] supports-[backdrop-filter]:backdrop-blur dark:border-slate-800 dark:bg-slate-950/90"
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        style={headerStyle}
        layout
        className={shouldShowCoverBackground
          ? 'text-white'
          : 'relative overflow-hidden bg-white/78 text-slate-950 dark:bg-slate-950/82 dark:text-white'}
      >
        {!shouldShowCoverBackground && (
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-brand-400 via-sky-400 to-rose-400" />
        )}
        <PageContainer className="py-4 sm:py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <Button
                variant={shouldShowCoverBackground ? 'ghost' : 'secondary'}
                size="icon"
                onClick={onGoToTrips}
                aria-label="回旅程列表"
                title="回旅程列表"
                className={shouldShowCoverBackground ? 'border border-white/25 bg-white/15 text-white hover:bg-white/25' : ''}
              >
                <ArrowLeft size={18} />
              </Button>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Badge variant={status.variant} className={shouldShowCoverBackground ? 'border-white/30 bg-white/15 text-white' : ''}>
                    {status.label}
                  </Badge>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold ${shouldShowCoverBackground ? 'text-white/85' : 'text-slate-500 dark:text-slate-400'}`}>
                    <Calendar size={14} />
                    {displayDates || '未設定日期'}
                  </span>
                </div>

                <h1 className="mt-2 truncate text-xl font-black tracking-tight sm:text-3xl">
                  {details?.title || '我的旅程'}
                </h1>

                <div className={`mt-3 hidden gap-2 text-sm sm:flex sm:items-center sm:gap-5 ${shouldShowCoverBackground ? 'text-white/85' : 'text-slate-600 dark:text-slate-300'}`}>
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <Home size={15} className="shrink-0" />
                    <span className="truncate">{details?.accommodation?.name || '尚未設定住宿'}</span>
                  </span>
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <MapPin size={15} className="shrink-0" />
                    <span className="truncate">{details?.accommodation?.address || '可在資訊頁補上地址'}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex w-full shrink-0 items-center justify-end gap-3 sm:w-auto">
              {isSaving && (
                <motion.span
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${shouldShowCoverBackground ? 'bg-black/30 text-white' : 'border border-brand-100 bg-white/85 text-brand-700 shadow-sm dark:border-brand-900/60 dark:bg-brand-900/30 dark:text-brand-200'}`}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                >
                  <RefreshCw size={13} className="animate-spin" />
                  儲存中
                </motion.span>
              )}
              <PresencePill presenceUi={presenceUi} cover={shouldShowCoverBackground} />
              <Button
                variant={shouldShowCoverBackground ? 'ghost' : 'secondary'}
                onClick={onSettingsOpen}
                aria-label="開啟設定"
                title="設定"
                className={shouldShowCoverBackground ? 'shrink-0 border border-white/25 bg-white/15 text-white hover:bg-white/25' : 'shrink-0'}
              >
                <Settings size={18} />
                <span className="hidden sm:inline">設定</span>
              </Button>
            </div>
          </div>
        </PageContainer>
      </motion.div>

      {children && (
        <motion.div
          className="border-t border-brand-100/80 bg-white/90 dark:border-slate-800 dark:bg-slate-950/[0.92]"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          <PageContainer>{children}</PageContainer>
        </motion.div>
      )}
    </motion.header>
  );
});

Header.displayName = 'Header';
export default Header;
