const ALLOWED_DATA_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif'
]);

// Firestore 單一文件限制約 1 MiB。
// 背景圖會以 base64 data URL 形式儲存於 trip 文件內，因此需保留充足空間給其他欄位。
// 這裡採用保守上限，避免「本地可見但雲端儲存失敗」。
export const MAX_COVER_IMAGE_FILE_SIZE_BYTES = 450 * 1024;
const MAX_DATA_IMAGE_URL_LENGTH = 700 * 1024;

const normalizeDataImageUrl = (value, maxDataUrlLength = MAX_DATA_IMAGE_URL_LENGTH) => {
  if (!value.startsWith('data:image/')) return '';
  if (value.length > maxDataUrlLength) return '';

  const dataUrlMatch = value.match(/^data:([^;,]+)(;base64)?,/i);
  if (!dataUrlMatch) return '';

  const mimeType = dataUrlMatch[1].toLowerCase();
  if (!ALLOWED_DATA_IMAGE_MIME_TYPES.has(mimeType)) return '';

  return value;
};

export const normalizeCoverImageUrl = (value, {
  maxDataUrlLength = MAX_DATA_IMAGE_URL_LENGTH
} = {}) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('data:image/')) {
    return normalizeDataImageUrl(trimmed, maxDataUrlLength);
  }

  try {
    const parsed = new URL(trimmed);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : '';
  } catch {
    return '';
  }
};

export const hasValidCoverImage = (value) => Boolean(normalizeCoverImageUrl(value));
