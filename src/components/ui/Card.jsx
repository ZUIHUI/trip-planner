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
        initial: { opacity: 0, y: 12, scale: 0.982 },
        animate: { opacity: 1, y: 0, scale: 1 },
        whileHover: interactive
          ? { y: -7, scale: 1.018, rotate: -0.25 }
          : { y: -2, scale: 1.004 },
        whileTap: interactive ? { y: -1, scale: 0.988 } : undefined,
        transition: { type: 'spring', stiffness: 430, damping: 30, mass: 0.55 }
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
