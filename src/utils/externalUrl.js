export const normalizeExternalUrl = (rawUrl = '') => {
  const value = String(rawUrl || '').trim();
  if (!value) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) && !/^https?:\/\//i.test(value)) return '';

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const parsed = new URL(withProtocol);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.toString();
  } catch {
    return '';
  }
};

export const getExternalUrlHost = (rawUrl = '') => {
  const normalizedUrl = normalizeExternalUrl(rawUrl);
  if (!normalizedUrl) return '';

  try {
    return new URL(normalizedUrl).host;
  } catch {
    return '';
  }
};
