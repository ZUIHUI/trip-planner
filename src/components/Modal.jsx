import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { cx } from './ui';

const sizeClasses = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl'
};

const Modal = ({ isOpen, onClose, children, title, size = 'md' }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-brand-950/55 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className={cx(
              'flex max-h-[100svh] w-full flex-col overflow-hidden rounded-t-lg border border-[#eadfd2] bg-white shadow-2xl sm:max-h-[90vh] sm:max-w-[calc(100vw-1.5rem)] sm:rounded-lg dark:border-brand-200/20 dark:bg-brand-50',
              sizeClasses[size] || sizeClasses.md
            )}
            initial={{ opacity: 0, y: 24, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 460, damping: 38, mass: 0.7 }}
          >
            <div className="flex min-w-0 shrink-0 items-center justify-between gap-3 border-b border-[#eadfd2] bg-[#faf7f0]/70 p-4 dark:border-brand-200/20 dark:bg-brand-100/45">
              <h3 className="min-w-0 break-words text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h3>
              <motion.button
                type="button"
                onClick={onClose}
                className="touch-target inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-sky-50 hover:text-brand-800 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                aria-label="關閉視窗"
                whileHover={{ scale: 1.05, rotate: 2 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 520, damping: 34, mass: 0.55 }}
              >
                <X size={24} />
              </motion.button>
            </div>
            <div className="overflow-y-auto p-4">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
