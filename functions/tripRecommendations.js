const MAX_RECOMMENDATIONS = 5;
const MAX_PROMPT_DAYS = 30;
const MAX_PROMPT_EVENTS = 80;
const MAX_PROMPT_PLACE_IDEAS = 12;
const MAX_PROMPT_CHECKLIST_ITEMS = 12;
const MAX_EXTERNAL_PLACE_CANDIDATES = 8;
const MAX_EXTERNAL_PLACE_TYPES = 8;
const MAX_GOOGLE_PLACE_SEARCH_QUERIES = 5;
const VALID_MODES = new Set(['placeIdeas', 'dayPlan']);
const VALID_EVENT_TYPES = new Set([
  'flight',
  'transport',
  'accommodation',
  'sightseeing',
  'food',
  'shopping',
  'activity',
  'other'
]);

const recommendationResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['headline', 'companionLine', 'recommendations'],
  properties: {
    headline: { type: 'string' },
    companionLine: { type: 'string' },
    recommendations: {
      type: 'array',
      maxItems: MAX_RECOMMENDATIONS,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'id',
          'kind',
          'title',
          'locationText',
          'suggestedDay',
          'time',
          'durationMinutes',
          'reason',
          'caution',
          'tags',
          'source',
          'googlePlace',
          'placeDraft',
          'eventDraft'
        ],
        properties: {
          id: { type: 'string' },
          kind: { type: 'string', enum: ['place', 'event'] },
          title: { type: 'string' },
          locationText: { type: 'string' },
          suggestedDay: { type: 'number' },
          time: { type: 'string' },
          durationMinutes: { type: 'number' },
          reason: { type: 'string' },
          caution: { type: 'string' },
          tags: {
            type: 'array',
            maxItems: 4,
            items: { type: 'string' }
          },
          source: { type: 'string', enum: ['ai', 'google_places'] },
          googlePlace: {
            type: 'object',
            additionalProperties: false,
            required: ['placeId', 'name', 'address', 'lat', 'lng', 'types'],
            properties: {
              placeId: { type: 'string' },
              name: { type: 'string' },
              address: { type: 'string' },
              lat: { type: ['number', 'null'] },
              lng: { type: ['number', 'null'] },
              types: {
                type: 'array',
                maxItems: MAX_EXTERNAL_PLACE_TYPES,
                items: { type: 'string' }
              }
            }
          },
          placeDraft: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'address', 'note'],
            properties: {
              name: { type: 'string' },
              address: { type: 'string' },
              note: { type: 'string' }
            }
          },
          eventDraft: {
            type: 'object',
            additionalProperties: false,
            required: ['title', 'location', 'time', 'type', 'desc', 'durationMinutes'],
            properties: {
              title: { type: 'string' },
              location: { type: 'string' },
              time: { type: 'string' },
              type: {
                type: 'string',
                enum: Array.from(VALID_EVENT_TYPES)
              },
              desc: { type: 'string' },
              durationMinutes: { type: 'number' }
            }
          }
        }
      }
    }
  }
};

const asArray = (value) => (Array.isArray(value) ? value : []);
const asObject = (value) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}
);

const cleanText = (value, maxLength = 160) => String(value || '')
  .replace(/[\u0000-\u001f\u007f]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, maxLength);

const readNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const readPositiveNumber = (value, fallback = 0) => {
  const number = readNumber(value, fallback);
  return number > 0 ? number : fallback;
};

const readCoordinate = (value, maxAbs) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.abs(number) <= maxAbs ? number : null;
};

const normalizeMode = (mode) => {
  const normalized = cleanText(mode, 24);
  return VALID_MODES.has(normalized) ? normalized : '';
};

const normalizeGooglePlaceTypes = (types) => asArray(types)
  .map((type) => cleanText(type, 48))
  .filter(Boolean)
  .slice(0, MAX_EXTERNAL_PLACE_TYPES);

