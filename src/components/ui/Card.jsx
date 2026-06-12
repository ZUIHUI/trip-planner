import React from 'react';
import { cx } from './utils';

const Card = ({ as: Component = 'div', interactive = false, className = '', children, ...props }) => (
  <Component className={cx('tp-card tp-motion-panel min-w-0 max-w-full', interactive && 'tp-card-hover tp-interactive-lift tp-playful-tilt', className)} {...props}>
    {children}
  </Component>
);

export default Card;
