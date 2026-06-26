import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { Button, EmptyState, Input } from './ui';
import { useFeedback } from '../contexts/FeedbackContext';
import { plainTextInputProps } from '../utils/mobileInputProps';

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
        <div className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
          {safeItems.length ? `${Math.round((doneCount / safeItems.length) * 100)}%` : '0%'}
        </div>
      </div>

      {safeItems.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="目前沒有待辦項目"
          className="py-8"
        />
      ) : (
        <div className="space-y-2">
          {safeItems.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 8, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 430, damping: 34, mass: 0.55 }}
              className="tp-motion-panel group flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 transition hover:border-brand-200 hover:bg-brand-50/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-800 dark:hover:bg-brand-900/20"
            >
              <input
                type="checkbox"
                checked={item.done || false}
                onChange={() => toggleItem(item.id)}
                disabled={readOnly}
                className="tp-press-feedback h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 checked:scale-110 dark:border-slate-700 dark:bg-slate-900"
                aria-label={`標記 ${item.text} 完成狀態`}
              />
              <span className={`min-w-0 flex-1 break-words text-sm font-medium transition-all duration-200 ${
                item.done ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'
              }`}>
                {item.text}
              </span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => deleteItem(item.id)}
                  className="touch-target tp-press-feedback inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 opacity-100 transition hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                  title={`刪除 ${item.text}`}
                  aria-label={`刪除 ${item.text}`}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
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
      </div>
    </div>
  );
};

export default Checklist;
