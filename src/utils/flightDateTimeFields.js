const emptyDateParts = { year: '', month: '', day: '' };
const emptyTimeParts = { hour: '', minute: '' };

const padTwo = (value) => String(value).padStart(2, '0');
const isIntegerText = (value) => /^\d+$/.test(String(value || ''));

const normalizeYear = (value) => {
  if (!isIntegerText(value)) return '';
  const year = Number(value);
  if (!Number.isInteger(year) || year < 1900 || year > 9999) return '';
  return String(year).padStart(4, '0');
};

const normalizeMonth = (value) => {
  if (!isIntegerText(value)) return '';
  const month = Number(value);
  if (!Number.isInteger(month) || month < 1 || month > 12) return '';
  return padTwo(month);
};

const normalizeDay = (value) => {
  if (!isIntegerText(value)) return '';
  const day = Number(value);
  if (!Number.isInteger(day) || day < 1 || day > 31) return '';
  return padTwo(day);
};

export const getFlightDateDayCount = (year, month) => {
  const safeYear = normalizeYear(year);
  const safeMonth = normalizeMonth(month);
  if (!safeYear || !safeMonth) return 31;
  return new Date(Number(safeYear), Number(safeMonth), 0).getDate();
};

const isValidDateParts = ({ year, month, day }) => {
  const safeYear = normalizeYear(year);
  const safeMonth = normalizeMonth(month);
  const safeDay = normalizeDay(day);
  if (!safeYear || !safeMonth || !safeDay) return false;
  return Number(safeDay) <= getFlightDateDayCount(safeYear, safeMonth);
};

export const buildFlightDateValue = ({ year = '', month = '', day = '' } = {}) => {
  const safeYear = normalizeYear(year);
  const safeMonth = normalizeMonth(month);
  const safeDay = normalizeDay(day);
  if (!isValidDateParts({ year: safeYear, month: safeMonth, day: safeDay })) return '';
  return `${safeYear}-${safeMonth}-${safeDay}`;
};

export const getFlightDateValue = (value, fallbackYear = null) => {
  if (typeof value !== 'string') return '';
  const trimmedValue = value.trim();
  if (!trimmedValue) return '';

  const fullDateMatch = trimmedValue.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (fullDateMatch) {
    return buildFlightDateValue({
      year: fullDateMatch[1],
      month: fullDateMatch[2],
      day: fullDateMatch[3]
    });
  }

  const monthDayMatch = trimmedValue.match(/^(\d{1,2})[-/.](\d{1,2})$/);
  if (!monthDayMatch) return '';

  return buildFlightDateValue({
    year: fallbackYear,
    month: monthDayMatch[1],
    day: monthDayMatch[2]
  });
};

export const getFlightDateSelectParts = (value, fallbackYear = null) => {
  const dateValue = getFlightDateValue(value, fallbackYear);
  if (!dateValue) return { ...emptyDateParts };
  const [year, month, day] = dateValue.split('-');
  return { year, month, day };
};

export const buildFlightTimeValue = ({ hour = '', minute = '' } = {}) => {
  if (!isIntegerText(hour) || !isIntegerText(minute)) return '';
  const parsedHour = Number(hour);
  const parsedMinute = Number(minute);
  if (
    !Number.isInteger(parsedHour) ||
    !Number.isInteger(parsedMinute) ||
    parsedHour < 0 ||
    parsedHour > 23 ||
    parsedMinute < 0 ||
    parsedMinute > 59
  ) {
    return '';
  }
  return `${padTwo(parsedHour)}:${padTwo(parsedMinute)}`;
};

export const getFlightTimeSelectParts = (value) => {
  if (typeof value !== 'string') return { ...emptyTimeParts };
  const matchedTime = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!matchedTime) return { ...emptyTimeParts };
  const timeValue = buildFlightTimeValue({ hour: matchedTime[1], minute: matchedTime[2] });
  if (!timeValue) return { ...emptyTimeParts };
  const [hour, minute] = timeValue.split(':');
  return { hour, minute };
};
