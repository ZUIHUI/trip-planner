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

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value.replaceAll('-', '');
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

const readText = (...values) => {
  const value = values.find((item) => typeof item === 'string' && item.trim());
  return value ? value.trim() : '';
};

const findLeg = (payload, key) => {
  const items = Array.isArray(payload) ? payload : [payload];
  return items
    .map((item) => item?.[key])
    .find((item) => item && typeof item === 'object') || null;
};

const buildFlightRecord = (payload, flightCode, carrierCode) => {
  const departure = findLeg(payload, 'departure');
  const arrival = findLeg(payload, 'arrival');

  if (!departure && !arrival) {
    return null;
  }

  const departureIso = readText(
    departure?.departureDateTime,
    departure?.scheduledDateTime,
    departure?.estimatedDateTime
  );
  const arrivalIso = readText(
    arrival?.arrivalDateTime,
    arrival?.scheduledDateTime,
    arrival?.estimatedDateTime
  );

  return {
    code: flightCode,
    airline: readText(payload?.airline?.name, payload?.airlineName, payload?.airline, carrierCode),
    date: toDateText(departureIso || arrivalIso),
    departureTime: toTimeText(departureIso),
    arrivalTime: toTimeText(arrivalIso),
    dep: readText(departure?.airportCode, departure?.airportIata, departure?.iata),
    arr: readText(arrival?.airportCode, arrival?.airportIata, arrival?.iata),
    depTerminal: readText(departure?.terminal),
    arrTerminal: readText(arrival?.terminal)
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

    const record = buildFlightRecord(results, parsedCode.code, parsedCode.name);
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
