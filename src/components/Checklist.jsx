import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  ListOrdered,
  Pencil,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import { Button, EmptyState, Input } from './ui';
import { useFeedback } from '../contexts/FeedbackContext';
import { plainTextInputProps } from '../utils/mobileInputProps';
import { getTripItemId, moveTripItemByOffset } from '../utils/tripItemDocuments';

const Checklist = ({
  items = [],
  onUpdate,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  title = '清單',
  readOnly = false
}) => {
  const { confirm, toast } = useFeedback();
  const [inputValue, setInputValue] = useState('');
  const [editingId, setEditingId] = useState('');
  const [editingText, setEditingText] = useState('');
  const [editError, setEditError] = useState('');
  const [sortMode, setSortMode] = useState(false);
  const inputRef = useRef(null);
  const safeItems = Array.isArray(items) ? items : [];
  const doneCount = useMemo(() => safeItems.filter((item) => item.done).length, [safeItems]);

  const commitUpdate = (nextItems) => {
    onUpdate?.(nextItems);
  };

  const addItem = () => {
    if (readOnly) return;
    const text = inputValue.trim();
    if (!text) return;

    if (onAddItem) {
      onAddItem(text);
    } else {
      commitUpdate([
        ...safeItems,
        {
          id: Date.now(),
          text,
          done: false
        }
      ]);
    }
    setInputValue('');
    if (typeof window !== 'undefined') {
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const toggleItem = (id) => {
    if (readOnly) return;
    if (onToggleItem) {
      onToggleItem(id);
      return;
    }
    commitUpdate(safeItems.map((item) => (
      item.id === id ? { ...item, done: !item.done } : item
    )));
  };

  const startEdit = (item) => {
    if (readOnly) return;
    setSortMode(false);
    setEditingId(getTripItemId(item));
    setEditingText(item?.text || '');
    setEditError('');
  };

  const cancelEdit = () => {
    setEditingId('');
    setEditingText('');
    setEditError('');
  };

  const saveEdit = () => {
    if (readOnly || !editingId) return;
    const nextText = editingText.trim();
    if (!nextText) {
      setEditError('待辦內容不能空白');
      return;
    }

    commitUpdate(safeItems.map((item) => (
      getTripItemId(item) === editingId ? { ...item, text: nextText } : item
    )));
    cancelEdit();
  };

  const moveItem = (id, offset) => {
    if (readOnly) return;
    const nextItems = moveTripItemByOffset(safeItems, id, offset);
    if (nextItems !== safeItems) commitUpdate(nextItems);
  };

  const toggleSortMode = () => {
    if (readOnly || safeItems.length < 2) return;
    cancelEdit();
    setSortMode((value) => !value);
  };

  const deleteItem = async (id) => {
    if (readOnly) return;
    const target = safeItems.find((item) => item.id === id);
    if (!target) return;
    const shouldDelete = await confirm({
      title: '刪除項目？',
      description: `「${target.text}」會從清單移除。`,
      confirmLabel: '刪除',
      variant: 'danger'
    });

    if (!shouldDelete) return;

    if (onDeleteItem) {
      onDeleteItem(id);
      toast({
        variant: 'success',
        title: '已刪除項目',
        description: target.text
      });
      return;
    }

    const previousItems = safeItems;
    commitUpdate(safeItems.filter((item) => item.id !== id));
    toast({
      variant: 'info',
      title: '已刪除項目',
      description: target.text,
      actionLabel: '復原',
      duration: 7000,
      onAction: () => commitUpdate(previousItems)
    });
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="tp-section-title">{title}</h3>
          <p className="tp-section-subtitle mt-1">
            已完成 {doneCount} / {safeItems.length} 項
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
            {safeItems.length ? `${Math.round((doneCount / safeItems.length) * 100)}%` : '0%'}
          </div>
          {!readOnly && (
            <Button
              variant={sortMode ? 'primary' : 'secondary'}
              size="sm"
              onClick={toggleSortMode}
              disabled={safeItems.length < 2}
              aria-pressed={sortMode}
              title={safeItems.length < 2 ? '至少需要兩個項目才能排序' : undefined}
            >
              <ListOrdered size={16} />
              {sortMode ? '完成排序' : '排序'}
            </Button>
          )}
        </div>
      </div>

      {sortMode && (
        <p className="mb-3 rounded-lg border border-brand-100 bg-brand-50/70 px-3 py-2 text-xs font-semibold text-brand-800 dark:border-brand-900/60 dark:bg-brand-950/30 dark:text-brand-200">
          使用每個項目的上下按鈕調整顯示順序。
        </p>
      )}

      {safeItems.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="目前沒有待辦項目"
          className="py-8"
        />
      ) : (
        <div className="space-y-2">
          {safeItems.map((item, index) => {
            const itemId = getTripItemId(item);
            const isEditing = editingId === itemId;
            return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 8, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 430, damping: 34, mass: 0.55 }}
              className={`tp-motion-panel group flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 transition hover:border-brand-200 hover:bg-brand-50/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-800 dark:hover:bg-brand-900/20 sm:gap-3 sm:p-3 ${
                sortMode ? 'ring-1 ring-brand-100 dark:ring-brand-900/50' : ''
              }`}
            >
              {isEditing ? (
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <Input
                        {...plainTextInputProps}
                        autoFocus
                        value={editingText}
                        onChange={(event) => {
                          setEditingText(event.target.value);
                          if (editError) setEditError('');
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            saveEdit();
                          }
                          if (event.key === 'Escape') cancelEdit();
                        }}
                        aria-label={`編輯 ${item.text}`}
                        enterKeyHint="done"
                        className="text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={saveEdit}
                      className="touch-target tp-press-feedback inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300"
                      title="儲存修改"
                      aria-label={`儲存 ${item.text} 的修改`}
                    >
                      <Check size={17} />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="touch-target tp-press-feedback inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                      title="取消編輯"
                      aria-label="取消編輯"
                    >
                      <X size={17} />
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
                  <input
                    type="checkbox"
                    checked={item.done || false}
                    onChange={() => toggleItem(item.id)}
                    disabled={readOnly || sortMode}
                    className="tp-press-feedback h-5 w-5 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500 checked:scale-110 dark:border-slate-700 dark:bg-slate-900"
                    aria-label={`標記 ${item.text} 完成狀態`}
                  />
                  <span className={`min-w-0 flex-1 break-words text-sm font-medium transition-all duration-200 ${
                    item.done ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'
                  }`}>
                    {item.text}
                  </span>
                  {!readOnly && (
                    sortMode ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveItem(item.id, -1)}
                          disabled={index === 0}
                          className="touch-target tp-press-feedback inline-flex h-11 w-11 items-center justify-center rounded-lg text-brand-700 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-30 dark:text-brand-300 dark:hover:bg-brand-950/30"
                          title={`將 ${item.text} 上移`}
                          aria-label={`將 ${item.text} 上移`}
                        >
                          <ArrowUp size={17} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveItem(item.id, 1)}
                          disabled={index === safeItems.length - 1}
                          className="touch-target tp-press-feedback inline-flex h-11 w-11 items-center justify-center rounded-lg text-brand-700 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-30 dark:text-brand-300 dark:hover:bg-brand-950/30"
                          title={`將 ${item.text} 下移`}
                          aria-label={`將 ${item.text} 下移`}
                        >
                          <ArrowDown size={17} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="touch-target tp-press-feedback inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 opacity-100 transition hover:bg-brand-50 hover:text-brand-700 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-brand-950/30 dark:hover:text-brand-300"
                          title={`編輯 ${item.text}`}
                          aria-label={`編輯 ${item.text}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteItem(item.id)}
                          className="touch-target tp-press-feedback inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 opacity-100 transition hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                          title={`刪除 ${item.text}`}
                          aria-label={`刪除 ${item.text}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )
                  )}
                </>
              )}
            </motion.div>
            );
          })}
        </div>
      )}

      {!sortMode && <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input
          ref={inputRef}
          {...plainTextInputProps}
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          disabled={readOnly}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addItem();
            }
          }}
          placeholder={readOnly ? '只能查看待辦事項' : '新增待辦事項'}
          aria-label="新增待辦事項"
          enterKeyHint="done"
        />
        <Button onClick={addItem} disabled={readOnly || !inputValue.trim()}>
          <Plus size={16} />
          新增
        </Button>
      </div>}
    </div>
  );
};

export default Checklist;
