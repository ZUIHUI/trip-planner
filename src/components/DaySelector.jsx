import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';

const DaySelector = ({ itinerary, selectedDay, onSelectDay }) => {
  const scrollContainerRef = useRef(null);
  const selectedTabRef = useRef(null);

  useEffect(() => {
    const scrollSelectedTabIntoView = () => {
      const container = scrollContainerRef.current;
      const selectedTab = selectedTabRef.current;
      if (!container || !selectedTab) return;

      const maxLeft = Math.max(0, container.scrollWidth - container.clientWidth);
      const centeredLeft = selectedTab.offsetLeft - ((container.clientWidth - selectedTab.offsetWidth) / 2);
      const nextLeft = Math.min(maxLeft, Math.max(0, centeredLeft));

      container.scrollTo({
        left: nextLeft,
        behavior: 'smooth'
      });
    };

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      scrollSelectedTabIntoView();
      secondFrame = window.requestAnimationFrame(scrollSelectedTabIntoView);
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [selectedDay, itinerary.length]);

  return (
    <motion.section
      className="tp-day-selector-strip px-5 sm:px-7 lg:px-10"
      aria-label="選擇行程日期"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        ref={scrollContainerRef}
        className="tp-panel tp-day-selector-track no-scrollbar flex gap-2 overflow-x-auto scroll-smooth p-2.5 sm:gap-3 sm:p-3"
        layout
      >
        {itinerary.map((item) => {
          const isSelected = String(selectedDay) === String(item.day);

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
              aria-label={`切換到第 ${item.day} 天`}
              className={`touch-target tp-day-selector-chip min-w-[4.25rem] rounded-lg px-3 py-2.5 text-center transition active:scale-[0.98] sm:min-w-[5rem] sm:px-4 ${
                isSelected
                  ? 'bg-brand-700 text-white shadow-sm dark:bg-brand-800 dark:text-brand-50'
                  : 'bg-white/75 text-stone-600 hover:bg-sky-50 hover:text-brand-800 dark:bg-brand-100/45 dark:text-brand-800 dark:hover:bg-brand-100/65'
              }`}
            >
              <span className="block whitespace-nowrap text-sm font-black leading-none">第 {item.day} 天</span>
            </motion.button>
          );
        })}
      </motion.div>
    </motion.section>
  );
};

export default DaySelector;
