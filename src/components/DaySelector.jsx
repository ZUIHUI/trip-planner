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

  // 格式化日期（提取日期部分）
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      // 嘗試多種日期格式
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.getDate().toString();
      }
      // 如果是 "2/23" 格式，直接取最後部分
      return dateString.split('/').pop();
    } catch {
      return dateString.split('/').pop() || dateString;
    }
  };

  // 取得星期
  const getWeekday = (dateString) => {
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return weekdays[date.getDay()];
      }
    } catch {
      // 降級處理
    }
    return '';
  };

  return (
    <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto px-4 py-4 space-x-3 no-scrollbar scroll-smooth"
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
              className={`flex-shrink-0 w-20 px-2 py-3 rounded-2xl transition-all duration-200 transform ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-lg scale-110'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 shadow-sm'
              }`}
            >
              <div className="flex flex-col items-center justify-center space-y-0.5">
                {/* 第 1 層：Day X */}
                <span className="text-xs font-medium" style={{ opacity: isSelected ? 0.9 : 0.7 }}>
                  Day {item.day}
                </span>

                {/* 第 2 層：日期 */}
                <span className="text-lg font-bold leading-tight">
                  {dateNum || item.day}
                </span>

                {/* 第 3 層：星期 */}
                <span className="text-xs font-medium" style={{ opacity: isSelected ? 0.9 : 0.7 }}>
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
