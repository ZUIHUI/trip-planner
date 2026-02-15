import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

const QuickAddEventForm = ({ onSubmit, onClose, isOpen }) => {
  const [formData, setFormData] = useState({
    time: '',
    title: '',
    type: 'sightseeing'
  });

  const eventTypes = [
    { id: 'flight', label: '✈️ 航班' },
    { id: 'transport', label: '🚆 交通' },
    { id: 'sightseeing', label: '📸 景點' },
    { id: 'food', label: '🍽️ 餐飲' },
    { id: 'shopping', label: '🛍️ 購物' },
    { id: 'hotel', label: '🏨 住宿' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.time && formData.title) {
      onSubmit({
        ...formData,
        id: Date.now(),
        desc: '',
        location: '',
        memos: [],
        cost: 0,
        currency: 'JPY',
        urgent: false
      });
      setFormData({ time: '', title: '', type: 'sightseeing' });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal - Positioned at bottom for mobile */}
      <div className="fixed bottom-20 left-0 right-0 bg-white dark:bg-slate-800 rounded-t-3xl shadow-2xl z-50 max-h-96 overflow-y-auto transform transition-all">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">快速新增行程</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-400 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Time Input - Large for mobile */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
              時間（HH:MM）
            </label>
            <input
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="w-full px-4 py-3 text-lg border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-700/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
              標題（必填）
            </label>
            <input
              type="text"
              placeholder="例：晴空塔"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-700/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              maxLength={50}
            />
          </div>

          {/* Type Selection - Grid for quick access */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
              行程類型
            </label>
            <div className="grid grid-cols-3 gap-2">
              {eventTypes.map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: type.id })}
                  className={`p-3 rounded-lg text-sm font-bold transition-all ${
                    formData.type === type.id
                      ? 'bg-brand-500 text-white ring-2 ring-brand-600'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300 font-bold hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!formData.time || !formData.title}
              className="flex-1 px-4 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 dark:disabled:bg-slate-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              新增
            </button>
          </div>

          <p className="text-xs text-gray-500 dark:text-slate-400 text-center mt-3">
            💡 更多詳情可稍後編輯
          </p>
        </form>
      </div>
    </>
  );
};

export default QuickAddEventForm;
