import React, { forwardRef } from 'react';
import { Plane, Home, Settings, Calendar, RefreshCw, ArrowLeft, MapPin } from 'lucide-react';
import { getTripDisplayDates } from '../utils/tripDates';

const Header = forwardRef(({
  details,
  onSettingsOpen,
  onGoToTrips,
  isSaving,
  children,
  isScrolled,
  coverImageUrl,
  shouldShowCoverBackground
}, ref) => {
  const displayDates = getTripDisplayDates(details);

  const heroBackgroundStyle = shouldShowCoverBackground
    ? {
        backgroundImage: `linear-gradient(120deg, rgba(15, 23, 42, 0.55), rgba(30, 41, 59, 0.32), rgba(8, 47, 73, 0.5)), url(${coverImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }
    : undefined;

  return (
    <div ref={ref} className="bg-white dark:bg-slate-950 sticky top-0 z-30 shadow-sm transition-colors duration-300 will-change-transform">
      <div
        style={heroBackgroundStyle}
        className={`
          relative overflow-hidden text-white shadow-lg transition-all duration-300 ease-out border-b-0 dark:border-b dark:border-slate-800 will-change-transform
          ${shouldShowCoverBackground
            ? 'bg-slate-800'
            : 'bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900'}
          ${isScrolled ? 'pt-4 pb-3 px-4 rounded-b-xl' : 'pt-7 pb-4 px-4 rounded-b-[2rem]'}
        `}
      >
        <div className={`absolute top-0 right-0 hidden sm:block transform translate-x-1/4 -translate-y-1/4 pointer-events-none transition-opacity duration-300 ${isScrolled ? 'opacity-0' : 'opacity-10'}`}>
          <Plane size={160} />
        </div>
        <div className={`absolute bottom-0 left-0 hidden sm:block transform -translate-x-1/4 translate-y-1/4 pointer-events-none transition-opacity duration-300 ${isScrolled ? 'opacity-0' : 'opacity-5'}`}>
          <Plane size={120} />
        </div>

        <div className={`relative rounded-2xl border border-white/30 bg-white/15 supports-[backdrop-filter]:bg-white/12 backdrop-blur-md shadow-lg px-4 sm:px-5 py-3 sm:py-4 transition-all duration-300 ${isScrolled ? 'mb-2' : 'mb-4'}`}>
          <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/40 bg-black/20 px-3 py-1.5">
                <Calendar size={14} className="shrink-0 text-blue-100" />
                <span className="truncate text-xs sm:text-sm font-semibold tracking-wide">{displayDates || '未設定日期'}</span>
              </div>
              <h1 className="truncate text-xl sm:text-2xl font-bold tracking-tight leading-tight drop-shadow-md">
                {details?.title || '我的旅程'}
              </h1>
              <div className="flex items-center gap-2 text-blue-100/95 text-xs sm:text-sm font-medium">
                <MapPin size={14} className="shrink-0" />
                <span className="truncate">{details?.accommodation?.name || '尚未設定住宿'}</span>
              </div>
            </div>

            <div className="flex w-full sm:w-auto items-center justify-end gap-2">
              <button
                onClick={onGoToTrips}
                className="touch-target inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/35 bg-white/20 backdrop-blur-md transition-all hover:bg-white/30 active:scale-95 sm:hidden"
                title="回旅程列表"
                aria-label="回旅程列表"
              >
                <ArrowLeft size={16} />
              </button>
              <button
                onClick={onGoToTrips}
                className="touch-target hidden h-9 items-center gap-1.5 rounded-xl border border-white/35 bg-white/20 px-3 text-sm font-medium transition-all hover:bg-white/30 active:scale-95 sm:inline-flex"
                title="回旅程列表"
                aria-label="回旅程列表"
              >
                <ArrowLeft size={15} />
                <span>回列表</span>
              </button>
              {isSaving && (
                <div className="flex h-9 items-center gap-1.5 rounded-xl border border-black/20 bg-black/30 px-3 text-xs font-semibold text-brand-100 animate-pulse">
                  <RefreshCw size={12} className="animate-spin" />
                  儲存中
                </div>
              )}
              <button
                onClick={onSettingsOpen}
                className="touch-target inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-white/35 bg-white/20 px-2.5 backdrop-blur-md shadow-sm transition-all hover:bg-white/30 active:scale-95"
                title="設定"
                aria-label="開啟設定"
              >
                <Settings size={18} />
                <span className="text-xs font-medium hidden sm:inline">設定</span>
              </button>
            </div>
          </div>
        </div>

        <div className={`relative transition-all duration-500 ease-in-out overflow-hidden ${isScrolled ? 'max-h-0 opacity-0' : 'max-h-16 opacity-100'}`}>
          <div className="flex items-center gap-2 text-brand-100/90 text-sm font-medium">
            <div className="p-1 bg-white/10 rounded-md">
              <Home size={14} className="text-brand-200" />
            </div>
            <span className="truncate max-w-[250px]">{details?.accommodation?.address || '可在設定補上住宿地址與資訊'}</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
        {children}
      </div>
    </div>
  );
});

Header.displayName = 'Header';
export default Header;
