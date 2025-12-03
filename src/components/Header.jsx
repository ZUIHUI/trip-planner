import React, { useState, useEffect } from 'react';
import { Plane, Home } from 'lucide-react';

const Header = ({ details, activeTab, onTabChange }) => {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsCompact(window.scrollY > 30);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
  <div className={`bg-gradient-to-r from-blue-600 to-indigo-700 px-6 text-white rounded-b-3xl shadow-lg relative overflow-hidden transition-all duration-200 ${
    isCompact ? 'pt-4 pb-1' : 'pt-12 pb-3'
  }`}>
    <div className="absolute top-0 right-0 opacity-10 transform translate-x-10 -translate-y-10">
      <Plane size={150} />
    </div>
    <p className={`text-blue-100 font-medium tracking-wider transition-all duration-200 ${isCompact ? 'text-xs mb-0' : 'text-sm mb-1'}`}>
      {isCompact ? details?.title : details?.dates || '未設定'}
    </p>
    {!isCompact && (
      <>
        <h1 className="text-3xl font-bold mb-2">{details?.title || '旅程'}</h1>
        <div className="flex items-center space-x-2 text-blue-100 text-sm mb-4">
          <Home size={16} />
          <span>{details?.accommodation?.name || '未設定住宿'}</span>
        </div>
      </>
    )}
    
    {/* 導覽列 - 響應式設計 */}
    <div className={`flex justify-center gap-1 flex-wrap transition-all duration-200 ${isCompact ? 'pb-0' : 'pb-1'}`}>
      <button onClick={() => onTabChange('summary')} className={`rounded-lg font-bold transition-colors ${isCompact ? 'text-xs px-1.5 py-0.5' : 'text-sm px-4 py-2'} ${
        activeTab === 'summary' ? 'bg-white text-blue-600' : 'bg-blue-500 text-white hover:bg-blue-400'
      }`}>總覽</button>
      <button onClick={() => onTabChange('itinerary')} className={`rounded-lg font-bold transition-colors ${isCompact ? 'text-xs px-1.5 py-0.5' : 'text-sm px-4 py-2'} ${
        activeTab === 'itinerary' ? 'bg-white text-blue-600' : 'bg-blue-500 text-white hover:bg-blue-400'
      }`}>行程表</button>
      <button onClick={() => onTabChange('checklist')} className={`rounded-lg font-bold transition-colors ${isCompact ? 'text-xs px-1.5 py-0.5' : 'text-sm px-4 py-2'} ${
        activeTab === 'checklist' ? 'bg-white text-blue-600' : 'bg-blue-500 text-white hover:bg-blue-400'
      }`}>清單</button>
      <button onClick={() => onTabChange('flights')} className={`rounded-lg font-bold transition-colors ${isCompact ? 'text-xs px-1.5 py-0.5' : 'text-sm px-4 py-2'} ${
        activeTab === 'flights' ? 'bg-white text-blue-600' : 'bg-blue-500 text-white hover:bg-blue-400'
      }`}>機票/住宿</button>
    </div>
  </div>
  );
};

export default Header;
