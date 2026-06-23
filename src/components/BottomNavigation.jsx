import React from 'react';
import { motion } from 'motion/react';
import {
  CheckSquare,
  Compass,
  DollarSign,
  LayoutDashboard,
  Luggage,
  Map,
  Menu,
  ShoppingCart,
  Star,
  Ticket,
  UsersRound,
} from 'lucide-react';

const mobileTabs = [
  { id: 'today', label: '旅途', icon: Compass },
  { id: 'itinerary', label: '行程', icon: Map },
  { id: 'ideas', label: '想去', icon: Star },
  { id: 'more', label: '更多', icon: Menu }
];

const desktopTabs = [
  { id: 'today', label: '旅途', icon: Compass },
  { id: 'summary', label: '總覽', icon: LayoutDashboard },
  { id: 'itinerary', label: '行程', icon: Map },
  { id: 'ideas', label: '想去', icon: Star },
  { id: 'flights', label: '資訊', icon: Ticket },
  { id: 'preTrip', label: '行前', icon: CheckSquare },
  { id: 'packing', label: '行李', icon: Luggage },
  { id: 'expenses', label: '記帳', icon: DollarSign },
  { id: 'shopping', label: '購物', icon: ShoppingCart },
  { id: 'companions', label: '旅伴', icon: UsersRound }
];

const mobileMoreTabIds = [
  'summary',
  'flights',
  'preTrip',
  'packing',
  'expenses',
  'shopping',
  'companions',
  'more'
];

const PresenceTabMarker = ({ count = 0 }) => {
  if (!count) return null;

  return (
    <motion.span
      className="tp-status-pulse absolute right-1.5 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-black leading-none text-white shadow-sm ring-2 ring-white dark:ring-slate-900"
      title={`${count} 位旅伴在這裡`}
      aria-label={`${count} 位旅伴在這裡`}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 560, damping: 32, mass: 0.5 }}
    >
      {count > 1 ? count : ''}
    </motion.span>
  );
};

const BottomNavigation = ({ activeTab, onTabChange, isModalOpen = false, presenceByTab = {} }) => {
  const handleTabChange = (tabId) => {
    onTabChange(tabId);
  };

  const getMobilePresenceCount = (tabId) => {
    if (tabId === 'more') {
      return mobileMoreTabIds.reduce((total, id) => total + Number(presenceByTab?.[id] || 0), 0);
    }

    return Number(presenceByTab?.[tabId] || 0);
  };

  const isMobileTabActive = (tabId) => (
    tabId === 'more'
      ? mobileMoreTabIds.includes(activeTab)
      : activeTab === tabId
  );

  return (
    <>
      <nav
        className={`tp-ambient-dock fixed bottom-0 left-0 right-0 z-[var(--z-bottom-nav)] border-t border-[#e0e9e0] bg-white/[0.86] pb-[calc(0.625rem+env(safe-area-inset-bottom))] transition-all duration-200 supports-[backdrop-filter]:backdrop-blur lg:bottom-4 lg:left-1/2 lg:right-auto lg:w-[min(1080px,calc(100vw-3rem))] lg:-translate-x-1/2 lg:rounded-lg lg:border lg:border-[#e0e9e0] lg:pb-0 dark:border-brand-200/20 dark:bg-[#09100d]/[0.94] ${
          isModalOpen ? 'pointer-events-none translate-y-full opacity-0' : 'pointer-events-auto translate-y-0 opacity-100'
        }`}
        aria-label="主要功能導覽"
      >
        <div className="mx-auto flex h-[4.5rem] max-w-4xl items-center gap-2 px-3 lg:hidden">
          {mobileTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = isMobileTabActive(tab.id);
            return (
              <motion.button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                layout
                animate={{ y: isActive ? -1 : 0, scale: isActive ? 1.01 : 1 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.58 }}
                className={`touch-target tp-press-feedback relative flex flex-1 flex-col items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-bold transition-all duration-200 active:scale-[0.98] ${
                  isActive
                    ? 'tp-nav-active bg-white/95 text-brand-800 shadow-sm ring-1 ring-brand-100 dark:bg-brand-100/70 dark:text-brand-900 dark:ring-brand-300/20'
                    : 'text-stone-500 hover:bg-brand-50/70 hover:text-brand-800 dark:text-brand-700 dark:hover:bg-brand-100/55 dark:hover:text-brand-900'
                }`}
                aria-current={isActive ? 'page' : undefined}
                aria-label={tab.label}
                title={tab.label}
              >
                <PresenceTabMarker count={getMobilePresenceCount(tab.id)} />
                <Icon size={22} className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                <span className="truncate">{tab.label}</span>
              </motion.button>
            );
          })}
        </div>

        <div className="mx-auto hidden h-[4.5rem] max-w-7xl items-center gap-2 px-3 lg:flex">
          {desktopTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                layout
                animate={{ y: isActive ? -1 : 0, scale: isActive ? 1.008 : 1 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.58 }}
                className={`touch-target tp-press-feedback relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-lg px-2.5 py-2.5 text-xs font-bold transition-all duration-200 active:scale-[0.98] ${
                  isActive
                    ? 'tp-nav-active bg-white/95 text-brand-800 shadow-sm ring-1 ring-brand-100 dark:bg-brand-100/70 dark:text-brand-900 dark:ring-brand-300/20'
                    : 'text-stone-500 hover:bg-brand-50/70 hover:text-brand-800 dark:text-brand-700 dark:hover:bg-brand-100/55 dark:hover:text-brand-900'
                }`}
                aria-current={isActive ? 'page' : undefined}
                aria-label={tab.label}
                title={tab.label}
              >
                <PresenceTabMarker count={presenceByTab?.[tab.id] || 0} />
                <Icon size={21} className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                <span className="max-w-full truncate">{tab.label}</span>
              </motion.button>
            );
          })}
        </div>
      </nav>

      <div className="h-[calc(5.75rem+env(safe-area-inset-bottom))] lg:h-28" />
    </>
  );
};

export default BottomNavigation;
