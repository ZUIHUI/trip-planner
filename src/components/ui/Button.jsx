import React, { forwardRef } from 'react';
import { cx } from './utils';

const variants = {
  primary: 'tp-button-primary',
  secondary: 'tp-button-secondary',
  ghost: 'tp-button-ghost',
  danger: 'tp-button-danger'
};

const sizes = {
  sm: '!px-3 !py-2 text-xs',
  md: '',
  lg: '!px-5 !py-3 text-base',
  icon: '!h-11 !w-11 !px-0 !py-0'
};

const Button = forwardRef(({
  as: Component = 'button',
  type,
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}, ref) => (
  <Component
    ref={ref}
    type={Component === 'button' ? (type || 'button') : type}
    className={cx('tp-press-feedback tp-hover-icon tp-tap-ripple', variants[variant] || variants.primary, sizes[size], className)}
    {...props}
  >
    {children}
  </Component>
));

Button.displayName = 'Button';

export default Button;
