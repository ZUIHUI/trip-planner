import React, { useEffect, useState } from 'react';
import { 
  Map, Home, DollarSign, ShoppingCart, CheckSquare, 
  Luggage, Ticket, Menu, X, LayoutDashboard 
} from 'lucide-react';

const BottomNavigation = ({ activeTab, onTabChange, isModalOpen = false }) => {
  const [showMenu, setShowMenu] = useState(false);

  // 主要導航（底部顯示）
  const mainTabs = [
    { id: 'summary', label: '總覽', icon: LayoutDashboard },
    { id: 'itinerary', label: '行程', icon: Map },
    { id: 'expenses', label: '記帳', icon: DollarSign },
    { id: 'shopping', label: '購物', icon: ShoppingCart },
  ];

  // 次要導航（菜單中顯示）
  const secondaryTabs = [
    { id: 'preTrip', label: '行前', icon: CheckSquare },
    { id: 'packing', label: '行李', icon: Luggage },
    { id: 'flights', label: '資訊', icon: Ticket },
  ];

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
      {/* Bottom Navigation Bar */}
      <div className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 shadow-2xl z-[var(--z-bottom-nav)] pb-2 transition-all duration-200 ${isModalOpen ? 'opacity-0 pointer-events-none translate-y-full' : 'opacity-100 pointer-events-auto translate-y-0'}`}>
        <div className="flex justify-between items-center h-16 px-2 gap-2">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`touch-target flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg transition-all active:scale-95 min-h-16 ${
                  isActive
                    ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                }`}
                title={tab.label}
              >
                <Icon size={24} />
                <span className="text-xs font-semibold truncate">{tab.label}</span>
              </button>
            );
          })}

          {/* Menu Button */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={`touch-target flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg transition-all active:scale-95 min-h-16 ${
              showMenu
                ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
            }`}
            title="更多"
          >
            <Menu size={24} />
            <span className="text-xs font-semibold">更多</span>
          </button>
        </div>

        {/* Menu Popup */}
        {showMenu && (
          <div className="absolute bottom-full right-0 mb-2 mr-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden w-52 z-[var(--z-modal)]">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-slate-700">
              <h3 className="font-bold text-gray-800 dark:text-white">更多選項</h3>
              <button
                onClick={() => setShowMenu(false)}
                className="touch-target p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-400"
                aria-label="關閉更多選單"
                title="關閉"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-2">
              {secondaryTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`touch-target w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                      isActive
                        ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
                        : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Spacer to prevent content overlap */}
      <div className="h-16" />
    </>
  );
};

export default BottomNavigation;
