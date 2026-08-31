import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
import { TP_MOTION_TRANSITIONS } from '../utils/motionPresets';

const CompactScrollHeader = ({
  observeRef,
  title,
  subtitle,
  onBack,
  backLabel = '返回',
  onAction,
  actionLabel = '開啟操作',
  ActionIcon
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const target = observeRef?.current;
    if (!target || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(!entry.isIntersecting),
      { rootMargin: '-56px 0px 0px 0px', threshold: 0 }
    );
    observer.observe(target);

    return () => observer.disconnect();
  }, [observeRef]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.header
          className="tp-compact-scroll-header"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={TP_MOTION_TRANSITIONS.panel}
        >
          <div className="tp-compact-scroll-header-inner">
            {onBack && (
              <button type="button" onClick={onBack} aria-label={backLabel} title={backLabel}>
                <ChevronLeft size={20} />
              </button>
            )}

            <div className="tp-compact-scroll-header-copy">
              <strong>{title}</strong>
              {subtitle && <span>{subtitle}</span>}
            </div>

            {onAction && ActionIcon && (
              <button type="button" onClick={onAction} aria-label={actionLabel} title={actionLabel}>
                <ActionIcon size={19} />
              </button>
            )}
          </div>
        </motion.header>
      )}
    </AnimatePresence>
  );
};

export default CompactScrollHeader;
