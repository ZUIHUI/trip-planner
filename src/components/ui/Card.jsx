import React from 'react';
import { motion } from 'motion/react';
import { cx } from './utils';

const motionElements = {
  article: motion.article,
  div: motion.div,
  section: motion.section
};

const Card = ({ as: Component = 'div', interactive = false, className = '', children, ...props }) => {
  const MotionComponent = motionElements[Component] || Component;
  const isMotionElement = Boolean(motionElements[Component]);
  const motionProps = isMotionElement
    ? {
        initial: false,
        whileHover: interactive
          ? { y: -1, scale: 1.001 }
          : undefined,
        whileTap: interactive ? { y: 0, scale: 0.992 } : undefined,
        transition: { type: 'tween', duration: 0.1, ease: 'easeOut' }
      }
    : {};

  return (
    <MotionComponent
      className={cx('tp-card tp-card-animated tp-motion-panel min-w-0 max-w-full', interactive && 'tp-card-hover tp-card-interactive', className)}
      data-interactive={interactive ? 'true' : undefined}
      {...motionProps}
      {...props}
    >
      {children}
    </MotionComponent>
  );
};

export default Card;
