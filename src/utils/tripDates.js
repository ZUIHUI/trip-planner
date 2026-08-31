const DATE_SEPARATORS = [' - ', '～', '~', '至', '到'];

const WEEKDAY_NAMES = ['Sun.', 'Mon.', 'Tue.', 'Wed.', 'Thu.', 'Fri.', 'Sat.'];
const WEEKDAY_ALIASES = {
  sun: 'Sun.',
  sunday: 'Sun.',
  mon: 'Mon.',
  monday: 'Mon.',
  tue: 'Tue.',
  tues: 'Tue.',
  tuesday: 'Tue.',
  wed: 'Wed.',
  wednesday: 'Wed.',
  thu: 'Thu.',
  thur: 'Thu.',
  thurs: 'Thu.',
  thursday: 'Thu.',
  fri: 'Fri.',
  friday: 'Fri.',
  sat: 'Sat.',
  saturday: 'Sat.'
};
const CHINESE_WEEKDAY_ALIASES = {
  日: 'Sun.',
  天: 'Sun.',
  一: 'Mon.',
  二: 'Tue.',
  三: 'Wed.',
  四: 'Thu.',
  五: 'Fri.',
  六: 'Sat.'
};
const GENERIC_DAY_TITLE_PATTERN = /^(?:day\s*\d+|第\s*\d+\s*天)$/i;
const WEEKDAY_IN_TEXT_PATTERN = /(?:週|周|星期)[日一二三四五六天]|\b(?:sun(?:day)?|mon(?:day)?|tue(?:sday|s)?|wed(?:nesday)?|thu(?:rsday|rs|r)?|fri(?:day)?|sat(?:urday)?)\b/i;

const pad = (value) => String(value).padStart(2, '0');

const toIsoDateText = (date) => (
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
);

const createValidLocalDate = (year, month, day) => {
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) return null;
  return date;
};

const getDateYear = (dateInput) => {
  const matched = String(dateInput || '').trim().match(/^(\d{4})[-/.]\d{1,2}[-/.]\d{1,2}$/);
  return matched ? Number(matched[1]) : null;
};

export const getTripDayMonthLength = (monthInput, referenceDate = '') => {
  const month = Number(monthInput);
  if (!Number.isInteger(month) || month < 1 || month > 12) return 31;

  const referenceYear = getDateYear(referenceDate);
  const year = referenceYear || 2000;
  return new Date(year, month, 0).getDate();
};

export const getTripDayDateParts = (dateInput, referenceDate = '') => {
  const text = String(dateInput || '').trim();
  const fullDateMatch = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  const monthDayMatch = text.match(/^(\d{1,2})[-/.](\d{1,2})$/);
  const matched = fullDateMatch || monthDayMatch;

  if (!matched) return { month: '', day: '' };

  const month = Number(fullDateMatch ? matched[2] : matched[1]);
  const day = Number(fullDateMatch ? matched[3] : matched[2]);
  const validationDate = fullDateMatch ? text : referenceDate;
  const monthLength = getTripDayMonthLength(month, validationDate);

  if (
    !Number.isInteger(month)
    || !Number.isInteger(day)
    || month < 1
    || month > 12
    || day < 1
    || day > monthLength
  ) {
    return { month: '', day: '' };
  }

  return { month: pad(month), day: pad(day) };
};

export const buildTripDayDateText = ({ month = '', day = '' } = {}, referenceDate = '') => {
  const parts = getTripDayDateParts(`${month}/${day}`, referenceDate);
  if (!parts.month || !parts.day) return '';
  return `${Number(parts.month)}/${Number(parts.day)}`;
};

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

const formatMonthDayText = (dateInput) => {
  const text = String(dateInput || '').trim();
  if (!text || GENERIC_DAY_TITLE_PATTERN.test(text)) return '';

  const normalized = toDateInputValue(text);
  if (normalized) {
    const [, month, day] = normalized.split('-');
    return `${Number(month)}/${Number(day)}`;
  }

  const monthDayMatch = text.match(/^(\d{1,2})[/.](\d{1,2})$/);
  if (monthDayMatch) {
    return `${Number(monthDayMatch[1])}/${Number(monthDayMatch[2])}`;
  }

  return text;
};

