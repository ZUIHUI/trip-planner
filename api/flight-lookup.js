const FLIGHTAPI_BASE_URL = 'https://api.flightapi.io/airline';

const normalizeFlightCode = (rawCode = '') => String(rawCode).trim().toUpperCase().replace(/\s+/g, '');

const parseFlightCode = (rawCode = '') => {
  const code = normalizeFlightCode(rawCode);
  const match = code.match(/^([A-Z0-9]{2})(\d{1,5}[A-Z]?)$/);
  if (!match) {
    return null;
  }

  return {
    code,
    name: match[1],
    num: match[2]
  };
};

const normalizeLookupDate = (rawDate = '') => {
  const value = String(rawDate || '').trim();
  if (!value) return '';

  const slashDate = value.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (slashDate) {
    return `${slashDate[1]}${slashDate[2].padStart(2, '0')}${slashDate[3].padStart(2, '0')}`;
  }

  const dashDate = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (dashDate) {
    return `${dashDate[1]}${dashDate[2].padStart(2, '0')}${dashDate[3].padStart(2, '0')}`;
  }

  if (/^\d{8}$/.test(value)) {
    return value;
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return '';

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

const formatLookupDate = (yyyymmdd = '') => {
  const match = String(yyyymmdd).match(/^\d{4}(\d{2})(\d{2})$/);
  if (!match) return '';
  return `${Number(match[1])}/${Number(match[2])}`;
};

const toTimeText = (raw) => {
  const value = String(raw || '').trim();
  if (!value) return '';

  const isoMatch = value.match(/T(\d{2}):(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}:${isoMatch[2]}`;
  }

  const meridiemMatch = value.match(/\b(\d{1,2}):(\d{2})\s*(AM|PM)\b/i);
  if (meridiemMatch) {
    const hour = Number(meridiemMatch[1]);
    const minute = meridiemMatch[2];
    const meridiem = meridiemMatch[3].toUpperCase();
    const normalizedHour = meridiem === 'PM'
      ? (hour === 12 ? 12 : hour + 12)
      : (hour === 12 ? 0 : hour);
    return `${String(normalizedHour).padStart(2, '0')}:${minute}`;
  }

  const timeMatch = value.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (timeMatch) {
    return `${String(Number(timeMatch[1])).padStart(2, '0')}:${timeMatch[2]}`;
  }

  return value;
};

const readText = (...values) => {
  const value = values.find((item) => typeof item === 'string' && item.trim());
  return value ? value.trim() : '';
};

const getField = (source, ...keys) => {
  if (!source || typeof source !== 'object') return '';
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
};

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  return value == null ? [] : [value];
};

const findLeg = (payload, key) => {
  const containers = asArray(payload);
  for (const container of containers) {
    const legs = asArray(container?.[key]);
    const leg = legs.find((item) => item && typeof item === 'object');
    if (leg) return leg;
  }
  return null;
};

const extractTerminal = (raw) => {
  const value = String(raw || '').trim();
  if (!value) return '';
  const [terminal] = value.split(/\s+-\s+/);
  return terminal?.trim() || '';
};

const buildFlightRecord = (payload, flightCode, carrierCode, lookupDate) => {
  const items = asArray(payload);
  const firstItem = items[0] || {};
  const departure = findLeg(items, 'departure');
  const arrival = findLeg(items, 'arrival');

  if (!departure && !arrival) {
    return null;
  }

  const departureTime = readText(
    departure?.offGroundTime,
    departure?.outGateTime,
    getField(departure, 'Takeoff Time:', 'Takeoff Time', 'Actual Time:', 'Actual Time'),
    getField(departure, 'Scheduled Time:', 'Scheduled Time'),
    departure?.scheduledTime,
    departure?.estimatedTime,
    departure?.departureDateTime,
    departure?.scheduledDateTime,
    departure?.estimatedDateTime
  );
  const arrivalTime = readText(
    arrival?.inGateTime,
    arrival?.onGroundTime,
    getField(arrival, 'At Gate Time:', 'At Gate Time', 'Actual Time:', 'Actual Time'),
    getField(arrival, 'Scheduled Time:', 'Scheduled Time'),
    arrival?.scheduledTime,
    arrival?.estimatedTime,
    arrival?.arrivalDateTime,
    arrival?.scheduledDateTime,
    arrival?.estimatedDateTime
  );

  return {
    code: flightCode,
    airline: readText(firstItem?.airline?.name, firstItem?.airlineName, firstItem?.airline, carrierCode),
    date: formatLookupDate(lookupDate),
    departureTime: toTimeText(departureTime),
    arrivalTime: toTimeText(arrivalTime),
    dep: readText(getField(departure, 'Airport:', 'Airport'), departure?.airportCode, departure?.airportIata, departure?.iata),
    arr: readText(getField(arrival, 'Airport:', 'Airport'), arrival?.airportCode, arrival?.airportIata, arrival?.iata),
    depTerminal: readText(extractTerminal(getField(departure, 'Terminal - Gate:', 'Terminal - Gate')), departure?.terminal),
    arrTerminal: readText(extractTerminal(getField(arrival, 'Terminal - Gate:', 'Terminal - Gate')), arrival?.terminal)
  };
};

const sendJson = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
};

const mapProviderError = (status, payload) => {
  if (status === 401 || status === 403) {
    return 'FlightAPI.io API key 無效或沒有權限，請確認 FLIGHTAPI_IO_KEY。';
  }

  if (status === 404 || status === 410) {
    return 'FlightAPI.io 查無此日期的航班資料，已保留目前手動輸入內容。';
  }

  if (status === 429) {
    return 'FlightAPI.io 免費額度或請求次數已達上限，請稍後再試或手動填寫。';
  }

  const providerMessage = payload?.message || payload?.msg || payload?.error;
  if (typeof providerMessage === 'string' && providerMessage.trim()) {
    return providerMessage.trim();
  }

  return 'FlightAPI.io 航班查詢失敗，請稍後再試或手動填寫。';
};

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendJson(res, 405, { error: 'method_not_allowed', message: '只支援 GET 查詢。' });
    return;
  }

  const apiKey = process.env.FLIGHTAPI_IO_KEY;
  if (!apiKey) {
    sendJson(res, 500, {
      error: 'missing_key',
      message: '尚未設定航班查詢 API Key：FLIGHTAPI_IO_KEY。'
    });
    return;
  }

  const parsedCode = parseFlightCode(req.query?.code);
  if (!parsedCode) {
    sendJson(res, 400, {
      error: 'invalid_flight_code',
      message: '航班代號格式不正確，請輸入例如 BR198、JX802 或 7C1101。'
    });
    return;
  }

  const date = normalizeLookupDate(req.query?.date);
  if (!date) {
    sendJson(res, 400, {
      error: 'invalid_date',
      message: '航班查詢日期格式不正確，請使用旅程日期或手動填寫。'
    });
    return;
  }

  const query = new URLSearchParams({
    num: parsedCode.num,
    name: parsedCode.name,
    date
  });

  const departureAirport = String(req.query?.depap || '').trim().toUpperCase();
  if (departureAirport) {
    query.set('depap', departureAirport);
  }

  try {
    const response = await fetch(`${FLIGHTAPI_BASE_URL}/${encodeURIComponent(apiKey)}?${query.toString()}`);
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      sendJson(res, response.status, {
        error: 'provider_error',
        message: mapProviderError(response.status, payload)
      });
      return;
    }

    const results = Array.isArray(payload) ? payload : payload?.data || payload?.results || [];
    if (!Array.isArray(results) || results.length === 0) {
      sendJson(res, 404, {
        error: 'not_found',
        message: 'FlightAPI.io 查無此日期的航班資料，已保留目前手動輸入內容。'
      });
      return;
    }

    const record = buildFlightRecord(results, parsedCode.code, parsedCode.name, date);
    if (!record) {
      sendJson(res, 502, {
        error: 'invalid_provider_payload',
        message: 'FlightAPI.io 回傳格式不完整，請手動確認航班資料。'
      });
      return;
    }

    sendJson(res, 200, {
      provider: 'flightapi.io',
      flight: record
    });
  } catch (error) {
    sendJson(res, 502, {
      error: 'provider_unavailable',
      message: error?.message || 'FlightAPI.io 暫時無法連線，請稍後再試或手動填寫。'
    });
  }
};
