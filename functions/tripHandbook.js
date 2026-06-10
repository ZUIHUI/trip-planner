const MAX_HANDBOOK_DAYS = 30;
const MAX_HANDBOOK_EVENTS = 120;
const MAX_DAY_EVENTS = 16;
const MAX_LIST_ITEMS = 18;
const MAX_SHOPPING_ITEMS = 18;
const MAX_EXPENSES = 80;
const MAX_PLACE_IDEAS = 18;
const MAX_FLIGHTS = 4;
const MAX_TEXT_ITEMS = 8;

const handbookResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['cover', 'overview', 'days', 'logistics', 'lists', 'expenses', 'manualChecks'],
  properties: {
    cover: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'subtitle', 'dateText', 'intro'],
      properties: {
        title: { type: 'string' },
        subtitle: { type: 'string' },
        dateText: { type: 'string' },
        intro: { type: 'string' }
      }
    },
    overview: {
      type: 'object',
      additionalProperties: false,
      required: ['summary', 'highlights'],
      properties: {
        summary: { type: 'string' },
        highlights: {
          type: 'array',
          maxItems: MAX_TEXT_ITEMS,
          items: { type: 'string' }
        }
      }
    },
    days: {
      type: 'array',
      maxItems: MAX_HANDBOOK_DAYS,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['day', 'title', 'date', 'intro', 'schedule', 'notes'],
        properties: {
          day: { type: 'number' },
          title: { type: 'string' },
          date: { type: 'string' },
          intro: { type: 'string' },
          schedule: {
            type: 'array',
            maxItems: MAX_DAY_EVENTS,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['time', 'title', 'location', 'note'],
              properties: {
                time: { type: 'string' },
                title: { type: 'string' },
                location: { type: 'string' },
                note: { type: 'string' }
              }
            }
          },
          notes: {
            type: 'array',
            maxItems: MAX_TEXT_ITEMS,
            items: { type: 'string' }
          }
        }
      }
    },
    logistics: {
      type: 'object',
      additionalProperties: false,
      required: ['accommodation', 'flights', 'notes'],
      properties: {
        accommodation: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'address', 'note'],
          properties: {
            name: { type: 'string' },
            address: { type: 'string' },
            note: { type: 'string' }
          }
        },
        flights: {
          type: 'array',
          maxItems: MAX_FLIGHTS,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['label', 'code', 'date', 'route', 'time', 'note'],
            properties: {
              label: { type: 'string' },
              code: { type: 'string' },
              date: { type: 'string' },
              route: { type: 'string' },
              time: { type: 'string' },
              note: { type: 'string' }
            }
          }
        },
        notes: {
          type: 'array',
          maxItems: MAX_TEXT_ITEMS,
          items: { type: 'string' }
        }
      }
    },
    lists: {
      type: 'object',
      additionalProperties: false,
      required: ['preTrip', 'packing', 'shopping'],
      properties: {
        preTrip: {
          type: 'array',
          maxItems: MAX_LIST_ITEMS,
          items: { type: 'string' }
        },
        packing: {
          type: 'array',
          maxItems: MAX_LIST_ITEMS,
          items: { type: 'string' }
        },
        shopping: {
          type: 'array',
          maxItems: MAX_SHOPPING_ITEMS,
          items: { type: 'string' }
        }
      }
    },
    expenses: {
      type: 'object',
      additionalProperties: false,
      required: ['summary', 'totals'],
      properties: {
        summary: { type: 'string' },
        totals: {
          type: 'array',
          maxItems: 6,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['currency', 'amount'],
            properties: {
              currency: { type: 'string' },
              amount: { type: 'number' }
            }
          }
        }
      }
    },
    manualChecks: {
      type: 'array',
      maxItems: MAX_TEXT_ITEMS,
      items: { type: 'string' }
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

const normalizeTime = (value) => {
  const match = cleanText(value, 16).match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return cleanText(value, 16);
  return `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`;
};

const documentIdNumber = (document = {}, fallback = null) => {
  const direct = Number(document.dayNumber || document.day);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const match = String(document.id || document.dayId || '').match(/(\d+)/);
  return match ? Number(match[1]) : fallback;
};

const getDetailsById = (details = []) => asArray(details).reduce((acc, detail) => {
  const id = cleanText(detail?.id || detail?.section, 40);
  if (id) acc[id] = asObject(detail);
  return acc;
}, {});

const getLocationText = (location, fallback = '') => {
  if (typeof location === 'string') return cleanText(location, 180);
  const source = asObject(location);
  return cleanText(
    source.address ||
    source.formattedAddress ||
    source.formatted_address ||
    source.name ||
    source.label ||
    fallback,
    180
  );
};

const normalizeFlight = (flight = {}, label = '') => {
  const source = asObject(flight);
  const dep = cleanText(source.dep || source.departureAirport || source.from, 32);
  const arr = cleanText(source.arr || source.arrivalAirport || source.to, 32);
  const departureTime = normalizeTime(source.departureTime || source.time);
  const arrivalTime = normalizeTime(source.arrivalTime);

  return {
    label,
    code: cleanText(source.code || source.flightNumber, 32),
    date: cleanText(source.date, 48),
    route: [dep, arr].filter(Boolean).join(' -> '),
    time: [departureTime, arrivalTime].filter(Boolean).join(' - ')
  };
};

const normalizeTripDetails = ({ trip = {}, details = [] } = {}) => {
  const detailsById = getDetailsById(details);
  const rootDetails = asObject(trip.tripDetails);
  const meta = {
    ...rootDetails,
    ...asObject(trip.meta),
    ...asObject(detailsById.meta)
  };
  const logisticsRoot = asObject(trip.logistics);
  const logisticsDetail = asObject(detailsById.logistics);
  const financeRoot = asObject(trip.finance);
  const financeDetail = asObject(detailsById.finance);
  const dateRange = {
    ...asObject(rootDetails.dateRange),
    ...asObject(trip.meta?.dateRange),
    ...asObject(detailsById.meta?.dateRange)
  };
  const accommodation = {
    ...asObject(rootDetails.accommodation),
    ...asObject(logisticsRoot.accommodation),
    ...asObject(logisticsDetail.accommodation)
  };
  const flights = {
    ...asObject(rootDetails.flights),
    ...asObject(logisticsRoot.flights),
    ...asObject(logisticsDetail.flights)
  };
  const budget = {
    ...asObject(rootDetails.budget),
    ...asObject(financeRoot.budget),
    ...asObject(financeDetail.budget)
  };

  return {
    title: cleanText(meta.title, 120) || '未命名旅程',
    dates: cleanText(
      meta.dates ||
      [dateRange.start, dateRange.end].filter(Boolean).join(' - '),
      100
    ),
    dateRange: {
      start: cleanText(dateRange.start, 32),
      end: cleanText(dateRange.end, 32)
    },
    accommodation: {
      name: cleanText(accommodation.name, 120),
      address: cleanText(accommodation.address, 180)
    },
    flights: {
      outbound: normalizeFlight(flights.outbound, '去程'),
      inbound: normalizeFlight(flights.inbound, '回程')
    },
    budget: {
      total: readPositiveNumber(budget.total, 0),
      currency: cleanText(budget.currency || 'TWD', 12)
    }
  };
};

const normalizeEventForSnapshot = (event = {}, index = 0) => {
  const source = asObject(event);
  const costAmount = readPositiveNumber(source.cost?.amount ?? source.cost, 0);
  const costCurrency = cleanText(source.cost?.currency || source.currency, 12);

  return {
    time: normalizeTime(source.time || source.startTime),
    title: cleanText(source.title || source.name, 120),
    type: cleanText(source.type || 'other', 32),
    location: getLocationText(source.locationPlace || source.location),
    note: cleanText(source.desc || source.description, 220),
    cost: costAmount > 0
      ? {
          amount: costAmount,
          currency: costCurrency || 'TWD'
        }
      : null,
    orderKey: readNumber(source.orderKey, (index + 1) * 1000)
  };
};

const normalizeItinerary = ({ trip = {}, days = [], events = [] } = {}) => {
  const rootSourceDays = asArray(trip.itineraryDays).length ? trip.itineraryDays : trip.itinerary;
  const baseDays = asArray(rootSourceDays).map((day, index) => {
    const dayNumber = documentIdNumber(day, index + 1) || index + 1;
    return {
      day: dayNumber,
      title: cleanText(day?.title, 100) || `Day ${dayNumber}`,
      date: cleanText(day?.date || day?.isoDate, 60),
      orderKey: readNumber(day?.orderKey, (index + 1) * 1000),
      events: asArray(day?.events)
        .filter((event) => !event?.deleted)
        .map(normalizeEventForSnapshot)
        .filter((event) => event.title)
    };
  });
  const daysByNumber = new Map(baseDays.map((day) => [day.day, day]));

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
        date: cleanText(day.date || day.isoDate, 60) || existing.date,
        orderKey: readNumber(day.orderKey, existing.orderKey)
      });
    });

  const eventDocuments = asArray(events)
    .filter((event) => !event?.deleted)
    .map((event, index) => ({
      ...normalizeEventForSnapshot(event, index),
      day: documentIdNumber(event, 1)
    }))
    .filter((event) => event.day && event.title)
    .slice(0, MAX_HANDBOOK_EVENTS);

  if (eventDocuments.length) {
    daysByNumber.forEach((day) => {
      day.events = [];
    });
    eventDocuments.forEach((event) => {
      const existing = daysByNumber.get(event.day) || {
        day: event.day,
        title: `Day ${event.day}`,
        date: '',
        orderKey: event.day * 1000,
        events: []
      };
      daysByNumber.set(event.day, {
        ...existing,
        events: [
          ...asArray(existing.events),
          {
            time: event.time,
            title: event.title,
            type: event.type,
            location: event.location,
            note: event.note,
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
    .slice(0, MAX_HANDBOOK_DAYS)
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
        .slice(0, MAX_DAY_EVENTS)
        .map((event) => ({
          time: event.time,
          title: event.title,
          type: event.type,
          location: event.location,
          note: event.note,
          cost: event.cost
        }))
    }));
};

const normalizeChecklistItems = ({ trip = {}, checklistItems = [] } = {}) => {
  const rootChecklists = asObject(trip.checklists || trip.planning?.checklists);
  const combined = [
    ...asArray(rootChecklists.preTrip).map((item) => ({ ...asObject(item), listId: 'preTrip' })),
    ...asArray(rootChecklists.packing).map((item) => ({ ...asObject(item), listId: 'packing' })),
    ...asArray(checklistItems)
  ];
  const byId = new Map();

  combined.forEach((item, index) => {
    const source = asObject(item);
    if (source.deleted) return;
    const text = cleanText(source.text || source.name, 120);
    if (!text) return;
    byId.set(cleanText(source.id, 120) || `checklist-${index}`, {
      text,
      listId: source.listId === 'packing' ? 'packing' : 'preTrip',
      category: cleanText(source.category, 60),
      day: readPositiveNumber(source.day, 0) || null,
      done: Boolean(source.done),
      orderKey: readNumber(source.orderKey, (index + 1) * 1000)
    });
  });

  const items = Array.from(byId.values()).sort((a, b) => a.orderKey - b.orderKey);

  return {
    preTrip: items
      .filter((item) => item.listId !== 'packing')
      .slice(0, MAX_LIST_ITEMS)
      .map(({ orderKey, ...item }) => item),
    packing: items
      .filter((item) => item.listId === 'packing')
      .slice(0, MAX_LIST_ITEMS)
      .map(({ orderKey, ...item }) => item)
  };
};

const normalizeShoppingItems = ({ trip = {}, shoppingItems = [] } = {}) => {
  const combined = [
    ...asArray(trip.planning?.shoppingList || trip.shoppingList),
    ...asArray(shoppingItems)
  ];
  const byId = new Map();

  combined.forEach((item, index) => {
    const source = asObject(item);
    if (source.deleted) return;
    const name = cleanText(source.name || source.text, 120);
    if (!name) return;
    byId.set(cleanText(source.id, 120) || `shopping-${index}`, {
      name,
      category: cleanText(source.category, 60),
      shop: cleanText(source.shop, 100),
      quantity: readPositiveNumber(source.quantity, 1),
      notes: cleanText(source.notes || source.note, 160),
      purchased: Boolean(source.purchased),
      orderKey: readNumber(source.orderKey, (index + 1) * 1000)
    });
  });

  return Array.from(byId.values())
    .sort((a, b) => a.orderKey - b.orderKey)
    .slice(0, MAX_SHOPPING_ITEMS)
    .map(({ orderKey, ...item }) => item);
};

const normalizeExpenses = ({ trip = {}, expenses = [] } = {}) => {
  const combined = [
    ...asArray(trip.finance?.expenses || trip.expenses),
    ...asArray(expenses)
  ];
  const byId = new Map();

  combined.forEach((expense, index) => {
    const source = asObject(expense);
    if (source.deleted) return;
    const amount = readPositiveNumber(source.amount, 0);
    if (!amount) return;
    byId.set(cleanText(source.id, 120) || `expense-${index}`, {
      title: cleanText(source.title || source.name || source.category, 120),
      amount,
      currency: cleanText(source.currency || 'TWD', 12),
      date: cleanText(source.date, 48),
      category: cleanText(source.category, 60),
      note: cleanText(source.note, 160),
      orderKey: readNumber(source.orderKey, (index + 1) * 1000)
    });
  });

  const items = Array.from(byId.values())
    .sort((a, b) => a.orderKey - b.orderKey)
    .slice(0, MAX_EXPENSES);
  const totalByCurrency = {};

  items.forEach((item) => {
    totalByCurrency[item.currency] = (totalByCurrency[item.currency] || 0) + item.amount;
  });

  return {
    count: items.length,
    items: items.map(({ orderKey, ...item }) => item),
    totalByCurrency: Object.entries(totalByCurrency)
      .map(([currency, amount]) => ({ currency, amount: Math.round(amount) }))
      .slice(0, 6)
  };
};

const normalizePlaceIdeas = ({ trip = {}, placeIdeas = [] } = {}) => {
  const combined = [
    ...asArray(trip.planning?.placePool || trip.placePool),
    ...asArray(placeIdeas)
  ];
  const byId = new Map();

  combined.forEach((place, index) => {
    const source = asObject(place);
    if (source.deleted) return;
    const name = cleanText(source.name || source.address, 120);
    const address = cleanText(source.address || source.name, 180);
    if (!name && !address) return;
    byId.set(cleanText(source.id, 120) || `place-${index}`, {
      name,
      address,
      note: cleanText(source.note || source.notes, 160),
      status: cleanText(source.status || 'idea', 32),
      plannedDay: readPositiveNumber(source.plannedDay, 0) || null
    });
  });

  return Array.from(byId.values()).slice(0, MAX_PLACE_IDEAS);
};

const buildTripHandbookSnapshot = (source = {}) => {
  const tripDetails = normalizeTripDetails(source);
  const itinerary = normalizeItinerary(source);
  const checklists = normalizeChecklistItems(source);
  const shopping = normalizeShoppingItems(source);
  const expenses = normalizeExpenses(source);
  const placeIdeas = normalizePlaceIdeas(source);
  const eventCount = itinerary.reduce((total, day) => total + asArray(day.events).length, 0);

  return {
    trip: {
      title: tripDetails.title,
      dates: tripDetails.dates,
      dateRange: tripDetails.dateRange,
      dayCount: itinerary.length,
      eventCount,
      accommodation: tripDetails.accommodation,
      flights: [
        tripDetails.flights.outbound,
        tripDetails.flights.inbound
      ].filter((flight) => flight.code || flight.date || flight.route || flight.time),
      budget: tripDetails.budget
    },
    itinerary,
    placeIdeas,
    checklists,
    shopping,
    expenses
  };
};

const handbookPrompt = ({ snapshot }) => [
  'You are creating a compact Traditional Chinese travel handbook inside a collaborative trip planner app.',
  'Use only the provided trip snapshot. Do not add new attractions, restaurants, live weather, opening hours, prices, tickets, transit duration, or claims from outside data.',
  'If a detail is missing, write a cautious manual-check reminder instead of inventing it.',
  'Write concise Traditional Chinese. Make it feel like a polished travel booklet, but stay practical and faithful to the source data.',
  'For schedule notes, summarize the existing event note/location/type/cost only when present.',
  'Return only JSON matching the schema.',
  JSON.stringify(snapshot)
].join('\n\n');

const normalizeTextList = (items, maxItems = MAX_TEXT_ITEMS, maxLength = 120) => asArray(items)
  .map((item) => cleanText(item, maxLength))
  .filter(Boolean)
  .slice(0, maxItems);

const normalizeSchedule = (schedule = []) => asArray(schedule)
  .map((item) => {
    const source = asObject(item);
    return {
      time: normalizeTime(source.time),
      title: cleanText(source.title, 120),
      location: cleanText(source.location, 180),
      note: cleanText(source.note, 220)
    };
  })
  .filter((item) => item.title || item.location || item.note)
  .slice(0, MAX_DAY_EVENTS);

const normalizeHandbookFlight = (flight = {}) => {
  const source = asObject(flight);
  return {
    label: cleanText(source.label, 40),
    code: cleanText(source.code, 40),
    date: cleanText(source.date, 60),
    route: cleanText(source.route, 80),
    time: cleanText(source.time, 60),
    note: cleanText(source.note, 160)
  };
};

const normalizeHandbookVisuals = (visuals = {}) => {
  const source = asObject(visuals);
  return {
    coverImageStatus: cleanText(source.coverImageStatus, 40),
    coverImageUrl: cleanText(source.coverImageUrl, 2000),
    coverImagePath: cleanText(source.coverImagePath, 260),
    coverImageContentType: cleanText(source.coverImageContentType, 60),
    coverImageAlt: cleanText(source.coverImageAlt, 140),
    coverImageModel: cleanText(source.coverImageModel, 80),
    coverImageDataUrl: cleanText(source.coverImageDataUrl, 2 * 1024 * 1024),
    coverImageGeneratedAt: cleanText(source.coverImageGeneratedAt, 48)
  };
};

const normalizeHandbookResponse = (payload = {}, snapshot = {}) => {
  const source = asObject(payload);
  const cover = asObject(source.cover);
  const overview = asObject(source.overview);
  const logistics = asObject(source.logistics);
  const lists = asObject(source.lists);
  const expenses = asObject(source.expenses);
  const snapshotTrip = asObject(snapshot.trip);
  const snapshotDays = asArray(snapshot.itinerary);
  const generatedDays = asArray(source.days);
  const days = (generatedDays.length ? generatedDays : snapshotDays).map((day, index) => {
    const sourceDay = asObject(day);
    const snapshotDay = snapshotDays[index] || {};
    const schedule = normalizeSchedule(sourceDay.schedule).length
      ? normalizeSchedule(sourceDay.schedule)
      : normalizeSchedule(asArray(snapshotDay.events).map((event) => ({
          time: event.time,
          title: event.title,
          location: event.location,
          note: event.note
        })));

    return {
      day: readPositiveNumber(sourceDay.day || snapshotDay.day, index + 1),
      title: cleanText(sourceDay.title || snapshotDay.title || `Day ${index + 1}`, 100),
      date: cleanText(sourceDay.date || snapshotDay.date, 60),
      intro: cleanText(sourceDay.intro, 220) || (schedule.length ? '依照目前行程安排整理如下。' : '這一天尚未安排明確行程。'),
      schedule,
      notes: normalizeTextList(sourceDay.notes, MAX_TEXT_ITEMS, 120)
    };
  }).slice(0, MAX_HANDBOOK_DAYS);

  const normalizedTotals = asArray(expenses.totals).map((total) => ({
    currency: cleanText(total?.currency, 12),
    amount: readPositiveNumber(total?.amount, 0)
  })).filter((total) => total.currency && total.amount > 0).slice(0, 6);

  const snapshotTotals = asArray(snapshot.expenses?.totalByCurrency);

  return {
    cover: {
      title: cleanText(cover.title || snapshotTrip.title || '旅遊手冊', 120),
      subtitle: cleanText(cover.subtitle, 120) || '把目前旅程整理成可以離線查看的小冊。',
      dateText: cleanText(cover.dateText || snapshotTrip.dates, 80),
      intro: cleanText(cover.intro, 360) || '這份手冊由目前旅程資料整理而成，出發前請再確認交通、訂位與營業資訊。'
    },
    overview: {
      summary: cleanText(overview.summary, 420) || '目前旅程資料已整理成每日行程、交通住宿、清單與費用摘要。',
      highlights: normalizeTextList(overview.highlights, MAX_TEXT_ITEMS, 120)
    },
    days,
    logistics: {
      accommodation: {
        name: cleanText(logistics.accommodation?.name || snapshotTrip.accommodation?.name, 120),
        address: cleanText(logistics.accommodation?.address || snapshotTrip.accommodation?.address, 180),
        note: cleanText(logistics.accommodation?.note, 180)
      },
      flights: asArray(logistics.flights).map(normalizeHandbookFlight).filter((flight) => (
        flight.label || flight.code || flight.date || flight.route || flight.time || flight.note
      )).slice(0, MAX_FLIGHTS),
      notes: normalizeTextList(logistics.notes, MAX_TEXT_ITEMS, 120)
    },
    lists: {
      preTrip: normalizeTextList(lists.preTrip, MAX_LIST_ITEMS, 120),
      packing: normalizeTextList(lists.packing, MAX_LIST_ITEMS, 120),
      shopping: normalizeTextList(lists.shopping, MAX_SHOPPING_ITEMS, 120)
    },
    expenses: {
      summary: cleanText(expenses.summary, 260) || (snapshot.expenses?.count ? '費用已依目前記帳資料整理。' : '目前尚未建立費用摘要。'),
      totals: normalizedTotals.length
        ? normalizedTotals
        : snapshotTotals.map((total) => ({
            currency: cleanText(total.currency, 12),
            amount: readPositiveNumber(total.amount, 0)
          })).filter((total) => total.currency && total.amount > 0).slice(0, 6)
    },
    manualChecks: normalizeTextList(source.manualChecks, MAX_TEXT_ITEMS, 140),
    visuals: normalizeHandbookVisuals(source.visuals)
  };
};

module.exports = {
  MAX_HANDBOOK_DAYS,
  handbookResponseSchema,
  buildTripHandbookSnapshot,
  handbookPrompt,
  normalizeHandbookResponse
};
