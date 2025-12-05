import React, { useState } from 'react';
import { Plus, Trash2, Briefcase, Luggage, Shirt, Package, User, GripVertical } from 'lucide-react';
import DaySelector from './DaySelector';

const PackingListContent = ({ items = [], onUpdate, travelers = [], itinerary = [] }) => {
  const [activeCategory, setActiveCategory] = useState('suitcase');
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedTravelerId, setSelectedTravelerId] = useState(''); // '' means shared/all
  const [draggedItemId, setDraggedItemId] = useState(null);

  const categories = [
    { id: 'suitcase', name: '行李箱', icon: <Luggage size={20} />, color: 'text-brand-600 dark:text-brand-400', bg: 'bg-brand-50 dark:bg-brand-900/20', border: 'border-brand-200 dark:border-brand-800' },
    { id: 'carryOn', name: '隨身包', icon: <Briefcase size={20} />, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
    { id: 'clothing', name: '每日衣服', icon: <Shirt size={20} />, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' },
    { id: 'other', name: '其他', icon: <Package size={20} />, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700' }
  ];

  const getTravelerName = (id) => {
    if (!id) return null;
    const traveler = travelers.find(t => t.id === id);
    return traveler ? traveler.name : null;
  };

  const handleAddItem = (text) => {
    if (!text.trim()) return;
    
    const newItem = {
      id: Date.now(),
      text: text,
      done: false,
      category: activeCategory,
      assignedTo: selectedTravelerId || null,
      day: activeCategory === 'clothing' ? selectedDay : null
    };
    
    onUpdate([...items, newItem]);
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

  const handleDragStart = (e, id) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Make the drag image transparent or custom if needed, but default is usually fine
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (!draggedItemId || draggedItemId === targetId) return;

    const sourceIndex = items.findIndex(i => i.id === draggedItemId);
    const targetIndex = items.findIndex(i => i.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const newItems = [...items];
    const [movedItem] = newItems.splice(sourceIndex, 1);
    newItems.splice(targetIndex, 0, movedItem);

    onUpdate(newItems);
    setDraggedItemId(null);
  };

  // Touch Support for Mobile Drag and Drop
  const handleTouchStart = (e, id) => {
    setDraggedItemId(id);
  };

  const handleTouchMove = (e) => {
    if (!draggedItemId) return;
    // Prevent scrolling while dragging via the handle
    if (e.cancelable && e.target.closest('.touch-none')) {
      e.preventDefault();
    }

    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!target) return;

    const targetRow = target.closest('[data-item-id]');
    if (targetRow) {
      const targetId = parseInt(targetRow.getAttribute('data-item-id'));
      
      // Only reorder if we are over a different item
      if (targetId && targetId !== draggedItemId) {
        const sourceIndex = items.findIndex(i => i.id === draggedItemId);
        const targetIndex = items.findIndex(i => i.id === targetId);

        if (sourceIndex !== -1 && targetIndex !== -1) {
          const newItems = [...items];
          const [movedItem] = newItems.splice(sourceIndex, 1);
          newItems.splice(targetIndex, 0, movedItem);
          onUpdate(newItems);
        }
      }
    }
  };

  const handleTouchEnd = () => {
    setDraggedItemId(null);
  };

  // Filter items based on active category and day (if clothing)
  const filteredItems = items.filter(item => {
    // Handle legacy items without category (default to 'other')
    const itemCategory = item.category || 'other';
    
    if (activeCategory === 'other') {
      return itemCategory === 'other';
    }
    
    if (activeCategory === 'clothing') {
      // For clothing, match category AND day
      // If item has no day (legacy), maybe show in Day 1?
      const itemDay = item.day || 1;
      return itemCategory === 'clothing' && itemDay === selectedDay;
    }
    
    return itemCategory === activeCategory;
  });

  const currentCategory = categories.find(c => c.id === activeCategory);

  return (
    <div className="space-y-4">
      {/* Category Tabs */}
      <div className="flex space-x-1 overflow-x-auto pb-2 no-scrollbar">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-colors ${
              activeCategory === cat.id 
                ? `${cat.bg} ${cat.color} border ${cat.border}` 
                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent'
            }`}
          >
            {cat.icon}
            {cat.name}
          </button>
        ))}
      </div>

      {/* Day Selector for Clothing */}
      {activeCategory === 'clothing' && (
        <div className="mb-4">
          <DaySelector
            itinerary={itinerary}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
          />
        </div>
      )}

      {/* Content Area */}
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border ${currentCategory.border} overflow-hidden`}>
        <div className={`${currentCategory.bg} p-4 border-b ${currentCategory.border} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <span className={currentCategory.color}>{currentCategory.icon}</span>
            <h3 className={`font-bold ${currentCategory.color}`}>
              {currentCategory.name} 
              {activeCategory === 'clothing' && ` (Day ${selectedDay})`}
            </h3>
          </div>
          <span className="text-xs font-medium px-2 py-1 bg-white/50 dark:bg-gray-700/50 rounded-full text-gray-600 dark:text-gray-300">
            {filteredItems.filter(i => i.done).length} / {filteredItems.length}
          </span>
        </div>
        
        <div className="p-4">
          <div className="space-y-2 mb-4">
            {filteredItems.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-8">
                {activeCategory === 'clothing' 
                  ? `Day ${selectedDay} 尚無衣物清單` 
                  : '尚無項目'}
              </p>
            ) : (
              filteredItems.map(item => (
                <div 
                  key={item.id} 
                  data-item-id={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, item.id)}
                  className={`flex items-center gap-3 group hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors ${
                    draggedItemId === item.id ? 'opacity-50 bg-gray-100 dark:bg-gray-700' : ''
                  }`}
                >
                  <div 
                    className="cursor-grab text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 flex-shrink-0 touch-none p-2 -ml-2"
                    onTouchStart={(e) => handleTouchStart(e, item.id)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    <GripVertical size={16} />
                  </div>
                  <input
                    type="checkbox"
                    checked={item.done || false}
                    onChange={() => handleToggleItem(item.id)}
                    className={`w-5 h-5 rounded border-gray-300 dark:border-gray-600 focus:ring-offset-0 cursor-pointer bg-white dark:bg-gray-700 ${
                      activeCategory === 'suitcase' ? 'text-brand-600 focus:ring-brand-500' :
                      activeCategory === 'carryOn' ? 'text-amber-600 focus:ring-amber-500' :
                      activeCategory === 'clothing' ? 'text-purple-600 focus:ring-purple-500' :
                      'text-gray-600 dark:text-gray-400 focus:ring-gray-500'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className={`flex items-center gap-2 ${item.done ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'}`}>
                      <span className="truncate">{item.text}</span>
                      {item.assignedTo && (
                        <span className="flex-shrink-0 text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full flex items-center gap-1">
                          <User size={10} />
                          {getTravelerName(item.assignedTo) || '未知'}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-all p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            {travelers.length > 0 && (
              <select
                value={selectedTravelerId}
                onChange={(e) => setSelectedTravelerId(e.target.value)}
                className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-brand-400 max-w-[100px]"
              >
                <option value="">共用</option>
                {travelers.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={`+ 新增至${currentCategory.name}...`}
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:border-brand-400 transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddItem(e.target.value);
                    e.target.value = '';
                  }
                }}
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
                <Plus size={16} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackingListContent;
