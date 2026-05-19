import React, { useEffect, useState } from 'react';
import {
  CheckSquare,
  DollarSign,
  LayoutDashboard,
  Luggage,
  Map,
  Menu,
  ShoppingCart,
  Ticket,
  X
} from 'lucide-react';

const mainTabs = [
  { id: 'summary', label: '總覽', icon: LayoutDashboard },
  { id: 'itinerary', label: '行程', icon: Map },
  { id: 'expenses', label: '記帳', icon: DollarSign },
  { id: 'shopping', label: '購物', icon: ShoppingCart }
];

const secondaryTabs = [
  { id: 'preTrip', label: '行前', icon: CheckSquare },
  { id: 'packing', label: '行李', icon: Luggage },
  { id: 'flights', label: '資訊', icon: Ticket }
];

const BottomNavigation = ({ activeTab, onTabChange, isModalOpen = false }) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleTabChange = (tabId) => {
    onTabChange(tabId);
    setShowMenu(false);
  };

  useEffect(() => {
    if (isModalOpen) {
      setShowMenu(false);
    }
  }, [isModalOpen]);

  return (
    <>
      <nav
        className={`fixed bottom-0 left-0 right-0 z-[var(--z-bottom-nav)] border-t border-slate-200 bg-white/95 pb-2 shadow-2xl transition-all duration-200 supports-[backdrop-filter]:backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 ${
          isModalOpen ? 'pointer-events-none translate-y-full opacity-0' : 'pointer-events-auto translate-y-0 opacity-100'
        }`}
        aria-label="主要功能導覽"
      >
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-1 px-2">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`touch-target flex flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-xs font-bold transition active:scale-[0.98] ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                }`}
                aria-current={isActive ? 'page' : undefined}
                aria-label={tab.label}
                title={tab.label}
              >
                <Icon size={22} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setShowMenu((prev) => !prev)}
            className={`touch-target flex flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-xs font-bold transition active:scale-[0.98] ${
              showMenu
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
            }`}
            aria-expanded={showMenu}
            aria-label="更多功能"
            title="更多"
          >
            <Menu size={22} />
            <span>更多</span>
          </button>
        </div>

        {showMenu && (
          <div className="absolute bottom-full right-2 mb-2 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 p-3 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white">更多選項</h3>
              <button
                type="button"
                onClick={() => setShowMenu(false)}
                className="touch-target inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="關閉更多選單"
                title="關閉"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-1.5">
              {secondaryTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={`touch-target flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${
                      isActive
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                        : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      <div className="h-16" />
    </>
  );
};

export default BottomNavigation;
