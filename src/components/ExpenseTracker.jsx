import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, DollarSign, Calendar, X, Save, Tag } from 'lucide-react';

const ExpenseTracker = ({ itinerary, expenses = [], setExpenses, exchangeRate = 0.215 }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedDay, setSelectedDay] = useState('all');
  
  const initialFormState = {
    title: '',
    amount: '',
    currency: 'JPY',
    date: itinerary[0]?.date || '',
    category: 'food'
  };
  
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

  // 處理表單變更
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 提交表單 (新增或編輯)
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) return;

    if (editingId) {
      // 編輯模式
      setExpenses(prev => prev.map(item => 
        item.id === editingId ? { ...formData, id: editingId, amount: parseFloat(formData.amount) } : item
      ));
    } else {
      // 新增模式
      const newExpense = {
        ...formData,
        id: Date.now().toString(),
        amount: parseFloat(formData.amount)
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
    setFormData(item);
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
        <div className="mt-4 flex items-center text-xs text-emerald-100 bg-white/10 rounded-lg px-3 py-2 w-fit">
          <span className="mr-2">💱</span>
          目前匯率: 1 JPY ≈ {exchangeRate} TWD
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
              <h3 className="font-bold text-gray-500 dark:text-gray-400 text-sm sticky top-0 bg-gray-50 dark:bg-gray-900 py-2 z-10 flex items-center">
                <Calendar size={14} className="mr-2" />
                {date}
              </h3>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden divide-y divide-gray-50 dark:divide-gray-700">
                {items.map(item => {
                  const category = categories.find(c => c.id === item.category) || categories[5];
                  return (
                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${category.color}`}>
                            {category.label}
                          </span>
                          <p className="font-bold text-gray-800 dark:text-gray-200 truncate">{item.title}</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div>
                          <p className="font-bold text-gray-900 dark:text-gray-100">
                            {item.currency === 'TWD' ? 'NT$' : '¥'} {item.amount.toLocaleString()}
                          </p>
                          {item.currency !== 'TWD' && (
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              ≈ NT$ {Math.round(item.amount * exchangeRate).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(item)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* 當日小計 */}
                <div className="bg-gray-50 dark:bg-gray-700/30 p-3 flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-500 dark:text-gray-400">當日小計</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300">
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
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
                  value={formData.title}
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
                    value={formData.amount}
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
                    {itinerary.map(day => (
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
    </div>
  );
};

export default ExpenseTracker;
