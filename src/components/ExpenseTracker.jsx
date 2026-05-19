import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  DollarSign,
  Edit2,
  Save,
  Trash2,
  Users,
  Wallet,
  X
} from 'lucide-react';
import { Badge, Button, Card, EmptyState, Field, Input, Select, Textarea } from './ui';

const EXPENSE_CATEGORIES = [
  { id: 'food', label: '餐飲', className: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-900/70' },
  { id: 'transport', label: '交通', className: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-900/70' },
  { id: 'shopping', label: '購物', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/70' },
  { id: 'ticket', label: '票券/門票', className: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-900/70' },
  { id: 'accommodation', label: '住宿', className: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-900/70' },
  { id: 'other', label: '其他', className: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' }
];

const getCategory = (categoryId) => (
  EXPENSE_CATEGORIES.find((category) => category.id === categoryId) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]
);

const convertToTwd = (expense, exchangeRate) => {
  const amount = parseFloat(expense.amount) || 0;
  return expense.currency === 'JPY' ? Math.round(amount * exchangeRate) : amount;
};

const formatTwd = (amount) => `NT$ ${Math.round(amount).toLocaleString()}`;

const renderToBody = (node) => {
  if (typeof document === 'undefined') return null;
  return createPortal(node, document.body);
};

const ExpenseSummary = ({ totalSpentTWD, exchangeRate, onOpenSettlement }) => (
  <Card className="overflow-hidden border-emerald-200 bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white dark:border-emerald-900">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-emerald-50">總旅行花費 (TWD)</p>
        <h2 className="mt-1 text-4xl font-black tracking-tight">{formatTwd(totalSpentTWD)}</h2>
      </div>
      <div className="rounded-lg bg-white/20 p-2" aria-hidden="true">
        <DollarSign size={24} />
      </div>
    </div>
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="rounded-lg bg-white/12 px-3 py-2 text-xs font-semibold text-emerald-50">
        目前匯率：JPY 1 約 {exchangeRate} TWD
      </div>
      <Button variant="secondary" onClick={onOpenSettlement} className="border-white/50 bg-white text-emerald-700 hover:bg-emerald-50">
        <Wallet size={16} />
        查看分帳
      </Button>
    </div>
  </Card>
);

const DayFilter = ({ itinerary, selectedDay, onSelectDay }) => (
  <Card className="p-2">
    <div className="no-scrollbar flex gap-2 overflow-x-auto" role="tablist" aria-label="支出日期篩選">
      <button
        type="button"
        onClick={() => onSelectDay('all')}
        className={`touch-target shrink-0 rounded-lg px-4 py-2 text-sm font-bold transition ${
          selectedDay === 'all'
            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
        }`}
        aria-pressed={selectedDay === 'all'}
      >
        全部
      </button>
      {itinerary.map((day) => (
        <button
          key={day.day}
          type="button"
          onClick={() => onSelectDay(day.day)}
          className={`touch-target shrink-0 rounded-lg px-4 py-2 text-sm font-bold transition ${
            selectedDay === day.day
              ? 'bg-brand-600 text-white dark:bg-brand-500 dark:text-slate-950'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
          aria-pressed={selectedDay === day.day}
        >
          Day {day.day} ({day.date})
        </button>
      ))}
    </div>
  </Card>
);

const CategoryPill = ({ category }) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${category.className}`}>
    {category.label}
  </span>
);

const ExpenseCard = ({ item, exchangeRate, onEdit, onDelete }) => {
  const category = getCategory(item.category);
  const amountText = `${item.currency === 'TWD' ? 'NT$' : '¥'} ${Number(item.amount || 0).toLocaleString()}`;
  const twdText = item.currency !== 'TWD' ? formatTwd(convertToTwd(item, exchangeRate)) : null;
  const splitLabel = item.splitType === 'settled'
    ? '已結清'
    : item.splitType === 'all'
      ? '全員分攤'
      : `分攤：${item.involved?.join(', ') || '未設定'}`;

  return (
    <Card as="article" interactive className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <CategoryPill category={category} />
            {item.isSettled && (
              <Badge variant="muted">
                <CheckCircle2 size={12} />
                已結清
              </Badge>
            )}
          </div>
          <h4 className="break-words text-lg font-black text-slate-900 dark:text-white">{item.title}</h4>
          {item.note && (
            <p className="mt-2 inline-block max-w-full break-words rounded-lg bg-slate-50 p-2 text-sm leading-6 text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
              {item.note}
            </p>
          )}
        </div>

        <div className="shrink-0 text-left sm:text-right">
          <p className="text-xl font-black text-slate-900 dark:text-white">{amountText}</p>
          {twdText && <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">約 {twdText}</p>}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-end sm:justify-between dark:border-slate-800">
        <div className="space-y-1 text-sm text-slate-500 dark:text-slate-400">
          <p className="inline-flex items-center gap-1.5">
            <Users size={14} />
            <span className="font-semibold text-slate-700 dark:text-slate-200">{item.payer || '未設定付款人'}</span>
          </p>
          <p>{splitLabel}</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => onEdit(item)} aria-label={`編輯支出 ${item.title}`}>
            <Edit2 size={14} />
            編輯
          </Button>
          <Button variant="danger" size="sm" onClick={() => onDelete(item.id)} aria-label={`刪除支出 ${item.title}`}>
            <Trash2 size={14} />
            刪除
          </Button>
        </div>
      </div>
    </Card>
  );
};

const ExpenseList = ({ groupedExpenses, exchangeRate, onEdit, onDelete }) => {
  if (Object.keys(groupedExpenses).length === 0) {
    return (
      <EmptyState
        icon={DollarSign}
        title="目前尚無支出"
        description="點擊新增支出，記錄第一筆旅行花費。"
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
              <h3 className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                <Calendar size={14} />
                {date || '未設定日期'}
              </h3>
              <span className="text-sm font-black text-slate-700 dark:text-slate-200">{formatTwd(dailyTotal)}</span>
            </div>

            <div className="space-y-3">
              {items.map((item) => (
                <ExpenseCard
                  key={item.id}
                  item={item}
                  exchangeRate={exchangeRate}
                  onEdit={onEdit}
                  onDelete={onDelete}
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
    className={`touch-target flex-1 rounded-lg border px-2 py-2 text-xs font-bold transition ${
      active
        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
    }`}
    aria-pressed={active}
  >
    {children}
  </button>
);

const ExpenseFormModal = ({
  editingId,
  formData,
  setFormData,
  itinerary,
  payerOptions,
  onSubmit,
  onClose,
  onInvolvedChange
}) => renderToBody(
  <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={editingId ? '編輯支出' : '新增支出'}>
    <form
      onSubmit={onSubmit}
      className="max-h-[100svh] w-full overflow-y-auto rounded-t-lg border border-slate-200 bg-white p-4 shadow-2xl sm:max-h-[90vh] sm:max-w-md sm:rounded-lg dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{editingId ? '編輯支出' : '新增支出'}</h3>
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
        <Field label="支出名稱" htmlFor="expense-title">
          <Input
            id="expense-title"
            type="text"
            name="title"
            value={formData.title || ''}
            onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="例如：拉麵、車票、門票"
            required
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="金額" htmlFor="expense-amount">
            <Input
              id="expense-amount"
              type="number"
              name="amount"
              value={formData.amount || ''}
              onChange={(event) => setFormData((prev) => ({ ...prev, amount: event.target.value }))}
              placeholder="0"
              min="0"
              required
            />
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
        </div>

        <div className="grid grid-cols-2 gap-3">
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
                  Day {day.day} ({day.date})
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
        </div>

        <Field label="備註" htmlFor="expense-note">
          <Textarea
            id="expense-note"
            name="note"
            value={formData.note || ''}
            onChange={(event) => setFormData((prev) => ({ ...prev, note: event.target.value }))}
            placeholder="例如：收據、付款方式、同行者備註"
            rows="2"
          />
        </Field>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/70">
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
            <div className="grid grid-cols-3 gap-2">
              <SplitTypeButton
                active={formData.splitType === 'all'}
                onClick={() => setFormData((prev) => ({ ...prev, splitType: 'all' }))}
              >
                全員均分
              </SplitTypeButton>
              <SplitTypeButton
                active={formData.splitType === 'specific'}
                onClick={() => setFormData((prev) => ({ ...prev, splitType: 'specific' }))}
              >
                指定分攤
              </SplitTypeButton>
              <SplitTypeButton
                active={formData.splitType === 'settled'}
                onClick={() => setFormData((prev) => ({ ...prev, splitType: 'settled' }))}
              >
                已結清
              </SplitTypeButton>
            </div>

            {formData.splitType === 'specific' && (
              <div className="mt-3 flex flex-wrap gap-2">
                {payerOptions.map((person) => (
                  <button
                    key={person}
                    type="button"
                    onClick={() => onInvolvedChange(person)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
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
            )}

            {formData.splitType === 'settled' && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                這筆支出會標記為已結清，不納入誰欠誰的分帳計算。
              </p>
            )}
          </div>
        </div>

        <Button type="submit" className="w-full">
          <Save size={18} />
          {editingId ? '更新支出' : '新增支出'}
        </Button>
      </div>
    </form>
  </div>
);

const SettlementModal = ({ settlements, onClose }) => renderToBody(
  <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="分帳結果">
    <div className="flex max-h-[100svh] w-full flex-col overflow-hidden rounded-t-lg border border-slate-200 bg-white shadow-2xl sm:max-h-[90vh] sm:max-w-md sm:rounded-lg dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 bg-emerald-50 p-4 dark:border-slate-800 dark:bg-emerald-950/20">
        <h3 className="flex items-center gap-2 text-lg font-bold text-emerald-800 dark:text-emerald-300">
          <Wallet size={20} />
          分帳結果 (TWD)
        </h3>
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
            description="所有花費可能已結清，或目前沒有可分帳的支出。"
            className="border-0 shadow-none"
          />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">依照目前分帳方式，建議用以下轉帳完成結算。</p>
            {settlements.map((transfer, index) => (
              <div key={`${transfer.from}-${transfer.to}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/70">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="w-20 truncate text-center font-bold text-slate-800 dark:text-slate-100" title={transfer.from}>{transfer.from}</span>
                  <span className="flex flex-col items-center text-slate-400">
                    <span className="text-[10px]">給</span>
                    <ArrowRight size={16} />
                  </span>
                  <span className="w-20 truncate text-center font-bold text-slate-800 dark:text-slate-100" title={transfer.to}>{transfer.to}</span>
                </div>
                <span className="shrink-0 text-lg font-black text-emerald-700 dark:text-emerald-300">
                  {formatTwd(transfer.amount)}
                </span>
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

const ExpenseTracker = forwardRef(({
  itinerary = [],
  expenses = [],
  setExpenses,
  exchangeRate = 0.215,
  travelers = [],
  onModalOpenChange
}, ref) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedDay, setSelectedDay] = useState('all');

  useEffect(() => {
    onModalOpenChange?.(isFormOpen || isSettlementOpen);
    return () => {
      onModalOpenChange?.(false);
    };
  }, [isFormOpen, isSettlementOpen, onModalOpenChange]);

  const payerOptions = useMemo(() => {
    if (travelers && travelers.length > 0) {
      return travelers.map((traveler) => (typeof traveler === 'object' && traveler.name) ? traveler.name : traveler);
    }
    return ['我'];
  }, [travelers]);

  const initialFormState = useMemo(() => ({
    title: '',
    amount: '',
    currency: 'JPY',
    date: itinerary?.[0]?.date || '',
    category: 'food',
    payer: payerOptions[0],
    splitType: 'all',
    involved: payerOptions,
    isSettled: false,
    note: ''
  }), [itinerary, payerOptions]);

  const [formData, setFormData] = useState(initialFormState);

  const safeExpenses = Array.isArray(expenses) ? expenses : [];

  const totalSpentTWD = useMemo(() => (
    safeExpenses.reduce((total, item) => total + convertToTwd(item, exchangeRate), 0)
  ), [safeExpenses, exchangeRate]);

  const settlements = useMemo(() => {
    const balances = {};
    payerOptions.forEach((payer) => {
      balances[payer] = 0;
    });

    safeExpenses.forEach((expense) => {
      if (expense.isSettled || expense.splitType === 'settled') return;

      const amountTWD = convertToTwd(expense, exchangeRate);
      const payer = expense.payer;
      const involved = expense.involved || [];
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

  const filteredExpenses = useMemo(() => {
    if (selectedDay === 'all') return safeExpenses;
    const targetDay = itinerary.find((day) => day.day === parseInt(selectedDay, 10));
    if (!targetDay) return [];
    return safeExpenses.filter((expense) => expense.date === targetDay.date);
  }, [safeExpenses, selectedDay, itinerary]);

  const groupedExpenses = useMemo(() => {
    const sorted = [...filteredExpenses].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    return sorted.reduce((groups, item) => {
      const date = item.date || '未設定日期';
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
      return groups;
    }, {});
  }, [filteredExpenses]);

  const openAddForm = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setIsFormOpen(true);
  };

  useImperativeHandle(ref, () => ({
    openAddForm
  }), [initialFormState]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!formData.title || !formData.amount) return;

    const expenseData = {
      ...formData,
      amount: parseFloat(formData.amount),
      isSettled: formData.splitType === 'settled' ? true : formData.isSettled,
      involved: formData.splitType === 'all' ? payerOptions : formData.involved
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

  const handleDelete = (id) => {
    const target = safeExpenses.find((item) => item.id === id);
    if (!target) return;
    if (!window.confirm(`確定要刪除「${target.title}」這筆支出嗎？`)) return;
    setExpenses((prev) => prev.filter((item) => item.id !== id));
  };

  const handleEdit = (item) => {
    setFormData({
      title: item.title || '',
      amount: item.amount !== undefined ? item.amount : '',
      currency: item.currency || 'JPY',
      date: item.date || itinerary[0]?.date || '',
      category: item.category || 'food',
      payer: item.payer || payerOptions[0],
      splitType: item.splitType || 'all',
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
        totalSpentTWD={totalSpentTWD}
        exchangeRate={exchangeRate}
        onOpenSettlement={() => setIsSettlementOpen(true)}
      />

      <DayFilter itinerary={itinerary} selectedDay={selectedDay} onSelectDay={setSelectedDay} />

      <ExpenseList
        groupedExpenses={groupedExpenses}
        exchangeRate={exchangeRate}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {isFormOpen && (
        <ExpenseFormModal
          editingId={editingId}
          formData={formData}
          setFormData={setFormData}
          itinerary={itinerary}
          payerOptions={payerOptions}
          onSubmit={handleSubmit}
          onClose={handleCloseForm}
          onInvolvedChange={handleInvolvedChange}
        />
      )}

      {isSettlementOpen && (
        <SettlementModal settlements={settlements} onClose={() => setIsSettlementOpen(false)} />
      )}
    </div>
  );
});

ExpenseTracker.displayName = 'ExpenseTracker';

export default ExpenseTracker;
