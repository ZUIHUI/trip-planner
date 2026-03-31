const ALLOWED_DATA_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif'
]);

const MAX_DATA_IMAGE_URL_LENGTH = 3 * 1024 * 1024;

const normalizeDataImageUrl = (value) => {
  if (!value.startsWith('data:image/')) return '';
  if (value.length > MAX_DATA_IMAGE_URL_LENGTH) return '';

  const dataUrlMatch = value.match(/^data:([^;,]+)(;base64)?,/i);
  if (!dataUrlMatch) return '';

  const mimeType = dataUrlMatch[1].toLowerCase();
  if (!ALLOWED_DATA_IMAGE_MIME_TYPES.has(mimeType)) return '';

  return value;
};

export const normalizeCoverImageUrl = (value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('data:image/')) {
    return normalizeDataImageUrl(trimmed);
  }

  try {
    const parsed = new URL(trimmed);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : '';
  } catch {
    return '';
  }
};

export const hasValidCoverImage = (value) => Boolean(normalizeCoverImageUrl(value));
