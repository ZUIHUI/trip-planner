import React from 'react';
import { motion } from 'motion/react';
import { cx } from './utils';

const PageContainer = ({ className = '', children }) => (
  <motion.div className={cx('tp-page-container min-w-0 max-w-full', className)} layout>
    {children}
  </motion.div>
);

export default PageContainer;
