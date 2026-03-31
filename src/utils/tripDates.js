const DATE_SEPARATORS = [' - ', '～', '~', '至', '到'];

const pad = (value) => String(value).padStart(2, '0');

export const toDateInputValue = (dateText) => {
  if (typeof dateText !== 'string') return '';
  const trimmed = dateText.trim();
  if (!trimmed) return '';

  const matched = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (!matched) return '';

  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return '';
  if (month < 1 || month > 12 || day < 1 || day > 31) return '';

  return `${year}-${pad(month)}-${pad(day)}`;
};

export const formatDateText = (dateInput) => {
  if (typeof dateInput !== 'string') return '';
  const normalized = toDateInputValue(dateInput);
  if (!normalized) return '';
  return normalized.replace(/-/g, '/');
};

export const formatDateRangeText = (startDate, endDate) => {
  const start = formatDateText(startDate);
  const end = formatDateText(endDate);
  if (start && end) return `${start} - ${end}`;
  return start || end || '';
};

const splitDateRangeText = (datesText) => {
  if (typeof datesText !== 'string') return ['', ''];

  for (const separator of DATE_SEPARATORS) {
    if (datesText.includes(separator)) {
      const [left = '', right = ''] = datesText.split(separator);
      return [left.trim(), right.trim()];
    }
  }

  const rangeMatch = datesText.match(/(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}).*(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/);
  if (rangeMatch) {
    return [rangeMatch[1], rangeMatch[2]];
  }

  return [datesText.trim(), ''];
};

export const normalizeTripDateFields = (tripDetails = {}) => {
  const existingRange = tripDetails?.dateRange || {};
  let startDate = toDateInputValue(existingRange.start || '');
  let endDate = toDateInputValue(existingRange.end || '');

  if ((!startDate || !endDate) && typeof tripDetails?.dates === 'string' && tripDetails.dates.trim()) {
    const [legacyStart, legacyEnd] = splitDateRangeText(tripDetails.dates);
    startDate = startDate || toDateInputValue(legacyStart);
    endDate = endDate || toDateInputValue(legacyEnd);
  }

  const dates = formatDateRangeText(startDate, endDate) || (tripDetails?.dates || '');

  return {
    ...tripDetails,
    dateRange: {
      start: startDate,
      end: endDate
    },
    dates
  };
};

export const getTripDisplayDates = (tripDetails) => {
  const range = tripDetails?.dateRange || {};
  return formatDateRangeText(range.start, range.end) || tripDetails?.dates || '';
};