const getDerivedTripDayIsoDate = (day = {}, tripDetails = {}) => {
  const rawDate = String(day?.isoDate || day?.date || '').trim();
  const explicitDate = toDateInputValue(rawDate);
  if (explicitDate) return explicitDate;

  const startDate = toDateInputValue(tripDetails?.dateRange?.start || '');
  const dayNumber = Number(day?.day ?? day?.dayNumber);
  if (!startDate || !Number.isInteger(dayNumber) || dayNumber < 1) return '';

  const [year, month, date] = startDate.split('-').map(Number);
  const derivedDate = new Date(year, month - 1, date);
  derivedDate.setDate(derivedDate.getDate() + dayNumber - 1);

  const monthDayMatch = rawDate.match(/^(\d{1,2})[/.](\d{1,2})$/);
  if (monthDayMatch) {
    const explicitMonth = Number(monthDayMatch[1]);
    const explicitDay = Number(monthDayMatch[2]);
    const candidates = [
      createValidLocalDate(derivedDate.getFullYear() - 1, explicitMonth, explicitDay),
      createValidLocalDate(derivedDate.getFullYear(), explicitMonth, explicitDay),
      createValidLocalDate(derivedDate.getFullYear() + 1, explicitMonth, explicitDay)
    ].filter(Boolean);
    const closestDate = candidates.sort(
      (left, right) => Math.abs(left - derivedDate) - Math.abs(right - derivedDate)
    )[0];
    if (closestDate) return toIsoDateText(closestDate);
  }

  return toIsoDateText(derivedDate);
};

export const getTripDayWeekdayForDate = (dateInput, day = {}, tripDetails = {}) => {
  const derivedIsoDate = getDerivedTripDayIsoDate({
    ...day,
    isoDate: '',
    date: dateInput
  }, tripDetails);
  if (!derivedIsoDate) return '';

  const [year, month, date] = derivedIsoDate.split('-').map(Number);
  const localDate = createValidLocalDate(year, month, date);
  return localDate ? WEEKDAY_NAMES[localDate.getDay()].replace('.', '') : '';
};

export const normalizeTripWeekday = (weekday) => {
  const text = String(weekday || '').trim();
  if (!text) return '';

  const chineseMatch = text.match(/^(?:週|周|星期)([日一二三四五六天])$/);
  if (chineseMatch) return CHINESE_WEEKDAY_ALIASES[chineseMatch[1]] || '';

  const normalized = text.toLowerCase().replace(/\./g, '');
  return WEEKDAY_ALIASES[normalized] || '';
};

export const isGenericTripDayTitle = (title) => (
  GENERIC_DAY_TITLE_PATTERN.test(String(title || '').trim())
);

export const getTripDayDisplayTitle = (day = {}, fallback = '當日行程') => {
  const title = String(day?.title || '').trim();
  return title && !isGenericTripDayTitle(title) ? title : fallback;
};

export const getTripDayDisplayLabel = (
  day = {},
  tripDetails = {},
  fallback = '日期未設定'
) => {
  const derivedIsoDate = getDerivedTripDayIsoDate(day, tripDetails);
  const dateText = formatMonthDayText(day?.date || day?.isoDate)
    || formatMonthDayText(derivedIsoDate);
  const weekdayText = normalizeTripWeekday(day?.weekday) || (() => {
    if (!derivedIsoDate) return '';
    const [year, month, date] = derivedIsoDate.split('-').map(Number);
    return WEEKDAY_NAMES[new Date(year, month - 1, date).getDay()];
  })();

  if (dateText && WEEKDAY_IN_TEXT_PATTERN.test(dateText)) return dateText;
  return [dateText, weekdayText].filter(Boolean).join(' ') || fallback;
};

export const getTripDayByNumber = (itinerary = [], dayNumber) => (
  (Array.isArray(itinerary) ? itinerary : []).find(
    (day) => String(day?.day ?? day?.dayNumber) === String(dayNumber)
  ) || null
);

export const getTripDayLabelByNumber = (
  itinerary = [],
  dayNumber,
  tripDetails = {},
  fallback = '日期未設定'
) => getTripDayDisplayLabel(
  getTripDayByNumber(itinerary, dayNumber) || { day: dayNumber },
  tripDetails,
  fallback
);

export const formatDateRangeText = (startDate, endDate) => {
  const start = formatDateText(startDate);
  const end = formatDateText(endDate);
  if (start && end) return `${start} - ${end}`;
  return start || end || '';
};

export const formatDateWithWeekday = (dateInput) => {
  const normalized = toDateInputValue(dateInput);
  if (!normalized) return '';
  const [year, month, day] = normalized.split('-').map(Number);
  const date = createValidLocalDate(year, month, day);
  if (!date) return '';
  return `${formatDateText(normalized)} ${WEEKDAY_NAMES[date.getDay()]}`;
};

export const formatDateTimeWithWeekday = (value, { includeYear = true } = {}) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const dateText = includeYear
    ? `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`
    : `${date.getMonth() + 1}/${date.getDate()}`;
  const timeText = date.toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  return `${dateText} ${WEEKDAY_NAMES[date.getDay()]} ${timeText}`;
};

export const formatDisplayDateRangeText = (startDate, endDate) => {
  const start = formatDateWithWeekday(startDate);
  const end = formatDateWithWeekday(endDate);
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
  const rangeText = formatDisplayDateRangeText(range.start, range.end);
  if (rangeText) return rangeText;

  const legacyDates = String(tripDetails?.dates || '').trim();
  if (!legacyDates) return '';
  const [legacyStart, legacyEnd] = splitDateRangeText(legacyDates);
  return formatDisplayDateRangeText(legacyStart, legacyEnd) || legacyDates;
};
