const DEFAULT_TIME_ZONE = 'Asia/Taipei';
const DEFAULT_DAILY_SUMMARY_TIME = '08:00';
const DEFAULT_EVENT_LEAD_MINUTES = 60;
const DEFAULT_FLIGHT_LEAD_HOURS = [24, 3];
const DEFAULT_CHECKLIST_LEAD_DAYS = [3, 1];
const DEFAULT_LOOK_BEHIND_MINUTES = 20;
const DEFAULT_LOOK_AHEAD_MINUTES = 0;
const MAX_AUTO_TRIP_DAYS = 45;

const NOTIFICATION_CATEGORIES = ['event', 'flight', 'checklist'];

const DEFAULT_NOTIFICATION_CATEGORIES = Object.freeze({
  event: true,
  flight: true,
  checklist: true
});

const DEFAULT_NOTIFICATION_LEAD_TIMES = Object.freeze({
  eventMinutes: DEFAULT_EVENT_LEAD_MINUTES,
  flightHours: DEFAULT_FLIGHT_LEAD_HOURS,
  checklistDays: DEFAULT_CHECKLIST_LEAD_DAYS
});

const asArray = (value) => (Array.isArray(value) ? value : []);
const asObject = (value) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}
);
const cleanString = (value, fallback = '') => (typeof value === 'string' ? value.trim() : fallback);
const pad2 = (value) => String(value).padStart(2, '0');

const normalizeCategories = (categories = {}) => {
  const source = asObject(categories);
  return NOTIFICATION_CATEGORIES.reduce((acc, category) => {
    acc[category] = source[category] !== false;
    return acc;
  }, {});
};

const normalizeTimeZone = (value = DEFAULT_TIME_ZONE) => {
  const timeZone = cleanString(value, DEFAULT_TIME_ZONE) || DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
};

const normalizeTimeText = (value = '') => {
  const match = cleanString(value).match(/^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d(?:\.\d+)?)?$/);
  if (!match) return '';
  return `${pad2(Number(match[1]))}:${match[2]}`;
};

const toValidIsoDate = (year, month, day) => {
  if (!Number.isInteger(year) || year < 1900 || year > 2200) return '';
  if (!Number.isInteger(month) || month < 1 || month > 12) return '';
  if (!Number.isInteger(day) || day < 1 || day > 31) return '';

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return '';
  }

  return `${year}-${pad2(month)}-${pad2(day)}`;
};

const getIsoYear = (isoDate = '') => {
  const match = cleanString(isoDate).match(/^(\d{4})-/);
  return match ? Number(match[1]) : null;
};

const parseDateText = (value = '', fallbackYear = null) => {
  const text = cleanString(value);
  if (!text) return '';

  const isoMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    return toValidIsoDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  const monthDayMatch = text.match(/^(\d{1,2})[/-](\d{1,2})$/);
  if (monthDayMatch && Number.isInteger(fallbackYear)) {
    return toValidIsoDate(fallbackYear, Number(monthDayMatch[1]), Number(monthDayMatch[2]));
  }

  return '';
};

const addDaysIso = (isoDate, dayOffset) => {
  const parsed = parseDateText(isoDate);
  if (!parsed) return '';
  const [year, month, day] = parsed.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + Number(dayOffset || 0)));
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
};

const diffDaysInclusive = (startIso, endIso) => {
  const start = parseDateText(startIso);
  const end = parseDateText(endIso);
  if (!start || !end) return 0;
  const [startYear, startMonth, startDay] = start.split('-').map(Number);
  const [endYear, endMonth, endDay] = end.split('-').map(Number);
  const startMs = Date.UTC(startYear, startMonth - 1, startDay);
  const endMs = Date.UTC(endYear, endMonth - 1, endDay);
  const diff = Math.floor((endMs - startMs) / (24 * 60 * 60 * 1000)) + 1;
  return diff > 0 ? Math.min(diff, MAX_AUTO_TRIP_DAYS) : 0;
};

