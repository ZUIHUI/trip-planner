import React, { useState } from 'react';
import {
  Plane, Train, Camera, Coffee, ShoppingBag, Home, MapPin,
  AlertCircle, MoreVertical, Edit2, Trash2, X, CheckSquare, Square,
  Navigation, Map, ChevronRight
} from 'lucide-react';

const EventCard = ({ event, prevLocation, onEdit, onDelete, onUpdateMemos, onOpenGoogleMaps }) => {
  const [showMemos, setShowMemos] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const Icon = {
    flight: Plane, transport: Train, sightseeing: Camera,
    food: Coffee, shopping: ShoppingBag, hotel: Home
  }[event.type] || MapPin;

  const styleClass = {
    flight: 'bg-indigo-100 text-indigo-600', transport: 'bg-gray-100 text-gray-600',
    sightseeing: 'bg-pink-100 text-pink-600', food: 'bg-orange-100 text-orange-600',
    shopping: 'bg-emerald-100 text-emerald-600', hotel: 'bg-blue-100 text-blue-600'
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
    <div className="relative pl-6 pb-8 last:pb-0 border-l-2 border-gray-200 ml-3 group">
      <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 bg-white ${event.urgent ? 'border-red-500 bg-red-50' : 'border-blue-400'}`}></div>

      {prevLocation && (
        <div className="absolute -left-3 -top-8 w-px h-8"></div>
      )}

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all relative">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-2 gap-2">
          <div className="flex items-center space-x-2 min-w-0">
            <div className={`p-2 rounded-lg flex-shrink-0 ${styleClass}`}>
              <Icon size={18} />
            </div>
            <span className="font-mono text-sm font-bold bg-gray-50 px-2 py-1 rounded text-gray-600 whitespace-nowrap">{event.time}</span>
          </div>

          <div className="flex items-center space-x-1 flex-shrink-0">
            {event.urgent && <AlertCircle size={16} className="text-red-500" />}
            <button onClick={() => setShowMenu(!showMenu)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
              <MoreVertical size={16} />
            </button>
            {showMenu && (
              <div className="absolute right-2 top-10 bg-white shadow-xl border border-gray-100 rounded-lg z-10 w-24 py-1 flex flex-col">
                <button onClick={() => {onEdit(event); setShowMenu(false)}} className="px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center"><Edit2 size={12} className="mr-2"/> 編輯</button>
                <button onClick={() => {onDelete(event.id); setShowMenu(false)}} className="px-3 py-2 text-left text-sm hover:bg-gray-50 text-red-500 flex items-center"><Trash2 size={12} className="mr-2"/> 刪除</button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <h3 className="text-lg font-bold text-gray-800 leading-tight break-words word-wrap">{event.title}</h3>
        <p className="text-sm text-gray-500 mt-1 break-words word-wrap">{event.desc}</p>
        
        {/* Location Info */}
        {event.location && (
          <p className="text-sm text-blue-600 mt-2 flex items-center gap-1 font-medium">
            <MapPin size={14} />
            {event.location}
          </p>
        )}

        {/* Transport Info & Google Map Button */}
        <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
            <Navigation size={12} className="mr-1 text-blue-500" />
            {event.transport?.duration
              ? <span>{event.transport.duration} {event.transport.route && `• ${event.transport.route}`}</span>
              : <span className="text-gray-400">未設定交通</span>
            }
          </div>
          <button
            onClick={() => onOpenGoogleMaps(prevLocation, event.location)}
            className="flex items-center text-xs font-medium text-blue-600 hover:bg-blue-50 px-2 py-1 rounded border border-blue-100 transition-colors"
          >
            <Map size={12} className="mr-1" />
            規劃路線
          </button>
        </div>

        {/* Memos Section */}
        <div className="mt-3">
          <button
            onClick={() => setShowMemos(!showMemos)}
            className="flex items-center text-xs text-gray-500 font-medium hover:text-blue-600 transition-colors"
          >
            <CheckSquare size={12} className="mr-1" />
            備忘錄 ({event.memos?.length || 0})
            <ChevronRight size={12} className={`transform transition-transform ${showMemos ? 'rotate-90' : ''}`} />
          </button>

          {showMemos && (
            <div className="mt-2 bg-yellow-50 rounded-lg p-2 border border-yellow-100">
              <ul className="space-y-1 mb-2">
                {event.memos?.map(memo => (
                  <li key={memo.id} className="flex items-start group/item gap-2">
                    <button onClick={() => handleToggleMemo(memo.id)} className="mt-0.5 text-gray-400 hover:text-blue-600 flex-shrink-0">
                      {memo.done ? <CheckSquare size={14} className="text-blue-500" /> : <Square size={14} />}
                    </button>
                    <span className={`text-xs flex-1 break-words word-wrap overflow-wrap-break-word ${memo.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{memo.text}</span>
                    <button onClick={() => deleteMemo(memo.id)} className="opacity-0 group-hover/item:opacity-100 text-gray-400 hover:text-red-500 flex-shrink-0">
                      <X size={12} />
                    </button>
                  </li>
                ))}
              </ul>
              <input
                type="text"
                placeholder="+ 新增待辦 (Enter)"
                className="w-full bg-white border border-yellow-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-yellow-400"
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