const normalizeGooglePlacePayload = (place = {}) => {
  const source = asObject(place);
  return {
    placeId: cleanText(source.placeId || source.place_id, 180),
    name: cleanText(source.name, 160),
    address: cleanText(source.address || source.formatted_address, 220),
    lat: readCoordinate(source.lat, 90),
    lng: readCoordinate(source.lng, 180),
    types: normalizeGooglePlaceTypes(source.types)
  };
};

const normalizeExternalGoogleCandidate = (candidate = {}, index = 0) => {
  const source = asObject(candidate);
  const googlePlace = normalizeGooglePlacePayload(source.googlePlace || source);
  const name = googlePlace.name || cleanText(source.title || source.mainText, 160);
  const address = googlePlace.address || cleanText(source.locationText || source.description, 220);

  if (!googlePlace.placeId && !name && !address) return null;

  return {
    id: cleanText(source.id, 80) || `google-candidate-${index + 1}`,
    source: 'google_places',
    query: cleanText(source.query, 180),
    placeId: googlePlace.placeId,
    name,
    address,
    lat: googlePlace.lat,
    lng: googlePlace.lng,
    types: googlePlace.types
  };
};

const uniqueTexts = (values = []) => {
  const seen = new Set();
  return asArray(values)
    .map((value) => cleanText(value, 120))
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const normalizeTime = (value) => {
  const match = cleanText(value, 16).match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return '';
  return `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`;
};

const normalizeVoteValue = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return 1;
  if (number > 0) return 1;
  if (number < 0) return -1;
  return 0;
};

const getVoteScore = (votes = []) => asArray(votes).reduce(
  (total, vote) => total + normalizeVoteValue(vote?.value),
  0
);

const documentIdNumber = (document = {}) => {
  const direct = Number(document.dayNumber || document.day);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const match = String(document.id || '').match(/(\d+)/);
  return match ? Number(match[1]) : null;
};

const getDetailsById = (details = []) => asArray(details).reduce((acc, detail) => {
  const id = cleanText(detail?.id || detail?.section, 40);
  if (id) acc[id] = asObject(detail);
  return acc;
}, {});

const normalizeTripDetails = ({ trip = {}, details = [] } = {}) => {
  const detailsById = getDetailsById(details);
  const rootDetails = asObject(trip.tripDetails);
  const meta = {
    ...asObject(trip.meta),
    ...rootDetails,
    ...asObject(detailsById.meta)
  };
  const logistics = {
    accommodation: asObject(trip.logistics?.accommodation || rootDetails.accommodation),
    flights: asObject(trip.logistics?.flights || rootDetails.flights),
    ...asObject(detailsById.logistics)
  };
  const finance = {
    budget: asObject(trip.finance?.budget || rootDetails.budget),
    ...asObject(detailsById.finance)
  };

  return {
    title: cleanText(meta.title, 120),
    dates: cleanText(meta.dates, 80),
    dateRange: {
      start: cleanText(meta.dateRange?.start, 32),
      end: cleanText(meta.dateRange?.end, 32)
    },
    accommodation: {
      name: cleanText(logistics.accommodation?.name, 120),
      address: cleanText(logistics.accommodation?.address, 180)
    },
    flights: {
      outbound: summarizeFlight(logistics.flights?.outbound),
      inbound: summarizeFlight(logistics.flights?.inbound)
    },
    budget: {
      total: readPositiveNumber(finance.budget?.total, 0),
      currency: cleanText(finance.budget?.currency || 'JPY', 12)
    }
  };
};

const summarizeFlight = (flight = {}) => {
  const source = asObject(flight);
  return {
    code: cleanText(source.code, 24),
    date: cleanText(source.date, 40),
    dep: cleanText(source.dep, 24),
    arr: cleanText(source.arr, 24),
    departureTime: cleanText(source.departureTime, 16),
    arrivalTime: cleanText(source.arrivalTime, 16)
  };
};

