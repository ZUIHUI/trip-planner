const AVIATIONSTACK_API_URL = 'https://api.aviationstack.com/v1/flights';
const HISTORICAL_LOOKUP_MONTHS = 3;

const normalizeFlightCode = (rawCode = '') => rawCode.trim().toUpperCase().replace(/\s+/g, '');

const hasText = (value) => typeof value === 'string' && value.trim().length > 0;

const readText = (value) => (hasText(value) ? value.trim() : '');

const toLocalDateOnly = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const toTimeText = (raw) => {
  if (!raw) return '';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const toDateText = (raw) => {
  if (!raw) return '';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  return `${parsed.getMonth() + 1}/${parsed.getDate()}`;
};

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

export const getFlightLookupAvailability = (rawDate = '', today = new Date()) => {
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

  const cutoff = toLocalDateOnly(today);
  cutoff.setMonth(cutoff.getMonth() - HISTORICAL_LOOKUP_MONTHS);

  if (toLocalDateOnly(parsedDate) < cutoff) {
    return {
      canLookup: false,
      reason: 'too_old',
      normalizedDate,
      message: 'Aviationstack 只支援最近 3 個月的歷史航班，請手動填寫。'
    };
  }

  return {
    canLookup: true,
    reason: 'available',
    normalizedDate,
    message: '可依旅程日期查詢航班。'
  };
};

const buildFlightRecord = (item, fallbackCode) => {
  const departureIso = item?.departure?.scheduled || item?.departure?.estimated;
  const arrivalIso = item?.arrival?.scheduled || item?.arrival?.estimated;
  return {
    code: item?.flight?.iata || fallbackCode,
    airline: item?.airline?.name || '',
    date: toDateText(departureIso),
    departureTime: toTimeText(departureIso),
    arrivalTime: toTimeText(arrivalIso),
    dep: item?.departure?.iata || '',
    arr: item?.arrival?.iata || '',
    depTerminal: item?.departure?.terminal || '',
    arrTerminal: item?.arrival?.terminal || ''
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

export const lookupFlightByCode = async (rawCode, rawDepartureDate = '') => {
  const code = normalizeFlightCode(rawCode);
  if (!code) throw new Error('請先輸入航班代號');

  const availability = getFlightLookupAvailability(rawDepartureDate);
  if (!availability.canLookup) {
    throw new Error(availability.message);
  }

  const accessKey = import.meta.env.VITE_AVIATIONSTACK_API_KEY;
  if (!accessKey) {
    throw new Error('尚未設定航班查詢 API Key：VITE_AVIATIONSTACK_API_KEY');
  }

  const query = new URLSearchParams({
    access_key: accessKey,
    flight_iata: code,
    flight_date: availability.normalizedDate,
    limit: '1'
  });

  const response = await fetch(`${AVIATIONSTACK_API_URL}?${query.toString()}`);
  if (!response.ok) throw new Error('航班查詢失敗，請稍後再試或手動填寫。');

  const payload = await response.json();
  if (payload?.error) {
    const apiMessage = payload.error?.info || payload.error?.message || '無法取得航班資料';
    throw new Error(apiMessage);
  }

  const results = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.results)
      ? payload.results
      : [];
  const first = results[0] || null;
  if (!first) throw new Error('查無此日期的航班資料，已保留目前手動輸入內容。');

  return buildFlightRecord(first, code);
};
