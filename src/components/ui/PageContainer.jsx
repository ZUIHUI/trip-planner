import React from 'react';
import { cx } from './utils';

const PageContainer = ({ className = '', children }) => (
  <div className={cx('tp-page-container min-w-0 max-w-full', className)}>
    {children}
  </div>
);

export default PageContainer;
