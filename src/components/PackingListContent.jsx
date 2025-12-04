import React, { useState } from 'react';
import { Plus, Trash2, Briefcase, Luggage, Shirt, Package } from 'lucide-react';

const PackingListContent = ({ items = [], onUpdate }) => {
  const [newItemText, setNewItemText] = useState('');
  const [activeCategory, setActiveCategory] = useState('suitcase');

  const categories = [
    { id: 'suitcase', name: '行李箱', icon: <Luggage size={20} />, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    { id: 'carryOn', name: '隨身包', icon: <Briefcase size={20} />, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
    { id: 'clothing', name: '每日衣服', icon: <Shirt size={20} />, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
    { id: 'other', name: '其他', icon: <Package size={20} />, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' }
  ];

  const handleAddItem = (category) => {
    if (!newItemText.trim()) return;
    
    const newItem = {
      id: Date.now(),
      text: newItemText,
      done: false,
      category: category
    };
    
    onUpdate([...items, newItem]);
    setNewItemText('');
  };

  const handleToggleItem = (id) => {
    const newItems = items.map(item => 
      item.id === id ? { ...item, done: !item.done } : item
    );
    onUpdate(newItems);
  };

  const handleDeleteItem = (id) => {
    if (window.confirm('確定要刪除此項目嗎？')) {
      const newItems = items.filter(item => item.id !== id);
      onUpdate(newItems);
    }
  };

  // Group items by category
  const getItemsByCategory = (catId) => {
    return items.filter(item => {
      if (catId === 'other') {
        return item.category === 'other' || !item.category; // Handle legacy items
      }
      return item.category === catId;
    });
  };

  return (
    <div className="space-y-6">
      {categories.map(cat => (
        <div key={cat.id} className={`rounded-xl shadow-sm border ${cat.border} overflow-hidden`}>
          <div className={`${cat.bg} p-4 border-b ${cat.border} flex items-center gap-2`}>
            <span className={cat.color}>{cat.icon}</span>
            <h3 className={`font-bold ${cat.color}`}>{cat.name}</h3>
            <span className="ml-auto text-xs font-medium px-2 py-1 bg-white/50 rounded-full text-gray-600">
              {getItemsByCategory(cat.id).filter(i => i.done).length} / {getItemsByCategory(cat.id).length}
            </span>
          </div>
          
          <div className="p-4 bg-white">
            <div className="space-y-2 mb-4">
              {getItemsByCategory(cat.id).length === 0 ? (
                <p className="text-sm text-gray-400 italic text-center py-2">尚無項目</p>
              ) : (
                getItemsByCategory(cat.id).map(item => (
                  <div key={item.id} className="flex items-center gap-3 group hover:bg-gray-50 p-2 rounded-lg transition-colors">
                    <input
                      type="checkbox"
                      checked={item.done || false}
                      onChange={() => handleToggleItem(item.id)}
                      className={`w-5 h-5 rounded border-gray-300 focus:ring-offset-0 cursor-pointer ${
                        cat.id === 'suitcase' ? 'text-blue-600 focus:ring-blue-500' :
                        cat.id === 'carryOn' ? 'text-amber-600 focus:ring-amber-500' :
                        cat.id === 'clothing' ? 'text-purple-600 focus:ring-purple-500' :
                        'text-gray-600 focus:ring-gray-500'
                      }`}
                    />
                    <span className={`flex-1 ${item.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {item.text}
                    </span>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder={`+ 新增至${cat.name}...`}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:border-blue-400 transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setNewItemText(e.target.value);
                    // Use a timeout to ensure state update before adding (or just pass value directly)
                    // Actually, better to just use e.target.value directly in a local handler or modify handleAddItem
                    if (e.target.value.trim()) {
                        const newItem = {
                            id: Date.now(),
                            text: e.target.value,
                            done: false,
                            category: cat.id
                        };
                        onUpdate([...items, newItem]);
                        e.target.value = '';
                    }
                  }
                }}
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                <Plus size={16} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PackingListContent;
