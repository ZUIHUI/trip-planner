import React, { useRef, useEffect } from 'react';

const DaySelector = ({ itinerary, selectedDay, onSelectDay }) => {
  const scrollContainerRef = useRef(null);
  const selectedTabRef = useRef(null);

  // 自動滾動至選中的 Tab
  useEffect(() => {
    if (selectedTabRef.current && scrollContainerRef.current) {
      selectedTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [selectedDay]);

  // 格式化日期（保留月/日格式）
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      // 直接返回原始的月/日格式，例如 "2/23" → "2/23"
      return dateString;
    } catch {
      return dateString;
    }
  };

  // 取得星期
  const getWeekday = (dateString) => {
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (!dateString) return '';
    try {
      // 嘗試從 itinerary 找到對應的日期項目以獲取準確的星期
      const item = itinerary.find(d => d.date === dateString);
      if (item && item.weekday) {
        return item.weekday;
      }
      
      // 備用方案：根據日期計算星期
      // 假設起始日期，計算相對星期
      const [month, day] = dateString.split('/').map(Number);
      // 2026年2月23日是星期一（可根據實際調整）
      const startDate = new Date(2026, 1, 23); // 月份從 0 開始
      const currentDate = new Date(2026, month - 1, day);
      const dayDiff = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));
      const startWeekday = startDate.getDay(); // 星期一 = 1
      const calculatedWeekday = (startWeekday + dayDiff) % 7;
      return weekdays[calculatedWeekday];
    } catch {
      return '';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800 sticky top-0 z-20 transition-colors duration-300">
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto px-3 py-2 space-x-2 no-scrollbar scroll-smooth"
        style={{ scrollBehavior: 'smooth' }}
      >
        {itinerary.map((item) => {
          const isSelected = selectedDay === item.day;
          const dateNum = formatDate(item.date);
          const weekday = getWeekday(item.date);

          return (
            <button
              key={item.day}
              ref={isSelected ? selectedTabRef : null}
              onClick={() => onSelectDay(item.day)}
              className={`touch-target flex-shrink-0 w-20 px-2 py-2 rounded-lg transition-all duration-200 transform ${
                isSelected
                  ? 'bg-brand-600 text-white shadow-md scale-100'
                  : 'bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-800 shadow-sm'
              }`}
            >
              <div className="flex flex-col items-center justify-center space-y-0">
                {/* 第 1 層：Day X */}
                <span className="text-xs font-semibold leading-tight" style={{ opacity: isSelected ? 1 : 0.7 }}>
                  Day {item.day}
                </span>

                {/* 第 2 層：日期 */}
                <span className="text-sm font-bold leading-tight">
                  {dateNum || item.day}
                </span>

                {/* 第 3 層：星期 */}
                <span className="text-xs leading-tight" style={{ opacity: isSelected ? 1 : 0.6 }}>
                  {weekday}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DaySelector;
