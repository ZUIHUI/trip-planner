import { lazy } from 'react';
import { markLazyImportReload } from './lazyImportRecovery';

export const lazyWithReload = (loader) => lazy(async () => {
  try {
    return await loader();
  } catch (error) {
    if (typeof window !== 'undefined' && markLazyImportReload(error)) {
      window.location.reload();
      return new Promise(() => {});
    }
    throw error;
  }
});
