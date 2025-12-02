import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DaySelector = ({ itinerary, selectedDay, onSelectDay }) => {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const containerRef = useRef(null);

  // 處理滑動事件
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    setTouchEnd(e.changedTouches[0].clientX);
    handleSwipe();
  };

  const handleSwipe = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      // 向左滑動 → 下一天
      onSelectDay(Math.min(selectedDay + 1, itinerary.length));
    }
    if (isRightSwipe) {
      // 向右滑動 → 上一天
      onSelectDay(Math.max(selectedDay - 1, 1));
    }
  };

  // 獲取星期
  const getDayOfWeek = (dayIndex) => {
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    // 假設第一天是起始日期，可根據實際調整
    return days[(dayIndex - 1) % 7];
  };

  return (
    <div className="space-y-2 mb-6">
      {/* 日曆行 */}
      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 overflow-x-auto">
        <div className="flex gap-2 min-w-min">
          {itinerary.map((day) => (
            <button
              key={day.day}
              onClick={() => onSelectDay(day.day)}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all whitespace-nowrap min-w-fit ${
                selectedDay === day.day
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span className="text-xs font-bold">Day {day.day}</span>
              <span className="text-xs text-gray-500" style={selectedDay === day.day ? { color: 'rgba(255,255,255,0.8)' } : {}}>
                {getDayOfWeek(day.day)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 滑動區域 + 當前日期 */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex items-center justify-between bg-white rounded-xl p-3 shadow-sm border border-gray-100 cursor-grab active:cursor-grabbing"
      >
        <button
          onClick={() => onSelectDay(Math.max(selectedDay - 1, 1))}
          className="p-2 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
          disabled={selectedDay === 1}
        >
          <ChevronLeft size={20} className={selectedDay === 1 ? 'text-gray-300' : 'text-gray-600'} />
        </button>

        <div className="text-center flex-grow select-none">
          <p className="text-sm font-bold text-gray-800">Day {selectedDay}</p>
          <p className="text-xs text-gray-500">
            {getDayOfWeek(selectedDay)} · {itinerary[selectedDay - 1]?.date || ''}
          </p>
        </div>

        <button
          onClick={() => onSelectDay(Math.min(selectedDay + 1, itinerary.length))}
          className="p-2 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
          disabled={selectedDay === itinerary.length}
        >
          <ChevronRight size={20} className={selectedDay === itinerary.length ? 'text-gray-300' : 'text-gray-600'} />
        </button>
      </div>
    </div>
  );
};

export default DaySelector;
