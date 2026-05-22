export const getEventDestination = (event) => event?.locationPlace || event?.location || '';

export const getEventLocationText = (event) => {
  if (!event) return '';
  const destination = getEventDestination(event);
  if (typeof destination === 'string') return destination;
  return destination?.address || destination?.name || destination?.formattedAddress || destination?.label || '';
};

export const getEventMemoText = (event) => {
  const firstMemo = Array.isArray(event?.memos) ? event.memos[0] : null;
  const memoText = typeof firstMemo === 'string'
    ? firstMemo
    : firstMemo?.text || firstMemo?.note || '';
  return event?.desc || memoText || '';
};

export const sortEventsByTime = (events = []) => (
  [...events].sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')))
);

export const pickNextEvent = (events = [], now = new Date()) => {
  const sortedEvents = sortEventsByTime(events);
  if (!sortedEvents.length) return null;

  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return sortedEvents.find((event) => String(event.time || '') > currentTime) || sortedEvents[0];
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