const normalizeEventForPrompt = (event = {}) => {
  const source = asObject(event);
  const locationPlace = asObject(source.locationPlace);
  const costAmount = readPositiveNumber(source.cost?.amount ?? source.cost, 0);

  return {
    title: cleanText(source.title, 120),
    time: normalizeTime(source.time),
    type: VALID_EVENT_TYPES.has(source.type) ? source.type : 'other',
    location: cleanText(
      locationPlace.name || locationPlace.address || source.location,
      180
    ),
    cost: costAmount > 0
      ? {
          amount: costAmount,
          currency: cleanText(source.cost?.currency || source.currency || 'JPY', 12)
        }
      : null
  };
};

const normalizeItinerary = ({ trip = {}, days = [], events = [] } = {}) => {
  const rootDays = asArray(trip.itinerary).map((day, index) => ({
    day: documentIdNumber(day) || index + 1,
    title: cleanText(day?.title, 100) || `Day ${index + 1}`,
    date: cleanText(day?.date, 60),
    orderKey: readNumber(day?.orderKey, (index + 1) * 1000),
    events: asArray(day?.events).map(normalizeEventForPrompt).filter((event) => event.title)
  }));
  const daysByNumber = new Map(rootDays.map((day) => [day.day, day]));

  asArray(days)
    .filter((day) => !day?.deleted)
    .forEach((day, index) => {
      const dayNumber = documentIdNumber(day);
      if (!dayNumber) return;
      const existing = daysByNumber.get(dayNumber) || {
        day: dayNumber,
        title: `Day ${dayNumber}`,
        date: '',
        orderKey: (index + 1) * 1000,
        events: []
      };
      daysByNumber.set(dayNumber, {
        ...existing,
        title: cleanText(day.title, 100) || existing.title,
        date: cleanText(day.date, 60) || existing.date,
        orderKey: readNumber(day.orderKey, existing.orderKey)
      });
    });

  const activeEventDocuments = asArray(events)
    .filter((event) => !event?.deleted)
    .map((event, index) => ({
      ...normalizeEventForPrompt(event),
      dayNumber: documentIdNumber(event),
      orderKey: readNumber(event.orderKey, (index + 1) * 1000)
    }))
    .filter((event) => event.dayNumber && event.title)
    .slice(0, MAX_PROMPT_EVENTS);

  if (activeEventDocuments.length) {
    daysByNumber.forEach((day) => {
      day.events = [];
    });
    activeEventDocuments.forEach((event) => {
      const existing = daysByNumber.get(event.dayNumber) || {
        day: event.dayNumber,
        title: `Day ${event.dayNumber}`,
        date: '',
        orderKey: event.dayNumber * 1000,
        events: []
      };
      daysByNumber.set(event.dayNumber, {
        ...existing,
        events: [
          ...asArray(existing.events),
          {
            title: event.title,
            time: event.time,
            type: event.type,
            location: event.location,
            cost: event.cost,
            orderKey: event.orderKey
          }
        ]
      });
    });
  }

  return Array.from(daysByNumber.values())
    .filter((day) => Number.isFinite(day.day) && day.day > 0)
    .sort((a, b) => a.day - b.day)
    .slice(0, MAX_PROMPT_DAYS)
    .map((day) => ({
      day: day.day,
      title: cleanText(day.title, 100) || `Day ${day.day}`,
      date: cleanText(day.date, 60),
      events: asArray(day.events)
        .slice()
        .sort((a, b) => {
          const timeDiff = cleanText(a.time).localeCompare(cleanText(b.time));
          if (timeDiff !== 0) return timeDiff;
          return readNumber(a.orderKey, 0) - readNumber(b.orderKey, 0);
        })
        .slice(0, 12)
        .map((event) => ({
          title: event.title,
          time: event.time,
          type: event.type,
          location: event.location,
          cost: event.cost
        }))
    }));
};

