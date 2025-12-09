import React, { useMemo } from 'react';
import { Clock, Calendar, MapPin, Wallet, ListTodo, Users, Plane, ArrowRight, Edit2 } from 'lucide-react';

const SummaryView = ({ 
  tripDetails, 
  itinerary, 
  expenses, 
  checklists, 
  exchangeRate,
  onEditDetails 
}) => {
  
  // 計算倒數天數
  const daysUntil = useMemo(() => {
    if (!tripDetails?.dates) return 0;
    try {
      const startDateStr = tripDetails.dates.split(' - ')[0]; // "2026/02/23"
      const [year, month, day] = startDateStr.split('/').map(Number);
      const startDate = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const diffTime = startDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (e) {
      return 0;
    }
  }, [tripDetails?.dates]);

  // 計算總花費 (TWD)
  const totalExpenses = useMemo(() => {
    return expenses.reduce((acc, curr) => {
      const amount = parseFloat(curr.amount) || 0;
      const rate = curr.currency === 'JPY' ? exchangeRate : 1;
      return acc + (amount * rate);
    }, 0);
  }, [expenses, exchangeRate]);

  // 計算清單進度
  const checklistStats = useMemo(() => {
    const preTrip = checklists?.preTrip || [];
    const packing = checklists?.packing || [];
    const total = preTrip.length + packing.length;
    const completed = preTrip.filter(i => i.done).length + packing.filter(i => i.done).length;
    return { total, completed, progress: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [checklists]);

  // 計算總行程數
  const totalEvents = useMemo(() => {
    return itinerary.reduce((acc, day) => acc + (day.events?.length || 0), 0);
  }, [itinerary]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 space-y-6 pb-20">
      {/* Hero Card */}
      <div className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
          <Plane size={150} />
        </div>
        
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-2">{tripDetails?.title || '我的旅程'}</h2>
          <div className="flex items-center gap-2 text-brand-100 text-sm mb-6">
            <Calendar size={16} />
            <span>{tripDetails?.dates || '未設定日期'}</span>
            <span>•</span>
            <span>{itinerary.length} 天</span>
          </div>

          <div className="flex items-end gap-2">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 flex-1">
              <p className="text-brand-100 text-xs mb-1">旅伴人數</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">{tripDetails?.travelers?.length || 1}</span>
                <span className="text-sm">人</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
            <Wallet size={16} />
            <span className="text-xs font-bold">目前花費</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            ${Math.round(totalExpenses).toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-1">TWD (估算)</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
            <ListTodo size={16} />
            <span className="text-xs font-bold">準備進度</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {checklistStats.progress}%
            </p>
            <p className="text-xs text-gray-400 mb-1">
              {checklistStats.completed}/{checklistStats.total} 項
            </p>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-brand-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${checklistStats.progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Accommodation Card */}
      {tripDetails?.accommodation && (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <span className="text-xl">🏨</span> 住宿資訊
            </h3>
            <button
              onClick={() => onEditDetails('accommodation')}
              className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-brand-600 transition-colors"
            >
              <Edit2 size={18} />
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <p className="font-bold text-lg text-gray-900 dark:text-gray-100">{tripDetails.accommodation.name}</p>
              <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm mt-1">
                <MapPin size={14} />
                <p>{tripDetails.accommodation.address}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-50 dark:border-gray-700">
              <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Check-in</p>
                <p className="font-bold text-brand-600 dark:text-brand-400">{tripDetails.accommodation.checkIn}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Check-out</p>
                <p className="font-bold text-brand-600 dark:text-brand-400">{tripDetails.accommodation.checkOut}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Flights Card */}
      {tripDetails?.flights && (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <span className="text-xl">✈️</span> 航班資訊
            </h3>
            <div className="flex gap-1">
              <button
                onClick={() => onEditDetails('outbound')}
                className="px-3 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                去程
              </button>
              <button
                onClick={() => onEditDetails('inbound')}
                className="px-3 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                回程
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Outbound */}
            <div className="relative pl-4 border-l-2 border-brand-200 dark:border-brand-800">
              <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-brand-500 ring-4 ring-white dark:ring-gray-800"></div>
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded">去程</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{tripDetails.flights.outbound.date}</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-900 dark:text-gray-100">{tripDetails.flights.outbound.dep} <ArrowRight size={12} className="inline mx-1" /> {tripDetails.flights.outbound.arr}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{tripDetails.flights.outbound.airline} • {tripDetails.flights.outbound.code}</p>
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{tripDetails.flights.outbound.time}</p>
              </div>
            </div>

            {/* Inbound */}
            <div className="relative pl-4 border-l-2 border-orange-200 dark:border-orange-800">
              <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-orange-500 ring-4 ring-white dark:ring-gray-800"></div>
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded">回程</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{tripDetails.flights.inbound.date}</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-900 dark:text-gray-100">{tripDetails.flights.inbound.dep} <ArrowRight size={12} className="inline mx-1" /> {tripDetails.flights.inbound.arr}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{tripDetails.flights.inbound.airline} • {tripDetails.flights.inbound.code}</p>
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{tripDetails.flights.inbound.time}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SummaryView;