import { normalizeExternalUrl } from './externalUrl';

export const validateRequiredText = (value, label, { maxLength = 160 } = {}) => {
  const text = String(value || '').trim();
  if (!text) return `${label}為必填`;
  if (text.length > maxLength) return `${label}請少於 ${maxLength} 個字`;
  return '';
};

export const validateInviteCode = (value) => {
  const code = String(value || '').replace(/[^A-Z0-9]/gi, '');
  if (code.length !== 8) return '請輸入 8 碼邀請碼';
  return '';
};

export const validatePositiveInteger = (value, label, { min = 1, max = 999 } = {}) => {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min) return `${label}請輸入大於 ${min - 1} 的整數`;
  if (number > max) return `${label}請小於或等於 ${max}`;
  return '';
};

export const validateOptionalUrl = (value) => {
  const text = String(value || '').trim();
  if (!text) return '';
  return normalizeExternalUrl(text) ? '' : '網址格式不正確，請使用 http 或 https 網址';
};

export const validateImageFile = (file, { maxBytes = 2 * 1024 * 1024 } = {}) => {
  if (!file) return '';
  if (!String(file.type || '').startsWith('image/')) return '請選擇圖片檔案';
  if (file.size > maxBytes) return `圖片大小請小於 ${Math.round(maxBytes / 1024 / 1024)}MB`;
  return '';
};