const normalizePlaceIdeas = ({ trip = {}, placeIdeas = [] } = {}) => {
  const rootIdeas = asArray(trip.planning?.placePool || trip.placePool);
  const combined = [
    ...rootIdeas,
    ...asArray(placeIdeas)
  ];
  const byId = new Map();

  combined.forEach((place, index) => {
    if (place?.deleted) return;
    const id = cleanText(place?.id || `place-${index}`, 120);
    if (!id) return;
    byId.set(id, {
      id,
      name: cleanText(place.name || place.address, 120),
      address: cleanText(place.address || place.name, 180),
      status: cleanText(place.status || 'idea', 32),
      plannedDay: readPositiveNumber(place.plannedDay, 0) || null,
      voteScore: getVoteScore(place.votes),
      voteCount: asArray(place.votes).length
    });
  });

  return Array.from(byId.values())
    .filter((place) => place.name || place.address)
    .sort((a, b) => {
      const scoreDiff = b.voteScore - a.voteScore;
      if (scoreDiff !== 0) return scoreDiff;
      return cleanText(a.name).localeCompare(cleanText(b.name));
    })
    .slice(0, MAX_PROMPT_PLACE_IDEAS);
};

const normalizeChecklistSummary = ({ trip = {}, checklistItems = [] } = {}) => {
  const rootPreTrip = asArray(trip.checklists?.preTrip);
  const rootPacking = asArray(trip.checklists?.packing);
  const combined = [
    ...rootPreTrip.map((item) => ({ ...item, listId: 'preTrip' })),
    ...rootPacking.map((item) => ({ ...item, listId: 'packing' })),
    ...asArray(checklistItems)
  ];
  const byId = new Map();

  combined.forEach((item, index) => {
    if (item?.deleted) return;
    const id = cleanText(item?.id || `checklist-${index}`, 120);
    if (!id) return;
    byId.set(id, {
      id,
      listId: item.listId === 'packing' ? 'packing' : 'preTrip',
      text: cleanText(item.text || item.name, 120),
      category: cleanText(item.category || 'other', 60),
      day: readPositiveNumber(item.day, 0) || null,
      done: Boolean(item.done)
    });
  });

  const remaining = Array.from(byId.values()).filter((item) => item.text && !item.done);
  const preTripRemaining = remaining.filter((item) => item.listId !== 'packing');
  const packingRemaining = remaining.filter((item) => item.listId === 'packing');

  return {
    preTripRemaining: preTripRemaining.length,
    packingRemaining: packingRemaining.length,
    samples: remaining.slice(0, MAX_PROMPT_CHECKLIST_ITEMS).map((item) => ({
      listId: item.listId,
      text: item.text,
      category: item.category,
      day: item.day
    }))
  };
};

const normalizeExpenseSummary = ({ trip = {}, expenses = [] } = {}) => {
  const combined = [
    ...asArray(trip.finance?.expenses || trip.expenses),
    ...asArray(expenses)
  ].filter((expense) => !expense?.deleted);
  const totals = {};

  combined.forEach((expense) => {
    const amount = readPositiveNumber(expense.amount, 0);
    if (!amount) return;
    const currency = cleanText(expense.currency || 'JPY', 12);
    totals[currency] = (totals[currency] || 0) + amount;
  });

  return {
    count: combined.length,
    totalByCurrency: Object.entries(totals)
      .map(([currency, amount]) => ({ currency, amount: Math.round(amount) }))
      .slice(0, 4)
  };
};

const clampDayToValidRange = (day, validDayNumbers = [], fallbackDay = 1) => {
  const requested = readPositiveNumber(day, 0);
  const validDays = asArray(validDayNumbers).filter((item) => Number.isFinite(item) && item > 0);
  if (validDays.includes(requested)) return requested;
  if (validDays.includes(Number(fallbackDay))) return Number(fallbackDay);
  return validDays[0] || 1;
};

