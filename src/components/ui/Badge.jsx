import React from 'react';
import { motion } from 'motion/react';
import { cx } from './utils';

const variants = {
  success: 'tp-badge-success',
  warning: 'tp-badge-warning',
  muted: 'tp-badge-muted',
  info: 'tp-badge-info'
};

const Badge = ({ variant = 'muted', className = '', children }) => (
  <motion.span
    className={cx('tp-badge', variants[variant] || variants.muted, className)}
    layout
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.58 }}
  >
    {children}
  </motion.span>
);

export default Badge;
