import { normalizePlaceText } from './placeText';

export const normalizeEventTime = (value) => {
  const text = String(value || '').trim();
  const match = text.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d(?:\.\d+)?)?$/);
  if (!match) return text;
  return `${String(match[1]).padStart(2, '0')}:${match[2]}`;
};

export const formatEventTime = (event, fallback = '--:--') => (
  normalizeEventTime(event?.time) || fallback
);

export const getEventDestination = (event) => {
  const locationPlace = event?.locationPlace;
  if (normalizePlaceText(locationPlace)) return locationPlace;
  if (normalizePlaceText(event?.location)) return event.location;
  return '';
};

export const getEventLocationText = (event) => {
  if (!event) return '';
  const destination = getEventDestination(event);
  return normalizePlaceText(destination);
};

export const getEventMemoText = (event) => {
  const firstMemo = Array.isArray(event?.memos) ? event.memos[0] : null;
  const memoText = typeof firstMemo === 'string'
    ? firstMemo
    : firstMemo?.text || firstMemo?.note || '';
  return event?.desc || memoText || '';
};

export const sortEventsByTime = (events = []) => (
  [...events].sort((a, b) => normalizeEventTime(a.time).localeCompare(normalizeEventTime(b.time)))
);

export const getLocalIsoDate = (date = new Date()) => (
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
);

export const normalizeIsoDate = (value) => {
  const text = String(value || '').trim();
  const match = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (!match) return '';
  return `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`;
};

export const getTripDayIsoDate = (startDate = '', selectedDay = 1) => {
  const normalizedStartDate = normalizeIsoDate(startDate);
  const match = normalizedStartDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  date.setDate(date.getDate() + Math.max(0, Number(selectedDay || 1) - 1));
  return getLocalIsoDate(date);
};

export const pickNextEvent = (events = [], now = new Date(), eventDate = '') => {
  const sortedEvents = sortEventsByTime(events);
  if (!sortedEvents.length) return null;

  const normalizedEventDate = normalizeIsoDate(eventDate);
  if (normalizedEventDate && normalizedEventDate !== getLocalIsoDate(now)) {
    return sortedEvents[0];
  }

  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return sortedEvents.find((event) => normalizeEventTime(event.time) > currentTime) || sortedEvents[0];
};

export const readEventCost = (event) => {
  const rawAmount = event?.cost?.amount ?? event?.cost;
  const amount = Number(rawAmount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return {
    amount,
    currency: event?.cost?.currency || event?.currency || 'JPY'
  };
};

export const formatCurrencyAmount = ({ amount, currency }) => {
  const formattedAmount = amount.toLocaleString();
  return currency === 'TWD' ? `NT$${formattedAmount}` : `¥${formattedAmount}`;
};

export const formatEventCost = (event, fallback = '未設定') => {
  const cost = readEventCost(event);
  return cost ? formatCurrencyAmount(cost) : fallback;
};

export const formatDailyCost = (events = [], fallback = '未設定') => {
  const totals = events.reduce((acc, event) => {
    const cost = readEventCost(event);
    if (!cost) return acc;
    acc[cost.currency] = (acc[cost.currency] || 0) + cost.amount;
    return acc;
  }, {});

  const parts = Object.entries(totals).map(([currency, amount]) =>
    formatCurrencyAmount({ amount, currency })
  );

  return parts.length > 0 ? parts.join(' / ') : fallback;
};
