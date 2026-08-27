import { THEME_STORAGE_KEY } from './storageKeys';

export const APP_THEME = Object.freeze({
  LIGHT: 'light',
  SOFT_PINK: 'soft-pink',
  SUNNY_YELLOW: 'sunny-yellow',
  DARK: 'dark'
});

const APP_THEME_VALUES = new Set(Object.values(APP_THEME));

export const normalizeAppTheme = (theme) => (
  APP_THEME_VALUES.has(theme) ? theme : APP_THEME.LIGHT
);

export const applyAppTheme = (theme, root) => {
  const normalizedTheme = normalizeAppTheme(theme);
  const targetRoot = root || (typeof document !== 'undefined' ? document.documentElement : null);

  if (!targetRoot) return normalizedTheme;

  targetRoot.classList.toggle('dark', normalizedTheme === APP_THEME.DARK);
  targetRoot.dataset.theme = normalizedTheme;
  return normalizedTheme;
};

export const readStoredAppTheme = (storage) => {
  const targetStorage = storage || (typeof window !== 'undefined' ? window.localStorage : null);

  if (!targetStorage) return APP_THEME.LIGHT;

  try {
    return normalizeAppTheme(targetStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return APP_THEME.LIGHT;
  }
};

export const saveAppTheme = (theme, { root, storage } = {}) => {
  const normalizedTheme = applyAppTheme(theme, root);
  const targetStorage = storage || (typeof window !== 'undefined' ? window.localStorage : null);

  if (targetStorage) {
    try {
      targetStorage.setItem(THEME_STORAGE_KEY, normalizedTheme);
    } catch {
      // The visual preference still applies when browser storage is unavailable.
    }
  }

  return normalizedTheme;
};

export const initializeStoredAppTheme = () => applyAppTheme(readStoredAppTheme());
