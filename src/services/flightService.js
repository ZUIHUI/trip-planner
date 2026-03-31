const AVIATIONSTACK_API_URL = 'https://api.aviationstack.com/v1/flights';

const normalizeFlightCode = (rawCode = '') => rawCode.trim().toUpperCase().replace(/\s+/g, '');

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
    arr: item?.arrival?.iata || ''
  };
};

export const lookupFlightByCode = async (rawCode) => {
  const code = normalizeFlightCode(rawCode);
  if (!code) throw new Error('請先輸入航班代號');

  const accessKey = import.meta.env.VITE_AVIATIONSTACK_API_KEY;
  if (!accessKey) {
    throw new Error('尚未設定航班查詢 API Key（VITE_AVIATIONSTACK_API_KEY）');
  }

  const query = new URLSearchParams({
    access_key: accessKey,
    flight_iata: code,
    limit: '1'
  });

  const response = await fetch(`${AVIATIONSTACK_API_URL}?${query.toString()}`);
  if (!response.ok) throw new Error('航班查詢失敗，請稍後再試');

  const payload = await response.json();
  if (payload?.error) {
    const apiMessage = payload.error?.info || payload.error?.message || '無法取得航班資料';
    throw new Error(apiMessage);
  }

  const first = Array.isArray(payload?.data) ? payload.data[0] : null;
  if (!first) throw new Error('查無此航班或目前無可用資料');

  return buildFlightRecord(first, code);
};
