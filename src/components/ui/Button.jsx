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

const motionElements = {
  a: motion.a,
  button: motion.button
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
  const MotionComponent = motionElements[Component] || Component;
  const isMotionElement = Boolean(motionElements[Component]);
  const isDisabled = Boolean(props.disabled || props['aria-disabled']);
  const motionProps = isMotionElement
    ? {
        whileHover: isDisabled ? undefined : { y: -3, scale: 1.01 },
        whileTap: isDisabled ? undefined : { y: 0, scale: 0.95 },
        transition: { type: 'tween', duration: 0.12, ease: 'easeOut' }
      }
    : {};

  return (
    <MotionComponent
      ref={ref}
      type={isNativeButton ? (type || 'button') : type}
      className={cx('tp-button-motion tp-press-feedback tp-hover-icon tp-tap-ripple', variants[variant] || variants.primary, sizes[size], className)}
      {...motionProps}
      {...props}
    >
      {children}
    </MotionComponent>
  );
});

Button.displayName = 'Button';

export default Button;
