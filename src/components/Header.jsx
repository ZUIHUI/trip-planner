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
        ${isScrolled ? 'pt-4 pb-2 px-4 rounded-b-xl' : 'pt-12 pb-6 px-6 rounded-b-[2rem]'}
      `}>
        {/* Decorative Background Elements */}
        <div className={`absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 pointer-events-none transition-opacity duration-300 ${isScrolled ? 'opacity-0' : 'opacity-10'}`}>
          <Plane size={200} />
        </div>
        <div className={`absolute bottom-0 left-0 transform -translate-x-1/4 translate-y-1/4 pointer-events-none transition-opacity duration-300 ${isScrolled ? 'opacity-0' : 'opacity-5'}`}>
          <Plane size={150} />
        </div>

        {/* Top Bar: Date & Actions */}
        <div className={`relative flex justify-between items-center transition-all duration-300 ${isScrolled ? 'mb-0' : 'mb-4'}`}>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10 shadow-sm">
            <Calendar size={14} className="text-brand-100" />
            <span className="text-xs font-medium text-brand-50 tracking-wide">{displayDates || '未設定日期'}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onGoToTrips}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white/15 hover:bg-white/25 rounded-full transition-all active:scale-95 border border-white/20 text-xs sm:text-sm font-medium"
              title="回旅程列表"
            >
              <ArrowLeft size={14} />
              <span>回旅程列表</span>
            </button>
            {isSaving && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-brand-200 bg-black/20 px-3 py-1 rounded-full animate-pulse">
                <RefreshCw size={12} className="animate-spin" />
                儲存中
              </div>
            )}
            <button
              onClick={onSettingsOpen}
              className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition-all active:scale-95 border border-white/10 shadow-sm"
              title="設定"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>

        {/* Main Title Area */}
        <div className={`relative transition-all duration-500 ease-in-out overflow-hidden ${isScrolled ? 'max-h-0 opacity-0' : 'max-h-40 opacity-100'}`}>
          <h1 className="text-3xl font-bold mb-2 tracking-tight leading-tight drop-shadow-md">
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

