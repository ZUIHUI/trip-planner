import React, { useMemo, useState } from 'react';
import {
  Briefcase,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  GripVertical,
  Luggage,
  Package,
  Pencil,
  Plus,
  Shirt,
  Sparkles,
  Trash2,
  User,
  X
} from 'lucide-react';
import DaySelector from './DaySelector';
import { Button, EmptyState, Input, Select } from './ui';
import { plainTextInputProps } from '../utils/mobileInputProps';

const CATEGORIES = [
  {
    id: 'suitcase',
    name: '托運',
    fullName: '托運行李',
    icon: Luggage,
    color: 'text-brand-700 dark:text-brand-300',
    bg: 'bg-brand-50 dark:bg-brand-900/30',
    border: 'border-brand-200 dark:border-brand-800',
    ring: 'focus:ring-brand-500'
  },
  {
    id: 'carryOn',
    name: '隨身',
    fullName: '隨身行李',
    icon: Briefcase,
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-900/70',
    ring: 'focus:ring-amber-500'
  },
  {
    id: 'clothing',
    name: '衣物',
    fullName: '每日衣物',
    icon: Shirt,
    color: 'text-sky-700 dark:text-sky-300',
    bg: 'bg-sky-50 dark:bg-sky-950/30',
    border: 'border-sky-200 dark:border-sky-900/70',
    ring: 'focus:ring-sky-500'
  },
  {
    id: 'other',
    name: '其他',
    fullName: '其他物品',
    icon: Package,
    color: 'text-slate-700 dark:text-slate-300',
    bg: 'bg-slate-50 dark:bg-slate-800',
    border: 'border-slate-200 dark:border-slate-700',
    ring: 'focus:ring-slate-500'
  }
];

const STATUS_FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'todo', label: '未打包' },
  { id: 'done', label: '已打包' }
];

const SUGGESTIONS = {
  suitcase: ['護照影本', '備用藥品', '轉接頭', '防曬乳', '摺疊袋'],
  carryOn: ['護照', '錢包', '行動電源', '耳機', '旅行文件'],
  clothing: ['上衣', '褲子', '內衣', '襪子', '睡衣'],
  other: ['雨具', '濕紙巾', '環保袋', '常備藥', '小剪刀']
};

const getItemCategory = (item) => item.category || 'other';
const getItemDay = (item) => item.day || 1;
const getGroupId = (value) => (value == null ? '' : String(value));
const getItemId = (value) => (value == null ? '' : String(value));

const isItemInCategory = (item, activeCategory, selectedDay) => {
  const category = getItemCategory(item);

  if (activeCategory === 'clothing') {
    return category === 'clothing' && getItemDay(item) === selectedDay;
  }

  return category === activeCategory;
};

export const getVisiblePackingItems = (
  items,
  { activeCategory, selectedDay, statusFilter }
) =>
  items.filter((item) => {
    if (!isItemInCategory(item, activeCategory, selectedDay)) return false;
    if (statusFilter === 'todo') return !item.done;
    if (statusFilter === 'done') return Boolean(item.done);
    return true;
  });

export const getPackingStats = (items, { activeCategory, selectedDay }) => {
  const categoryItems = items.filter((item) =>
    isItemInCategory(item, activeCategory, selectedDay)
  );
  const total = items.length;
  const packed = items.filter((item) => item.done).length;
  const categoryPacked = categoryItems.filter((item) => item.done).length;

  return {
    total,
    packed,
    remaining: Math.max(total - packed, 0),
    categoryTotal: categoryItems.length,
    categoryPacked,
    categoryRemaining: Math.max(categoryItems.length - categoryPacked, 0),
    categoryProgress: categoryItems.length
      ? Math.round((categoryPacked / categoryItems.length) * 100)
      : 0
  };
};

export const getPackingSuggestions = (activeCategory) =>
  SUGGESTIONS[activeCategory] || SUGGESTIONS.other;

