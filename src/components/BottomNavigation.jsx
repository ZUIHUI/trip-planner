import React from 'react';
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
    <span
      className="tp-status-pulse tp-pop absolute right-1.5 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-black leading-none text-white shadow-sm ring-2 ring-white dark:ring-slate-900"
      title={`${count} 位旅伴在這裡`}
      aria-label={`${count} 位旅伴在這裡`}
    >
      {count > 1 ? count : ''}
    </span>
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
        className={`fixed bottom-0 left-0 right-0 z-[var(--z-bottom-nav)] border-t border-cyan-100 bg-white/95 pb-2 shadow-[0_-18px_44px_-34px_rgba(14,165,233,0.72)] transition-all duration-200 supports-[backdrop-filter]:backdrop-blur lg:bottom-4 lg:left-1/2 lg:right-auto lg:w-[min(960px,calc(100vw-3rem))] lg:-translate-x-1/2 lg:rounded-lg lg:border lg:border-cyan-100 lg:pb-0 dark:border-slate-800 dark:bg-slate-900/95 ${
          isModalOpen ? 'pointer-events-none translate-y-full opacity-0' : 'pointer-events-auto translate-y-0 opacity-100'
        }`}
        aria-label="主要功能導覽"
      >
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-1 px-2 lg:hidden">
          {mobileTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = isMobileTabActive(tab.id);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`touch-target tp-press-feedback relative flex flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-xs font-bold transition-all duration-200 active:scale-[0.98] ${
                  isActive
                    ? 'bg-gradient-to-br from-sky-50 via-brand-50 to-rose-50 text-brand-800 shadow-sm ring-1 ring-cyan-100 dark:from-brand-950/40 dark:via-slate-900 dark:to-violet-950/30 dark:text-brand-200 dark:ring-brand-900/60'
                    : 'text-slate-500 hover:bg-sky-50 hover:text-brand-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                }`}
                aria-current={isActive ? 'page' : undefined}
                aria-label={tab.label}
                title={tab.label}
              >
                <PresenceTabMarker count={getMobilePresenceCount(tab.id)} />
                <Icon size={22} className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mx-auto hidden h-16 max-w-6xl items-center gap-1 px-2 lg:flex">
          {desktopTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`touch-target tp-press-feedback relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-bold transition-all duration-200 active:scale-[0.98] ${
                  isActive
                    ? 'bg-gradient-to-br from-sky-50 via-brand-50 to-rose-50 text-brand-800 shadow-sm ring-1 ring-cyan-100 dark:from-brand-950/40 dark:via-slate-900 dark:to-violet-950/30 dark:text-brand-200 dark:ring-brand-900/60'
                    : 'text-slate-500 hover:bg-sky-50 hover:text-brand-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                }`}
                aria-current={isActive ? 'page' : undefined}
                aria-label={tab.label}
                title={tab.label}
              >
                <PresenceTabMarker count={presenceByTab?.[tab.id] || 0} />
                <Icon size={21} className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                <span className="max-w-full truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="h-16 lg:h-24" />
    </>
  );
};

export default BottomNavigation;
