import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, DollarSign, Calendar, X, Save, Tag, Users, CheckCircle2, ArrowRight, Wallet } from 'lucide-react';

const ExpenseTracker = ({ itinerary = [], expenses = [], setExpenses, exchangeRate = 0.215, travelers = [] }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedDay, setSelectedDay] = useState('all');
  
  // 確保至少有一個付款人選項
  const payerOptions = useMemo(() => {
    if (travelers && travelers.length > 0) {
      return travelers.map(t => (typeof t === 'object' && t.name) ? t.name : t);
    }
    return ['我'];
  }, [travelers]);

  const initialFormState = useMemo(() => ({
    title: '',
    amount: '',
    currency: 'JPY',
    date: (itinerary && itinerary.length > 0) ? itinerary[0].date : '',
    category: 'food',
    payer: payerOptions[0],
    splitType: 'all', // all, specific, settled
    involved: payerOptions, // 預設所有人分攤
    isSettled: false // 是否已結清
  }), [itinerary, payerOptions]);
  
  const [formData, setFormData] = useState(initialFormState);

  const categories = [
    { id: 'food', label: '餐飲', color: 'bg-orange-100 text-orange-600' },
    { id: 'transport', label: '交通', color: 'bg-blue-100 text-blue-600' },
    { id: 'shopping', label: '購物', color: 'bg-emerald-100 text-emerald-600' },
    { id: 'ticket', label: '票券/門票', color: 'bg-purple-100 text-purple-600' },
    { id: 'accommodation', label: '住宿', color: 'bg-indigo-100 text-indigo-600' },
    { id: 'other', label: '其他', color: 'bg-gray-100 text-gray-600' }
  ];

  // 計算總花費 (TWD)
  const totalSpentTWD = useMemo(() => {
    return expenses.reduce((total, item) => {
      const amount = parseFloat(item.amount) || 0;
      const amountTWD = item.currency === 'JPY' ? Math.round(amount * exchangeRate) : amount;
      return total + amountTWD;
    }, 0);
  }, [expenses, exchangeRate]);

  // 計算分帳結果
  const settlements = useMemo(() => {
    const balances = {};
    // 初始化餘額
    payerOptions.forEach(p => balances[p] = 0);

    expenses.forEach(expense => {
      // 跳過已結清的項目
      if (expense.isSettled || expense.splitType === 'settled') return;

      const amount = parseFloat(expense.amount) || 0;
      const amountTWD = expense.currency === 'JPY' ? Math.round(amount * exchangeRate) : amount;
      
      const payer = expense.payer;
      const involved = expense.involved || [];
      
      // 如果沒有分攤人，則跳過
      if (!involved || involved.length === 0) return;

      const splitAmount = amountTWD / involved.length;

      // 付款人增加債權 (正值)
      if (payer) {
        balances[payer] = (balances[payer] || 0) + amountTWD;
      }

      // 分攤人增加債務 (負值)
      involved.forEach(person => {
        balances[person] = (balances[person] || 0) - splitAmount;
      });
    });

    // 計算轉帳路徑
    const debtors = [];
    const creditors = [];

    Object.entries(balances).forEach(([person, amount]) => {
      if (amount < -1) debtors.push({ person, amount }); // 使用 -1 避免浮點數誤差
      else if (amount > 1) creditors.push({ person, amount });
    });

    debtors.sort((a, b) => a.amount - b.amount); // 升序 (負最多在前)
    creditors.sort((a, b) => b.amount - a.amount); // 降序 (正最多在前)

    const transfers = [];
    let i = 0; // debtor index
    let j = 0; // creditor index

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];

      // 找出可抵銷的金額
      const amount = Math.min(Math.abs(debtor.amount), creditor.amount);
      
      if (amount > 0) {
        transfers.push({
          from: debtor.person,
          to: creditor.person,
          amount: Math.round(amount)
        });
      }

      // 更新餘額
      debtor.amount += amount;
      creditor.amount -= amount;

      // 如果債務/債權已清，移動指標
      if (Math.abs(debtor.amount) < 1) i++;
      if (creditor.amount < 1) j++;
    }

    return transfers;
  }, [expenses, exchangeRate, payerOptions]);

  // 處理表單變更
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  // 處理分攤人選擇
  const handleInvolvedChange = (person) => {
    setFormData(prev => {
      const currentInvolved = prev.involved || [];
      const newInvolved = currentInvolved.includes(person)
        ? currentInvolved.filter(p => p !== person)
        : [...currentInvolved, person];
      return { ...prev, involved: newInvolved };
    });
  };

  // 提交表單 (新增或編輯)
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) return;

    const expenseData = {
      ...formData,
      amount: parseFloat(formData.amount),
      // 如果是已結清，強制設定 isSettled 為 true
      isSettled: formData.splitType === 'settled' ? true : formData.isSettled,
      // 如果是全部分攤，確保 involved 包含所有人
      involved: formData.splitType === 'all' ? payerOptions : formData.involved
    };

    if (editingId) {
      // 編輯模式
      setExpenses(prev => prev.map(item => 
        item.id === editingId ? { ...expenseData, id: editingId } : item
      ));
    } else {
      // 新增模式
      const newExpense = {
        ...expenseData,
        id: Date.now().toString()
      };
      setExpenses(prev => [...prev, newExpense]);
    }

    handleCloseForm();
  };

  // 刪除項目
  const handleDelete = (id) => {
    if (window.confirm('確定要刪除此筆支出嗎？')) {
      setExpenses(prev => prev.filter(item => item.id !== id));
    }
  };

  // 開啟編輯
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
      isSettled: item.isSettled || false
    });
    setEditingId(item.id);
    setIsFormOpen(true);
  };

  // 關閉表單
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setFormData(initialFormState);
  };

  // 根據選擇的天數過濾
  const filteredExpenses = useMemo(() => {
    if (selectedDay === 'all') return expenses;
    // 找出該 day 對應的 date
    const targetDay = itinerary.find(d => d.day === parseInt(selectedDay));
    if (!targetDay) return [];
    return expenses.filter(e => e.date === targetDay.date);
  }, [expenses, selectedDay, itinerary]);

  // 依日期分組顯示
  const groupedExpenses = useMemo(() => {
    // 先排序
    const sorted = [...filteredExpenses].sort((a, b) => {
      // 簡單日期比較 (假設格式 MM/DD)
      return a.date.localeCompare(b.date);
    });

    return sorted.reduce((groups, item) => {
      if (!groups[item.date]) groups[item.date] = [];
      groups[item.date].push(item);
      return groups;
    }, {});
  }, [filteredExpenses]);

  return (
    <div className="space-y-6 pb-24 relative min-h-[500px]">
      {/* 總覽卡片 */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-emerald-100 text-sm font-medium mb-1">目前總花費 (TWD)</p>
            <h2 className="text-4xl font-bold">
              ${Math.round(totalSpentTWD).toLocaleString()}
            </h2>
          </div>
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
            <DollarSign size={24} className="text-white" />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center text-xs text-emerald-100 bg-white/10 rounded-lg px-3 py-2 w-fit">
            <span className="mr-2">💱</span>
            目前匯率: 1 JPY ≈ {exchangeRate} TWD
          </div>
          <button
            onClick={() => setIsSettlementOpen(true)}
            className="flex items-center gap-2 bg-white text-emerald-600 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-50 transition-colors"
          >
            <Wallet size={16} />
            查看分帳
          </button>
        </div>
      </div>

      {/* 篩選器 */}
      <div className="flex overflow-x-auto pb-2 no-scrollbar gap-2">
        <button
          onClick={() => setSelectedDay('all')}
          className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
            selectedDay === 'all'
              ? 'bg-gray-800 text-white dark:bg-white dark:text-gray-900'
              : 'bg-white text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
          }`}
        >
          全部
        </button>
        {itinerary.map(day => (
          <button
            key={day.day}
            onClick={() => setSelectedDay(day.day)}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
              selectedDay === day.day
                ? 'bg-brand-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
            }`}
          >
            Day {day.day} ({day.date})
          </button>
        ))}
      </div>

      {/* 支出列表 */}
      <div className="space-y-6">
        {Object.keys(groupedExpenses).length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign size={32} className="text-gray-300 dark:text-gray-500" />
            </div>
            <p className="text-gray-500 dark:text-gray-400">尚無支出紀錄</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">點擊右下角按鈕新增第一筆支出</p>
          </div>
        ) : (
          Object.entries(groupedExpenses).map(([date, items]) => (
            <div key={date} className="space-y-3">
              <h3 className="font-bold text-gray-500 dark:text-gray-400 text-sm sticky top-0 bg-gray-50 dark:bg-gray-900 py-2 z-10 flex items-center backdrop-blur-sm bg-opacity-90">
                <Calendar size={14} className="mr-2" />
                {date}
              </h3>
              
              <div className="space-y-3">
                {items.map(item => {
                  const category = categories.find(c => c.id === item.category) || categories[5];
                  return (
                    <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 relative group transition-all hover:shadow-md">
                      {/* Top Row: Category & Amount */}
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${category.color}`}>
                            {category.label}
                          </span>
                          {item.isSettled && (
                            <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-full flex items-center">
                              <CheckCircle2 size={10} className="mr-1" /> 已結清
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="block font-bold text-gray-900 dark:text-gray-100 text-lg">
                            {item.currency === 'TWD' ? 'NT$' : '¥'} {item.amount.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Middle Row: Title */}
                      <h4 className="font-bold text-gray-800 dark:text-gray-200 text-base mb-3 pr-16 break-words">
                        {item.title}
                      </h4>

                      {/* Bottom Row: Meta Info & Actions */}
                      <div className="flex justify-between items-end">
                        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <Users size={12} className="text-gray-400" />
                            <span className="font-medium text-gray-600 dark:text-gray-300">{item.payer}</span>
                            <span className="text-gray-300">|</span>
                            <span>
                              {item.splitType === 'settled' ? '已分帳' : 
                               item.splitType === 'all' ? '全員分攤' : 
                               `分攤: ${item.involved?.join(', ')}`}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          {item.currency !== 'TWD' && (
                            <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                              ≈ NT$ {Math.round(item.amount * exchangeRate).toLocaleString()}
                            </span>
                          )}
                          
                          <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleEdit(item)} 
                              className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded-lg transition-colors"
                              title="編輯"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete(item.id)} 
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                              title="刪除"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* 當日小計 */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-dashed border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <span className="font-medium text-gray-500 dark:text-gray-400 text-sm">當日小計</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300 text-lg">
                    NT$ {Math.round(items.reduce((sum, item) => {
                      const amount = parseFloat(item.amount) || 0;
                      const rate = item.currency === 'JPY' ? exchangeRate : 1;
                      return sum + (amount * rate);
                    }, 0)).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsFormOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 flex items-center justify-center transition-all duration-200 hover:scale-110 z-40"
        title="新增支出"
      >
        <Plus size={28} />
      </button>

      {/* Add/Edit Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10">
              <h3 className="font-bold text-lg text-gray-800 dark:text-white">
                {editingId ? '編輯支出' : '新增支出'}
              </h3>
              <button onClick={handleCloseForm} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">項目名稱</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title || ''}
                  onChange={handleChange}
                  placeholder="例如：午餐、紀念品"
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 text-sm focus:outline-emerald-500 dark:text-white"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">金額</label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount || ''}
                    onChange={handleChange}
                    placeholder="0"
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 text-sm focus:outline-emerald-500 dark:text-white"
                    required
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">幣別</label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 text-sm focus:outline-emerald-500 dark:text-white"
                  >
                    <option value="JPY">JPY (日幣)</option>
                    <option value="TWD">TWD (台幣)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">日期</label>
                  <select
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 text-sm focus:outline-emerald-500 dark:text-white"
                  >
                    {itinerary && itinerary.map(day => (
                      <option key={day.day} value={day.date}>
                        Day {day.day} ({day.date})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">類別</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 text-sm focus:outline-emerald-500 dark:text-white"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 付款與分帳設定 */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-600 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">誰先付款？</label>
                  <select
                    name="payer"
                    value={formData.payer}
                    onChange={handleChange}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-2 text-sm focus:outline-emerald-500 dark:text-white"
                  >
                    {payerOptions.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">分帳方式</label>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, splitType: 'all' }))}
                      className={`flex-1 py-1.5 text-xs rounded-md border ${formData.splitType === 'all' ? 'bg-emerald-100 border-emerald-500 text-emerald-700' : 'bg-white border-gray-200 text-gray-600'}`}
                    >
                      全員均分
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, splitType: 'specific' }))}
                      className={`flex-1 py-1.5 text-xs rounded-md border ${formData.splitType === 'specific' ? 'bg-emerald-100 border-emerald-500 text-emerald-700' : 'bg-white border-gray-200 text-gray-600'}`}
                    >
                      指定分攤
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, splitType: 'settled' }))}
                      className={`flex-1 py-1.5 text-xs rounded-md border ${formData.splitType === 'settled' ? 'bg-emerald-100 border-emerald-500 text-emerald-700' : 'bg-white border-gray-200 text-gray-600'}`}
                    >
                      已結清
                    </button>
                  </div>

                  {formData.splitType === 'specific' && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {payerOptions.map(person => (
                        <button
                          key={person}
                          type="button"
                          onClick={() => handleInvolvedChange(person)}
                          className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                            formData.involved?.includes(person)
                              ? 'bg-emerald-500 text-white border-emerald-600'
                              : 'bg-white text-gray-500 border-gray-200'
                          }`}
                        >
                          {person}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {formData.splitType === 'settled' && (
                    <p className="text-xs text-gray-500 mt-1">
                      此筆支出將只列入總花費，不參與後續的債務計算。
                    </p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-md mt-4 flex items-center justify-center"
              >
                <Save size={18} className="mr-2" />
                {editingId ? '更新支出' : '新增支出'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Settlement Modal */}
      {isSettlementOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/20">
              <h3 className="font-bold text-lg text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                <Wallet size={20} />
                分帳結算 (TWD)
              </h3>
              <button onClick={() => setIsSettlementOpen(false)} className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-full transition-colors">
                <X size={20} className="text-emerald-600 dark:text-emerald-400" />
              </button>
            </div>
            
            <div className="p-6">
              {settlements.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <CheckCircle2 size={48} className="mx-auto mb-3 text-emerald-500" />
                  <p className="font-bold">目前沒有需要結算的款項</p>
                  <p className="text-xs mt-1">所有支出都已結清或無人欠款</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center">
                    以下是建議的轉帳方式，可將債務最小化
                  </p>
                  {settlements.map((transfer, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-600">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="font-bold text-gray-800 dark:text-gray-200 w-16 text-center truncate" title={transfer.from}>
                          {transfer.from}
                        </div>
                        <div className="flex flex-col items-center text-gray-400">
                          <span className="text-[10px] mb-0.5">給</span>
                          <ArrowRight size={16} />
                        </div>
                        <div className="font-bold text-gray-800 dark:text-gray-200 w-16 text-center truncate" title={transfer.to}>
                          {transfer.to}
                        </div>
                      </div>
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 text-lg ml-4">
                        ${transfer.amount.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 text-center text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700">
              * 金額皆以台幣 (TWD) 計算，已包含匯率換算
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseTracker;
