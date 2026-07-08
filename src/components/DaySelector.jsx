import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';

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
    <motion.section
      className="px-5 sm:px-7 lg:px-10"
      aria-label="選擇行程日期"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        ref={scrollContainerRef}
        className="tp-panel no-scrollbar flex gap-3 overflow-x-auto scroll-smooth p-3"
        layout
      >
        {itinerary.map((item) => {
          const isSelected = selectedDay === item.day;
          const eventCount = item.events?.length || 0;
          const dateText = item.date || `第 ${item.day} 天`;
          const weekdayText = item.weekday || '';

          return (
            <motion.button
              key={item.day}
              ref={isSelected ? selectedTabRef : null}
              type="button"
              onClick={() => onSelectDay(item.day)}
              aria-pressed={isSelected}
              layout
              animate={{ y: isSelected ? -2 : 0, scale: isSelected ? 1.025 : 1 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 520, damping: 36, mass: 0.55 }}
              className={`touch-target min-w-[5.65rem] rounded-lg px-3 py-3 text-left transition active:scale-[0.98] sm:min-w-[6.5rem] sm:px-4 ${
                isSelected
                  ? 'bg-brand-700 text-white shadow-sm dark:bg-brand-800 dark:text-brand-50'
                  : 'bg-white/75 text-stone-600 hover:bg-sky-50 hover:text-brand-800 dark:bg-brand-100/45 dark:text-brand-800 dark:hover:bg-brand-100/65'
              }`}
            >
              <span className="block text-xs font-bold opacity-80">第 {item.day} 天</span>
              <span className="mt-1 block text-sm font-black leading-tight">{dateText}</span>
              <span className="mt-1.5 block truncate text-[11px] font-semibold opacity-75">
                {weekdayText || `${eventCount} 個行程`}
              </span>
              {weekdayText && (
                <span className="mt-0.5 block text-[11px] font-semibold opacity-70">{eventCount} 個行程</span>
              )}
            </motion.button>
          );
        })}
      </motion.div>
    </motion.section>
  );
};

export default DaySelector;