const getTripDayIsoDate = (rangeStart, dayNumber) => {
  const startIso = parseDateText(rangeStart);
  const safeDayNumber = Number(dayNumber);
  if (!startIso || !Number.isFinite(safeDayNumber) || safeDayNumber < 1) return '';
  return addDaysIso(startIso, safeDayNumber - 1);
};

const getFormatter = (timeZone) => new Intl.DateTimeFormat('en-US', {
  timeZone,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});

const getZonedParts = (date, timeZone) => {
  const parts = getFormatter(timeZone).formatToParts(date);
  return parts.reduce((acc, part) => {
    if (part.type !== 'literal') {
      acc[part.type] = Number(part.value);
    }
    return acc;
  }, {});
};

const getTimeZoneOffsetMs = (date, timeZone) => {
  const parts = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return asUtc - date.getTime();
};

const zonedDateTimeToUtcMs = ({ date, time, timeZone }) => {
  const isoDate = parseDateText(date);
  const timeText = normalizeTimeText(time);
  const safeTimeZone = normalizeTimeZone(timeZone);
  if (!isoDate || !timeText) return null;

  const [year, month, day] = isoDate.split('-').map(Number);
  const [hour, minute] = timeText.split(':').map(Number);
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const firstOffset = getTimeZoneOffsetMs(new Date(utcGuess), safeTimeZone);
  let utcMs = utcGuess - firstOffset;
  const secondOffset = getTimeZoneOffsetMs(new Date(utcMs), safeTimeZone);
  if (firstOffset !== secondOffset) {
    utcMs = utcGuess - secondOffset;
  }
  return utcMs;
};

const getDetailDocument = (details = [], id = '') => {
  const safeId = cleanString(id);
  return asArray(details).find((detail) => (
    cleanString(detail?.id || detail?.section) === safeId
  )) || {};
};

const normalizeTripDetails = ({ trip = {}, details = [] } = {}) => {
  const source = asObject(trip);
  const rootDetails = asObject(source.tripDetails);
  const rootMeta = asObject(source.meta);
  const rootLogistics = asObject(source.logistics);
  const rootFinance = asObject(source.finance);
  const meta = getDetailDocument(details, 'meta');
  const logistics = getDetailDocument(details, 'logistics');
  const finance = getDetailDocument(details, 'finance');
  const dateRange = {
    ...asObject(rootDetails.dateRange || rootMeta.dateRange),
    ...asObject(meta.dateRange)
  };

  return {
    title: cleanString(meta.title || rootDetails.title || rootMeta.title || source.title, 'Trip Planner'),
    dates: cleanString(meta.dates || rootDetails.dates || rootMeta.dates),
    dateRange: {
      start: parseDateText(dateRange.start),
      end: parseDateText(dateRange.end)
    },
    accommodation: asObject(logistics.accommodation || rootDetails.accommodation || rootLogistics.accommodation),
    flights: asObject(logistics.flights || rootDetails.flights || rootLogistics.flights),
    budget: asObject(finance.budget || rootDetails.budget || rootFinance.budget)
  };
};

