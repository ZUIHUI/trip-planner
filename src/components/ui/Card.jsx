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
        initial: { opacity: 0, y: 8, scale: 0.992 },
        animate: { opacity: 1, y: 0, scale: 1 },
        whileHover: interactive
          ? { y: -2, scale: 1.002 }
          : { y: -1, scale: 1.001 },
        whileTap: interactive ? { y: 0, scale: 0.996 } : undefined,
        transition: { type: 'spring', stiffness: 380, damping: 36, mass: 0.62 }
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
