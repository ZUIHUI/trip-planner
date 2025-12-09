import React from 'react';
import { Plane, Home, Settings, ShoppingCart, Calendar, Map, CheckSquare, Luggage, Ticket, LayoutDashboard, RefreshCw, DollarSign } from 'lucide-react';

const Header = ({ details, activeTab, onTabChange, onSettingsOpen, isSaving, children }) => {
  const tabs = [
    { id: 'summary', label: '總覽', icon: LayoutDashboard },
    { id: 'itinerary', label: '行程', icon: Map },
    { id: 'expenses', label: '記帳', icon: DollarSign },
    { id: 'shopping', label: '購物', icon: ShoppingCart },
    { id: 'preTrip', label: '行前', icon: CheckSquare },
    { id: 'packing', label: '行李', icon: Luggage },
    { id: 'flights', label: '資訊', icon: Ticket },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 sticky top-0 z-30 shadow-sm transition-colors duration-300">
      {/* Main Header Content - Gradient Background */}
      <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 text-white pt-12 pb-6 px-6 rounded-b-[2rem] shadow-lg relative overflow-hidden transition-colors duration-500">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4 pointer-events-none">
          <Plane size={200} />
        </div>
        <div className="absolute bottom-0 left-0 opacity-5 transform -translate-x-1/4 translate-y-1/4 pointer-events-none">
          <Map size={150} />
        </div>

        {/* Top Bar: Date & Actions */}
        <div className="relative flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10 shadow-sm">
            <Calendar size={14} className="text-brand-100" />
            <span className="text-xs font-medium text-brand-50 tracking-wide">{details?.dates || '未設定日期'}</span>
          </div>
          
          <div className="flex items-center gap-3">
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
        <div className="relative">
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

      {/* Scrollable Tab Navigation */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
        <div className="flex overflow-x-auto px-4 py-2 gap-2 no-scrollbar snap-x">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all snap-start
                  ${isActive 
                    ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 shadow-sm scale-105 ring-1 ring-brand-100 dark:ring-brand-800' 
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
                  }
                `}
              >
                <Icon size={18} className={isActive ? 'stroke-[2.5px]' : 'stroke-2'} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-header Content (Sticky) */}
      {children && (
        <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
          {children}
        </div>
      )}
    </div>
  );
};

export default Header;


