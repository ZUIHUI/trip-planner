import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  DollarSign,
  Edit2,
  Filter,
  ReceiptText,
  Save,
  Search,
  Sparkles,
  Trash2,
  Users,
  Wallet,
  X
} from 'lucide-react';
import { Badge, Button, Card, EmptyState, Field, Input, Select, Textarea } from './ui';
import { moneyInputProps, plainTextInputProps, searchInputProps } from '../utils/mobileInputProps';
import { getTripDayDisplayLabel } from '../utils/tripDates';

const EXPENSE_CATEGORIES = [
  { id: 'food', label: '餐飲', className: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-900/70' },
  { id: 'transport', label: '交通', className: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-900/70' },
  { id: 'shopping', label: '購物', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/70' },
  { id: 'ticket', label: '票券/門票', className: 'bg-brand-50 text-brand-700 border-brand-200 dark:bg-slate-800 dark:text-brand-800 dark:border-slate-700' },
  { id: 'accommodation', label: '住宿', className: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' },
  { id: 'other', label: '其他', className: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' }
];

const STATUS_FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'unsettled', label: '未結算' },
  { id: 'settled', label: '已結清' }
];

const QUICK_EXPENSES = {
  food: ['早餐', '午餐', '晚餐', '咖啡', '甜點'],
  transport: ['地鐵票', '計程車', '機場交通', '巴士票', '租車'],
  shopping: ['伴手禮', '藥妝', '零食', '衣物', '3C 配件'],
  ticket: ['景點門票', '展覽票', '交通票券', '餐券', '優惠券'],
  accommodation: ['飯店尾款', '住宿稅', '清潔費', '城市稅', '寄放行李'],
  other: ['保險', '電話卡', '手續費', '小費', '雜費']
};

const getCategory = (categoryId) => (
  EXPENSE_CATEGORIES.find((category) => category.id === categoryId) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]
);

const isSettledExpense = (expense) => Boolean(expense?.isSettled || expense?.splitType === 'settled');

const convertToTwd = (expense, exchangeRate) => {
  const amount = parseFloat(expense?.amount) || 0;
  return expense?.currency === 'JPY' ? Math.round(amount * exchangeRate) : amount;
};

const formatTwd = (amount) => `NT$ ${Math.round(amount || 0).toLocaleString()}`;

const formatOriginalAmount = (expense) => {
  const amount = Number(expense?.amount || 0).toLocaleString();
  return `${expense?.currency === 'TWD' ? 'NT$' : '¥'} ${amount}`;
};

const renderToBody = (node) => {
  if (typeof document === 'undefined') return null;
  return createPortal(node, document.body);
};

const getTargetDay = (itinerary = [], selectedDay) => (
  itinerary.find((day) => String(day.day) === String(selectedDay))
);

const getExpenseTitle = (expense) => expense?.title || expense?.name || '未命名支出';

const buildFormState = ({ itinerary = [], payerOptions = [], selectedDay = 'all', defaults = {} }) => {
  const targetDay = getTargetDay(itinerary, selectedDay);
  const fallbackDate = targetDay?.date || itinerary?.[0]?.date || '';
  const baseState = {
    title: '',
    amount: '',
    currency: 'JPY',
    date: fallbackDate,
    category: 'food',
    payer: payerOptions[0] || '我',
    splitType: 'all',
    involved: payerOptions,
    isSettled: false,
    note: ''
  };

  return {
    ...baseState,
    ...defaults,
    involved: defaults.involved || baseState.involved
  };
};

export const getExpenseStats = (expenses = [], exchangeRate = 1, visibleExpenses = expenses) => {
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const safeVisibleExpenses = Array.isArray(visibleExpenses) ? visibleExpenses : [];
  const total = safeExpenses.length;
  const settledCount = safeExpenses.filter(isSettledExpense).length;
  const unsettledCount = Math.max(total - settledCount, 0);
  const totalSpentTWD = safeExpenses.reduce((sum, item) => sum + convertToTwd(item, exchangeRate), 0);
  const visibleSpentTWD = safeVisibleExpenses.reduce((sum, item) => sum + convertToTwd(item, exchangeRate), 0);

  return {
    total,
    settledCount,
    unsettledCount,
    totalSpentTWD,
    visibleCount: safeVisibleExpenses.length,
    visibleSpentTWD,
    settledProgress: total ? Math.round((settledCount / total) * 100) : 0
  };
};

export const getVisibleExpenses = (
  expenses = [],
  { itinerary = [], selectedDay = 'all', statusFilter = 'all', categoryFilter = 'all', searchQuery = '' } = {}
) => {
  const query = searchQuery.trim().toLowerCase();
  const targetDay = selectedDay === 'all' ? null : getTargetDay(itinerary, selectedDay);

  return (Array.isArray(expenses) ? expenses : []).filter((expense) => {
    const matchesDay = selectedDay === 'all' || (targetDay && expense.date === targetDay.date);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'settled' && isSettledExpense(expense)) ||
      (statusFilter === 'unsettled' && !isSettledExpense(expense));
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    const matchesSearch =
      !query ||
      getExpenseTitle(expense).toLowerCase().includes(query) ||
      String(expense.note || '').toLowerCase().includes(query) ||
      String(expense.payer || '').toLowerCase().includes(query) ||
      getCategory(expense.category).label.toLowerCase().includes(query);

    return matchesDay && matchesStatus && matchesCategory && matchesSearch;
  });
};

const CategoryPill = ({ category }) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${category.className}`}>
    {category.label}
  </span>
);

const ExpenseSummary = ({ stats, exchangeRate, settlementCount, onOpenSettlement }) => (
  <Card className="overflow-hidden p-4 sm:p-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="tp-icon-chip bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
          <ReceiptText size={21} />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">記帳與分帳</p>
          <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
            {formatTwd(stats.totalSpentTWD)}
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
            目前匯率：JPY 1 約 {exchangeRate} TWD
          </p>
        </div>
      </div>

      <Button variant="secondary" onClick={onOpenSettlement} className="w-full justify-center sm:w-auto">
        <Wallet size={16} />
        查看分帳
        {settlementCount > 0 && (
          <span className="ml-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-black text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
            {settlementCount}
          </span>
        )}
      </Button>
    </div>

    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div className="rounded-lg bg-slate-50 px-3 py-3 dark:bg-slate-800/70">
        <p className="text-lg font-black text-slate-900 dark:text-white">{stats.total}</p>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">支出筆數</p>
      </div>
      <div className="rounded-lg bg-amber-50 px-3 py-3 dark:bg-amber-950/30">
        <p className="text-lg font-black text-amber-700 dark:text-amber-300">{stats.unsettledCount}</p>
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">未結算</p>
      </div>
      <div className="rounded-lg bg-emerald-50 px-3 py-3 dark:bg-emerald-950/30">
        <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">{stats.settledCount}</p>
        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">已結清</p>
      </div>
      <div className="rounded-lg bg-sky-50 px-3 py-3 dark:bg-sky-950/30">
        <p className="text-lg font-black text-sky-700 dark:text-sky-300">{formatTwd(stats.visibleSpentTWD)}</p>
        <p className="text-xs font-semibold text-sky-700 dark:text-sky-300">目前篩選</p>
      </div>
    </div>

    <div className="mt-4" aria-label={`已結清進度 ${stats.settledProgress}%`}>
      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
        <span>已結清進度</span>
        <span>{stats.settledProgress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all dark:bg-emerald-400"
          style={{ width: `${stats.settledProgress}%` }}
        />
      </div>
    </div>
  </Card>
);

const ExpenseFilters = ({
  itinerary,
  selectedDay,
  onSelectDay,
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  searchQuery,
  setSearchQuery,
  hasActiveFilters,
  onClearFilters
}) => (
  <Card className="p-3 sm:p-4">
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-100">
          <Filter size={16} />
          篩選支出
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="text-xs font-bold text-slate-500 underline-offset-4 hover:text-slate-800 hover:underline dark:text-slate-400 dark:hover:text-slate-100"
          >
            清除
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <Input
          {...searchInputProps}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="搜尋名稱、付款人、備註"
          aria-label="搜尋支出"
          className="pl-9"
        />
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="支出日期篩選">
        <button
          type="button"
          onClick={() => onSelectDay('all')}
          className={`min-h-[42px] shrink-0 rounded-full border px-4 text-sm font-bold transition ${
            selectedDay === 'all'
              ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950'
              : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
          aria-pressed={selectedDay === 'all'}
        >
          全部日期
        </button>
        {itinerary.map((day) => (
          <button
            key={day.day}
            type="button"
            onClick={() => onSelectDay(day.day)}
            className={`min-h-[42px] shrink-0 rounded-full border px-4 text-sm font-bold transition ${
              String(selectedDay) === String(day.day)
                ? 'border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-200'
                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
            aria-pressed={String(selectedDay) === String(day.day)}
          >
            {getTripDayDisplayLabel(day)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(180px,240px)_1fr]">
        <Select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          aria-label="分類篩選"
        >
          <option value="all">全部分類</option>
          {EXPENSE_CATEGORIES.map((category) => (
            <option key={category.id} value={category.id}>{category.label}</option>
          ))}
        </Select>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" aria-label="結算狀態篩選">
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
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  </Card>
);

const ExpenseCard = ({ item, exchangeRate, onEdit, onDelete, readOnly = false }) => {
  const category = getCategory(item.category);
  const title = getExpenseTitle(item);
  const isSettled = isSettledExpense(item);
  const twdText = item.currency !== 'TWD' ? formatTwd(convertToTwd(item, exchangeRate)) : null;
  const involved = item.splitType === 'all'
    ? '全員分攤'
    : item.splitType === 'specific'
      ? `分攤：${item.involved?.join('、') || '未設定'}`
      : '已結清';

  return (
    <Card as="article" interactive className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryPill category={category} />
            <Badge variant={isSettled ? 'success' : 'muted'}>
              <CheckCircle2 size={12} />
              {isSettled ? '已結清' : '未結算'}
            </Badge>
          </div>
          <h4 className="mt-2 break-words text-lg font-black text-slate-900 dark:text-white">{title}</h4>
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Calendar size={13} />
            {item.date || '未設定日期'}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-xl font-black text-slate-950 dark:text-white">{formatOriginalAmount(item)}</p>
          {twdText && <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">約 {twdText}</p>}
        </div>
      </div>

      <div className="mt-4 grid gap-2 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/70 sm:grid-cols-2">
        <p className="inline-flex min-w-0 items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <Users size={14} />
          <span className="shrink-0 text-slate-500 dark:text-slate-400">付款</span>
          <span className="truncate font-bold text-slate-800 dark:text-slate-100">{item.payer || '未設定付款人'}</span>
        </p>
        <p className="min-w-0 truncate text-slate-600 dark:text-slate-300" title={involved}>
          {involved}
        </p>
      </div>

      {item.note && (
        <p className="mt-3 break-words rounded-lg border border-slate-100 bg-white p-3 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          {item.note}
        </p>
      )}

      {!readOnly && (
        <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <Button variant="secondary" size="sm" onClick={() => onEdit(item)} aria-label={`編輯支出 ${title}`}>
            <Edit2 size={14} />
            編輯
          </Button>
          <Button variant="danger" size="sm" onClick={() => onDelete(item)} aria-label={`刪除支出 ${title}`}>
            <Trash2 size={14} />
            刪除
          </Button>
        </div>
      )}
    </Card>
  );
};

const ExpenseList = ({ groupedExpenses, exchangeRate, hasExpenses, hasActiveFilters, onEdit, onDelete, onAddExpense, onClearFilters, readOnly = false }) => {
  if (Object.keys(groupedExpenses).length === 0) {
    return (
      <EmptyState
        icon={DollarSign}
        title={hasExpenses ? '找不到符合條件的支出' : '目前尚無支出'}
        actionLabel={hasExpenses && hasActiveFilters ? '清除篩選' : readOnly ? '' : '新增第一筆支出'}
        onAction={hasExpenses && hasActiveFilters ? onClearFilters : readOnly ? undefined : onAddExpense}
      />
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedExpenses).map(([date, items]) => {
        const dailyTotal = items.reduce((sum, item) => sum + convertToTwd(item, exchangeRate), 0);

        return (
          <section key={date} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="inline-flex min-w-0 items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                <Calendar size={14} />
                <span className="truncate">{date || '未設定日期'}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {items.length} 筆
                </span>
              </h3>
              <span className="shrink-0 text-sm font-black text-slate-700 dark:text-slate-200">{formatTwd(dailyTotal)}</span>
            </div>

            <div className="space-y-3">
              {items.map((item) => (
                <ExpenseCard
                  key={item.id}
                  item={item}
                  exchangeRate={exchangeRate}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  readOnly={readOnly}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};

const SplitTypeButton = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`min-h-[44px] rounded-lg border px-2 py-2 text-xs font-bold transition ${
      active
        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
    }`}
    aria-pressed={active}
  >
    {children}
  </button>
);

const FieldError = ({ children }) => (
  children ? <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-300" role="alert">{children}</p> : null
);

const ExpenseFormModal = ({
  editingId,
  formData,
  setFormData,
  itinerary,
  payerOptions,
  errors,
  onSubmit,
  onClose,
  onInvolvedChange
}) => {
  const suggestions = QUICK_EXPENSES[formData.category] || QUICK_EXPENSES.other;

  return renderToBody(
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={editingId ? '編輯支出' : '新增支出'}>
      <form
        onSubmit={onSubmit}
        className="max-h-[100svh] w-full overflow-y-auto rounded-t-lg border border-slate-200 bg-white p-4 shadow-2xl sm:max-h-[90vh] sm:max-w-lg sm:rounded-lg dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">{editingId ? '編輯支出' : '新增支出'}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">記錄金額、付款人與分帳方式。</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="關閉支出表單"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <section className="space-y-3">
            <Field label="支出名稱" htmlFor="expense-title">
              <Input
                id="expense-title"
                {...plainTextInputProps}
                name="title"
                value={formData.title || ''}
                onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="例如：拉麵、車票、門票"
                aria-invalid={Boolean(errors.title)}
                enterKeyHint="next"
                autoFocus
              />
              <FieldError>{errors.title}</FieldError>
            </Field>

            {!editingId && (
              <div>
                <p className="mb-2 flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <Sparkles size={14} />
                  快速名稱
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, title: suggestion }))}
                      className="min-h-[36px] rounded-full border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/30"
                    >
                      + {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="金額" htmlFor="expense-amount">
              <Input
                id="expense-amount"
                {...moneyInputProps}
                name="amount"
                value={formData.amount || ''}
                onChange={(event) => setFormData((prev) => ({ ...prev, amount: event.target.value }))}
                placeholder="0"
                min="0"
                step="0.01"
                aria-invalid={Boolean(errors.amount)}
              />
              <FieldError>{errors.amount}</FieldError>
            </Field>
            <Field label="幣別" htmlFor="expense-currency">
              <Select
                id="expense-currency"
                name="currency"
                value={formData.currency}
                onChange={(event) => setFormData((prev) => ({ ...prev, currency: event.target.value }))}
              >
                <option value="JPY">JPY (日圓)</option>
                <option value="TWD">TWD (台幣)</option>
              </Select>
            </Field>
          </section>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="日期" htmlFor="expense-date">
              <Select
                id="expense-date"
                name="date"
                value={formData.date}
                onChange={(event) => setFormData((prev) => ({ ...prev, date: event.target.value }))}
              >
                {itinerary.length === 0 && <option value="">未設定日期</option>}
                {itinerary.map((day) => (
                  <option key={day.day} value={day.date}>
                    {getTripDayDisplayLabel(day)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="分類" htmlFor="expense-category">
              <Select
                id="expense-category"
                name="category"
                value={formData.category}
                onChange={(event) => setFormData((prev) => ({ ...prev, category: event.target.value }))}
              >
                {EXPENSE_CATEGORIES.map((category) => (
                  <option key={category.id} value={category.id}>{category.label}</option>
                ))}
              </Select>
            </Field>
          </section>

          <Field label="備註" htmlFor="expense-note">
            <Textarea
              id="expense-note"
              name="note"
              value={formData.note || ''}
              onChange={(event) => setFormData((prev) => ({ ...prev, note: event.target.value }))}
              placeholder="例如：收據、付款方式、同行者備註"
              rows="2"
              enterKeyHint="done"
            />
          </Field>

          <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/70">
            <Field label="誰先付款？" htmlFor="expense-payer">
              <Select
                id="expense-payer"
                name="payer"
                value={formData.payer}
                onChange={(event) => setFormData((prev) => ({ ...prev, payer: event.target.value }))}
              >
                {payerOptions.map((payer) => (
                  <option key={payer} value={payer}>{payer}</option>
                ))}
              </Select>
            </Field>

            <div className="mt-3">
              <p className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">分帳方式</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <SplitTypeButton
                  active={formData.splitType === 'all'}
                  onClick={() => setFormData((prev) => ({ ...prev, splitType: 'all', involved: payerOptions }))}
                >
                  全員均分
                </SplitTypeButton>
                <SplitTypeButton
                  active={formData.splitType === 'specific'}
                  onClick={() => setFormData((prev) => ({ ...prev, splitType: 'specific', involved: prev.involved?.length ? prev.involved : payerOptions }))}
                >
                  指定分攤
                </SplitTypeButton>
                <SplitTypeButton
                  active={formData.splitType === 'settled'}
                  onClick={() => setFormData((prev) => ({ ...prev, splitType: 'settled', isSettled: true }))}
                >
                  已結清
                </SplitTypeButton>
              </div>

              {formData.splitType === 'specific' && (
                <div className="mt-3">
                  <p className="mb-2 text-xs font-bold text-slate-500 dark:text-slate-400">選擇要分攤的人</p>
                  <div className="flex flex-wrap gap-2">
                    {payerOptions.map((person) => (
                      <button
                        key={person}
                        type="button"
                        onClick={() => onInvolvedChange(person)}
                        className={`min-h-[36px] rounded-full border px-3 text-xs font-bold transition ${
                          formData.involved?.includes(person)
                            ? 'border-emerald-600 bg-emerald-500 text-white'
                            : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                        }`}
                        aria-pressed={formData.involved?.includes(person)}
                      >
                        {person}
                      </button>
                    ))}
                  </div>
                  <FieldError>{errors.involved}</FieldError>
                </div>
              )}

              {formData.splitType === 'settled' && (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  這筆支出會標記為已結清，不納入誰欠誰的分帳計算。
                </p>
              )}
            </div>
          </section>

          <div className="sticky bottom-0 -mx-4 border-t border-slate-100 bg-white/95 px-4 py-3 supports-[backdrop-filter]:backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 dark:border-slate-800 dark:bg-slate-900/95 sm:dark:bg-transparent">
            <Button type="submit" className="w-full">
              <Save size={18} />
              {editingId ? '更新支出' : '新增支出'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

const SettlementModal = ({ settlements, onClose }) => {
  const totalTransferAmount = settlements.reduce((sum, transfer) => sum + transfer.amount, 0);

  return renderToBody(
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="分帳結果">
      <div className="flex max-h-[100svh] w-full flex-col overflow-hidden rounded-t-lg border border-slate-200 bg-white shadow-2xl sm:max-h-[90vh] sm:max-w-md sm:rounded-lg dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-emerald-50 p-4 dark:border-slate-800 dark:bg-emerald-950/20">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-black text-emerald-800 dark:text-emerald-300">
              <Wallet size={20} />
              分帳結果
            </h3>
            <p className="mt-1 text-sm font-semibold text-emerald-700/80 dark:text-emerald-200/80">
              {settlements.length > 0 ? `${settlements.length} 筆轉帳，合計 ${formatTwd(totalTransferAmount)}` : '目前不用轉帳'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target inline-flex h-10 w-10 items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
            aria-label="關閉分帳結果"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          {settlements.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="目前沒有需要結算的金額"
              className="border-0 shadow-none"
            />
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">轉帳清單：</p>
              {settlements.map((transfer, index) => (
                <div key={`${transfer.from}-${transfer.to}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/70">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="min-w-0 flex-1 truncate text-left font-bold text-slate-800 dark:text-slate-100" title={transfer.from}>{transfer.from}</span>
                      <span className="flex shrink-0 flex-col items-center text-slate-400">
                        <span className="text-[10px]">給</span>
                        <ArrowRight size={16} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-right font-bold text-slate-800 dark:text-slate-100" title={transfer.to}>{transfer.to}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-right text-xl font-black text-emerald-700 dark:text-emerald-300">
                    {formatTwd(transfer.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 bg-slate-50 p-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
          金額以台幣估算，實際付款仍以現場匯率與支付紀錄為準。
        </div>
      </div>
    </div>
  );
};

const ConfirmDialog = ({ target, onCancel, onConfirm }) => {
  if (!target) return null;

  return renderToBody(
    <div
      className="fixed inset-0 z-[140] flex items-end justify-center bg-slate-950/55 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-delete-title"
    >
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <h3 id="expense-delete-title" className="text-lg font-black text-slate-900 dark:text-white">
          刪除這筆支出？
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          「{getExpenseTitle(target)}」會從記帳清單移除，這個動作無法復原。
        </p>
        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button variant="secondary" onClick={onCancel}>取消</Button>
          <Button variant="danger" onClick={onConfirm}>刪除</Button>
        </div>
      </div>
    </div>
  );
};

const ExpenseTracker = forwardRef(({
  itinerary = [],
  expenses = [],
  setExpenses,
  exchangeRate = 0.215,
  travelers = [],
  onModalOpenChange,
  readOnly = false
}, ref) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedDay, setSelectedDay] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  const payerOptions = useMemo(() => {
    if (travelers && travelers.length > 0) {
      return travelers.map((traveler) => (typeof traveler === 'object' && traveler.name) ? traveler.name : traveler);
    }
    return ['我'];
  }, [travelers]);

  const initialFormState = useMemo(() => buildFormState({
    itinerary,
    payerOptions,
    selectedDay
  }), [itinerary, payerOptions, selectedDay]);

  const [formData, setFormData] = useState(initialFormState);

  const safeExpenses = Array.isArray(expenses) ? expenses : [];

  const visibleExpenses = useMemo(() => getVisibleExpenses(safeExpenses, {
    itinerary,
    selectedDay,
    statusFilter,
    categoryFilter,
    searchQuery
  }), [safeExpenses, itinerary, selectedDay, statusFilter, categoryFilter, searchQuery]);

  const stats = useMemo(
    () => getExpenseStats(safeExpenses, exchangeRate, visibleExpenses),
    [safeExpenses, exchangeRate, visibleExpenses]
  );

  const settlements = useMemo(() => {
    const balances = {};
    payerOptions.forEach((payer) => {
      balances[payer] = 0;
    });

    safeExpenses.forEach((expense) => {
      if (isSettledExpense(expense)) return;

      const amountTWD = convertToTwd(expense, exchangeRate);
      const payer = expense.payer;
      const involved = expense.splitType === 'all' ? payerOptions : (expense.involved || []);
      if (!involved.length) return;

      const splitAmount = amountTWD / involved.length;

      if (payer) {
        balances[payer] = (balances[payer] || 0) + amountTWD;
      }

      involved.forEach((person) => {
        balances[person] = (balances[person] || 0) - splitAmount;
      });
    });

    const debtors = [];
    const creditors = [];

    Object.entries(balances).forEach(([person, amount]) => {
      if (amount < -1) debtors.push({ person, amount });
      if (amount > 1) creditors.push({ person, amount });
    });

    debtors.sort((a, b) => a.amount - b.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const transfers = [];
    let debtorIndex = 0;
    let creditorIndex = 0;

    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const debtor = debtors[debtorIndex];
      const creditor = creditors[creditorIndex];
      const amount = Math.min(Math.abs(debtor.amount), creditor.amount);

      if (amount > 0) {
        transfers.push({
          from: debtor.person,
          to: creditor.person,
          amount: Math.round(amount)
        });
      }

      debtor.amount += amount;
      creditor.amount -= amount;

      if (Math.abs(debtor.amount) < 1) debtorIndex += 1;
      if (creditor.amount < 1) creditorIndex += 1;
    }

    return transfers;
  }, [safeExpenses, exchangeRate, payerOptions]);

  const groupedExpenses = useMemo(() => {
    const sorted = [...visibleExpenses].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    return sorted.reduce((groups, item) => {
      const date = item.date || '未設定日期';
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
      return groups;
    }, {});
  }, [visibleExpenses]);

  const hasActiveFilters =
    selectedDay !== 'all' ||
    statusFilter !== 'all' ||
    categoryFilter !== 'all' ||
    Boolean(searchQuery.trim());

  useEffect(() => {
    onModalOpenChange?.(isFormOpen || isSettlementOpen || Boolean(deleteTarget));
    return () => {
      onModalOpenChange?.(false);
    };
  }, [isFormOpen, isSettlementOpen, deleteTarget, onModalOpenChange]);

  const openAddForm = (defaults = {}) => {
    if (readOnly) return;
    setEditingId(null);
    setFormErrors({});
    setFormData(buildFormState({
      itinerary,
      payerOptions,
      selectedDay,
      defaults
    }));
    setIsFormOpen(true);
  };

  useImperativeHandle(ref, () => ({
    openAddForm
  }), [itinerary, payerOptions, readOnly, selectedDay]);

  const clearFilters = () => {
    setSelectedDay('all');
    setStatusFilter('all');
    setCategoryFilter('all');
    setSearchQuery('');
  };

  const validateForm = () => {
    const nextErrors = {};
    const amount = Number(formData.amount);

    if (!String(formData.title || '').trim()) {
      nextErrors.title = '請輸入支出名稱';
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      nextErrors.amount = '請輸入大於 0 的金額';
    }

    if (formData.splitType === 'specific' && (!formData.involved || formData.involved.length === 0)) {
      nextErrors.involved = '請至少選擇一位分攤者';
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (readOnly) return;
    if (!validateForm()) return;

    const expenseData = {
      ...formData,
      title: String(formData.title || '').trim(),
      amount: parseFloat(formData.amount),
      isSettled: formData.splitType === 'settled' ? true : false,
      involved: formData.splitType === 'all'
        ? payerOptions
        : formData.splitType === 'settled'
          ? []
          : formData.involved
    };

    if (editingId) {
      setExpenses((prev) => prev.map((item) => (
        item.id === editingId ? { ...expenseData, id: editingId } : item
      )));
    } else {
      setExpenses((prev) => [
        ...prev,
        {
          ...expenseData,
          id: Date.now().toString()
        }
      ]);
    }

    handleCloseForm();
  };

  const handleConfirmDelete = () => {
    if (readOnly) return;
    if (!deleteTarget) return;
    setExpenses((prev) => prev.filter((item) => item.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const handleEdit = (item) => {
    if (readOnly) return;
    setFormErrors({});
    setFormData({
      title: getExpenseTitle(item) === '未命名支出' ? '' : getExpenseTitle(item),
      amount: item.amount !== undefined ? item.amount : '',
      currency: item.currency || 'JPY',
      date: item.date || itinerary[0]?.date || '',
      category: item.category || 'food',
      payer: item.payer || payerOptions[0],
      splitType: item.splitType || (item.isSettled ? 'settled' : 'all'),
      involved: item.involved || payerOptions,
      isSettled: item.isSettled || false,
      note: item.note || ''
    });
    setEditingId(item.id);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setFormData(initialFormState);
    setFormErrors({});
  };

  const handleInvolvedChange = (person) => {
    setFormData((prev) => {
      const currentInvolved = prev.involved || [];
      const nextInvolved = currentInvolved.includes(person)
        ? currentInvolved.filter((item) => item !== person)
        : [...currentInvolved, person];
      return { ...prev, involved: nextInvolved };
    });
  };

  return (
    <div className="relative space-y-4 pb-24">
      <ExpenseSummary
        stats={stats}
        exchangeRate={exchangeRate}
        settlementCount={settlements.length}
        onOpenSettlement={() => setIsSettlementOpen(true)}
      />

      <ExpenseFilters
        itinerary={itinerary}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      <ExpenseList
        groupedExpenses={groupedExpenses}
        exchangeRate={exchangeRate}
        hasExpenses={safeExpenses.length > 0}
        hasActiveFilters={hasActiveFilters}
        onEdit={handleEdit}
        onDelete={setDeleteTarget}
        onAddExpense={() => openAddForm()}
        onClearFilters={clearFilters}
        readOnly={readOnly}
      />

      {isFormOpen && (
        <ExpenseFormModal
          editingId={editingId}
          formData={formData}
          setFormData={setFormData}
          itinerary={itinerary}
          payerOptions={payerOptions}
          errors={formErrors}
          onSubmit={handleSubmit}
          onClose={handleCloseForm}
          onInvolvedChange={handleInvolvedChange}
        />
      )}

      {isSettlementOpen && (
        <SettlementModal settlements={settlements} onClose={() => setIsSettlementOpen(false)} />
      )}

      <ConfirmDialog
        target={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
});

ExpenseTracker.displayName = 'ExpenseTracker';

export default ExpenseTracker;
