import React, { useState } from 'react';

const Checklist = ({ items = [], onAddItem, onToggleItem, onDeleteItem, title = "清單" }) => {
  const [inputValue, setInputValue] = useState('');

  const handleAddItem = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      onAddItem(inputValue);
      setInputValue('');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
      <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-4">{title}</h3>

      <div className="space-y-2 mb-4">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-3 group">
            <input
              type="checkbox"
              checked={item.done || false}
              onChange={() => onToggleItem(item.id)}
              className="rounded text-brand-600 cursor-pointer"
            />
            <span className={`flex-1 ${item.done ? 'line-through text-gray-400 dark:text-slate-500' : 'text-gray-700 dark:text-slate-300'}`}>
              {item.text}
            </span>
            <button
              onClick={() => onDeleteItem(item.id)}
              className="touch-target opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
              title={`刪除 ${item.text}`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleAddItem}
        placeholder="+ 新增待辦事項 (Enter)"
        className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg p-2 text-sm focus:outline-none focus:border-brand-400 dark:text-slate-200"
      />
    </div>
  );
};

export default Checklist;
