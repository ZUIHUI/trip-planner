const MAX_DAYS = 30;
const MAX_DAY_EVENTS = 16;
const MAX_LIST_ITEMS = 18;
const MAX_TEXT_ITEMS = 8;

const asArray = (value) => (Array.isArray(value) ? value : []);
const asObject = (value) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}
);

export const cleanHandbookText = (value, maxLength = 160) => String(value || '')
  .replace(/[\u0000-\u001f\u007f]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, maxLength);

const normalizeTextList = (items, maxItems = MAX_TEXT_ITEMS, maxLength = 120) => asArray(items)
  .map((item) => cleanHandbookText(item, maxLength))
  .filter(Boolean)
  .slice(0, maxItems);

const normalizeMoneyTotal = (total = {}) => {
  const source = asObject(total);
  const amount = Number(source.amount);

  return {
    currency: cleanHandbookText(source.currency, 12),
    amount: Number.isFinite(amount) ? Math.round(amount) : 0
  };
};

const normalizeSchedule = (items = []) => asArray(items)
  .map((item) => {
    const source = asObject(item);
    return {
      time: cleanHandbookText(source.time, 24),
      title: cleanHandbookText(source.title, 120),
      location: cleanHandbookText(source.location, 180),
      note: cleanHandbookText(source.note, 220)
    };
  })
  .filter((item) => item.title || item.location || item.note)
  .slice(0, MAX_DAY_EVENTS);

const normalizeDay = (day = {}, index = 0) => {
  const source = asObject(day);
  const dayNumber = Number(source.day);

  return {
    day: Number.isFinite(dayNumber) && dayNumber > 0 ? Math.round(dayNumber) : index + 1,
    title: cleanHandbookText(source.title, 100) || `Day ${index + 1}`,
    date: cleanHandbookText(source.date, 60),
    intro: cleanHandbookText(source.intro, 220),
    schedule: normalizeSchedule(source.schedule),
    notes: normalizeTextList(source.notes, MAX_TEXT_ITEMS, 120)
  };
};

const normalizeFlight = (flight = {}) => {
  const source = asObject(flight);
  return {
    label: cleanHandbookText(source.label, 40),
    code: cleanHandbookText(source.code, 40),
    date: cleanHandbookText(source.date, 60),
    route: cleanHandbookText(source.route, 80),
    time: cleanHandbookText(source.time, 60),
    note: cleanHandbookText(source.note, 160)
  };
};

export const normalizeTripHandbookResponse = (payload = {}) => {
  const source = asObject(payload);
  const cover = asObject(source.cover);
  const overview = asObject(source.overview);
  const logistics = asObject(source.logistics);
  const accommodation = asObject(logistics.accommodation);
  const lists = asObject(source.lists);
  const expenses = asObject(source.expenses);

  return {
    generatedAt: cleanHandbookText(source.generatedAt, 48),
    cover: {
      title: cleanHandbookText(cover.title, 120) || '旅遊手冊',
      subtitle: cleanHandbookText(cover.subtitle, 120),
      dateText: cleanHandbookText(cover.dateText, 80),
      intro: cleanHandbookText(cover.intro, 360)
    },
    overview: {
      summary: cleanHandbookText(overview.summary, 420),
      highlights: normalizeTextList(overview.highlights, MAX_TEXT_ITEMS, 120)
    },
    days: asArray(source.days).map(normalizeDay).slice(0, MAX_DAYS),
    logistics: {
      accommodation: {
        name: cleanHandbookText(accommodation.name, 120),
        address: cleanHandbookText(accommodation.address, 180),
        note: cleanHandbookText(accommodation.note, 180)
      },
      flights: asArray(logistics.flights)
        .map(normalizeFlight)
        .filter((flight) => flight.label || flight.code || flight.date || flight.route || flight.time || flight.note)
        .slice(0, 4),
      notes: normalizeTextList(logistics.notes, MAX_TEXT_ITEMS, 120)
    },
    lists: {
      preTrip: normalizeTextList(lists.preTrip, MAX_LIST_ITEMS, 120),
      packing: normalizeTextList(lists.packing, MAX_LIST_ITEMS, 120),
      shopping: normalizeTextList(lists.shopping, MAX_LIST_ITEMS, 120)
    },
    expenses: {
      summary: cleanHandbookText(expenses.summary, 260),
      totals: asArray(expenses.totals)
        .map(normalizeMoneyTotal)
        .filter((total) => total.currency && total.amount > 0)
        .slice(0, 6)
    },
    manualChecks: normalizeTextList(source.manualChecks, MAX_TEXT_ITEMS, 140)
  };
};

export const formatHandbookMoney = ({ currency, amount } = {}) => {
  const safeCurrency = cleanHandbookText(currency, 12);
  const number = Number(amount);
  if (!safeCurrency || !Number.isFinite(number)) return '';
  return `${safeCurrency} ${Math.round(number).toLocaleString()}`;
};
