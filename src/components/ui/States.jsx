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
  <div className={cx('tp-empty-state', className)} role="status">
    {Icon && (
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
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

export const LoadingState = ({ label = 'Loading...', className = '' }) => (
  <div className={cx('tp-loading-state', className)} role="status" aria-live="polite">
    <Loader2 className="mx-auto mb-3 animate-spin text-brand-600" size={28} />
    <p className="text-sm font-semibold">{label}</p>
  </div>
);

export const ErrorState = ({ title = 'Something went wrong', description, className = '' }) => (
  <div className={cx('tp-error-state', className)} role="alert">
    <p className="text-base font-bold">{title}</p>
    {description && <p className="mt-1 text-sm">{description}</p>}
  </div>
);