const createPackingItem = ({ text, activeCategory, selectedDay, assignedTo }) => ({
  id: Date.now() + Math.floor(Math.random() * 1000),
  text: text.trim(),
  done: false,
  category: activeCategory,
  assignedTo: assignedTo || null,
  day: activeCategory === 'clothing' ? selectedDay : null
});

const PackingListContent = ({ items = [], onUpdate, travelers = [], itinerary = [] }) => {
  const [activeCategory, setActiveCategory] = useState('suitcase');
  const [selectedDay, setSelectedDay] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [draggedItemId, setDraggedItemId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [editError, setEditError] = useState('');
  const [sortMode, setSortMode] = useState(false);
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [newItemAssignedTo, setNewItemAssignedTo] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [itemToDelete, setItemToDelete] = useState(null);

  const currentCategory = CATEGORIES.find((category) => category.id === activeCategory) || CATEGORIES[0];
  const CurrentCategoryIcon = currentCategory.icon;

  const stats = useMemo(
    () => getPackingStats(items, { activeCategory, selectedDay }),
    [items, activeCategory, selectedDay]
  );

  const visibleItems = useMemo(
    () => getVisiblePackingItems(items, { activeCategory, selectedDay, statusFilter }),
    [items, activeCategory, selectedDay, statusFilter]
  );

  const groups = useMemo(
    () => [
      { id: '', name: '共用物品', isShared: true },
      ...travelers.map((traveler) => ({
        ...traveler,
        id: getGroupId(traveler.id),
        isShared: false
      }))
    ],
    [travelers]
  );

  const suggestions = useMemo(() => {
    const existing = new Set(
      items
        .filter((item) => isItemInCategory(item, activeCategory, selectedDay))
        .map((item) => item.text?.trim())
        .filter(Boolean)
    );

    return getPackingSuggestions(activeCategory).filter((text) => !existing.has(text));
  }, [items, activeCategory, selectedDay]);

  const progressLabel = `${stats.categoryPacked}/${stats.categoryTotal}`;

  const handleAddItem = (text, assignedTo = newItemAssignedTo) => {
    const nextText = text.trim();
    if (!nextText) return;

    onUpdate([
      ...items,
      createPackingItem({
        text: nextText,
        activeCategory,
        selectedDay,
        assignedTo
      })
    ]);
  };

  const handleAddSubmit = (event) => {
    event.preventDefault();
    const nextText = newItemText.trim();
    if (!nextText) return;

    handleAddItem(nextText);
    setNewItemText('');
  };

  const handleToggleItem = (id) => {
    const newItems = items.map((item) =>
      getItemId(item.id) === getItemId(id) ? { ...item, done: !item.done } : item
    );
    onUpdate(newItems);
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    onUpdate(items.filter((item) => getItemId(item.id) !== getItemId(itemToDelete.id)));
    setItemToDelete(null);
  };

  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setEditingText(item.text);
    setEditError('');
  };

  const handleSaveEdit = () => {
    const nextText = editingText.trim();

    if (!nextText) {
      setEditError('物品名稱不能空白');
      return;
    }

    const newItems = items.map((item) =>
      getItemId(item.id) === getItemId(editingId) ? { ...item, text: nextText } : item
    );
    onUpdate(newItems);
    setEditingId(null);
    setEditingText('');
    setEditError('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText('');
    setEditError('');
  };

  const reorderItem = (targetId) => {
    if (!draggedItemId || getItemId(draggedItemId) === getItemId(targetId)) return;

    const sourceIndex = items.findIndex((item) => getItemId(item.id) === getItemId(draggedItemId));
    const targetIndex = items.findIndex((item) => getItemId(item.id) === getItemId(targetId));

    if (sourceIndex === -1 || targetIndex === -1) return;

    const newItems = [...items];
    const [movedItem] = newItems.splice(sourceIndex, 1);
    newItems.splice(targetIndex, 0, movedItem);
    onUpdate(newItems);
  };

  const handleDragStart = (event, id) => {
    if (editingId === id) return;
    setDraggedItemId(getItemId(id));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (event, targetId) => {
    event.preventDefault();
    reorderItem(targetId);
    setDraggedItemId(null);
  };

  const handleTouchStart = (event, id) => {
    if (!sortMode || editingId === id) return;
    setDraggedItemId(getItemId(id));
  };

  const handleTouchMove = (event) => {
    if (!sortMode || !draggedItemId) return;

    if (event.cancelable) {
      event.preventDefault();
    }

    const touch = event.touches?.[0];
    if (!touch) return;

    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetRow = target?.closest('[data-item-id]');
    if (!targetRow) return;

    const targetId = targetRow.getAttribute('data-item-id');
    reorderItem(targetId);
  };

  const handleTouchEnd = () => {
    setDraggedItemId(null);
  };

  const toggleGroup = (groupId) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const renderItem = (item) => {
    const isEditing = editingId === item.id;
    const isDragging = draggedItemId === item.id;

    return (
      <div
        key={item.id}
        data-item-id={item.id}
        draggable={!isEditing}
        onDragStart={(event) => handleDragStart(event, item.id)}
        onDragOver={handleDragOver}
        onDrop={(event) => handleDrop(event, item.id)}
        className={`tp-animate-enter tp-motion-panel group flex items-center gap-2 rounded-lg border p-2.5 transition sm:gap-3 ${
          item.done
            ? 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/50'
            : 'border-slate-200 bg-white hover:border-brand-200 hover:bg-brand-50/30 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-800 dark:hover:bg-brand-950/20'
        } ${isDragging ? 'opacity-60 ring-2 ring-brand-200 dark:ring-brand-800' : ''}`}
      >
        {!isEditing && (
          <button
            type="button"
            aria-label="拖曳排序"
            onTouchStart={(event) => handleTouchStart(event, item.id)}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`tp-press-feedback h-11 w-9 shrink-0 cursor-grab items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300 ${
              sortMode ? 'flex' : 'hidden sm:flex'
            }`}
          >
            <GripVertical size={17} />
          </button>
        )}

        {isEditing ? (
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Input
                {...plainTextInputProps}
                autoFocus
                value={editingText}
                aria-label="編輯物品名稱"
                enterKeyHint="done"
                onChange={(event) => {
                  setEditingText(event.target.value);
                  if (editError) setEditError('');
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSaveEdit();
                  if (event.key === 'Escape') handleCancelEdit();
                }}
                className="text-sm"
              />
              <button
                type="button"
                onClick={handleSaveEdit}
                aria-label="儲存物品"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300"
              >
                <Check size={18} />
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                aria-label="取消編輯"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                <X size={18} />
              </button>
            </div>
            {editError && (
              <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-300" role="alert">
                {editError}
              </p>
            )}
          </div>
        ) : (
          <>
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg px-1 py-1">
              <input
                type="checkbox"
                checked={Boolean(item.done)}
                onChange={() => handleToggleItem(item.id)}
                className={`tp-press-feedback h-5 w-5 rounded border-slate-300 bg-white text-brand-600 checked:scale-110 ${currentCategory.ring} dark:border-slate-600 dark:bg-slate-800`}
              />
              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-base font-semibold transition-all duration-200 sm:text-sm ${
                    item.done
                      ? 'text-slate-400 line-through dark:text-slate-500'
                      : 'text-slate-800 dark:text-slate-100'
                  }`}
                >
                  {item.text}
                </span>
                <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  {item.done ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                  {item.done ? '已打包' : '未打包'}
                  {activeCategory === 'clothing' && <span>Day {selectedDay}</span>}
                </span>
              </span>
            </label>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => handleStartEdit(item)}
                aria-label={`編輯 ${item.text}`}
                className="tp-press-feedback flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-sky-50 hover:text-sky-700 dark:text-slate-400 dark:hover:bg-sky-950/30 dark:hover:text-sky-300 sm:opacity-0 sm:group-hover:opacity-100"
              >
                <Pencil size={17} />
              </button>
              <button
                type="button"
                onClick={() => setItemToDelete(item)}
                aria-label={`刪除 ${item.text}`}
                className="tp-press-feedback flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/30 dark:hover:text-red-300 sm:opacity-0 sm:group-hover:opacity-100"
              >
                <Trash2 size={17} />
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${currentCategory.bg} ${currentCategory.color}`}>
              <CurrentCategoryIcon size={22} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                行李概況
              </p>
              <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                {currentCategory.fullName}
                {activeCategory === 'clothing' && ` Day ${selectedDay}`}
              </h3>
            </div>
          </div>
          <Button
            variant={sortMode ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setSortMode((value) => !value)}
            aria-pressed={sortMode}
            className="w-full sm:w-auto"
          >
            <GripVertical size={16} />
            {sortMode ? '完成排序' : '排序'}
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-800">
            <p className="text-lg font-black text-slate-900 dark:text-white">{stats.total}</p>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">全部</p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-3 text-center dark:bg-emerald-950/30">
            <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">{stats.packed}</p>
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">已打包</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-3 text-center dark:bg-amber-950/30">
            <p className="text-lg font-black text-amber-700 dark:text-amber-300">{stats.remaining}</p>
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">未打包</p>
          </div>
        </div>

        <div className="mt-4" aria-label={`${currentCategory.fullName} 進度 ${progressLabel}`}>
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>目前分類進度</span>
            <span>{progressLabel}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-brand-500 transition-all dark:bg-brand-400"
              style={{ width: `${stats.categoryProgress}%` }}
            />
          </div>
        </div>
      </section>

      <div className="space-y-3">
        <div className="no-scrollbar flex gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {CATEGORIES.map((category) => {
            const Icon = category.icon;
            const isActive = activeCategory === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
                aria-pressed={isActive}
                className={`flex min-h-[44px] min-w-[76px] flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition ${
                  isActive
                    ? `${category.bg} ${category.color} shadow-sm`
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                }`}
              >
                <Icon size={18} />
                {category.name}
              </button>
            );
          })}
        </div>

        {activeCategory === 'clothing' && (
          <div className="-mx-4 sm:mx-0">
            <DaySelector
              itinerary={itinerary}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
            />
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" aria-label="行李篩選">
          {STATUS_FILTERS.map((filter) => {
            const isActive = statusFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setStatusFilter(filter.id)}
                aria-pressed={isActive}
                className={`min-h-[40px] rounded-full border px-4 text-sm font-bold transition ${
                  isActive
                    ? 'border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-200'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">快速新增物品</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activeCategory === 'clothing' ? `Day ${selectedDay}` : '目前分類'}
            </p>
          </div>
          <Button
            variant={addPanelOpen ? 'ghost' : 'primary'}
            size="sm"
            onClick={() => setAddPanelOpen((value) => !value)}
            aria-expanded={addPanelOpen}
            className="w-full sm:w-auto"
          >
            {addPanelOpen ? <X size={16} /> : <Plus size={16} />}
            {addPanelOpen ? '收起' : '新增物品'}
          </Button>
        </div>

        {addPanelOpen && (
          <form onSubmit={handleAddSubmit} className="mt-4 space-y-3">
            <Input
              {...plainTextInputProps}
              value={newItemText}
              onChange={(event) => setNewItemText(event.target.value)}
              placeholder="輸入物品名稱"
              aria-label="新增行李物品名稱"
              enterKeyHint="done"
            />
            <Select
              value={newItemAssignedTo}
              onChange={(event) => setNewItemAssignedTo(event.target.value)}
              aria-label="選擇行李歸屬"
            >
              <option value="">共用物品</option>
              {travelers.map((traveler) => (
                <option key={traveler.id} value={traveler.id}>
                  {traveler.name}
                </option>
              ))}
            </Select>
            <Button type="submit" className="w-full">
              <Plus size={16} />
              加入行李清單
            </Button>
          </form>
        )}

        {suggestions.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">
              <Sparkles size={14} />
              常用項目
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleAddItem(suggestion)}
                  className="min-h-[36px] rounded-full border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-brand-700 dark:hover:bg-brand-900/30"
                >
                  + {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className={`overflow-hidden rounded-lg border bg-white dark:bg-slate-900 ${currentCategory.border}`}>
        <div className={`${currentCategory.bg} border-b p-4 ${currentCategory.border}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <CurrentCategoryIcon className={currentCategory.color} size={20} />
              <div className="min-w-0">
                <h3 className={`truncate text-base font-black ${currentCategory.color}`}>
                  {currentCategory.fullName}
                </h3>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {statusFilter === 'all' ? '全部物品' : STATUS_FILTERS.find((item) => item.id === statusFilter)?.label}
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-white/70 px-2.5 py-1 text-xs font-black text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
              {progressLabel}
            </span>
          </div>
        </div>

        <div className="space-y-3 p-3 sm:p-4">
          {visibleItems.length === 0 ? (
            <EmptyState
              icon={Package}
              title="目前沒有符合條件的物品"
              className="py-8"
            />
          ) : (
            groups.map((group) => {
              const groupKey = getGroupId(group.id);
              const groupItems = visibleItems.filter(
                (item) => getGroupId(item.assignedTo) === groupKey
              );
              const groupCategoryItems = items.filter(
                (item) =>
                  isItemInCategory(item, activeCategory, selectedDay) &&
                  getGroupId(item.assignedTo) === groupKey
              );
              const doneCount = groupCategoryItems.filter((item) => item.done).length;
              const isCollapsed = Boolean(collapsedGroups[groupKey]);

              return (
                <div
                  key={groupKey || 'shared'}
                  className="rounded-lg border border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/30"
                >
                  <button
                    type="button"
                    onClick={() => toggleGroup(groupKey)}
                    aria-expanded={!isCollapsed}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-white dark:hover:bg-slate-900"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          group.isShared
                            ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            : 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                        }`}
                      >
                        <User size={16} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black text-slate-800 dark:text-slate-100">
                          {group.name}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {doneCount}/{groupCategoryItems.length} 已打包
                        </span>
                      </span>
                    </span>
                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                  </button>

                  {!isCollapsed && (
                    <div className="space-y-2 px-3 pb-3">
                      {groupItems.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-sm font-semibold text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500">
                          沒有符合篩選的物品。
                        </p>
                      ) : (
                        groupItems.map(renderItem)
                      )}

                      <div className="relative hidden sm:block">
                        <input
                          {...plainTextInputProps}
                          enterKeyHint="done"
                          placeholder={`+ 新增到 ${group.name}`}
                          className="tp-input pr-10 text-sm"
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              handleAddItem(event.currentTarget.value, group.id);
                              event.currentTarget.value = '';
                            }
                          }}
                        />
                        <Plus
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                          size={16}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {itemToDelete && (
        <div
          className="tp-fade-in fixed inset-0 z-[var(--z-modal)] flex items-end justify-center bg-slate-950/45 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="packing-delete-title"
        >
          <div className="tp-slide-up w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h3 id="packing-delete-title" className="text-lg font-black text-slate-900 dark:text-white">
              刪除這個物品？
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              「{itemToDelete.text}」會從行李清單移除，這個動作無法復原。
            </p>
            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button variant="secondary" onClick={() => setItemToDelete(null)}>
                取消
              </Button>
              <Button variant="danger" onClick={handleConfirmDelete}>
                刪除
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackingListContent;