const buildGooglePlaceSearchQueries = (snapshot = {}) => {
  const source = asObject(snapshot);
  const trip = asObject(source.trip);
  const accommodation = asObject(trip.accommodation);
  const itinerary = asArray(source.itinerary);
  const placeIdeas = asArray(source.placeIdeas);
  const locationTerms = uniqueTexts([
    trip.title,
    accommodation.address,
    accommodation.name,
    ...itinerary.flatMap((day) => asArray(day.events).map((event) => event.location || event.title)),
    ...placeIdeas.flatMap((place) => [place.address, place.name])
  ]);
  const primary = locationTerms[0];
  const queries = [];
  const addQuery = (query) => {
    const normalized = cleanText(query, 180);
    if (!normalized) return;
    if (queries.some((item) => item.toLowerCase() === normalized.toLowerCase())) return;
    queries.push(normalized);
  };

  if (!primary) return [];

  ['attractions', 'food', 'indoor attractions'].forEach((topic) => {
    addQuery(`${primary} ${topic}`);
  });

  locationTerms.slice(1, 4).forEach((term) => {
    addQuery(`${term} nearby attractions`);
    addQuery(`${term} restaurants`);
  });

  ['shopping', 'cafes'].forEach((topic) => {
    addQuery(`${primary} ${topic}`);
  });

  return queries.slice(0, MAX_GOOGLE_PLACE_SEARCH_QUERIES);
};

const buildTripRecommendationSnapshot = (source = {}, options = {}) => {
  const mode = normalizeMode(options.mode) || 'placeIdeas';
  const tripDetails = normalizeTripDetails(source);
  const itinerary = normalizeItinerary(source);
  const validDayNumbers = itinerary.map((day) => day.day);
  const selectedDay = clampDayToValidRange(options.selectedDay, validDayNumbers, 1);
  const externalCandidates = asArray(options.externalCandidates)
    .map(normalizeExternalGoogleCandidate)
    .filter(Boolean)
    .slice(0, MAX_EXTERNAL_PLACE_CANDIDATES);

  return {
    mode,
    selectedDay,
    validDayNumbers,
    trip: {
      title: tripDetails.title,
      dates: tripDetails.dates,
      dateRange: tripDetails.dateRange,
      dayCount: validDayNumbers.length,
      accommodation: tripDetails.accommodation,
      flights: tripDetails.flights,
      budget: tripDetails.budget
    },
    itinerary,
    placeIdeas: normalizePlaceIdeas(source),
    externalLookupStatus: cleanText(options.externalLookupStatus, 48),
    externalCandidates,
    checklists: normalizeChecklistSummary(source),
    expenses: normalizeExpenseSummary(source)
  };
};

const recommendationPrompt = ({ mode, snapshot }) => {
  const externalCandidates = asArray(snapshot?.externalCandidates);
  const modeInstruction = mode === 'dayPlan'
    ? 'Recommend concrete itinerary events for the selected day. Prefer filling gaps around existing events.'
    : (externalCandidates.length
        ? 'Recommend candidate places or experiences that fit the trip and can be added to the idea pool. Prefer the provided externalCandidates when they are relevant.'
        : 'Recommend candidate places or experiences that fit the trip and can be added to the idea pool.');
  const externalInstruction = externalCandidates.length
    ? 'externalCandidates are Google Places candidate data. If a recommendation uses one, set source to "google_places" and copy placeId, name, address, lat, lng, and types into googlePlace. They do not prove opening hours, ticket price, crowding, or live availability.'
    : 'No external place candidates are available. Set source to "ai" and return googlePlace with empty strings, null coordinates, and an empty types array.';

  return [
    modeInstruction,
    externalInstruction,
    'Use only the provided trip snapshot and externalCandidates. Do not claim you checked live availability, opening hours, prices, maps routing, or any source not present in the snapshot.',
    'Write Traditional Chinese for user-facing strings. Keep each item practical and short.',
    'If data is missing, make conservative suggestions and explain what should be checked manually.',
    'Return only JSON matching the schema.',
    JSON.stringify(snapshot)
  ].join('\n\n');
};

