import { formatDateRangeText, normalizeTripDateFields } from '../utils/tripDates';

export const TRIP_SCHEMA_VERSION = 2;

export const createEmptyItinerary = (days = 6) =>
  Array.from({ length: days }, (_, index) => ({
    id: `day-${index + 1}`,
    day: index + 1,
    date: `Day ${index + 1}`,
    title: `Day ${index + 1}`,
    events: []
  }));

export const createTripAppData = (title = '未命名旅程', days = 6) => ({
  tripDetails: {
    title,
    dates: '',
    dateRange: { start: '', end: '' },
    status: 'planning',
    coverImage: '',
    budget: { total: '', currency: 'TWD' },
    accommodation: {},
    flights: {},
    travelers: []
  },
  itinerary: createEmptyItinerary(days),
  checklists: { preTrip: [], packing: [] },
  expenses: []
});

const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
const asArray = (value) => (Array.isArray(value) ? value : []);
const cleanString = (value, fallback = '') => (typeof value === 'string' ? value : fallback);

const makeId = (prefix, fallback) => {
  if (fallback !== undefined && fallback !== null && String(fallback).trim()) {
    return String(fallback);
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const normalizeLocationForDocument = (location) => {
  if (typeof location === 'string') {
    return {
      name: location,
      address: location,
      placeId: '',
      lat: null,
      lng: null
    };
  }

  const source = asObject(location);
  const displayName = typeof source.displayName === 'object'
    ? source.displayName.text
    : source.displayName;
  const name = cleanString(source.name || source.label || source.address || displayName);

  return {
    name,
    address: cleanString(source.address || source.formattedAddress || source.formatted_address || name),
    placeId: cleanString(source.placeId || source.place_id || source.id),
    lat: typeof source.lat === 'number' ? source.lat : null,
    lng: typeof source.lng === 'number' ? source.lng : null
  };
};

const locationToAppText = (location) => {
  if (typeof location === 'string') return location;
  const source = asObject(location);
  return cleanString(source.address || source.name || source.label);
};

const normalizeCostForDocument = (event) => {
  const rawAmount = event?.cost?.amount ?? event?.cost;
  const numericAmount = Number(rawAmount);

  return {
    amount: Number.isFinite(numericAmount) ? numericAmount : 0,
    currency: cleanString(event?.cost?.currency || event?.currency, 'JPY')
  };
};

const normalizeEventForDocument = (event = {}) => {
  const source = asObject(event);

  return {
    id: makeId('event', source.id),
    startTime: cleanString(source.startTime || source.time),
    endTime: cleanString(source.endTime),
    type: cleanString(source.type, 'sightseeing'),
    title: cleanString(source.title, '未命名行程'),
    description: cleanString(source.description || source.desc),
    location: normalizeLocationForDocument(source.locationPlace || source.location),
    urgent: Boolean(source.urgent),
    transport: asObject(source.transport),
    cost: normalizeCostForDocument(source),
    url: cleanString(source.url),
    memos: asArray(source.memos)
  };
};

const normalizeEventForApp = (event = {}) => {
  const source = asObject(event);
  const cost = source.cost && typeof source.cost === 'object' ? source.cost : null;

  return {
    ...source,
    id: source.id || makeId('event', source.startTime || source.time),
    time: cleanString(source.time || source.startTime),
    type: cleanString(source.type, 'sightseeing'),
    title: cleanString(source.title, '未命名行程'),
    desc: cleanString(source.desc || source.description),
    location: locationToAppText(source.location || source.locationPlace),
    locationPlace: normalizeLocationForDocument(source.locationPlace || source.location),
    transport: asObject(source.transport),
    cost: cost ? cost.amount : source.cost,
    currency: cost ? cost.currency : source.currency,
    memos: asArray(source.memos)
  };
};

const normalizeDayForDocument = (day = {}, index = 0) => {
  const source = asObject(day);
  const dayNumber = Number(source.dayNumber || source.day || index + 1);

  return {
    id: makeId('day', source.id || dayNumber),
    dayNumber,
    date: cleanString(source.isoDate || source.date),
    weekday: cleanString(source.weekday),
    title: cleanString(source.title, `Day ${dayNumber}`),
    events: asArray(source.events).map(normalizeEventForDocument)
  };
};

const normalizeDayForApp = (day = {}, index = 0) => {
  const source = asObject(day);
  const dayNumber = Number(source.day || source.dayNumber || index + 1);

  return {
    ...source,
    id: source.id || `day-${dayNumber}`,
    day: dayNumber,
    date: cleanString(source.date || source.isoDate, `Day ${dayNumber}`),
    weekday: cleanString(source.weekday),
    title: cleanString(source.title, `Day ${dayNumber}`),
    events: asArray(source.events).map(normalizeEventForApp)
  };
};

export const normalizeTripDocumentForApp = (rawData, fallbackData = createTripAppData()) => {
  const source = asObject(rawData);
  const fallback = asObject(fallbackData);
  const fallbackDetails = asObject(fallback.tripDetails);
  const meta = asObject(source.meta);
  const logistics = asObject(source.logistics);
  const planning = asObject(source.planning);
  const finance = asObject(source.finance);

  const legacyDetails = asObject(source.tripDetails);
  const tripDetails = normalizeTripDateFields({
    ...fallbackDetails,
    ...legacyDetails,
    title: cleanString(meta.title || legacyDetails.title || fallbackDetails.title, '未命名旅程'),
    status: cleanString(meta.status || legacyDetails.status || fallbackDetails.status, 'planning'),
    coverImage: cleanString(meta.coverImage || legacyDetails.coverImage || fallbackDetails.coverImage),
    dateRange: {
      ...asObject(legacyDetails.dateRange || fallbackDetails.dateRange),
      ...asObject(meta.dateRange)
    },
    dates:
      cleanString(legacyDetails.dates) ||
      formatDateRangeText(meta.dateRange?.start || '', meta.dateRange?.end || '') ||
      cleanString(fallbackDetails.dates),
    budget: {
      ...asObject(fallbackDetails.budget),
      ...asObject(legacyDetails.budget),
      ...asObject(finance.budget)
    },
    accommodation: {
      ...asObject(fallbackDetails.accommodation),
      ...asObject(legacyDetails.accommodation),
      ...asObject(logistics.accommodation)
    },
    flights: {
      ...asObject(fallbackDetails.flights),
      ...asObject(legacyDetails.flights),
      ...asObject(logistics.flights)
    },
    travelers: asArray(logistics.travelers).length
      ? asArray(logistics.travelers)
      : asArray(legacyDetails.travelers || fallbackDetails.travelers)
  });

  const sourceItinerary = asArray(source.itineraryDays).length ? source.itineraryDays : source.itinerary;
  const itinerary = (asArray(sourceItinerary).length ? asArray(sourceItinerary) : asArray(fallback.itinerary))
    .map(normalizeDayForApp);

  return {
    ...fallback,
    ...source,
    schemaVersion: source.schemaVersion || 1,
    tripDetails,
    itinerary,
    checklists: {
      preTrip: asArray(planning.checklists?.preTrip || source.checklists?.preTrip || fallback.checklists?.preTrip),
      packing: asArray(planning.checklists?.packing || source.checklists?.packing || fallback.checklists?.packing)
    },
    expenses: asArray(finance.expenses).length ? asArray(finance.expenses) : asArray(source.expenses || fallback.expenses),
    shoppingList: planning.shoppingList || source.shoppingList,
    shoppingCategories: planning.shoppingCategories || source.shoppingCategories,
    savedAt: source.savedAt
  };
};

export const buildTripDocumentFromAppState = (tripId, appState, previousDocument = {}) => {
  const source = normalizeTripDocumentForApp(appState);
  const tripDetails = normalizeTripDateFields(source.tripDetails);
  const dateRange = asObject(tripDetails.dateRange);
  const now = new Date().toISOString();
  const previous = asObject(previousDocument);

  return {
    ...previous,
    ...source,
    id: tripId || source.id || previous.id || '',
    schemaVersion: TRIP_SCHEMA_VERSION,
    meta: {
      title: cleanString(tripDetails.title, '未命名旅程'),
      status: cleanString(tripDetails.status, 'planning'),
      dateRange: {
        start: cleanString(dateRange.start),
        end: cleanString(dateRange.end)
      },
      coverImage: cleanString(tripDetails.coverImage),
      createdAt: previous.meta?.createdAt || previous.createdAt || source.createdAt || now,
      updatedAt: now
    },
    logistics: {
      accommodation: asObject(tripDetails.accommodation),
      flights: asObject(tripDetails.flights),
      travelers: asArray(tripDetails.travelers)
    },
    planning: {
      checklists: {
        preTrip: asArray(source.checklists?.preTrip),
        packing: asArray(source.checklists?.packing)
      },
      shoppingList: source.shoppingList || previous.planning?.shoppingList || previous.shoppingList || null,
      shoppingCategories: source.shoppingCategories || previous.planning?.shoppingCategories || previous.shoppingCategories || null
    },
    finance: {
      budget: asObject(tripDetails.budget),
      expenses: asArray(source.expenses)
    },
    itineraryDays: asArray(source.itinerary).map(normalizeDayForDocument),
    // Compatibility fields keep old clients and localStorage snapshots readable.
    tripDetails,
    itinerary: asArray(source.itinerary).map(normalizeDayForApp),
    checklists: {
      preTrip: asArray(source.checklists?.preTrip),
      packing: asArray(source.checklists?.packing)
    },
    expenses: asArray(source.expenses),
    savedAt: now,
    updatedAt: now,
    createdAt: previous.createdAt || source.createdAt || now
  };
};

export const buildTripListItem = (tripId, rawData = {}) => {
  const normalized = normalizeTripDocumentForApp(rawData);
  const details = normalized.tripDetails;
  const updatedAt =
    rawData?.meta?.updatedAt ||
    rawData?.updatedAt ||
    rawData?.savedAt ||
    rawData?.createdAt ||
    new Date().toISOString();

  return {
    id: tripId,
    title: details.title || '未命名旅程',
    status: details.status || 'planning',
    coverImage: details.coverImage || '',
    dateRange: details.dateRange || { start: '', end: '' },
    eventCount: normalized.itinerary.reduce((total, day) => total + asArray(day.events).length, 0),
    updatedAt,
    createdAt: rawData?.meta?.createdAt || rawData?.createdAt || updatedAt,
    schemaVersion: rawData?.schemaVersion || 1
  };
};
