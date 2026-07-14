const DIAGNOSTIC_MESSAGE_LIMIT = 320;

const normalizeDiagnosticValue = (value) => {
  if (typeof value === 'string') return value;
  if (value == null) return '';

  try {
    return String(value);
  } catch {
    return '';
  }
};

export const sanitizeErrorDiagnosticText = (value, limit = DIAGNOSTIC_MESSAGE_LIMIT) => {
  const normalized = normalizeDiagnosticValue(value)
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[redacted-api-key]')
    .replace(/\bBearer\s+[^\s]+/gi, 'Bearer [redacted]')
    .replace(/([?&](?:api_?key|key|token|auth|access_token)=)[^&\s]+/gi, '$1[redacted]')
    .replace(/https?:\/\/[^\s)\]}]+/gi, '[redacted-url]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return '';
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, Math.max(0, limit - 1))}…`;
};

export const getFirstComponentName = (componentStack) => {
  const lines = normalizeDiagnosticValue(componentStack).split(/\r?\n/);

  for (const line of lines) {
    const match = line.trim().match(/^at\s+([A-Za-z0-9_$.[\]-]+)/);
    if (match?.[1]) return match[1].slice(0, 80);
  }

  return '';
};

const createDiagnosticHash = (value) => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, '0').toUpperCase();
};

export const buildErrorDiagnostic = (error, componentStack = '') => {
  const rawName = normalizeDiagnosticValue(error?.name) || 'Error';
  const rawMessage = normalizeDiagnosticValue(error?.message || error) || 'Unknown render error';
  const component = getFirstComponentName(componentStack);

  return {
    code: `ERR-${createDiagnosticHash(`${rawName}\n${rawMessage}\n${component}`)}`,
    name: sanitizeErrorDiagnosticText(rawName, 60) || 'Error',
    message: sanitizeErrorDiagnosticText(rawMessage) || 'Unknown render error',
    component
  };
};
