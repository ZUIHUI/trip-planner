import React from 'react';
import { Plane, Home, Settings, ShoppingCart, Cloud, RefreshCw } from 'lucide-react';

const Header = ({ details, activeTab, onTabChange, onSettingsOpen, isSaving }) => (
  <div className="bg-gradient-to-r from-blue-600 to-indigo-700 pt-12 pb-3 px-6 text-white rounded-b-3xl shadow-lg relative overflow-hidden">
    <div className="absolute top-0 right-0 opacity-10 transform translate-x-10 -translate-y-10">
      <Plane size={150} />
    </div>
    <div className="flex justify-between items-start">
      <p className="text-blue-100 text-sm font-medium tracking-wider mb-1">{details?.dates || '未設定'}</p>
      {isSaving && (
        <div className="flex items-center gap-1 text-xs text-blue-200 bg-white/10 px-2 py-1 rounded-full animate-pulse">
          <RefreshCw size={12} className="animate-spin" />
          儲存中...
        </div>
      )}
    </div>
    <h1 className="text-3xl font-bold mb-2">{details?.title || '旅程'}</h1>
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-2 text-blue-100 text-sm">
        <Home size={16} />
        <span>{details?.accommodation?.name || '未設定住宿'}</span>
      </div>
      {/* 設定按鈕 */}
      <button
        onClick={onSettingsOpen}
        className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
        title="開啟設定"
      >
        <Settings size={20} className="text-white" />
      </button>
    </div>
    
    {/* 導覽列 - 響應式設計 */}
    <div className="flex justify-center gap-1 flex-wrap pb-1">
      <button onClick={() => onTabChange('summary')} className={`rounded-lg font-bold transition-colors text-sm px-4 py-2 ${
        activeTab === 'summary' ? 'bg-white text-blue-600' : 'bg-blue-500 text-white hover:bg-blue-400'
      }`}>總覽</button>
      <button onClick={() => onTabChange('itinerary')} className={`rounded-lg font-bold transition-colors text-sm px-4 py-2 ${
        activeTab === 'itinerary' ? 'bg-white text-blue-600' : 'bg-blue-500 text-white hover:bg-blue-400'
      }`}>行程表</button>
      <button onClick={() => onTabChange('preTrip')} className={`rounded-lg font-bold transition-colors text-sm px-4 py-2 ${
        activeTab === 'preTrip' ? 'bg-white text-blue-600' : 'bg-blue-500 text-white hover:bg-blue-400'
      }`}>行前</button>
      <button onClick={() => onTabChange('packing')} className={`rounded-lg font-bold transition-colors text-sm px-4 py-2 ${
        activeTab === 'packing' ? 'bg-white text-blue-600' : 'bg-blue-500 text-white hover:bg-blue-400'
      }`}>行李</button>
      <button onClick={() => onTabChange('flights')} className={`rounded-lg font-bold transition-colors text-sm px-4 py-2 ${
        activeTab === 'flights' ? 'bg-white text-blue-600' : 'bg-blue-500 text-white hover:bg-blue-400'
      }`}>機票/住宿</button>
      <button onClick={() => onTabChange('shopping')} className={`rounded-lg font-bold transition-colors text-sm px-4 py-2 ${
        activeTab === 'shopping' ? 'bg-white text-orange-600' : 'bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:from-amber-500 hover:to-orange-600'
      } flex items-center gap-1`} title="打開購物清單">
        <ShoppingCart size={18} />
        購物
      </button>
    </div>
  </div>
);

export default Header;


