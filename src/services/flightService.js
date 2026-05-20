const FLIGHT_LOOKUP_API_PATH = '/api/flight-lookup';

const normalizeFlightCode = (rawCode = '') => String(rawCode).trim().toUpperCase().replace(/\s+/g, '');
const normalizeAirportCode = (rawCode = '') => String(rawCode || '').trim().toUpperCase();
const isAirportCode = (rawCode = '') => /^[A-Z]{3}$/.test(normalizeAirportCode(rawCode));

const hasText = (value) => typeof value === 'string' && value.trim().length > 0;

const readText = (value) => (hasText(value) ? value.trim() : '');

export const normalizeFlightLookupDate = (rawDate = '') => {
  const value = String(rawDate || '').trim();
  if (!value) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return '';

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseLookupDate = (rawDate = '') => {
  const normalizedDate = normalizeFlightLookupDate(rawDate);
  if (!normalizedDate) return null;
  const parsed = new Date(`${normalizedDate}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getFlightLookupAvailability = (rawDate = '') => {
  if (!String(rawDate || '').trim()) {
    return {
      canLookup: false,
      reason: 'missing_date',
      normalizedDate: '',
      message: '請先設定旅程日期後再查詢航班。'
    };
  }

  const parsedDate = parseLookupDate(rawDate);
  const normalizedDate = normalizeFlightLookupDate(rawDate);
  if (!parsedDate) {
    return {
      canLookup: false,
      reason: 'invalid_date',
      normalizedDate: '',
      message: '航班查詢日期格式不正確，請改用旅程日期或手動填寫。'
    };
  }

  return {
    canLookup: true,
    reason: 'available',
    normalizedDate,
    message: '可依旅程日期查詢 FlightAPI.io 航班資料。'
  };
};

export const mergeFlightLookupResult = (existingFlight = {}, lookupResult = {}) => {
  const merged = { ...(existingFlight || {}) };
  Object.entries(lookupResult || {}).forEach(([key, value]) => {
    if (readText(value)) {
      merged[key] = value;
    }
  });
  return merged;
};

const readResponsePayload = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return { message: await response.text() };
};

export const lookupFlightByCode = async (rawCode, rawDepartureDate = '', options = {}) => {
  const code = normalizeFlightCode(rawCode);
  if (!code) throw new Error('請先輸入航班代號');

  const availability = getFlightLookupAvailability(rawDepartureDate);
  if (!availability.canLookup) {
    throw new Error(availability.message);
  }

  const query = new URLSearchParams({
    code,
    date: availability.normalizedDate
  });

  const departureAirport = normalizeAirportCode(options.departureAirport);
  const arrivalAirport = normalizeAirportCode(options.arrivalAirport);
  if (departureAirport) {
    if (!isAirportCode(departureAirport)) {
      throw new Error('出發機場請輸入 3 碼 IATA 代碼，例如 TPE');
    }
    query.set('depap', departureAirport);
  }

  if (arrivalAirport) {
    if (!isAirportCode(arrivalAirport)) {
      throw new Error('抵達機場請輸入 3 碼 IATA 代碼，例如 NRT');
    }
    query.set('arrap', arrivalAirport);
  }

  const response = await fetch(`${FLIGHT_LOOKUP_API_PATH}?${query.toString()}`);
  const payload = await readResponsePayload(response);

  if (!response.ok) {
    throw new Error(payload?.message || 'FlightAPI.io 航班查詢失敗，請稍後再試或手動填寫。');
  }

  if (!payload?.flight) {
    throw new Error('FlightAPI.io 回傳格式不完整，請手動確認航班資料。');
  }

  return payload.flight;
};