const normalizeDays = ({ trip = {}, details = [], days = [] } = {}) => {
  const tripDetails = normalizeTripDetails({ trip, details });
  const startIso = tripDetails.dateRange.start;
  const endIso = tripDetails.dateRange.end;
  const fallbackYear = getIsoYear(startIso);
  const byDayNumber = new Map();

  asArray(trip.itinerary).forEach((day, index) => {
    const dayNumber = Number(day?.day || day?.dayNumber || index + 1);
    if (!Number.isFinite(dayNumber) || dayNumber < 1) return;
    byDayNumber.set(dayNumber, {
      id: cleanString(day?.id, `day-${dayNumber}`),
      dayNumber,
      title: cleanString(day?.title, `Day ${dayNumber}`),
      date: cleanString(day?.date),
      isoDate: getTripDayIsoDate(startIso, dayNumber) || parseDateText(day?.date, fallbackYear),
      events: asArray(day?.events)
    });
  });

  asArray(days).forEach((day) => {
    const dayNumber = Number(day?.dayNumber || day?.day);
    if (!Number.isFinite(dayNumber) || dayNumber < 1) return;
    const previous = byDayNumber.get(dayNumber) || {};
    byDayNumber.set(dayNumber, {
      ...previous,
      id: cleanString(day?.id, `day-${dayNumber}`),
      dayNumber,
      title: cleanString(day?.title, previous.title || `Day ${dayNumber}`),
      date: cleanString(day?.date || day?.isoDate, previous.date || ''),
      isoDate: getTripDayIsoDate(startIso, dayNumber)
        || parseDateText(day?.date || day?.isoDate, fallbackYear)
        || previous.isoDate
        || '',
      events: asArray(previous.events)
    });
  });

  if (!byDayNumber.size && startIso && endIso) {
    const dayCount = diffDaysInclusive(startIso, endIso);
    for (let index = 0; index < dayCount; index += 1) {
      const dayNumber = index + 1;
      byDayNumber.set(dayNumber, {
        id: `day-${dayNumber}`,
        dayNumber,
        title: `Day ${dayNumber}`,
        date: addDaysIso(startIso, index),
        isoDate: addDaysIso(startIso, index),
        events: []
      });
    }
  }

  return Array.from(byDayNumber.values())
    .filter((day) => day.isoDate)
    .sort((a, b) => a.dayNumber - b.dayNumber);
};

const normalizeEvents = ({ trip = {}, details = [], days = [], events = [] } = {}) => {
  const tripDetails = normalizeTripDetails({ trip, details });
  const startIso = tripDetails.dateRange.start;
  const rootEvents = [];

  asArray(trip.itinerary).forEach((day, dayIndex) => {
    const dayNumber = Number(day?.day || day?.dayNumber || dayIndex + 1);
    asArray(day?.events).forEach((event, eventIndex) => {
      rootEvents.push({
        ...asObject(event),
        id: cleanString(event?.id, `root-${dayNumber}-${eventIndex + 1}`),
        dayNumber,
        orderKey: Number(event?.orderKey || (eventIndex + 1) * 1000)
      });
    });
  });

  const activeById = new Map();
  const deletedIds = new Set();
  asArray(rootEvents).forEach((event) => activeById.set(cleanString(event.id), event));

  asArray(events).forEach((event) => {
    const eventId = cleanString(event?.id);
    if (!eventId) return;
    if (event?.deleted) {
      deletedIds.add(eventId);
      activeById.delete(eventId);
      return;
    }
    activeById.set(eventId, asObject(event));
    deletedIds.delete(eventId);
  });

  const dayDates = new Map(normalizeDays({ trip, details, days }).map((day) => [day.dayNumber, day.isoDate]));

  return Array.from(activeById.values())
    .filter((event) => !deletedIds.has(cleanString(event?.id)))
    .map((event) => {
      const dayNumber = Number(event?.dayNumber || event?.day || 1);
      return {
        id: cleanString(event?.id),
        dayNumber,
        isoDate: dayDates.get(dayNumber) || getTripDayIsoDate(startIso, dayNumber),
        time: normalizeTimeText(event?.time || event?.startTime),
        title: cleanString(event?.title || event?.name, '行程提醒'),
        location: cleanString(event?.location || event?.locationPlace?.name || event?.locationPlace?.address),
        orderKey: Number(event?.orderKey || 1000)
      };
    })
    .filter((event) => event.id && event.isoDate && event.time)
    .sort((a, b) => {
      const dayDiff = a.dayNumber - b.dayNumber;
      if (dayDiff !== 0) return dayDiff;
      const timeDiff = a.time.localeCompare(b.time);
      if (timeDiff !== 0) return timeDiff;
      return a.orderKey - b.orderKey;
    });
};

