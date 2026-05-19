import React, { forwardRef } from 'react';
import { ArrowLeft, Calendar, Home, MapPin, RefreshCw, Settings } from 'lucide-react';
import { getTripDisplayDates } from '../utils/tripDates';
import { Badge, Button, PageContainer } from './ui';

const statusConfig = {
  planning: { label: '規劃中', variant: 'warning' },
  ongoing: { label: '旅途中', variant: 'success' },
  done: { label: '已完成', variant: 'muted' }
};

const Header = forwardRef(({
  details,
  onSettingsOpen,
  onGoToTrips,
  isSaving,
  children,
  coverImageUrl,
  shouldShowCoverBackground
}, ref) => {
  const displayDates = getTripDisplayDates(details);
  const status = statusConfig[details?.status] || statusConfig.planning;

  const headerStyle = shouldShowCoverBackground
    ? {
        backgroundImage: `linear-gradient(120deg, rgba(15, 23, 42, 0.70), rgba(15, 118, 110, 0.44)), url(${coverImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }
    : undefined;

  return (
    <header ref={ref} className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 shadow-sm supports-[backdrop-filter]:backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div
        style={headerStyle}
        className={shouldShowCoverBackground
          ? 'text-white'
          : 'bg-gradient-to-br from-white via-brand-50 to-sky-50 text-slate-950 dark:from-slate-950 dark:via-slate-900 dark:to-brand-950/30 dark:text-white'}
      >
        <PageContainer className="py-3 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
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
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={status.variant} className={shouldShowCoverBackground ? 'border-white/30 bg-white/15 text-white' : ''}>
                    {status.label}
                  </Badge>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold ${shouldShowCoverBackground ? 'text-white/85' : 'text-slate-500 dark:text-slate-400'}`}>
                    <Calendar size={14} />
                    {displayDates || '未設定日期'}
                  </span>
                </div>

                <h1 className="mt-2 truncate text-2xl font-black tracking-tight sm:text-3xl">
                  {details?.title || '我的旅程'}
                </h1>

                <div className={`mt-2 grid gap-1 text-sm sm:flex sm:items-center sm:gap-4 ${shouldShowCoverBackground ? 'text-white/85' : 'text-slate-600 dark:text-slate-300'}`}>
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

            <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
              {isSaving && (
                <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${shouldShowCoverBackground ? 'bg-black/30 text-white' : 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200'}`}>
                  <RefreshCw size={13} className="animate-spin" />
                  儲存中
                </span>
              )}
              <Button
                variant={shouldShowCoverBackground ? 'ghost' : 'secondary'}
                onClick={onSettingsOpen}
                aria-label="開啟設定"
                title="設定"
                className={shouldShowCoverBackground ? 'w-full border border-white/25 bg-white/15 text-white hover:bg-white/25 sm:w-auto' : 'w-full sm:w-auto'}
              >
                <Settings size={18} />
                設定
              </Button>
            </div>
          </div>
        </PageContainer>
      </div>

      {children && (
        <div className="border-t border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950">
          <PageContainer>{children}</PageContainer>
        </div>
      )}
    </header>
  );
});

Header.displayName = 'Header';
export default Header;
