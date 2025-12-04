import React, { useState } from 'react';
import { X, MapPin, Zap, Users, Plus, Trash2 } from 'lucide-react';

const SettingsPanel = ({ isOpen, onClose, enableGPS, onGPSToggle, travelers = [], onUpdateTravelers }) => {
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold text-gray-900">設定</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Settings Content */}
        <div className="p-6 space-y-6">
          {/* 成員設定 */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Users size={20} className="text-purple-600" />
              旅程成員
            </h3>
            
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <div className="space-y-2 mb-4">
                {travelers.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-2">尚未新增成員</p>
                ) : (
                  travelers.map(traveler => (
                    <div key={traveler.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-purple-100">
                      <span className="font-medium text-gray-800">{traveler.name}</span>
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
                  className="flex-1 bg-white border border-purple-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400"
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
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <MapPin size={20} className="text-blue-600" />
              位置設定
            </h3>

            {/* GPS 開關 */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-gray-300 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 mb-1">啟用 GPS 定位</h4>
                  <p className="text-sm text-gray-600">
                    使用設備位置獲取當前位置的天氣資訊
                  </p>
                </div>
                <button
                  onClick={onGPSToggle}
                  className={`ml-4 relative inline-flex h-8 w-14 items-center rounded-full transition-colors flex-shrink-0 ${
                    enableGPS ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      enableGPS ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                {enableGPS ? '✓ GPS 已啟用' : '✗ GPS 已禁用'}
              </p>
            </div>
          </div>

          {/* 天氣優先級說明 */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Zap size={20} className="text-amber-600" />
              天氣資訊優先級
            </h3>

            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 space-y-3">
              <div className="flex gap-3">
                <span className="font-bold text-blue-700 text-lg flex-shrink-0">1</span>
                <div>
                  <p className="font-bold text-gray-900">選中的行程地點</p>
                  <p className="text-sm text-gray-600">點擊行程卡片時顯示該地點的天氣</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="font-bold text-blue-700 text-lg flex-shrink-0">2</span>
                <div>
                  <p className="font-bold text-gray-900">第一個行程的地點</p>
                  <p className="text-sm text-gray-600">未選中時顯示當天第一個行程的天氣</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="font-bold text-blue-700 text-lg flex-shrink-0">3</span>
                <div>
                  <p className="font-bold text-gray-900">當前 GPS 位置</p>
                  <p className="text-sm text-gray-600">GPS 啟用時顯示設備當前位置的天氣</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="font-bold text-blue-700 text-lg flex-shrink-0">4</span>
                <div>
                  <p className="font-bold text-gray-900">住宿地點</p>
                  <p className="text-sm text-gray-600">最終備用位置，顯示住宿地點的天氣</p>
                </div>
              </div>
            </div>
          </div>

          {/* 版本資訊 */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Trip Planner v1.0.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
