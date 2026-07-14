export const LAZY_IMPORT_RELOAD_COOLDOWN_MS = 60_000;

const lazyImportErrorPattern = /failed to fetch dynamically imported module|importing a module script failed|error loading dynamically imported module|expected a javascript-or-wasm module script|module script.+mime type.+text\/html/i;

const readErrorMessage = (error) => String(
  error?.message || error?.name || error || ''
).trim();

const hashText = (text) => {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
};

export const isLazyImportError = (error) => (
  lazyImportErrorPattern.test(readErrorMessage(error))
);

export const markLazyImportReload = (
  error,
  { storage, now = Date.now() } = {}
) => {
  if (!isLazyImportError(error)) return false;

  let targetStorage = storage;
  if (!targetStorage && typeof window !== 'undefined') {
    try {
      targetStorage = window.sessionStorage;
    } catch {
      targetStorage = null;
    }
  }
  if (!targetStorage) return false;

  const key = `trip-planner:lazy-reload:${hashText(readErrorMessage(error))}`;

  try {
    const previousReloadAt = Number(targetStorage.getItem(key));
    if (
      Number.isFinite(previousReloadAt)
      && previousReloadAt > 0
      && now - previousReloadAt < LAZY_IMPORT_RELOAD_COOLDOWN_MS
    ) {
      return false;
    }
    targetStorage.setItem(key, String(now));
    return true;
  } catch {
    return false;
  }
};
