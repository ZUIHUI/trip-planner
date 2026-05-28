const asArray = (value) => (Array.isArray(value) ? value : []);
const asObject = (value) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}
);
const cleanString = (value, fallback = '') => (typeof value === 'string' ? value : fallback);

export const makeTripDayDocumentId = (dayNumber) => `day-${Number(dayNumber) || 1}`;

export const normalizeTripDayDocumentForApp = (document = {}) => {
  const source = asObject(document);
  const dayNumber = Number(source.dayNumber || source.day);
  const normalizedDayNumber = Number.isFinite(dayNumber) && dayNumber > 0 ? dayNumber : 1;

  return {
    id: cleanString(source.id, makeTripDayDocumentId(normalizedDayNumber)),
    schemaVersion: Number(source.schemaVersion) || 1,
    dayNumber: normalizedDayNumber,
    title: cleanString(source.title, `Day ${normalizedDayNumber}`),
    date: cleanString(source.date || source.isoDate, `Day ${normalizedDayNumber}`),
    weekday: cleanString(source.weekday),
    updatedAt: cleanString(source.updatedAt),
    updatedByUid: cleanString(source.updatedByUid),
    updatedByClientId: cleanString(source.updatedByClientId)
  };
};

export const buildTripDayDocument = ({
  day = {},
  dayNumber = 1,
  user = null,
  clientId = '',
  now = new Date().toISOString()
} = {}) => {
  const normalized = normalizeTripDayDocumentForApp({
    ...day,
    dayNumber
  });

  return {
    id: makeTripDayDocumentId(normalized.dayNumber),
    schemaVersion: 1,
    dayNumber: normalized.dayNumber,
    title: normalized.title,
    date: normalized.date,
    weekday: normalized.weekday,
    updatedAt: now,
    updatedByUid: cleanString(user?.uid),
    updatedByClientId: cleanString(clientId)
  };
};

export const applyTripDayDocumentsToItinerary = (itinerary = [], dayDocuments = []) => {
  const documentsByDay = new Map(
    asArray(dayDocuments)
      .map(normalizeTripDayDocumentForApp)
      .map((document) => [Number(document.dayNumber), document])
  );

  if (!documentsByDay.size) return itinerary;

  return asArray(itinerary).map((day, index) => {
    const dayNumber = Number(day?.day || day?.dayNumber || index + 1);
    const document = documentsByDay.get(dayNumber);
    if (!document) return day;

    return {
      ...day,
      id: day?.id || document.id,
      day: dayNumber,
      title: document.title,
      date: document.date,
      weekday: document.weekday,
      events: asArray(day?.events)
    };
  });
};

export const buildRootItineraryMirror = (itinerary = []) => (
  asArray(itinerary).map((day, index) => {
    const dayNumber = Number(day?.day || day?.dayNumber || index + 1);
    return {
      ...day,
      id: day?.id || makeTripDayDocumentId(dayNumber),
      day: dayNumber,
      title: cleanString(day?.title, `Day ${dayNumber}`),
      date: cleanString(day?.date || day?.isoDate, `Day ${dayNumber}`),
      weekday: cleanString(day?.weekday),
      events: asArray(day?.events)
    };
  })
);

export const buildRootItineraryDaysMirror = (itinerary = []) => (
  buildRootItineraryMirror(itinerary).map((day) => ({
    id: day.id,
    dayNumber: day.day,
    isoDate: day.date,
    weekday: day.weekday,
    title: day.title,
    events: asArray(day.events)
  }))
);
