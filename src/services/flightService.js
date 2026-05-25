import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

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
    message: '可依旅程日期查詢航班資料。'
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

const toFlightLookupError = (error) => {
  const message = error?.message || '航班查詢失敗，請稍後再試或手動填寫。';
  const nextError = new Error(message);
  nextError.code = error?.code || 'flight_lookup_failed';
  return nextError;
};

export const lookupFlightByCode = async (rawCode, rawDepartureDate = '', options = {}) => {
  const code = normalizeFlightCode(rawCode);
  if (!code) throw new Error('請先輸入航班代號');

  const availability = getFlightLookupAvailability(rawDepartureDate);
  if (!availability.canLookup) {
    throw new Error(availability.message);
  }

  const departureAirport = normalizeAirportCode(options.departureAirport);
  const arrivalAirport = normalizeAirportCode(options.arrivalAirport);
  const request = {
    code,
    date: availability.normalizedDate
  };

  if (departureAirport) {
    if (!isAirportCode(departureAirport)) {
      throw new Error('出發機場請輸入 3 碼機場代碼，例如 TPE');
    }
    request.depap = departureAirport;
  }

  if (arrivalAirport) {
    if (!isAirportCode(arrivalAirport)) {
      throw new Error('抵達機場請輸入 3 碼機場代碼，例如 NRT');
    }
    request.arrap = arrivalAirport;
  }

  const callable = httpsCallable(functions, 'lookupFlight');
  let payload = null;
  try {
    const response = await callable(request);
    payload = response.data || {};
  } catch (error) {
    throw toFlightLookupError(error);
  }

  if (!payload?.flight) {
    throw new Error('航班資料不完整，請手動確認。');
  }

  return payload.flight;
};
