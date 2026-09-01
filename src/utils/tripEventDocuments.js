import { normalizeEventTime } from './tripEvents';

const ORDER_STEP = 1000;

const asArray = (value) => (Array.isArray(value) ? value : []);
const asObject = (value) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}
);
const cleanString = (value, fallback = '') => (typeof value === 'string' ? value : fallback);
const normalizeId = (value) => String(value ?? '');

export const makeTripEventId = () => `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const readEventOrderKey = (event, fallback = null) => {
  const value = Number(event?.orderKey);
  if (Number.isFinite(value)) return value;
  return fallback;
};

export const getEventOrderKeyAtIndex = (event, index = 0) => (
  readEventOrderKey(event, (index + 1) * ORDER_STEP)
);

export const getOrderKeyBetween = (previousEvent = null, nextEvent = null, fallbackIndex = 0) => {
  const previousKey = readEventOrderKey(previousEvent);
  const nextKey = readEventOrderKey(nextEvent);

  if (Number.isFinite(previousKey) && Number.isFinite(nextKey) && nextKey > previousKey) {
    return previousKey + ((nextKey - previousKey) / 2);
  }

  if (Number.isFinite(previousKey)) return previousKey + ORDER_STEP;
  if (Number.isFinite(nextKey)) return nextKey - ORDER_STEP;
  return (fallbackIndex + 1) * ORDER_STEP;
};

export const getAppendOrderKey = (events = []) => {
  const sourceEvents = asArray(events);
  const lastEvent = sourceEvents[sourceEvents.length - 1] || null;
  return getOrderKeyBetween(lastEvent, null, sourceEvents.length);
};

export const normalizeTripEventDocumentForApp = (document = {}) => {
  const source = asObject(document);
  const cost = source.cost && typeof source.cost === 'object' ? source.cost : null;
  const id = normalizeId(source.id);
  const dayNumber = Number(source.dayNumber || source.day);
  const orderKey = Number(source.orderKey);

  return {
    ...source,
    id: id || makeTripEventId(),
    dayNumber: Number.isFinite(dayNumber) ? dayNumber : 1,
    orderKey: Number.isFinite(orderKey) ? orderKey : ORDER_STEP,
    time: normalizeEventTime(source.time || source.startTime),
    type: cleanString(source.type, 'sightseeing'),
    title: cleanString(source.title, '行程'),
    desc: cleanString(source.desc || source.description),
    location: typeof source.location === 'string'
      ? source.location
      : cleanString(source.location?.address || source.location?.name || source.locationPlace?.address || source.locationPlace?.name),
    locationPlace: asObject(source.locationPlace || source.location),
    urgent: Boolean(source.urgent),
    transport: asObject(source.transport),
    cost: cost ? cost.amount : source.cost,
    currency: cost ? cost.currency : source.currency,
    url: cleanString(source.url),
    memos: asArray(source.memos),
    deleted: Boolean(source.deleted)
  };
};

export const buildTripEventDocument = ({
  event = {},
  dayNumber = 1,
  orderKey = ORDER_STEP,
  user = null,
  clientId = '',
  deleted = false,
  now = new Date().toISOString()
} = {}) => {
  const source = normalizeTripEventDocumentForApp({
    ...event,
    dayNumber,
    orderKey,
    deleted
  });

  return {
    id: source.id,
    schemaVersion: 1,
    dayNumber: Number(source.dayNumber),
    orderKey: Number(source.orderKey),
    time: normalizeEventTime(source.time),
    type: cleanString(source.type, 'sightseeing'),
    title: cleanString(source.title, '行程'),
    desc: cleanString(source.desc),
    location: cleanString(source.location),
    locationPlace: asObject(source.locationPlace),
    urgent: Boolean(source.urgent),
    transport: asObject(source.transport),
    cost: source.cost ?? '',
    currency: cleanString(source.currency, 'JPY'),
    url: cleanString(source.url),
    memos: asArray(source.memos),
    deleted: Boolean(deleted),
    updatedAt: now,
    updatedByUid: cleanString(user?.uid),
    updatedByClientId: cleanString(clientId)
  };
};

export const applyTripEventDocumentsToItinerary = (itinerary = [], eventDocuments = []) => {
  const days = asArray(itinerary).map((day) => ({
    ...day,
    events: asArray(day?.events).map((event, index) => ({
      ...event,
      orderKey: getEventOrderKeyAtIndex(event, index)
    }))
  }));
  const documents = asArray(eventDocuments).map(normalizeTripEventDocumentForApp);
  if (!documents.length) return days;

  const activeDocumentsById = new Map();
  const deletedIds = new Set();

  documents.forEach((event) => {
    const eventId = normalizeId(event.id);
    if (!eventId) return;
    if (event.deleted) {
      deletedIds.add(eventId);
      activeDocumentsById.delete(eventId);
    } else {
      activeDocumentsById.set(eventId, event);
      deletedIds.delete(eventId);
    }
  });

  const nextDays = days.map((day) => ({
    ...day,
    events: asArray(day.events).filter((event) => {
      const eventId = normalizeId(event?.id);
      return eventId && !deletedIds.has(eventId) && !activeDocumentsById.has(eventId);
    })
  }));

  activeDocumentsById.forEach((event) => {
    const targetDayNumber = Number(event.dayNumber);
    const targetDay = nextDays.find((day) => Number(day?.day) === targetDayNumber);
    if (!targetDay) return;
    targetDay.events = [...asArray(targetDay.events), event];
  });

  return nextDays.map((day) => ({
    ...day,
    events: asArray(day.events)
      .slice()
      .sort((a, b) => {
        const orderDiff = getEventOrderKeyAtIndex(a, 0) - getEventOrderKeyAtIndex(b, 0);
        if (orderDiff !== 0) return orderDiff;
        return normalizeEventTime(a.time).localeCompare(normalizeEventTime(b.time));
      })
  }));
};

export const countTripEventsWithDocuments = (itinerary = [], eventDocuments = []) => {
  const baseItinerary = asArray(itinerary);
  const documents = asArray(eventDocuments).map(normalizeTripEventDocumentForApp);

  if (!documents.length) {
    return baseItinerary.reduce((total, day) => total + asArray(day?.events).length, 0);
  }

  const overlaidItinerary = applyTripEventDocumentsToItinerary(baseItinerary, documents);
  const countedIds = new Set();
  let total = 0;

  overlaidItinerary.forEach((day) => {
    asArray(day?.events).forEach((event) => {
      const eventId = normalizeId(event?.id);
      if (eventId) countedIds.add(eventId);
      total += 1;
    });
  });

  documents.forEach((event) => {
    const eventId = normalizeId(event?.id);
    if (!event.deleted && eventId && !countedIds.has(eventId)) {
      countedIds.add(eventId);
      total += 1;
    }
  });

  return total;
};
