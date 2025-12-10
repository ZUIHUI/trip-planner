import React, { useState } from 'react';
import { X, MapPin, Zap, Users, Plus, Trash2, Palette, Check, Type, Sun, Moon } from 'lucide-react';

const SettingsPanel = ({ isOpen, onClose, enableGPS, onGPSToggle, travelers = [], onUpdateTravelers, currentTheme, onThemeChange, interfaceSize, onInterfaceSizeChange, exchangeRate, onExchangeRateChange, onUpdateRate, lastUpdateDate }) => {
  const [newTravelerName, setNewTravelerName] = useState('');

  if (!isOpen) return null;

  const handleAddTraveler = () => {
    if (newTravelerName.trim()) {
      const newTraveler = {
        id: Date.now().toString(),
        name: newTravelerName.trim()
      };
      onUpdateTravelers([...travelers, newTraveler]);
      setNewTravelerName('');
    }
  };

  const handleDeleteTraveler = (id) => {
    if (window.confirm('確定要刪除此成員嗎？')) {
      onUpdateTravelers(travelers.filter(t => t.id !== id));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">設定</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Settings Content */}
        <div className="p-6 space-y-6">
          {/* 主題設定 */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Palette size={20} className="text-brand-600 dark:text-brand-400" />
              外觀模式
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onThemeChange('light')}
                className={`
                  relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                  ${currentTheme === 'light' 
                    ? 'border-brand-500 bg-brand-50 text-brand-700' 
                    : 'border-transparent bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}
                `}
              >
                <Sun size={24} className={currentTheme === 'light' ? 'text-brand-500' : 'text-gray-400'} />
                <span className="font-bold">日間模式</span>
                {currentTheme === 'light' && (
                  <div className="absolute top-2 right-2">
                    <Check size={16} className="text-brand-500" />
                  </div>
                )}
              </button>

              <button
                onClick={() => onThemeChange('dark')}
                className={`
                  relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                  ${currentTheme === 'dark' 
                    ? 'border-brand-500 bg-gray-800 text-white' 
                    : 'border-transparent bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}
                `}
              >
                <Moon size={24} className={currentTheme === 'dark' ? 'text-brand-400' : 'text-gray-400'} />
                <span className="font-bold">夜間模式</span>
                {currentTheme === 'dark' && (
                  <div className="absolute top-2 right-2">
                    <Check size={16} className="text-brand-500" />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* 介面大小設定 */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Type size={20} className="text-brand-600 dark:text-brand-400" />
              介面大小
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'small', name: '精簡 (小)', iconSize: 'text-sm' },
                { id: 'medium', name: '標準 (中)', iconSize: 'text-base' },
                { id: 'large', name: '寬鬆 (大)', iconSize: 'text-lg' },
              ].map((size) => (
                <button
                  key={size.id}
                  onClick={() => onInterfaceSizeChange(size.id)}
                  className={`
                    relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all
                    ${interfaceSize === size.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'}
                  `}
                >
                  <span className={`font-bold text-gray-700 dark:text-gray-300 ${size.iconSize}`}>A</span>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{size.name}</span>
                  {interfaceSize === size.id && (
                    <div className="absolute top-2 right-2">
                      <Check size={14} className="text-brand-500" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 匯率設定 */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <span className="text-xl">💱</span>
              匯率設定 (JPY → TWD)
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-4 mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  1 日圓 = 
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={exchangeRate || ''}
                  onChange={(e) => onExchangeRateChange(parseFloat(e.target.value))}
                  className="w-24 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-500 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-brand-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">台幣</span>
                
                <button 
                  onClick={onUpdateRate}
                  className="ml-auto px-3 py-1.5 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-xs font-bold rounded-lg hover:bg-brand-200 dark:hover:bg-brand-900/50 transition-colors flex items-center gap-1"
                >
                  <span className="text-lg">↻</span> 更新
                </button>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                <span>此匯率將用於計算預算總覽及顯示換算金額。</span>
                {lastUpdateDate && <span>更新於: {lastUpdateDate}</span>}
              </div>
            </div>
          </div>

          {/* 成員設定 */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Users size={20} className="text-purple-600 dark:text-purple-400" />
              旅程成員
            </h3>
            
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-900/30">
              <div className="space-y-2 mb-4">
                {travelers.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">尚未新增成員</p>
                ) : (
                  travelers.map(traveler => (
                    <div key={traveler.id} className="flex items-center justify-between bg-white dark:bg-gray-700 p-2 rounded-lg border border-purple-100 dark:border-purple-800">
                      <span className="font-medium text-gray-800 dark:text-gray-200">{traveler.name}</span>
                      <button 
                        onClick={() => handleDeleteTraveler(traveler.id)}
                        className="text-gray-400 hover:text-red-500 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTravelerName}
                  onChange={(e) => setNewTravelerName(e.target.value)}
                  placeholder="輸入成員姓名"
                  className="flex-1 bg-white dark:bg-gray-700 border border-purple-200 dark:border-purple-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400 dark:text-gray-200"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTraveler()}
                />
                <button
                  onClick={handleAddTraveler}
                  disabled={!newTravelerName.trim()}
                  className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* GPS 設定 */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <MapPin size={20} className="text-brand-600 dark:text-brand-400" />
              位置設定
            </h3>

            {/* GPS 開關 */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1">啟用 GPS 定位</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    使用設備位置獲取當前位置的天氣資訊
                  </p>
                </div>
                <button
                  onClick={onGPSToggle}
                  className={`ml-4 relative inline-flex h-8 w-14 items-center rounded-full transition-colors flex-shrink-0 ${
                    enableGPS ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      enableGPS ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                {enableGPS ? '✓ GPS 已啟用' : '✗ GPS 已禁用'}
              </p>
            </div>
          </div>

          {/* 天氣優先級說明 */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Zap size={20} className="text-amber-600" />
              天氣資訊優先級
            </h3>

            <div className="bg-brand-50 dark:bg-brand-900/20 rounded-xl p-4 border border-brand-200 dark:border-brand-900/30 space-y-3">
              <div className="flex gap-3">
                <span className="font-bold text-brand-700 dark:text-brand-400 text-lg flex-shrink-0">1</span>
                <div>
                  <p className="font-bold text-gray-900 dark:text-gray-100">選中的行程地點</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">點擊行程卡片時顯示該地點的天氣</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="font-bold text-brand-700 dark:text-brand-400 text-lg flex-shrink-0">2</span>
                <div>
                  <p className="font-bold text-gray-900 dark:text-gray-100">第一個行程的地點</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">未選中時顯示當天第一個行程的天氣</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="font-bold text-brand-700 dark:text-brand-400 text-lg flex-shrink-0">3</span>
                <div>
                  <p className="font-bold text-gray-900 dark:text-gray-100">當前 GPS 位置</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">GPS 啟用時顯示設備當前位置的天氣</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="font-bold text-brand-700 dark:text-brand-400 text-lg flex-shrink-0">4</span>
                <div>
                  <p className="font-bold text-gray-900 dark:text-gray-100">住宿地點</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">最終備用位置，顯示住宿地點的天氣</p>
                </div>
              </div>
            </div>
          </div>

          {/* 版本資訊 */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Trip Planner v1.0.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