const parseRecommendationPayload = (payload) => {
  if (!payload) return {};
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload);
    } catch {
      return {};
    }
  }
  return asObject(payload);
};

const normalizeTags = (tags) => asArray(tags)
  .map((tag) => cleanText(tag, 24))
  .filter(Boolean)
  .slice(0, 4);

const normalizeRecommendation = (recommendation, index, context = {}) => {
  const source = asObject(recommendation);
  const placeDraft = asObject(source.placeDraft);
  const eventDraft = asObject(source.eventDraft);
  const googlePlace = normalizeGooglePlacePayload(source.googlePlace);
  const validDayNumbers = asArray(context.validDayNumbers);
  const selectedDay = clampDayToValidRange(context.selectedDay, validDayNumbers, 1);
  const suggestedDay = clampDayToValidRange(source.suggestedDay, validDayNumbers, selectedDay);
  const title = cleanText(source.title || placeDraft.name || eventDraft.title || googlePlace.name, 120);
  const locationText = cleanText(source.locationText || placeDraft.address || eventDraft.location || googlePlace.address || title, 180);
  const durationMinutes = Math.min(720, Math.max(0, Math.round(readPositiveNumber(
    source.durationMinutes || eventDraft.durationMinutes,
    0
  ))));

  if (!title && !locationText) return null;

  const kind = source.kind === 'event' || context.mode === 'dayPlan' ? 'event' : 'place';
  const eventType = VALID_EVENT_TYPES.has(eventDraft.type) ? eventDraft.type : 'sightseeing';
  const recommendationSource = (source.source === 'google_places' || googlePlace.placeId)
    ? 'google_places'
    : 'ai';

  return {
    id: cleanText(source.id, 80) || `ai-rec-${index + 1}`,
    kind,
    title: title || locationText,
    locationText,
    suggestedDay,
    time: normalizeTime(source.time || eventDraft.time),
    durationMinutes,
    reason: cleanText(source.reason, 280),
    caution: cleanText(source.caution, 220),
    tags: normalizeTags(source.tags),
    source: recommendationSource,
    googlePlace,
    placeDraft: {
      name: cleanText(placeDraft.name || googlePlace.name || title || locationText, 120),
      address: cleanText(placeDraft.address || googlePlace.address || locationText || title, 180),
      note: cleanText(placeDraft.note || source.reason, 280)
    },
    eventDraft: {
      title: cleanText(eventDraft.title || title || locationText, 120),
      location: cleanText(eventDraft.location || googlePlace.address || locationText || title, 180),
      time: normalizeTime(eventDraft.time || source.time),
      type: eventType,
      desc: cleanText(eventDraft.desc || source.reason, 320),
      durationMinutes
    }
  };
};

const normalizeRecommendationResponse = (payload, context = {}) => {
  const source = parseRecommendationPayload(payload);
  const recommendations = asArray(source.recommendations)
    .map((recommendation, index) => normalizeRecommendation(recommendation, index, context))
    .filter(Boolean)
    .slice(0, MAX_RECOMMENDATIONS);

  return {
    headline: cleanText(source.headline, 120) || 'AI 旅伴建議',
    companionLine: cleanText(source.companionLine, 180) || '我先把想法整理成可加入旅程的候選卡。',
    recommendations
  };
};

module.exports = {
  MAX_RECOMMENDATIONS,
  recommendationResponseSchema,
  buildGooglePlaceSearchQueries,
  buildTripRecommendationSnapshot,
  cleanText,
  clampDayToValidRange,
  normalizeExternalGoogleCandidate,
  normalizeMode,
  normalizeRecommendationResponse,
  recommendationPrompt
};
