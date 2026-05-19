import React, { forwardRef } from 'react';
import { cx } from './utils';

export const Input = forwardRef(({ className = '', ...props }, ref) => (
  <input ref={ref} className={cx('tp-input', className)} {...props} />
));

Input.displayName = 'Input';

export const Select = forwardRef(({ className = '', children, ...props }, ref) => (
  <select ref={ref} className={cx('tp-select', className)} {...props}>
    {children}
  </select>
));

Select.displayName = 'Select';

export const Textarea = forwardRef(({ className = '', ...props }, ref) => (
  <textarea ref={ref} className={cx('tp-input min-h-24', className)} {...props} />
));

Textarea.displayName = 'Textarea';

export const Field = ({ label, htmlFor, hint, children, className = '' }) => (
  <div className={className}>
    {label && (
      <label htmlFor={htmlFor} className="tp-label">
        {label}
      </label>
    )}
    {children}
    {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
  </div>
);
