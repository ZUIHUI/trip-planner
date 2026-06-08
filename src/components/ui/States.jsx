import React from 'react';
import { Loader2 } from 'lucide-react';
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
  <div className={cx('tp-empty-state tp-animate-enter', className)} role="status">
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
  </div>
);

export const LoadingState = ({ label = '載入中...', className = '' }) => (
  <div className={cx('tp-loading-state tp-animate-enter', className)} role="status" aria-live="polite">
    <Loader2 className="tp-soft-pulse mx-auto mb-3 animate-spin text-brand-600" size={28} />
    <p className="text-sm font-semibold">{label}</p>
    <div className="tp-shimmer mx-auto mt-3 h-1.5 w-32 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true" />
  </div>
);

export const ErrorState = ({ title = 'Something went wrong', description, actionLabel, onAction, className = '' }) => (
  <div className={cx('tp-error-state tp-animate-enter', className)} role="alert">
    <p className="text-base font-bold">{title}</p>
    {description && <p className="mt-1 text-sm">{description}</p>}
    {actionLabel && onAction && (
      <Button variant="primary" className="mt-4" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </div>
);
