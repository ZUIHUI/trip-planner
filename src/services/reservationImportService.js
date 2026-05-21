import { normalizeTripDateFields } from '../utils/tripDates';

const AIRPORT_CODE_IGNORE = new Set([
  'API',
  'APP',
  'CSS',
  'FAQ',
  'HTML',
  'PDF',
  'TWD',
  'URL',
  'USD',
  'VIP',
  'WWW'
]);

const hasText = (value) => typeof value === 'string' && value.trim().length > 0;
const cleanText = (value) => String(value || '').trim();
const normalizeFlightCode = (value) => cleanText(value).toUpperCase().replace(/\s+/g, '');

const normalizeDate = (year, month, day) => {
  const parsedYear = Number(year);
  const parsedMonth = Number(month);
  const parsedDay = Number(day);
  const date = new Date(parsedYear, parsedMonth - 1, parsedDay);

  if (
    !Number.isInteger(parsedYear) ||
    !Number.isInteger(parsedMonth) ||
    !Number.isInteger(parsedDay) ||
    date.getFullYear() !== parsedYear ||
    date.getMonth() !== parsedMonth - 1 ||
    date.getDate() !== parsedDay
  ) {
    return '';
  }

  return `${parsedYear}-${String(parsedMonth).padStart(2, '0')}-${String(parsedDay).padStart(2, '0')}`;
};

const getBaseYear = (tripDetails) => {
  const startDate = tripDetails?.dateRange?.start;
  const matchedStartYear = String(startDate || '').match(/\b(19|20)\d{2}\b/);
  if (matchedStartYear) return Number(matchedStartYear[0]);
  return new Date().getFullYear();
};

const toDisplayDate = (isoDate) => {
  const matched = String(isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!matched) return '';
  return `${Number(matched[2])}/${Number(matched[3])}`;
};

const unique = (values) => [...new Set(values.filter(Boolean))];

const getLines = (text) => cleanText(text)
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

const findLabeledValue = (lines, labels) => {
  const labelPattern = labels.join('|');
  const regex = new RegExp(`^(?:${labelPattern})\\s*[:：\\-]?\\s*(.+)$`, 'i');
  const matched = lines.find((line) => regex.test(line));
  return matched ? cleanText(matched.replace(regex, '$1')) : '';
};

const findValueAfterLabel = (text, labels, valuePattern) => {
  const labelPattern = labels.join('|');
  const regex = new RegExp(`(?:${labelPattern})[^\\dA-Z]{0,24}(${valuePattern})`, 'i');
  const matched = text.match(regex);
  return matched ? cleanText(matched[1]) : '';
};

