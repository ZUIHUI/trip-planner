import React, { forwardRef } from 'react';
import { motion } from 'motion/react';
import { cx } from './utils';

export const Input = forwardRef(({ className = '', ...props }, ref) => (
  <motion.input
    ref={ref}
    className={cx('tp-input', className)}
    whileFocus={{ scale: 1.006 }}
    transition={{ type: 'spring', stiffness: 520, damping: 36, mass: 0.55 }}
    {...props}
  />
));

Input.displayName = 'Input';

export const Select = forwardRef(({ className = '', children, ...props }, ref) => (
  <motion.select
    ref={ref}
    className={cx('tp-select', className)}
    whileFocus={{ scale: 1.006 }}
    transition={{ type: 'spring', stiffness: 520, damping: 36, mass: 0.55 }}
    {...props}
  >
    {children}
  </motion.select>
));

Select.displayName = 'Select';

export const Textarea = forwardRef(({ className = '', ...props }, ref) => (
  <motion.textarea
    ref={ref}
    className={cx('tp-input min-h-24', className)}
    whileFocus={{ scale: 1.004 }}
    transition={{ type: 'spring', stiffness: 520, damping: 36, mass: 0.55 }}
    {...props}
  />
));

Textarea.displayName = 'Textarea';

export const Field = ({ label, htmlFor, hint, children, className = '' }) => (
  <motion.div
    className={cx('min-w-0 max-w-full', className)}
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
  >
    {label && (
      <label htmlFor={htmlFor} className="tp-label">
        {label}
      </label>
    )}
    {children}
    {hint && <p className="mt-1 break-words text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
  </motion.div>
);
