import React from 'react';
import { X, MapPin, Zap } from 'lucide-react';

const SettingsPanel = ({ isOpen, onClose, enableGPS, onGPSToggle }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
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
