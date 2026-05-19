import React, { useEffect, useRef } from 'react';

const DaySelector = ({ itinerary, selectedDay, onSelectDay }) => {
  const scrollContainerRef = useRef(null);
  const selectedTabRef = useRef(null);

  useEffect(() => {
    if (selectedTabRef.current && scrollContainerRef.current) {
      selectedTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [selectedDay]);

  return (
    <section className="px-4 sm:px-6 lg:px-8" aria-label="選擇行程日期">
      <div
        ref={scrollContainerRef}
        className="no-scrollbar flex gap-2 overflow-x-auto scroll-smooth rounded-lg border border-slate-200 bg-white/85 p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/85"
      >
        {itinerary.map((item) => {
          const isSelected = selectedDay === item.day;
          const eventCount = item.events?.length || 0;
          const dateText = item.date || `Day ${item.day}`;
          const weekdayText = item.weekday || '';

          return (
            <button
              key={item.day}
              ref={isSelected ? selectedTabRef : null}
              type="button"
              onClick={() => onSelectDay(item.day)}
              aria-pressed={isSelected}
              className={`touch-target min-w-[5.75rem] rounded-lg px-3 py-2 text-left transition active:scale-[0.98] ${
                isSelected
                  ? 'bg-brand-600 text-white shadow-sm dark:bg-brand-500 dark:text-slate-950'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              <span className="block text-xs font-bold opacity-80">Day {item.day}</span>
              <span className="mt-0.5 block text-sm font-black leading-tight">{dateText}</span>
              <span className="mt-1 block truncate text-[11px] font-semibold opacity-75">
                {weekdayText || `${eventCount} 個行程`}
              </span>
              {weekdayText && (
                <span className="mt-0.5 block text-[11px] font-semibold opacity-70">{eventCount} 個行程</span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default DaySelector;
