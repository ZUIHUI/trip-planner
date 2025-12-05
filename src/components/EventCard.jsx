import React, { useState } from 'react';
import {
  Plane, Train, Camera, Coffee, ShoppingBag, Home, MapPin,
  AlertCircle, MoreVertical, Edit2, Trash2, X, CheckSquare, Square,
  Navigation, Map, ChevronRight
} from 'lucide-react';

const EventCard = ({ event, prevLocation, onEdit, onDelete, onUpdateMemos, onOpenGoogleMaps, exchangeRate = 0.21 }) => {
  const [showMemos, setShowMemos] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const Icon = {
    flight: Plane, transport: Train, sightseeing: Camera,
    food: Coffee, shopping: ShoppingBag, hotel: Home
  }[event.type] || MapPin;

  const styleClass = {
    flight: 'bg-brand-100 text-brand-600', transport: 'bg-gray-100 text-gray-600',
    sightseeing: 'bg-pink-100 text-pink-600', food: 'bg-orange-100 text-orange-600',
    shopping: 'bg-emerald-100 text-emerald-600', hotel: 'bg-brand-100 text-brand-600'
  }[event.type] || 'bg-gray-100 text-gray-600';

  const handleToggleMemo = (id) => {
    const newMemos = event.memos.map(m => m.id === id ? { ...m, done: !m.done } : m);
    onUpdateMemos(event.id, newMemos);
  };

  const handleAddMemo = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      const newMemo = { id: Date.now(), text: e.target.value, done: false };
      onUpdateMemos(event.id, [...(event.memos || []), newMemo]);
      e.target.value = '';
    }
  };

  const deleteMemo = (id) => {
    const newMemos = event.memos.filter(m => m.id !== id);
    onUpdateMemos(event.id, newMemos);
  };

  return (
    <div className="relative pl-6 pb-8 last:pb-0 border-l-2 border-gray-200 dark:border-gray-700 ml-3 group">
      <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 bg-white dark:bg-gray-800 ${event.urgent ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-brand-400'}`}></div>

      {prevLocation && (
        <div className="absolute -left-3 -top-8 w-px h-8"></div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all relative">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-2 gap-2">
          <div className="flex items-center space-x-2 min-w-0">
            <div className={`p-2 rounded-lg flex-shrink-0 ${styleClass}`}>
              <Icon size={18} />
            </div>
            <span className="font-mono text-sm font-bold bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-300 whitespace-nowrap">{event.time}</span>
          </div>

          <div className="flex items-center space-x-1 flex-shrink-0">
            {event.urgent && <AlertCircle size={16} className="text-red-500" />}
            <button onClick={() => setShowMenu(!showMenu)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400">
              <MoreVertical size={16} />
            </button>
            {showMenu && (
              <div className="absolute right-2 top-10 bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700 rounded-lg z-10 w-24 py-1 flex flex-col">
                <button onClick={() => {onEdit(event); setShowMenu(false)}} className="px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center"><Edit2 size={12} className="mr-2"/> 編輯</button>
                <button onClick={() => {onDelete(event.id); setShowMenu(false)}} className="px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-red-500 flex items-center"><Trash2 size={12} className="mr-2"/> 刪除</button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 leading-tight break-words">{event.title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words whitespace-pre-wrap">{event.desc}</p>
        
        {/* Location Info */}
        {event.location && (
          <p className="text-sm text-brand-600 dark:text-brand-400 mt-2 flex items-center gap-1 font-medium">
            <MapPin size={14} />
            {event.location}
          </p>
        )}

        {/* Transport Info & Google Map Button */}
        <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-700 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded">
              {event.transport?.mode === 'flight' ? (
                <Plane size={12} className="mr-1 text-brand-500" />
              ) : (
                <Navigation size={12} className="mr-1 text-brand-500" />
              )}
              {event.transport?.duration
                ? <span>{event.transport.duration} {event.transport.route && `• ${event.transport.route}`}</span>
                : <span className="text-gray-400">未設定交通</span>
              }
            </div>

            {/* Cost Info */}
            {(event.cost || event.actualCost) && (
              <div className="flex items-center text-xs font-medium px-2 py-1 rounded bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-800">
                <span className="mr-1">💰</span>
                {event.actualCost ? (
                  <span className="font-bold">{event.currency === 'TWD' ? 'NT$' : '¥'}{event.actualCost}</span>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">預估: {event.currency === 'TWD' ? 'NT$' : '¥'}{event.cost}</span>
                )}
                {/* Conversion for JPY */}
                {(event.currency !== 'TWD' && (event.actualCost || event.cost)) && (
                  <span className="ml-1 text-gray-500 dark:text-gray-400">
                    (≈NT${Math.round((event.actualCost || event.cost) * exchangeRate)})
                  </span>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => onOpenGoogleMaps(prevLocation, event.location)}
            className="flex items-center text-xs font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 px-2 py-1 rounded border border-brand-100 dark:border-brand-800 transition-colors"
          >
            <Map size={12} className="mr-1" />
            規劃路線
          </button>
        </div>

        {/* Memos Section */}
        <div className="mt-3">
          <button
            onClick={() => setShowMemos(!showMemos)}
            className="flex items-center text-xs text-gray-500 dark:text-gray-400 font-medium hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
          >
            <CheckSquare size={12} className="mr-1" />
            備忘錄 ({event.memos?.length || 0})
            <ChevronRight size={12} className={`transform transition-transform ${showMemos ? 'rotate-90' : ''}`} />
          </button>

          {showMemos && (
            <div className="mt-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2 border border-yellow-100 dark:border-yellow-900/30">
              <ul className="space-y-1 mb-2">
                {event.memos?.map(memo => (
                  <li key={memo.id} className="flex items-start group/item gap-2">
                    <button onClick={() => handleToggleMemo(memo.id)} className="mt-0.5 text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 flex-shrink-0">
                      {memo.done ? <CheckSquare size={14} className="text-brand-500" /> : <Square size={14} />}
                    </button>
                    <span className={`text-xs flex-1 break-words word-wrap overflow-wrap-break-word ${memo.done ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>{memo.text}</span>
                    <button onClick={() => deleteMemo(memo.id)} className="opacity-0 group-hover/item:opacity-100 text-gray-400 hover:text-red-500 flex-shrink-0">
                      <X size={12} />
                    </button>
                  </li>
                ))}
              </ul>
              <input
                type="text"
                placeholder="+ 新增待辦 (Enter)"
                className="w-full bg-white dark:bg-gray-800 border border-yellow-200 dark:border-yellow-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-yellow-400 dark:text-gray-200"
                onKeyDown={handleAddMemo}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventCard;
