import React, { useState } from 'react';
import {
  Plane, Train, Camera, Coffee, ShoppingBag, Home, MapPin,
  AlertCircle, MoreVertical, Edit2, Trash2, X, CheckSquare, Square,
  Navigation, Map, ChevronRight, Link as LinkIcon, ExternalLink, DollarSign, ChevronDown
} from 'lucide-react';

const EventCard = ({ event, prevLocation, onEdit, onDelete, onUpdateMemos, onOpenGoogleMaps, onViewDetails, onAddExpense }) => {
  const [showMemos, setShowMemos] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showQuickExpense, setShowQuickExpense] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCurrency, setExpenseCurrency] = useState('JPY');
  const [isExpanded, setIsExpanded] = useState(false);
  const memos = event.memos || [];

  const Icon = {
    flight: Plane, transport: Train, sightseeing: Camera,
    food: Coffee, shopping: ShoppingBag, hotel: Home
  }[event.type] || MapPin;

  const styleClass = {
    flight: 'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400',
    transport: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400',
    sightseeing: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
    food: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    shopping: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    hotel: 'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400'
  }[event.type] || 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400';

  const handleToggleMemo = (id) => {
    const newMemos = memos.map(m => m.id === id ? { ...m, done: !m.done } : m);
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
    const newMemos = memos.filter(m => m.id !== id);
    onUpdateMemos(event.id, newMemos);
  };

  const summaryParts = [
    event.location,
    event.transport?.duration,
    event.cost ? `${event.currency === 'TWD' ? 'NT$' : '¥'}${event.cost}` : ''
  ].filter(Boolean);

  return (
    <div className="relative pl-6 pb-8 last:pb-0 border-l-2 border-gray-200 dark:border-slate-800 ml-3 group">
      <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${event.urgent ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-brand-400 bg-white dark:bg-slate-900'}`}></div>

      {prevLocation && (
        <div className="absolute -left-3 -top-8 w-px h-8"></div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl tp-card-padding shadow-sm border border-gray-100 dark:border-slate-800 hover:shadow-md transition-all relative cursor-pointer group" onClick={() => onViewDetails && onViewDetails(event)}>
        {/* Header Section */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl flex-shrink-0 ${styleClass}`}>
              <Icon size={20} />
            </div>
            <span className="font-mono text-lg font-bold text-gray-700 dark:text-slate-200">{event.time}</span>
            {event.urgent && <AlertCircle size={18} className="text-red-500" />}
            <button onClick={(e) => {e.stopPropagation(); setShowMenu(!showMenu)}} className="touch-target p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-400 transition-colors" title="更多操作" aria-label="更多操作">
              <MoreVertical size={18} />
            </button>
            {showMenu && (
              <div className="absolute right-2 top-12 bg-white dark:bg-slate-900 shadow-xl border border-gray-100 dark:border-slate-800 rounded-lg z-10 w-32 py-1 flex flex-col">
                <button onClick={(e) => {e.stopPropagation(); onEdit(event); setShowMenu(false)}} className="px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 flex items-center"><Edit2 size={14} className="mr-2"/> 編輯</button>
                <button onClick={(e) => {e.stopPropagation(); setShowQuickExpense(true); setShowMenu(false)}} className="px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-slate-800 text-emerald-600 dark:text-emerald-400 flex items-center"><DollarSign size={14} className="mr-2"/> 記帳</button>
                <button onClick={(e) => {e.stopPropagation(); onDelete(event.id); setShowMenu(false)}} className="px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-slate-800 text-red-500 flex items-center"><Trash2 size={14} className="mr-2"/> 刪除</button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight break-words mb-1">{event.title}</h3>
          {event.desc && <p className="tp-caption-text text-gray-500 dark:text-slate-400 break-words whitespace-pre-wrap">{event.desc}</p>}
        </div>
        
        {/* Info Section - Vertical Stack */}
        <div className="space-y-2.5">
          {/* Location Info */}
          {event.location && (
            <div className="flex items-start gap-2 tp-caption-text text-gray-600 dark:text-slate-300">
              <MapPin size={16} className="mt-0.5 text-brand-500 shrink-0" />
              <span className="font-medium">{event.location}</span>
            </div>
          )}

          {/* Transport Info */}
          {(event.transport?.duration || event.transport?.route) && (
            <div className="flex items-start gap-2 tp-caption-text text-gray-600 dark:text-slate-300">
              {event.transport?.mode === 'flight' ? (
                <Plane size={16} className="mt-0.5 text-gray-400 shrink-0" />
              ) : (
                <Navigation size={16} className="mt-0.5 text-gray-400 shrink-0" />
              )}
              <span>
                {event.transport.duration && <span className="font-medium mr-1">{event.transport.duration}</span>}
                {event.transport.route && <span className="text-gray-500 dark:text-slate-400">{event.transport.route}</span>}
              </span>
            </div>
          )}

          {/* Cost Info */}
          {event.cost && (
            <div className="flex items-center gap-3 pt-1">
              <div className="flex items-center text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md" title="預估預算">
                <span className="mr-1.5">預算</span>
                <span className="font-mono font-medium">{event.currency === 'TWD' ? 'NT$' : '¥'}{event.cost}</span>
              </div>
            </div>
          )}
        </div>

          {/* URL Info */}
          {event.url && (
            <div className="flex items-start gap-2 tp-caption-text">
              <LinkIcon size={16} className="mt-0.5 text-blue-500 shrink-0" />
              <a 
                href={event.url} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-blue-600 dark:text-blue-400 hover:underline truncate font-medium flex items-center gap-1 group/link"
              >
                {event.url.replace(/^https?:\/\//, '').split('/')[0]}
                <ExternalLink size={12} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
              </a>
            </div>
          )}

        <div className="mt-4 flex items-center justify-between gap-4">
          <button
            onClick={(e) => {e.stopPropagation(); setShowMemos(!showMemos)}}
            className={`touch-target flex items-center text-xs font-medium transition-colors px-2 ${
              (event.memos?.length > 0) ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            查看詳情
            <ChevronRight size={16} className="ml-1" />
          </button>

          {onOpenGoogleMaps && (
            <button
              onClick={(e) => {e.stopPropagation(); onOpenGoogleMaps(prevLocation, event.location)}}
              className="touch-target flex items-center text-xs font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 px-3 py-1.5 rounded-full transition-colors"
            >
              <Map size={14} className="mr-1.5" />
              規劃路線
            </button>
          )}
        </div>

        {isExpanded && (
          <div className="mt-4 space-y-3 border-t border-gray-100 dark:border-slate-800 pt-4">
            {event.desc && <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed break-words whitespace-pre-wrap">{event.desc}</p>}

            {event.location && (
              <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-slate-300">
                <MapPin size={16} className="mt-0.5 text-brand-500 shrink-0" />
                <span className="font-medium">{event.location}</span>
              </div>
            )}

            {(event.transport?.duration || event.transport?.route) && (
              <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-slate-300">
                {event.transport?.mode === 'flight' ? (
                  <Plane size={16} className="mt-0.5 text-gray-400 shrink-0" />
                ) : (
                  <Navigation size={16} className="mt-0.5 text-gray-400 shrink-0" />
                )}
                <span>
                  {event.transport.duration && <span className="font-medium mr-1">{event.transport.duration}</span>}
                  {event.transport.route && <span className="text-gray-500 dark:text-slate-400">{event.transport.route}</span>}
                </span>
              </div>
            )}

            {event.url && (
              <div className="flex items-start gap-2 text-sm">
                <LinkIcon size={16} className="mt-0.5 text-blue-500 shrink-0" />
                <a
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-blue-600 dark:text-blue-400 hover:underline truncate font-medium flex items-center gap-1 group/link"
                >
                  {event.url.replace(/^https?:\/\//, '').split('/')[0]}
                  <ExternalLink size={12} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
                </a>
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                onClick={(e) => {e.stopPropagation(); setShowMemos(!showMemos)}}
                className={`flex items-center text-xs font-medium transition-colors ${(event.memos?.length > 0) ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
              >
                <CheckSquare size={14} className="mr-1.5" />
                備忘錄 ({event.memos?.length || 0})
                <ChevronRight size={14} className={`ml-1 transform transition-transform ${showMemos ? 'rotate-90' : ''}`} />
              </button>

              {onOpenGoogleMaps && (
                <button
                  onClick={(e) => {e.stopPropagation(); onOpenGoogleMaps(prevLocation, event.location)}}
                  className="flex items-center text-xs font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 px-3 py-1.5 rounded-full transition-colors"
                >
                  <Map size={14} className="mr-1.5" />
                  規劃路線
                </button>
              )}
            </div>
          </div>
        )}

        {showMemos && (
          <div className="mt-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border border-yellow-100 dark:border-yellow-900/30 animate-in fade-in slide-in-from-top-2 duration-200" onClick={(e) => e.stopPropagation()}>
              <ul className="space-y-1 mb-2">
                {memos.map(memo => (
                  <li key={memo.id} className="flex items-start group/item gap-2">
                    <button onClick={() => handleToggleMemo(memo.id)} className="touch-target mt-0.5 text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 flex-shrink-0" title="切換待辦狀態">
                      {memo.done ? <CheckSquare size={14} className="text-brand-500" /> : <Square size={14} />}
                    </button>
                    <span className={`text-xs flex-1 break-words word-wrap overflow-wrap-break-word ${memo.done ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>{memo.text}</span>
                    <button onClick={() => deleteMemo(memo.id)} className="touch-target opacity-0 group-hover/item:opacity-100 text-gray-400 hover:text-red-500 flex-shrink-0" title="刪除備忘錄">
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

        {showQuickExpense && (
          <div className="mt-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 border border-emerald-200 dark:border-emerald-900/30 animate-in fade-in slide-in-from-top-2 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={16} className="text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">快速記帳</span>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="金額"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                className="flex-1 bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-700 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-emerald-400 dark:text-gray-200"
                step="0.01"
              />
              <select
                value={expenseCurrency}
                onChange={(e) => setExpenseCurrency(e.target.value)}
                className="px-2 py-1.5 bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-700 rounded text-xs font-medium focus:outline-none focus:border-emerald-400 dark:text-gray-200"
              >
                <option value="JPY">¥</option>
                <option value="TWD">NT$</option>
              </select>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (expenseAmount && onAddExpense) {
                    onAddExpense({
                      eventId: event.id,
                      eventTitle: event.title,
                      date: `${event.date || ''}`,
                      amount: parseFloat(expenseAmount),
                      currency: expenseCurrency,
                      description: event.title,
                      category: event.type,
                      travelers: []
                    });
                    setExpenseAmount('');
                    setShowQuickExpense(false);
                  }
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs transition-colors"
              >
                記帳
              </button>
              <button
                onClick={(e) => {e.stopPropagation(); setShowQuickExpense(false); setExpenseAmount('')}}
                className="touch-target p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded text-gray-400 transition-colors"
                title="取消快速記帳"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventCard;
