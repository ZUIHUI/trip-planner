import React, { forwardRef } from 'react';
import { motion } from 'motion/react';
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
}, ref) => {
  const isNativeButton = Component === 'button';
  const MotionComponent = isNativeButton ? motion.button : Component;
  const isDisabled = Boolean(props.disabled || props['aria-disabled']);
  const motionProps = isNativeButton
    ? {
        whileHover: isDisabled ? undefined : { y: -1, scale: 1.015 },
        whileTap: isDisabled ? undefined : { y: 0, scale: 0.97 },
        transition: { type: 'spring', stiffness: 520, damping: 34, mass: 0.55 }
      }
    : {};

  return (
    <MotionComponent
      ref={ref}
      type={isNativeButton ? (type || 'button') : type}
      className={cx('tp-press-feedback tp-hover-icon tp-tap-ripple', variants[variant] || variants.primary, sizes[size], className)}
      {...motionProps}
      {...props}
    >
      {children}
    </MotionComponent>
  );
});

Button.displayName = 'Button';

export default Button;
