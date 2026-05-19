import React from 'react';
import { cx } from './utils';

const variants = {
  success: 'tp-badge-success',
  warning: 'tp-badge-warning',
  muted: 'tp-badge-muted',
  info: 'tp-badge-info'
};

const Badge = ({ variant = 'muted', className = '', children }) => (
  <span className={cx('tp-badge', variants[variant] || variants.muted, className)}>
    {children}
  </span>
);

export default Badge;
