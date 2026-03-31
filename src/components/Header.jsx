import React, { forwardRef } from 'react';
import { Plane, Home, Settings, Calendar, RefreshCw, ArrowLeft } from 'lucide-react';
import { getTripDisplayDates } from '../utils/tripDates';

const Header = forwardRef(({ details, onSettingsOpen, onGoToTrips, isSaving, children, isScrolled }, ref) => {
  // Tab 導航已移至 BottomNavigation 組件
  const displayDates = getTripDisplayDates(details);

  return (
    <div ref={ref} className="bg-white dark:bg-slate-950 sticky top-0 z-30 shadow-sm transition-colors duration-300 will-change-transform">
      {/* Main Header Content - Gradient Background */}
      <div className={`
        bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 text-white 
        shadow-lg relative overflow-hidden transition-all duration-300 ease-out border-b-0 dark:border-b dark:border-slate-800 will-change-transform
        ${isScrolled ? 'pt-4 pb-3 px-4 rounded-b-xl' : 'pt-7 pb-4 px-4 rounded-b-[2rem]'}
      `}>
        {/* Decorative Background Elements */}
        <div className={`absolute top-0 right-0 hidden sm:block transform translate-x-1/4 -translate-y-1/4 pointer-events-none transition-opacity duration-300 ${isScrolled ? 'opacity-0' : 'opacity-10'}`}>
          <Plane size={160} />
        </div>
        <div className={`absolute bottom-0 left-0 hidden sm:block transform -translate-x-1/4 translate-y-1/4 pointer-events-none transition-opacity duration-300 ${isScrolled ? 'opacity-0' : 'opacity-5'}`}>
          <Plane size={120} />
        </div>

        {/* Top Bar: Date & Actions */}
        <div className={`relative flex min-h-[52px] flex-wrap items-center justify-between gap-2 sm:gap-3 transition-all duration-300 ${isScrolled ? 'mb-1' : 'mb-4'}`}>
          <div className="flex min-w-0 max-w-full items-center gap-2 bg-white/25 supports-[backdrop-filter]:bg-white/20 backdrop-blur-md px-3.5 py-2 rounded-full border border-white/30 shadow-sm">
            <Calendar size={15} className="text-brand-100 shrink-0" />
            <span className="truncate text-sm font-semibold text-white tracking-wide">{displayDates || '未設定日期'}</span>
          </div>
          
          <div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
            <button
              onClick={onGoToTrips}
              className="touch-target inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/35 bg-white/25 supports-[backdrop-filter]:bg-white/20 backdrop-blur-md transition-all hover:bg-white/30 active:scale-95 sm:hidden"
              title="回旅程列表"
              aria-label="回旅程列表"
            >
              <ArrowLeft size={16} />
            </button>
            <button
              onClick={onGoToTrips}
              className="touch-target hidden h-9 items-center gap-1.5 rounded-xl border border-white/35 bg-white/25 px-3 text-sm font-medium transition-all hover:bg-white/30 active:scale-95 sm:inline-flex"
              title="回旅程列表"
              aria-label="回旅程列表"
            >
              <ArrowLeft size={15} />
              <span>回列表</span>
            </button>
            {isSaving && (
              <div className="flex h-9 items-center gap-1.5 rounded-xl border border-black/20 bg-black/25 px-3 text-xs font-semibold text-brand-100 animate-pulse">
                <RefreshCw size={12} className="animate-spin" />
                儲存中
              </div>
            )}
            <button
              onClick={onSettingsOpen}
              className="touch-target inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-white/35 bg-white/25 px-2.5 backdrop-blur-md shadow-sm transition-all hover:bg-white/30 active:scale-95"
              title="設定"
              aria-label="開啟設定"
            >
              <Settings size={18} />
              <span className="text-xs font-medium hidden sm:inline">設定</span>
            </button>
          </div>
        </div>

        {/* Main Title Area */}
        <div className={`relative transition-all duration-500 ease-in-out overflow-hidden ${isScrolled ? 'max-h-0 opacity-0' : 'max-h-40 opacity-100'}`}>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 tracking-tight leading-tight drop-shadow-md">
            {details?.title || '我的旅程'}
          </h1>
          <div className="flex items-center gap-2 text-brand-100/90 text-sm font-medium">
            <div className="p-1 bg-white/10 rounded-md">
              <Home size={14} className="text-brand-200" />
            </div>
            <span className="truncate max-w-[250px]">{details?.accommodation?.name || '尚未設定住宿'}</span>
          </div>
        </div>
      </div>

      {/* Sub-header Content (Sticky) - Used for DaySelector */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
        {children}
      </div>
    </div>
  );
});

Header.displayName = 'Header';
export default Header;