const normalizeChecklistItems = ({ trip = {}, checklistItems = [] } = {}) => {
  const rootItems = [
    ...asArray(trip?.checklists?.preTrip).map((item, index) => ({
      ...asObject(item),
      id: cleanString(item?.id, `preTrip-${index + 1}`),
      listId: 'preTrip'
    })),
    ...asArray(trip?.checklists?.packing).map((item, index) => ({
      ...asObject(item),
      id: cleanString(item?.id, `packing-${index + 1}`),
      listId: 'packing'
    }))
  ];
  const activeById = new Map();
  const deletedIds = new Set();
  rootItems.forEach((item) => activeById.set(cleanString(item.id), item));

  asArray(checklistItems).forEach((item) => {
    const itemId = cleanString(item?.id);
    if (!itemId) return;
    if (item?.deleted) {
      deletedIds.add(itemId);
      activeById.delete(itemId);
      return;
    }
    activeById.set(itemId, asObject(item));
    deletedIds.delete(itemId);
  });

  return Array.from(activeById.values())
    .filter((item) => !deletedIds.has(cleanString(item?.id)))
    .map((item) => ({
      id: cleanString(item?.id),
      listId: cleanString(item?.listId) === 'packing' ? 'packing' : 'preTrip',
      text: cleanString(item?.text || item?.name, '待辦事項'),
      done: Boolean(item?.done)
    }));
};

const isDueInWindow = ({ dueAtMs, nowMs, lookBehindMinutes, lookAheadMinutes }) => {
  if (!Number.isFinite(dueAtMs)) return false;
  const startMs = nowMs - (Number(lookBehindMinutes) || 0) * 60 * 1000;
  const endMs = nowMs + (Number(lookAheadMinutes) || 0) * 60 * 1000;
  return dueAtMs >= startMs && dueAtMs <= endMs;
};

const toDueAt = (ms) => new Date(ms).toISOString();

const buildTripUrl = (tripId) => `/trip/${encodeURIComponent(cleanString(tripId))}`;

const makeCandidate = ({
  tripId,
  category,
  dedupeKey,
  dueAtMs,
  title,
  body,
  url
}) => ({
  tripId: cleanString(tripId),
  category,
  dedupeId: `${category}:${cleanString(tripId)}:${dedupeKey}`,
  dueAt: toDueAt(dueAtMs),
  title,
  body,
  url: url || buildTripUrl(tripId),
  tag: `trip-${cleanString(tripId)}-${category}`
});

