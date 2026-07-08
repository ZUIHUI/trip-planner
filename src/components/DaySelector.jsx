import React, { useLayoutEffect, useRef } from 'react';

const VISIBLE_EDGE_PADDING = 10;
const DAY_SELECTOR_SCROLL_DURATION_MS = 220;

const clampScrollLeft = (container, nextLeft) => {
  const maxLeft = Math.max(0, container.scrollWidth - container.clientWidth);
  return Math.min(maxLeft, Math.max(0, nextLeft));
};

const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);

const getTargetScrollLeft = (container, selectedTab) => {
  const containerRect = container.getBoundingClientRect();
  const selectedRect = selectedTab.getBoundingClientRect();
  const visibleLeft = containerRect.left + VISIBLE_EDGE_PADDING;
  const visibleRight = containerRect.right - VISIBLE_EDGE_PADDING;

  if (selectedRect.left < visibleLeft) {
    return container.scrollLeft + selectedRect.left - visibleLeft;
  }

  if (selectedRect.right > visibleRight) {
    return container.scrollLeft + selectedRect.right - visibleRight;
  }

  return container.scrollLeft;
};

const DaySelector = ({ itinerary, selectedDay, onSelectDay }) => {
  const scrollContainerRef = useRef(null);
  const dayButtonRefs = useRef(new Map());
  const animationRef = useRef(0);

  const stopScrollAnimation = () => {
    if (animationRef.current) {
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    }
  };

  useLayoutEffect(() => {
    const alignSelectedTab = () => {
      const container = scrollContainerRef.current;
      const selectedTab = dayButtonRefs.current.get(String(selectedDay));
      if (!container || !selectedTab) return;

      const targetLeft = clampScrollLeft(
        container,
        Math.round(getTargetScrollLeft(container, selectedTab))
      );
      const startLeft = container.scrollLeft;
      const distance = targetLeft - startLeft;
      if (Math.abs(distance) < 1) return;

      const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      if (prefersReducedMotion) {
        container.scrollLeft = targetLeft;
        return;
      }

      const startedAt = window.performance.now();
      const tick = (now) => {
        const progress = Math.min(1, (now - startedAt) / DAY_SELECTOR_SCROLL_DURATION_MS);
        container.scrollLeft = startLeft + distance * easeOutCubic(progress);

        if (progress < 1) {
          animationRef.current = window.requestAnimationFrame(tick);
        } else {
          animationRef.current = 0;
          container.scrollLeft = targetLeft;
        }
      };

      stopScrollAnimation();
      animationRef.current = window.requestAnimationFrame(tick);
    };

    const frame = window.requestAnimationFrame(alignSelectedTab);

    return () => {
      window.cancelAnimationFrame(frame);
      stopScrollAnimation();
    };
  }, [selectedDay, itinerary.length]);

  return (
    <section
      className="tp-day-selector-strip px-5 sm:px-7 lg:px-10"
      aria-label="選擇行程日期"
    >
      <div
        ref={scrollContainerRef}
        className="tp-panel tp-day-selector-track no-scrollbar flex gap-2 overflow-x-auto p-2.5 sm:gap-3 sm:p-3"
      >
        {itinerary.map((item) => {
          const isSelected = String(selectedDay) === String(item.day);

          return (
            <button
              key={item.day}
              ref={(node) => {
                const dayKey = String(item.day);
                if (node) {
                  dayButtonRefs.current.set(dayKey, node);
                } else {
                  dayButtonRefs.current.delete(dayKey);
                }
              }}
              type="button"
              onClick={() => onSelectDay(item.day)}
              aria-pressed={isSelected}
              aria-label={`切換到第 ${item.day} 天`}
              className={`touch-target tp-day-selector-chip min-w-[4.25rem] rounded-lg px-3 py-2.5 text-center transition sm:min-w-[5rem] sm:px-4 ${
                isSelected
                  ? 'bg-brand-700 text-white shadow-sm dark:bg-brand-800 dark:text-brand-50'
                  : 'bg-white/75 text-stone-600 hover:bg-sky-50 hover:text-brand-800 dark:bg-brand-100/45 dark:text-brand-800 dark:hover:bg-brand-100/65'
              }`}
            >
              <span className="block whitespace-nowrap text-sm font-black leading-none">第 {item.day} 天</span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default DaySelector;
