import React, { useState } from 'react';
import { Plus, Edit2, Trash2, DollarSign, Calendar } from 'lucide-react';

const ExpenseTracker = ({ itinerary, onUpdateEvent, exchangeRate = 0.215 }) => {
  const [selectedDay, setSelectedDay] = useState('all');

  // 計算總花費 (TWD)
  const totalSpentTWD = itinerary.reduce((total, day) => {
    return total + (day.events?.reduce((dayTotal, event) => {
      const amount = event.actualCost ? parseInt(event.actualCost) : 0;
      if (!amount) return dayTotal;
      
      const currency = event.currency || 'JPY';
      const amountTWD = currency === 'JPY' ? Math.round(amount * exchangeRate) : amount;
      return dayTotal + amountTWD;
    }, 0) || 0);
  }, 0);

  // 取得所有有花費的事件
  const expenseEvents = itinerary.flatMap(day => 
    (day.events || [])
      .filter(e => e.actualCost) // 只顯示有實際花費的
      .map(e => ({ ...e, day: day.day, date: day.date }))
  );

  // 根據選擇的天數過濾
  const filteredEvents = selectedDay === 'all' 
    ? expenseEvents 
    : expenseEvents.filter(e => e.day === parseInt(selectedDay));

  // 依日期分組顯示
  const groupedEvents = filteredEvents.reduce((groups, event) => {
    const key = `Day ${event.day} (${event.date})`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(event);
    return groups;
  }, {});

  return (
    <div className="space-y-6 pb-20">
      {/* 總覽卡片 */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
        <p className="text-emerald-100 text-sm font-medium mb-1">目前總花費 (TWD)</p>
        <h2 className="text-4xl font-bold">
          ${totalSpentTWD.toLocaleString()}
        </h2>
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
            Day {day.day}
          </button>
        ))}
      </div>

      {/* 支出列表 */}
      <div className="space-y-6">
        {Object.keys(groupedEvents).length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign size={32} className="text-gray-300 dark:text-gray-500" />
            </div>
            <p className="text-gray-500 dark:text-gray-400">尚無支出紀錄</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">請在行程中編輯「實際支出」</p>
          </div>
        ) : (
          Object.entries(groupedEvents).map(([dateGroup, events]) => (
            <div key={dateGroup} className="space-y-3">
              <h3 className="font-bold text-gray-500 dark:text-gray-400 text-sm sticky top-0 bg-gray-50 dark:bg-gray-900 py-2 z-10 flex items-center">
                <Calendar size={14} className="mr-2" />
                {dateGroup}
              </h3>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden divide-y divide-gray-50 dark:divide-gray-700">
                {events.map(event => (
                  <div key={event.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="font-bold text-gray-800 dark:text-gray-200 truncate">{event.title}</p>
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded mr-2">
                          {event.type === 'food' ? '美食' : 
                           event.type === 'transport' ? '交通' : 
                           event.type === 'shopping' ? '購物' : 
                           event.type === 'ticket' ? '票券' : '其他'}
                        </span>
                        {event.time}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 dark:text-gray-100">
                        {event.currency === 'TWD' ? 'NT$' : '¥'} {parseInt(event.actualCost).toLocaleString()}
                      </p>
                      {event.currency !== 'TWD' && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          ≈ NT$ {Math.round(parseInt(event.actualCost) * exchangeRate).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* 當日小計 */}
                <div className="bg-gray-50 dark:bg-gray-700/30 p-3 flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-500 dark:text-gray-400">當日小計</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300">
                    NT$ {events.reduce((sum, e) => {
                      const amount = parseInt(e.actualCost) || 0;
                      const rate = e.currency === 'JPY' ? exchangeRate : 1;
                      return sum + Math.round(amount * rate);
                    }, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ExpenseTracker;