const buildTripNotificationCandidates = ({
  tripId,
  trip = {},
  details = [],
  days = [],
  events = [],
  checklistItems = [],
  preference = {},
  now = new Date(),
  timeZone,
  lookBehindMinutes = DEFAULT_LOOK_BEHIND_MINUTES,
  lookAheadMinutes = DEFAULT_LOOK_AHEAD_MINUTES
} = {}) => {
  const safeTripId = cleanString(tripId || trip?.id);
  if (!safeTripId || preference?.enabled === false) return [];

  const categories = normalizeCategories(preference?.categories);
  const leadTimes = {
    ...DEFAULT_NOTIFICATION_LEAD_TIMES,
    ...asObject(preference?.leadTimes)
  };
  const safeTimeZone = normalizeTimeZone(timeZone || preference?.timezone);
  const nowDate = now instanceof Date ? now : new Date(now);
  const nowMs = nowDate.getTime();
  if (!Number.isFinite(nowMs)) return [];

  const tripDetails = normalizeTripDetails({ trip, details });
  const normalizedEvents = normalizeEvents({ trip, details, days, events });
  const normalizedChecklistItems = normalizeChecklistItems({ trip, checklistItems });
  const candidates = [];
  const dueInWindow = (dueAtMs) => isDueInWindow({
    dueAtMs,
    nowMs,
    lookBehindMinutes,
    lookAheadMinutes
  });

  if (categories.event) {
    const leadMinutes = Number(leadTimes.eventMinutes) || DEFAULT_EVENT_LEAD_MINUTES;
    normalizedEvents.forEach((event) => {
      const eventStartMs = zonedDateTimeToUtcMs({
        date: event.isoDate,
        time: event.time,
        timeZone: safeTimeZone
      });
      const dueAtMs = Number.isFinite(eventStartMs) ? eventStartMs - leadMinutes * 60 * 1000 : null;
      if (!dueInWindow(dueAtMs)) return;
      candidates.push(makeCandidate({
        tripId: safeTripId,
        category: 'event',
        dedupeKey: `${event.id}:${leadMinutes}`,
        dueAtMs,
        title: `${leadMinutes} 分鐘後：${event.title}`,
        body: event.location || '行程即將開始'
      }));
    });
  }

  if (categories.flight) {
    const fallbackYear = getIsoYear(tripDetails.dateRange.start);
    const flightHours = asArray(leadTimes.flightHours).length
      ? asArray(leadTimes.flightHours)
      : DEFAULT_FLIGHT_LEAD_HOURS;
    Object.entries(asObject(tripDetails.flights)).forEach(([direction, flight]) => {
      const source = asObject(flight);
      const flightDate = parseDateText(source.date, fallbackYear);
      const departureTime = normalizeTimeText(source.departureTime || source.time);
      if (!flightDate || !departureTime) return;
      const departureMs = zonedDateTimeToUtcMs({
        date: flightDate,
        time: departureTime,
        timeZone: safeTimeZone
      });
      if (!Number.isFinite(departureMs)) return;
      const directionLabel = direction === 'inbound' ? '回程' : '去程';
      flightHours.forEach((leadHourValue) => {
        const leadHours = Number(leadHourValue);
        if (!Number.isFinite(leadHours) || leadHours <= 0) return;
        const dueAtMs = departureMs - leadHours * 60 * 60 * 1000;
        if (!dueInWindow(dueAtMs)) return;
        const code = cleanString(source.code || source.flightCode);
        candidates.push(makeCandidate({
          tripId: safeTripId,
          category: 'flight',
          dedupeKey: `${direction}:${flightDate}:${departureTime}:${leadHours}`,
          dueAtMs,
          title: `${directionLabel}航班 ${leadHours} 小時前提醒`,
          body: `${code || '航班'} 即將起飛`
        }));
      });
    });
  }

  if (categories.checklist) {
    const tripStartIso = tripDetails.dateRange.start;
    const remainingCount = normalizedChecklistItems.filter((item) => !item.done).length;
    const checklistDays = asArray(leadTimes.checklistDays).length
      ? asArray(leadTimes.checklistDays)
      : DEFAULT_CHECKLIST_LEAD_DAYS;
    if (tripStartIso && remainingCount > 0) {
      checklistDays.forEach((leadDayValue) => {
        const leadDays = Number(leadDayValue);
        if (!Number.isFinite(leadDays) || leadDays < 0) return;
        const localDate = addDaysIso(tripStartIso, -leadDays);
        const dueAtMs = zonedDateTimeToUtcMs({
          date: localDate,
          time: DEFAULT_DAILY_SUMMARY_TIME,
          timeZone: safeTimeZone
        });
        if (!dueInWindow(dueAtMs)) return;
        candidates.push(makeCandidate({
          tripId: safeTripId,
          category: 'checklist',
          dedupeKey: `${tripStartIso}:${leadDays}`,
          dueAtMs,
          title: `${tripDetails.title} 出發前待辦`,
          body: `還有 ${remainingCount} 項待辦或打包項目未完成`
        }));
      });
    }
  }

  return candidates.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
};

const buildWebPushPayload = (candidate = {}) => JSON.stringify({
  title: cleanString(candidate.title, 'Trip Planner'),
  body: cleanString(candidate.body, '你有一則旅程提醒。'),
  icon: '/icon-192.png',
  badge: '/icon-192.png',
  tag: cleanString(candidate.tag, cleanString(candidate.dedupeId)),
  data: {
    url: cleanString(candidate.url, '/'),
    tripId: cleanString(candidate.tripId),
    category: cleanString(candidate.category),
    dedupeId: cleanString(candidate.dedupeId)
  }
});

module.exports = {
  DEFAULT_NOTIFICATION_CATEGORIES,
  DEFAULT_NOTIFICATION_LEAD_TIMES,
  DEFAULT_TIME_ZONE,
  buildTripNotificationCandidates,
  buildWebPushPayload,
  normalizeCategories,
  normalizeTimeText,
  normalizeTimeZone,
  parseDateText,
  zonedDateTimeToUtcMs
};