const extractDates = (text, tripDetails) => {
  const baseYear = getBaseYear(tripDetails);
  const dates = [];

  const fullDateRegexes = [
    /\b((?:19|20)\d{2})[\/.-](\d{1,2})[\/.-](\d{1,2})\b/g,
    /((?:19|20)\d{2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/g
  ];

  fullDateRegexes.forEach((regex) => {
    for (const match of text.matchAll(regex)) {
      dates.push(normalizeDate(match[1], match[2], match[3]));
    }
  });

  for (const match of text.matchAll(/(?:^|[^\d])(\d{1,2})[\/.-](\d{1,2})(?:$|[^\d])/g)) {
    dates.push(normalizeDate(baseYear, match[1], match[2]));
  }

  return unique(dates);
};

const extractAirportCodes = (text) => unique(
  (text.match(/\b[A-Z]{3}\b/g) || [])
    .map((value) => value.toUpperCase())
    .filter((value) => !AIRPORT_CODE_IGNORE.has(value))
);

const extractFlightCodes = (text) => unique(
  (text.match(/\b[A-Z]{2}\s?\d{2,4}[A-Z]?\b/g) || [])
    .map(normalizeFlightCode)
);

const extractTimes = (text) => unique(text.match(/\b(?:[01]?\d|2[0-3]):[0-5]\d\b/g) || []);

const buildFlightPatch = ({ code, date, dep, arr, departureTime, arrivalTime }) => {
  const patch = {};
  if (code) patch.code = code;
  if (date) patch.date = toDisplayDate(date) || date;
  if (dep) patch.dep = dep;
  if (arr) patch.arr = arr;
  if (departureTime) patch.departureTime = departureTime;
  if (arrivalTime) patch.arrivalTime = arrivalTime;
  return patch;
};

const parseFlights = (text, tripDetails) => {
  const flightCodes = extractFlightCodes(text);
  const airports = extractAirportCodes(text);
  const dates = extractDates(text, tripDetails);
  const times = extractTimes(text);
  const outboundDepartureTime = findValueAfterLabel(
    text,
    ['departure', 'depart', '起飛', '出發', '去程起飛', '出発'],
    '(?:[01]?\\d|2[0-3]):[0-5]\\d'
  );
  const outboundArrivalTime = findValueAfterLabel(
    text,
    ['arrival', 'arrive', '抵達', '到達', '去程抵達', '到着'],
    '(?:[01]?\\d|2[0-3]):[0-5]\\d'
  );
  const hasInboundCue = /回程|返程|return|inbound|returning/i.test(text);
  const hasOutboundCue = /去程|出發|outbound|departing/i.test(text);
  const flights = {};

  if (flightCodes.length === 1) {
    const direction = hasInboundCue && !hasOutboundCue ? 'inbound' : 'outbound';
    flights[direction] = buildFlightPatch({
      code: flightCodes[0],
      date: dates[direction === 'inbound' && dates.length > 1 ? dates.length - 1 : 0],
      dep: airports[0],
      arr: airports[1],
      departureTime: outboundDepartureTime || times[0],
      arrivalTime: outboundArrivalTime || times[1]
    });
  }

  if (flightCodes.length >= 2) {
    flights.outbound = buildFlightPatch({
      code: flightCodes[0],
      date: dates[0],
      dep: airports[0],
      arr: airports[1],
      departureTime: outboundDepartureTime || times[0],
      arrivalTime: outboundArrivalTime || times[1]
    });

    flights.inbound = buildFlightPatch({
      code: flightCodes[1],
      date: dates[1] || dates[dates.length - 1],
      dep: airports[2],
      arr: airports[3],
      departureTime: times[2],
      arrivalTime: times[3]
    });
  }

  return flights;
};

const parseAccommodation = (text) => {
  const lines = getLines(text);
  const name = findLabeledValue(lines, [
    '飯店',
    '酒店',
    '住宿',
    '住宿名稱',
    '旅館',
    'hotel',
    'hotel name',
    'property',
    'accommodation',
    '施設名',
    '宿泊施設'
  ]);
  const address = findLabeledValue(lines, [
    '地址',
    '住址',
    '住宿地址',
    'address',
    'property address',
    '住所',
    '所在地'
  ]);
  const checkIn = findLabeledValue(lines, ['check[- ]?in', '入住', '入住時間', 'チェックイン']);
  const checkOut = findLabeledValue(lines, ['check[- ]?out', '退房', '退房時間', 'チェックアウト']);
  const accommodation = {};

  if (name) accommodation.name = name;
  if (address) accommodation.address = address;
  if (checkIn) accommodation.checkIn = checkIn;
  if (checkOut) accommodation.checkOut = checkOut;

  return accommodation;
};

export const parseReservationText = (rawText, { tripDetails = {} } = {}) => {
  const text = cleanText(rawText);
  if (!text) {
    return {
      accommodation: {},
      flights: {},
      dateRange: {},
      detectedCount: 0
    };
  }

  const dates = extractDates(text, tripDetails);
  const accommodation = parseAccommodation(text);
  const flights = parseFlights(text, tripDetails);
  const detectedCount =
    Object.keys(accommodation).length +
    Object.values(flights).reduce((sum, flight) => sum + Object.keys(flight || {}).length, 0);

  return {
    accommodation,
    flights,
    dateRange: {
      start: dates[0] || '',
      end: dates.length > 1 ? dates[dates.length - 1] : ''
    },
    detectedCount
  };
};

const mergeObjectFields = (current = {}, patch = {}, { overwrite = false, prefix = '' } = {}) => {
  const next = { ...current };
  const appliedFields = [];

  Object.entries(patch || {}).forEach(([key, value]) => {
    if (!hasText(value) && typeof value !== 'number') return;
    if (!overwrite && hasText(next[key])) return;
    next[key] = value;
    appliedFields.push(prefix ? `${prefix}.${key}` : key);
  });

  return { next, appliedFields };
};

export const mergeReservationImportIntoTripDetails = (tripDetails = {}, parsed = {}, { overwrite = false } = {}) => {
  const nextTripDetails = { ...tripDetails };
  const appliedFields = [];

  if (parsed.dateRange?.start || parsed.dateRange?.end) {
    const dateRangeResult = mergeObjectFields(nextTripDetails.dateRange || {}, parsed.dateRange, {
      overwrite,
      prefix: 'dateRange'
    });
    nextTripDetails.dateRange = dateRangeResult.next;
    appliedFields.push(...dateRangeResult.appliedFields);
  }

  const accommodationResult = mergeObjectFields(nextTripDetails.accommodation || {}, parsed.accommodation, {
    overwrite,
    prefix: 'accommodation'
  });
  nextTripDetails.accommodation = accommodationResult.next;
  appliedFields.push(...accommodationResult.appliedFields);

  const flights = {
    ...(nextTripDetails.flights || {})
  };

  ['outbound', 'inbound'].forEach((direction) => {
    if (!parsed.flights?.[direction]) return;
    const flightResult = mergeObjectFields(flights[direction] || {}, parsed.flights[direction], {
      overwrite,
      prefix: `flights.${direction}`
    });
    flights[direction] = flightResult.next;
    appliedFields.push(...flightResult.appliedFields);
  });

  nextTripDetails.flights = flights;

  return {
    tripDetails: normalizeTripDateFields(nextTripDetails),
    appliedFields
  };
};
