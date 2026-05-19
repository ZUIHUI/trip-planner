import React from 'react';
import { cx } from './utils';

const PageContainer = ({ className = '', children }) => (
  <div className={cx('tp-page-container', className)}>
    {children}
  </div>
);

export default PageContainer;
