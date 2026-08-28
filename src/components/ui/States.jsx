import React from 'react';
import { motion } from 'motion/react';
import { Compass } from 'lucide-react';
import Button from './Button';
import { cx } from './utils';

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = ''
}) => (
  <motion.div
    className={cx('tp-empty-state', className)}
    role="status"
    initial={{ opacity: 0, y: 12, scale: 0.99 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.65 }}
  >
    {Icon && (
      <div className="tp-icon-chip tp-soft-pulse mx-auto mb-3 h-11 w-11">
        <Icon size={22} />
      </div>
    )}
    {title && <p className="text-base font-bold text-slate-800 dark:text-white">{title}</p>}
    {description && <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">{description}</p>}
    {actionLabel && onAction && (
      <Button variant="primary" className="mt-4" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </motion.div>
);

export const LoadingState = ({ label = '載入中...', className = '' }) => (
  <div
    className={cx('tp-loading-state', className)}
    role="status"
    aria-live="polite"
  >
    <span className="tp-loading-icon mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full" aria-hidden="true">
      <Compass size={22} />
    </span>
    <p className="text-sm font-semibold">{label}</p>
    <div className="tp-static-loading-line mx-auto mt-3 h-1.5 w-16 rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true" />
  </div>
);

export const ErrorState = ({ title = 'Something went wrong', description, actionLabel, onAction, className = '' }) => (
  <motion.div
    className={cx('tp-error-state', className)}
    role="alert"
    initial={{ opacity: 0, y: 12, scale: 0.99 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.65 }}
  >
    <p className="text-base font-bold">{title}</p>
    {description && <p className="mt-1 text-sm">{description}</p>}
    {actionLabel && onAction && (
      <Button variant="primary" className="mt-4" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </motion.div>
);
