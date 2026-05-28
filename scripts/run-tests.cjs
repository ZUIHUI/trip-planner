require('sucrase/register/js');

const assert = require('node:assert/strict');
const { normalizeExternalUrl, getExternalUrlHost } = require('../src/utils/externalUrl.js');
const {
  validateInviteCode,
  validateOptionalUrl,
  validatePositiveInteger,
  validateRequiredText
} = require('../src/utils/validation.js');
const {
  buildTripDocumentFromAppState,
  createTripAppData,
  normalizeTripDocumentForApp
} = require('../src/domain/tripSchema.js');
const { buildPresenceUiState } = require('../src/utils/presence.js');
const {
  getChecklistStatusOnlyChanges,
  getShoppingStatusOnlyChanges,
  mergeRealtimeChecklistStatus,
  mergeRealtimeShoppingStatus,
  mergeRealtimeVotesIntoPlaces,
  normalizeTripRealtimeValue
} = require('../src/utils/tripRealtime.js');
const { buildItineraryRouteState } = require('../src/utils/itineraryRoute.js');
const { canMoveEventInDay, moveEventInDay, moveEventToDay } = require('../src/utils/itineraryEvents.js');
const {
  applyTripEventDocumentsToItinerary,
  buildTripEventDocument,
  getAppendOrderKey,
  getOrderKeyBetween
} = require('../src/utils/tripEventDocuments.js');
const {
  applyTripDayDocumentsToItinerary,
  buildRootItineraryDaysMirror,
  buildRootItineraryMirror,
  buildTripDayDocument,
  normalizeTripDayDocumentForApp
} = require('../src/utils/tripDayDocuments.js');
const {
  applyChecklistItemDocumentsToChecklists,
  applyShoppingItemDocumentsToList,
  buildChecklistItemDocument,
  buildShoppingItemDocument,
  getSparseOrderKeyForItem,
  getTripItemChanges
} = require('../src/utils/tripItemDocuments.js');
const {
  applyShoppingCategoryDocumentsToList,
  applyTripExpenseDocumentsToList,
  applyTripPlaceIdeaDocumentsToPool,
  buildShoppingCategoryDocument,
  buildTripExpenseDocument,
  buildTripPlaceIdeaDocument,
  makeShoppingCategoryId
} = require('../src/utils/tripCollectionDocuments.js');
const { buildDayReadiness, buildEventReadiness } = require('../src/utils/eventReadiness.js');
const {
  PLACE_VOTE_OPERATION,
  isSaveResultCurrent,
  isOwnPlaceVoteWrite,
  mergePlaceVoteIntoPlacePool,
  shouldKeepLocalChangesForSameClientSnapshot,
  shouldTreatRemoteAsConflict
} = require('../src/utils/tripSync.js');
const { dateInputProps, timeInputProps } = require('../src/utils/mobileInputProps.js');
const {
  buildFlightDateValue,
  buildFlightTimeValue,
  getFlightDateSelectParts,
  getFlightDateValue,
  getFlightTimeSelectParts
} = require('../src/utils/flightDateTimeFields.js');
const { getAirportDayFlights } = require('../src/utils/airportDayFlights.js');
const {
  getTripDetailsPatchSections,
  normalizeTripDetailsMetaPatch
} = require('../src/utils/tripDetailsPatch.js');
const {
  applyTripDetailDocumentsToTripDetails,
  normalizeTripDetailDocumentForApp
} = require('../src/utils/tripDetailDocuments.js');
const {
  applyTripSettingDocumentsToCollaboration,
  normalizeTripCollaborationSettings,
  normalizeTripSettingDocumentForApp
} = require('../src/utils/tripSettingDocuments.js');

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test('normalizes only http and https external URLs', () => {
  assert.equal(normalizeExternalUrl('example.com/path'), 'https://example.com/path');
  assert.equal(normalizeExternalUrl('https://example.com/a'), 'https://example.com/a');
  assert.equal(normalizeExternalUrl('javascript:alert(1)'), '');
  assert.equal(getExternalUrlHost('https://maps.google.com/foo'), 'maps.google.com');
});

test('builds itinerary route readiness without hiding missing locations', () => {
  const state = buildItineraryRouteState([
    { id: 'event-1', title: 'Airport', time: '09:00', location: 'Taoyuan Airport' },
    { id: 'event-2', title: 'Lunch', time: '12:00', location: '' },
    { id: 'event-3', title: 'Hotel', time: '15:00', locationPlace: { name: 'Shinjuku Hotel' } }
  ], { origin: { address: 'Taipei Main Station' } });

  assert.equal(state.totalEvents, 3);
  assert.equal(state.routeStopCount, 2);
  assert.equal(state.missingCount, 1);
  assert.equal(state.completenessPercent, 67);
  assert.equal(state.originText, 'Taipei Main Station');
  assert.equal(state.routeStops[1].itineraryIndex, 2);
  assert.equal(state.missingEvents[0].title, 'Lunch');
  assert.equal(state.hasPartialRoute, true);
});

test('moves itinerary events without sorting by time', () => {
  const events = [
    { id: 'a', title: 'First', time: '12:00' },
    { id: 'b', title: 'Second', time: '09:00' },
    { id: 'c', title: 'Third', time: '15:00' }
  ];

  assert.equal(canMoveEventInDay(events, 'a', 'up'), false);
  assert.equal(canMoveEventInDay(events, 'b', 'up'), true);
  assert.deepEqual(moveEventInDay(events, 'b', 'up').map((event) => event.id), ['b', 'a', 'c']);
  assert.deepEqual(moveEventInDay(events, 'b', 'down').map((event) => event.id), ['a', 'c', 'b']);
  assert.equal(moveEventInDay(events, 'missing', 'up'), events);
});

test('moves itinerary events between adjacent days with undo insert position', () => {
  const itinerary = [
    { day: 1, events: [{ id: 'a' }, { id: 'b' }] },
    { day: 2, events: [{ id: 'c' }] }
  ];

  const moved = moveEventToDay(itinerary, 'b', 1, 2);
  assert.deepEqual(moved[0].events.map((event) => event.id), ['a']);
  assert.deepEqual(moved[1].events.map((event) => event.id), ['c', 'b']);

  const restored = moveEventToDay(moved, 'b', 2, 1, { insertIndex: 1 });
  assert.deepEqual(restored[0].events.map((event) => event.id), ['a', 'b']);
  assert.deepEqual(restored[1].events.map((event) => event.id), ['c']);
  assert.equal(moveEventToDay(itinerary, 'missing', 1, 2), itinerary);
});

test('overlays trip event documents on legacy itinerary without rewriting base arrays', () => {
  const itinerary = [
    { day: 1, events: [{ id: 'a', title: 'Legacy A' }, { id: 'b', title: 'Legacy B' }] },
    { day: 2, events: [] }
  ];

  const overlaid = applyTripEventDocumentsToItinerary(itinerary, [
    { id: 'a', dayNumber: 2, title: 'Moved A', time: '10:00', orderKey: 1000 },
    { id: 'b', deleted: true, dayNumber: 1, orderKey: 2000 },
    { id: 'c', dayNumber: 1, title: 'New C', time: '09:00', orderKey: 500 }
  ]);

  assert.deepEqual(overlaid[0].events.map((event) => event.id), ['c']);
  assert.equal(overlaid[0].events[0].title, 'New C');
  assert.deepEqual(overlaid[1].events.map((event) => event.id), ['a']);
  assert.equal(overlaid[1].events[0].title, 'Moved A');
  assert.deepEqual(itinerary[0].events.map((event) => event.id), ['a', 'b']);
});

test('overlays trip day documents on itinerary metadata without rewriting events', () => {
  const itinerary = [
    { day: 1, title: 'Day 1', date: '5/1', weekday: 'Fri', events: [{ id: 'a' }] },
    { day: 2, title: 'Day 2', date: '5/2', weekday: 'Sat', events: [{ id: 'b' }] }
  ];

  const overlaid = applyTripDayDocumentsToItinerary(itinerary, [
    {
      id: 'day-2',
      dayNumber: 2,
      title: 'Shinjuku',
      date: '5/2 night',
      weekday: 'Sat'
    }
  ]);

  assert.equal(overlaid[0].title, 'Day 1');
  assert.equal(overlaid[1].title, 'Shinjuku');
  assert.equal(overlaid[1].date, '5/2 night');
  assert.deepEqual(overlaid[1].events, [{ id: 'b' }]);
  assert.equal(itinerary[1].title, 'Day 2');
});

test('builds trip day documents and root itinerary mirrors', () => {
  const document = buildTripDayDocument({
    day: { day: 3, title: 'Kyoto', date: '5/3', weekday: 'Sun' },
    dayNumber: 3,
    user: { uid: 'user-1' },
    clientId: 'client-1',
    now: '2026-05-28T00:00:00.000Z'
  });

  assert.deepEqual(document, {
    id: 'day-3',
    schemaVersion: 1,
    dayNumber: 3,
    title: 'Kyoto',
    date: '5/3',
    weekday: 'Sun',
    updatedAt: '2026-05-28T00:00:00.000Z',
    updatedByUid: 'user-1',
    updatedByClientId: 'client-1'
  });

  assert.deepEqual(normalizeTripDayDocumentForApp({ id: 'day-4', dayNumber: 4 }), {
    id: 'day-4',
    schemaVersion: 1,
    dayNumber: 4,
    title: 'Day 4',
    date: 'Day 4',
    weekday: '',
    updatedAt: '',
    updatedByUid: '',
    updatedByClientId: ''
  });

  const rootMirror = buildRootItineraryMirror([{ day: 1, title: 'Tokyo', events: [{ id: 'a' }] }]);
  assert.deepEqual(rootMirror, [{
    day: 1,
    id: 'day-1',
    title: 'Tokyo',
    date: 'Day 1',
    weekday: '',
    events: [{ id: 'a' }]
  }]);
  assert.deepEqual(buildRootItineraryDaysMirror(rootMirror), [{
    id: 'day-1',
    dayNumber: 1,
    isoDate: 'Day 1',
    weekday: '',
    title: 'Tokyo',
    events: [{ id: 'a' }]
  }]);
});

test('builds event document order keys for sparse ordering', () => {
  assert.equal(getOrderKeyBetween({ orderKey: 1000 }, { orderKey: 2000 }, 1), 1500);
  assert.equal(getAppendOrderKey([{ id: 'a', orderKey: 1000 }]), 2000);

  const document = buildTripEventDocument({
    event: {
      id: 'event-1',
      title: 'Lunch',
      time: '12:00',
      locationPlace: { name: 'Cafe', address: 'Tokyo' },
      cost: 1200,
      currency: 'JPY'
    },
    dayNumber: 2,
    orderKey: 3000,
    user: { uid: 'user-1' },
    clientId: 'client-1',
    now: '2026-05-28T00:00:00.000Z'
  });

  assert.equal(document.id, 'event-1');
  assert.equal(document.dayNumber, 2);
  assert.equal(document.orderKey, 3000);
  assert.equal(document.updatedByUid, 'user-1');
  assert.equal(document.updatedByClientId, 'client-1');
  assert.equal(document.deleted, false);
});

test('overlays checklist item documents on legacy checklists', () => {
  const checklists = {
    preTrip: [
      { id: 'a', text: 'Passport', done: false },
      { id: 'b', text: 'Visa', done: false }
    ],
    packing: [
      { id: 'p1', text: 'Socks', done: false, category: 'clothing', day: 1 }
    ]
  };

  const overlaid = applyChecklistItemDocumentsToChecklists(checklists, [
    { id: 'a', listId: 'packing', text: 'Passport', done: true, orderKey: 500 },
    { id: 'b', listId: 'preTrip', deleted: true, orderKey: 2000 },
    { id: 'c', listId: 'preTrip', text: 'SIM card', done: false, orderKey: 1000 }
  ]);

  assert.deepEqual(overlaid.preTrip.map((item) => item.id), ['c']);
  assert.equal(overlaid.preTrip[0].text, 'SIM card');
  assert.deepEqual(overlaid.packing.map((item) => item.id), ['a', 'p1']);
  assert.equal(overlaid.packing[0].done, true);
  assert.deepEqual(checklists.preTrip.map((item) => item.id), ['a', 'b']);
});

test('overlays shopping item documents on legacy shopping list', () => {
  const shoppingList = [
    { id: 'a', name: 'Tea', purchased: false },
    { id: 'b', name: 'Cookies', purchased: false }
  ];

  const overlaid = applyShoppingItemDocumentsToList(shoppingList, [
    { id: 'a', name: 'Green tea', purchased: true, quantity: 2, orderKey: 2000 },
    { id: 'b', deleted: true, orderKey: 3000 },
    { id: 'c', name: 'Candy', purchased: false, quantity: 1, orderKey: 1000 }
  ]);

  assert.deepEqual(overlaid.map((item) => item.id), ['c', 'a']);
  assert.equal(overlaid[1].name, 'Green tea');
  assert.equal(overlaid[1].purchased, true);
  assert.deepEqual(shoppingList.map((item) => item.id), ['a', 'b']);
});

test('builds item documents and detects sparse reorder changes', () => {
  const checklistDocument = buildChecklistItemDocument({
    item: { id: 'check-1', text: 'Umbrella', done: true, category: 'other' },
    listId: 'packing',
    orderKey: 1500,
    user: { uid: 'user-1' },
    clientId: 'client-1',
    now: '2026-05-28T00:00:00.000Z'
  });
  const shoppingDocument = buildShoppingItemDocument({
    item: { id: 'shop-1', name: 'Snack', quantity: 3, purchased: false },
    orderKey: 2500,
    user: { uid: 'user-1' },
    clientId: 'client-1',
    now: '2026-05-28T00:00:00.000Z'
  });
  const changes = getTripItemChanges({
    previousItems: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    nextItems: [{ id: 'b' }, { id: 'a' }, { id: 'c' }],
    fields: ['done']
  });

  assert.equal(checklistDocument.id, 'check-1');
  assert.equal(checklistDocument.listId, 'packing');
  assert.equal(checklistDocument.orderKey, 1500);
  assert.equal(checklistDocument.updatedByClientId, 'client-1');
  assert.equal(shoppingDocument.quantity, 3);
  assert.equal(shoppingDocument.orderKey, 2500);
  assert.equal(changes.movedItemId, 'b');
  assert.equal(getSparseOrderKeyForItem([{ id: 'b' }, { id: 'a', orderKey: 1000 }], 'b'), 0);
});

test('overlays expense documents on legacy expenses', () => {
  const expenses = [
    { id: 'a', title: 'Lunch', amount: 1000 },
    { id: 'b', title: 'Train', amount: 500 }
  ];

  const overlaid = applyTripExpenseDocumentsToList(expenses, [
    { id: 'a', title: 'Dinner', amount: 2000, currency: 'JPY', orderKey: 2000 },
    { id: 'b', deleted: true, orderKey: 3000 },
    { id: 'c', title: 'Coffee', amount: 300, currency: 'JPY', orderKey: 1000 }
  ]);
  const document = buildTripExpenseDocument({
    expense: { id: 'd', title: 'Hotel', amount: 12000, involved: ['A', 'B'] },
    orderKey: 4000,
    user: { uid: 'user-1' },
    clientId: 'client-1',
    now: '2026-05-28T00:00:00.000Z'
  });

  assert.deepEqual(overlaid.map((expense) => expense.id), ['c', 'a']);
  assert.equal(overlaid[1].title, 'Dinner');
  assert.deepEqual(expenses.map((expense) => expense.id), ['a', 'b']);
  assert.equal(document.id, 'd');
  assert.equal(document.updatedByClientId, 'client-1');
  assert.deepEqual(document.involved, ['A', 'B']);
});

test('overlays place idea documents on legacy place pool', () => {
  const placePool = [
    { id: 'a', name: 'Legacy Cafe', votes: [] },
    { id: 'b', name: 'Legacy Museum', votes: [] }
  ];

  const overlaid = applyTripPlaceIdeaDocumentsToPool(placePool, [
    { id: 'a', name: 'Updated Cafe', status: 'planned', plannedDay: 2, orderKey: 2000 },
    { id: 'b', deleted: true, orderKey: 3000 },
    { id: 'c', name: 'New Park', address: 'Tokyo', orderKey: 1000 }
  ]);
  const document = buildTripPlaceIdeaDocument({
    place: { id: 'd', name: 'Shrine', address: 'Kyoto', votes: [{ voterId: 'u1', value: 1 }] },
    orderKey: 4000,
    user: { uid: 'user-1' },
    clientId: 'client-1',
    now: '2026-05-28T00:00:00.000Z'
  });

  assert.deepEqual(overlaid.map((place) => place.id), ['c', 'a']);
  assert.equal(overlaid[1].status, 'planned');
  assert.equal(overlaid[1].plannedDay, 2);
  assert.equal(document.id, 'd');
  assert.equal(document.votes[0].voterId, 'u1');
});

test('overlays shopping category documents on legacy categories', () => {
  const legacyCategories = ['Food', 'Clothes', 'Gifts'];
  const clothesId = makeShoppingCategoryId('Clothes');
  const overlaid = applyShoppingCategoryDocumentsToList(legacyCategories, [
    { id: clothesId, name: 'Clothes', deleted: true, orderKey: 2000 },
    { id: makeShoppingCategoryId('Snacks'), name: 'Snacks', orderKey: 500 }
  ]);
  const document = buildShoppingCategoryDocument({
    name: 'Cosmetics',
    orderKey: 4000,
    user: { uid: 'user-1' },
    clientId: 'client-1',
    now: '2026-05-28T00:00:00.000Z'
  });

  assert.deepEqual(overlaid, ['Snacks', 'Food', 'Gifts']);
  assert.equal(document.id, makeShoppingCategoryId('Cosmetics'));
  assert.equal(document.name, 'Cosmetics');
  assert.equal(document.updatedByUid, 'user-1');
});

test('summarizes event readiness from time and place data', () => {
  const ready = buildEventReadiness({
    time: '09:30',
    location: '',
    locationPlace: { name: 'Tokyo Station' }
  });

  assert.equal(ready.hasTime, true);
  assert.equal(ready.hasLocation, true);
  assert.equal(ready.canNavigate, true);
  assert.equal(ready.locationText, 'Tokyo Station');
  assert.equal(ready.missingItems.length, 0);

  const missing = buildEventReadiness({ title: 'Draft' });
  assert.equal(missing.isReadyForRoute, false);
  assert.deepEqual(missing.missingItems.map((item) => item.id), ['time', 'location']);
});

test('summarizes day readiness for quick itinerary repair', () => {
  const state = buildDayReadiness([
    { id: 'ready', time: '09:00', location: 'Tokyo Station' },
    { id: 'missing-time', location: 'Shibuya' },
    { id: 'missing-location', time: '12:00' }
  ]);

  assert.equal(state.totalEvents, 3);
  assert.equal(state.readyCount, 1);
  assert.equal(state.incompleteCount, 2);
  assert.equal(state.missingTimeCount, 1);
  assert.equal(state.missingLocationCount, 1);
  assert.equal(state.firstIncompleteEvent.id, 'missing-time');
  assert.equal(state.isComplete, false);

  assert.equal(buildDayReadiness([{ id: 'ready', time: '10:00', location: 'Ueno' }]).isComplete, true);
});

test('validates common form fields', () => {
  assert.equal(validateRequiredText('Tokyo', '標題'), '');
  assert.match(validateRequiredText('', '標題'), /必填/);
  assert.equal(validateInviteCode('ABCD-1234'), '');
  assert.match(validateInviteCode('ABC'), /8 碼/);
  assert.equal(validatePositiveInteger(2, '數量'), '');
  assert.match(validatePositiveInteger(0, '數量'), /整數/);
  assert.equal(validateOptionalUrl('https://example.com'), '');
  assert.match(validateOptionalUrl('javascript:alert(1)'), /網址格式/);
});

test('builds schema v2 trip documents while preserving shopping data', () => {
  const appState = createTripAppData('東京行', 2);
  const document = buildTripDocumentFromAppState('trip-test', {
    ...appState,
    shoppingList: [{ id: 'item-1', name: '藥妝', purchased: false }],
    shoppingCategories: ['藥妝', '伴手禮']
  });

  assert.equal(document.schemaVersion, 2);
  assert.equal(document.meta.title, '東京行');
  assert.deepEqual(document.planning.shoppingCategories, ['藥妝', '伴手禮']);
  assert.equal(document.planning.shoppingList[0].name, '藥妝');

  const normalized = normalizeTripDocumentForApp(document);
  assert.equal(normalized.shoppingList[0].id, 'item-1');
  assert.equal(normalized.shoppingCategories[1], '伴手禮');
});

test('preserves vote sync metadata fields when normalizing trips', () => {
  const normalized = normalizeTripDocumentForApp({
    id: 'trip-sync',
    schemaVersion: 2,
    syncMeta: {
      revision: 8,
      updatedByUid: 'user-1',
      updatedByClientId: 'client-1',
      updatedByOperation: PLACE_VOTE_OPERATION,
      updatedEntityId: 'place-1',
      updatedAt: '2026-05-25T00:00:00.000Z'
    }
  });

  assert.equal(normalized.syncMeta.revision, 8);
  assert.equal(normalized.syncMeta.updatedByOperation, PLACE_VOTE_OPERATION);
  assert.equal(normalized.syncMeta.updatedEntityId, 'place-1');
});

test('normalizes trip detail meta patches from date range fields', () => {
  const meta = normalizeTripDetailsMetaPatch({
    title: 'Tokyo',
    status: '',
    coverImage: 'https://example.com/tokyo.jpg',
    dateRange: {
      start: '2026/5/1',
      end: '2026.5.3'
    }
  });

  assert.deepEqual(meta, {
    title: 'Tokyo',
    status: '',
    coverImage: 'https://example.com/tokyo.jpg',
    dateRange: {
      start: '2026-05-01',
      end: '2026-05-03'
    },
    dates: '2026/05/01 - 2026/05/03'
  });
});

test('detects trip detail patch sections for field-level saves', () => {
  const previous = {
    title: 'Tokyo',
    status: 'planning',
    coverImage: '',
    dateRange: {
      start: '2026-05-01',
      end: '2026-05-03'
    },
    budget: { total: '1000' },
    accommodation: { name: 'Hotel A' },
    flights: { outbound: { code: 'BR198' } }
  };

  const changedBudget = getTripDetailsPatchSections(previous, {
    ...previous,
    budget: { total: '2000' }
  });
  assert.equal(changedBudget.changed.budget, true);
  assert.equal(changedBudget.changed.meta, false);
  assert.equal(changedBudget.changed.accommodation, false);
  assert.equal(changedBudget.changed.flights, false);
  assert.equal(changedBudget.changed.untracked, false);

  const changedFlights = getTripDetailsPatchSections(previous, {
    ...previous,
    flights: { outbound: { code: 'BR198' }, inbound: { code: 'BR197' } }
  });
  assert.equal(changedFlights.changed.flights, true);
  assert.equal(changedFlights.changed.budget, false);

  const changedMeta = getTripDetailsPatchSections(previous, {
    ...previous,
    title: 'Osaka'
  });
  assert.equal(changedMeta.changed.meta, true);
  assert.equal(changedMeta.meta.title, 'Osaka');

  const changedAccommodation = getTripDetailsPatchSections(previous, {
    ...previous,
    accommodation: { name: 'Hotel B' }
  });
  assert.equal(changedAccommodation.changed.accommodation, true);

  const changedUntracked = getTripDetailsPatchSections(previous, {
    ...previous,
    travelers: [{ id: 'traveler-1' }]
  });
  assert.equal(changedUntracked.changed.untracked, true);
  assert.equal(changedUntracked.changed.any, true);
});

test('normalizes trip detail section documents for the app', () => {
  assert.deepEqual(normalizeTripDetailDocumentForApp({
    id: 'meta',
    title: 'Tokyo',
    dateRange: { start: '2026/5/1', end: '2026/5/3' }
  }), {
    id: 'meta',
    section: 'meta',
    title: 'Tokyo',
    status: 'planning',
    coverImage: '',
    dateRange: {
      start: '2026-05-01',
      end: '2026-05-03'
    },
    dates: '2026/05/01 - 2026/05/03',
    updatedAt: '',
    updatedByUid: '',
    updatedByClientId: ''
  });

  assert.deepEqual(normalizeTripDetailDocumentForApp({
    id: 'logistics',
    accommodation: { name: 'Hotel A' },
    flights: { outbound: { code: 'BR198' } }
  }), {
    id: 'logistics',
    section: 'logistics',
    accommodation: { name: 'Hotel A' },
    flights: { outbound: { code: 'BR198' } },
    updatedAt: '',
    updatedByUid: '',
    updatedByClientId: ''
  });
});

test('overlays trip detail section documents over root compatibility fields', () => {
  const overlaid = applyTripDetailDocumentsToTripDetails({
    title: 'Legacy Tokyo',
    dateRange: { start: '2026-05-01', end: '2026-05-03' },
    accommodation: { name: 'Legacy Hotel' },
    flights: { outbound: { code: 'OLD123' } },
    budget: { total: '1000' }
  }, [
    {
      id: 'meta',
      title: 'Section Tokyo',
      status: 'planning',
      coverImage: 'https://example.com/tokyo.jpg',
      dateRange: { start: '2026-05-02', end: '2026-05-04' }
    },
    {
      id: 'logistics',
      flights: { outbound: { code: 'BR198' }, inbound: { code: 'BR197' } }
    },
    {
      id: 'finance',
      budget: { total: '2000', currency: 'JPY' }
    }
  ]);

  assert.equal(overlaid.title, 'Section Tokyo');
  assert.deepEqual(overlaid.dateRange, { start: '2026-05-02', end: '2026-05-04' });
  assert.equal(overlaid.dates, '2026/05/02 - 2026/05/04');
  assert.deepEqual(overlaid.accommodation, { name: 'Legacy Hotel' });
  assert.deepEqual(overlaid.flights, { outbound: { code: 'BR198' }, inbound: { code: 'BR197' } });
  assert.deepEqual(overlaid.budget, { total: '2000', currency: 'JPY' });
});

test('normalizes trip collaboration setting documents for the app', () => {
  assert.deepEqual(normalizeTripCollaborationSettings({
    enabled: 1,
    token: 'legacy-token',
    permission: 'edit',
    votesEnabled: false,
    createdAt: '2026-05-01T00:00:00.000Z'
  }), {
    enabled: true,
    shareToken: 'legacy-token',
    permission: 'edit',
    votesEnabled: false,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: ''
  });

  assert.deepEqual(normalizeTripSettingDocumentForApp({
    id: 'collaboration',
    enabled: true,
    permission: 'owner',
    votesEnabled: undefined,
    updatedByUid: 'ownerUid'
  }), {
    id: 'collaboration',
    setting: 'collaboration',
    enabled: true,
    shareToken: '',
    permission: 'view',
    votesEnabled: true,
    createdAt: '',
    updatedAt: '',
    updatedByUid: 'ownerUid',
    updatedByClientId: ''
  });
});

test('overlays trip collaboration setting documents over root compatibility fields', () => {
  const overlaid = applyTripSettingDocumentsToCollaboration({
    enabled: false,
    permission: 'view',
    votesEnabled: true,
    createdAt: 'root-created',
    updatedAt: 'root-updated'
  }, [
    {
      id: 'collaboration',
      enabled: true,
      permission: 'edit',
      votesEnabled: false,
      createdAt: 'setting-created',
      updatedAt: 'setting-updated'
    }
  ]);

  assert.equal(overlaid.enabled, true);
  assert.equal(overlaid.permission, 'edit');
  assert.equal(overlaid.votesEnabled, false);
  assert.equal(overlaid.createdAt, 'setting-created');
  assert.equal(overlaid.updatedAt, 'setting-updated');
});

test('does not create a conflict for same-client place vote snapshots', () => {
  const syncMeta = {
    updatedByUid: 'user-1',
    updatedByClientId: 'client-1',
    updatedByOperation: PLACE_VOTE_OPERATION,
    updatedEntityId: 'place-1'
  };

  assert.equal(isOwnPlaceVoteWrite(syncMeta, { uid: 'user-1', clientId: 'client-1' }), true);
  assert.equal(shouldTreatRemoteAsConflict({
    hasLocalChanges: true,
    syncMeta,
    uid: 'user-1',
    clientId: 'client-1'
  }), false);
});

test('keeps unsaved local edits for same-client save snapshots', () => {
  const syncMeta = {
    revision: 12,
    updatedByUid: 'user-1',
    updatedByClientId: 'client-1',
    updatedAt: '2026-05-28T00:00:00.000Z'
  };

  assert.equal(shouldKeepLocalChangesForSameClientSnapshot({
    hasLocalChanges: true,
    syncMeta,
    uid: 'user-1',
    clientId: 'client-1'
  }), true);
  assert.equal(shouldKeepLocalChangesForSameClientSnapshot({
    hasLocalChanges: false,
    syncMeta,
    uid: 'user-1',
    clientId: 'client-1'
  }), false);
  assert.equal(shouldTreatRemoteAsConflict({
    hasLocalChanges: true,
    syncMeta,
    uid: 'user-1',
    clientId: 'client-1'
  }), false);
});

test('does not clear local dirty state for stale save completions', () => {
  assert.equal(isSaveResultCurrent(4, 4), true);
  assert.equal(isSaveResultCurrent(4, 5), false);
});

test('keeps date and time helpers free of numeric input mode', () => {
  assert.equal(dateInputProps.type, 'date');
  assert.equal(timeInputProps.type, 'time');
  assert.equal(Object.prototype.hasOwnProperty.call(dateInputProps, 'inputMode'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(timeInputProps, 'inputMode'), false);
});

test('maps legacy flight month/day dates into select parts with fallback year', () => {
  assert.deepEqual(getFlightDateSelectParts('2/23', 2026), {
    year: '2026',
    month: '02',
    day: '23'
  });
  assert.deepEqual(getFlightDateSelectParts('2026-11-05', null), {
    year: '2026',
    month: '11',
    day: '05'
  });
  assert.equal(getFlightDateValue('2/23', 2026), '2026-02-23');
});

test('rejects invalid flight date select values', () => {
  assert.equal(getFlightDateValue('2/31', 2026), '');
  assert.equal(getFlightDateValue('2026-02-31', null), '');
  assert.equal(buildFlightDateValue({ year: '2026', month: '02', day: '31' }), '');
  assert.deepEqual(getFlightDateSelectParts('not a date', 2026), {
    year: '',
    month: '',
    day: ''
  });
});

test('splits and builds flight time select values', () => {
  assert.deepEqual(getFlightTimeSelectParts('9:05'), {
    hour: '09',
    minute: '05'
  });
  assert.equal(buildFlightTimeValue({ hour: '9', minute: '5' }), '09:05');
  assert.equal(buildFlightTimeValue({ hour: '24', minute: '00' }), '');
  assert.deepEqual(getFlightTimeSelectParts('late'), {
    hour: '',
    minute: ''
  });
});

test('shows outbound flight on the first travel day', () => {
  const flights = getAirportDayFlights({
    itinerary: [{ day: 1 }, { day: 2 }, { day: 3 }],
    selectedDay: 1,
    tripDetails: {
      flights: {
        outbound: { code: 'BR198', dep: 'TPE', arr: 'NRT' },
        inbound: { code: 'BR197', dep: 'NRT', arr: 'TPE' }
      }
    }
  });

  assert.equal(flights.length, 1);
  assert.equal(flights[0].direction, 'outbound');
  assert.equal(flights[0].code, 'BR198');
  assert.equal(flights[0].hasFlightCode, true);
});

test('shows inbound flight on the last travel day', () => {
  const flights = getAirportDayFlights({
    itinerary: [{ day: 1 }, { day: 2 }, { day: 3 }],
    selectedDay: 3,
    tripDetails: {
      flights: {
        outbound: { code: 'BR198', dep: 'TPE', arr: 'NRT' },
        inbound: { code: 'BR197', dep: 'NRT', arr: 'TPE' }
      }
    }
  });

  assert.equal(flights.length, 1);
  assert.equal(flights[0].direction, 'inbound');
  assert.equal(flights[0].code, 'BR197');
});

test('hides airport flight card data on middle travel days', () => {
  const flights = getAirportDayFlights({
    itinerary: [{ day: 1 }, { day: 2 }, { day: 3 }],
    selectedDay: 2,
    tripDetails: {
      flights: {
        outbound: { code: 'BR198' },
        inbound: { code: 'BR197' }
      }
    }
  });

  assert.deepEqual(flights, []);
});

test('shows both airport flights for single-day trips', () => {
  const flights = getAirportDayFlights({
    itinerary: [{ day: 1 }],
    selectedDay: 1,
    tripDetails: {
      flights: {
        outbound: { code: 'JX802' },
        inbound: { code: 'JX803' }
      }
    }
  });

  assert.deepEqual(flights.map((flight) => flight.direction), ['outbound', 'inbound']);
});

test('keeps missing airport flight state visible on airport days', () => {
  const flights = getAirportDayFlights({
    itinerary: [{ day: 1 }, { day: 2 }],
    selectedDay: 1,
    tripDetails: { flights: {} }
  });

  assert.equal(flights.length, 1);
  assert.equal(flights[0].direction, 'outbound');
  assert.equal(flights[0].code, '');
  assert.equal(flights[0].hasFlightCode, false);
});

test('finds airport days by day number even when itinerary order is changed', () => {
  const tripDetails = {
    flights: {
      outbound: { code: 'OUT123' },
      inbound: { code: 'IN456' }
    }
  };

  assert.deepEqual(
    getAirportDayFlights({
      itinerary: [{ day: 2 }, { day: 1 }, { day: 3 }],
      selectedDay: 1,
      tripDetails
    }).map((flight) => flight.direction),
    ['outbound']
  );

  assert.deepEqual(
    getAirportDayFlights({
      itinerary: [{ day: 3 }, { day: 1 }, { day: 2 }],
      selectedDay: 3,
      tripDetails
    }).map((flight) => flight.direction),
    ['inbound']
  );
});

test('keeps conflict protection for other users and other devices', () => {
  const syncMeta = {
    updatedByUid: 'user-1',
    updatedByClientId: 'client-1',
    updatedByOperation: PLACE_VOTE_OPERATION,
    updatedEntityId: 'place-1'
  };

  assert.equal(shouldTreatRemoteAsConflict({
    hasLocalChanges: true,
    syncMeta,
    uid: 'user-2',
    clientId: 'client-1'
  }), true);
  assert.equal(shouldTreatRemoteAsConflict({
    hasLocalChanges: true,
    syncMeta,
    uid: 'user-1',
    clientId: 'client-2'
  }), true);
});

test('merges own place vote snapshots without overwriting local edits', () => {
  const result = mergePlaceVoteIntoPlacePool(
    [
      { id: 'place-1', name: 'Local draft name', notes: 'keep this', votes: [] },
      { id: 'place-2', name: 'Other place', votes: [{ voterId: 'old', value: 1 }] }
    ],
    [
      {
        id: 'place-1',
        name: 'Remote canonical name',
        votes: [{ voterId: 'user-1', value: 1, votedAt: '2026-05-25T00:00:00.000Z' }]
      },
      { id: 'place-2', name: 'Other place', votes: [] }
    ],
    'place-1'
  );

  assert.equal(result.changed, true);
  assert.equal(result.placePool[0].name, 'Local draft name');
  assert.equal(result.placePool[0].notes, 'keep this');
  assert.deepEqual(result.placePool[0].votes, [
    { voterId: 'user-1', value: 1, votedAt: '2026-05-25T00:00:00.000Z' }
  ]);
  assert.equal(result.placePool[1].votes[0].voterId, 'old');
});

test('summarizes presence without treating self-only usage as offline', () => {
  const selfOnly = buildPresenceUiState({
    currentUser: { uid: 'owner-1' },
    presenceByUid: {
      'owner-1': { uid: 'owner-1', online: true }
    },
    onlineMembers: [
      { uid: 'owner-1', online: true, profile: { displayName: 'Owner' }, connections: [] }
    ]
  });

  assert.equal(selfOnly.selfOnline, true);
  assert.equal(selfOnly.otherOnlineMembers.length, 0);
  assert.equal(selfOnly.summaryText, '你在線');

  const withCompanion = buildPresenceUiState({
    currentUser: { uid: 'owner-1' },
    presenceByUid: {
      'owner-1': { uid: 'owner-1', online: true },
      'member-1': { uid: 'member-1', online: true }
    },
    onlineMembers: [
      { uid: 'owner-1', online: true, profile: { displayName: 'Owner' }, connections: [] },
      { uid: 'member-1', online: true, profile: { displayName: 'Member' }, connections: [] }
    ]
  });

  assert.equal(withCompanion.summaryText, '1 位旅伴在線');
});

test('builds a roster with online editing and offline member states', () => {
  const state = buildPresenceUiState({
    currentUser: { uid: 'owner-1', displayName: 'Owner' },
    members: [
      { uid: 'owner-1', displayName: 'Owner', role: 'owner' },
      { uid: 'member-1', displayName: 'Member', role: 'editor' },
      { uid: 'viewer-1', displayName: 'Viewer', role: 'viewer' }
    ],
    presenceByUid: {
      'owner-1': { uid: 'owner-1', online: true },
      'member-1': { uid: 'member-1', online: true, editingTarget: 'event:event-1' }
    },
    onlineMembers: [
      { uid: 'owner-1', online: true, profile: { displayName: 'Owner' }, connections: [] },
      { uid: 'member-1', online: true, editingTarget: 'event:event-1', profile: { displayName: 'Member' }, connections: [] }
    ]
  });

  assert.equal(state.roster.length, 3);
  assert.equal(state.selfStatus.status, 'online');
  assert.equal(state.roster.find((person) => person.uid === 'member-1').status, 'editing');
  assert.equal(state.roster.find((person) => person.uid === 'viewer-1').status, 'offline');
  assert.equal(state.statusCounts.online, 1);
  assert.equal(state.statusCounts.editing, 1);
  assert.equal(state.statusCounts.offline, 1);
});

test('normalizes realtime trip overlays without replacing canonical records', () => {
  const normalized = normalizeTripRealtimeValue({
    placeVotes: {
      placeA: {
        updatedAt: 10,
        votes: {
          userA: { voterId: 'userA', name: 'Ada', value: 1, votedAt: '2026-05-25T08:00:00.000Z' },
          userB: { voterId: 'userB', name: 'Ben', value: 0 },
          userC: { voterId: 'userC', name: 'Cia', value: -1 }
        }
      },
      placeB: {
        updatedAt: 20,
        votes: {}
      }
    },
    checklistStatus: {
      preTrip: {
        itemA: {
          userA: { done: false, updatedAt: 10 },
          userB: { done: true, updatedAt: 20 }
        }
      }
    },
    shoppingStatus: {
      itemB: {
        userA: { purchased: true, updatedAt: 30 }
      }
    }
  });

  assert.deepEqual(normalized.placeVotesByPlaceId.placeA, [
    { voterId: 'userA', name: 'Ada', value: 1, votedAt: '2026-05-25T08:00:00.000Z' },
    { voterId: 'userB', name: 'Ben', value: 0, votedAt: '' },
    { voterId: 'userC', name: 'Cia', value: -1, votedAt: '' }
  ]);
  assert.deepEqual(normalized.placeVotesByPlaceId.placeB, []);
  assert.equal(normalized.checklistStatusByListId.preTrip.itemA.done, true);
  assert.equal(normalized.shoppingItemStatusById.itemB.purchased, true);
});

test('merges realtime overlays into UI-only copies', () => {
  const places = [{ id: 'placeA', votes: [{ voterId: 'old', value: 1 }] }, { id: 'placeB', votes: [] }];
  const mergedPlaces = mergeRealtimeVotesIntoPlaces(places, {
    placeA: [{ voterId: 'userA', value: 1, name: 'Ada', votedAt: '' }]
  });
  assert.equal(mergedPlaces[0].votes[0].voterId, 'userA');
  assert.equal(places[0].votes[0].voterId, 'old');

  const checklist = mergeRealtimeChecklistStatus([{ id: 1, done: false }], {
    1: { done: true, updatedAt: 10 }
  });
  assert.equal(checklist[0].done, true);

  const shopping = mergeRealtimeShoppingStatus([{ id: 'milk', purchased: false }], {
    milk: { purchased: true, updatedAt: 10 }
  });
  assert.equal(shopping[0].purchased, true);
});

test('detects realtime-only status changes without treating structure edits as safe', () => {
  const checklistBefore = [
    { id: 'passport', text: 'Passport', done: false },
    { id: 'charger', text: 'Charger', done: false }
  ];
  const checklistAfter = [
    { id: 'passport', text: 'Passport', done: true },
    { id: 'charger', text: 'Charger', done: false }
  ];
  const checklistStatusOnly = getChecklistStatusOnlyChanges(checklistBefore, checklistAfter);
  assert.equal(checklistStatusOnly.statusOnly, true);
  assert.deepEqual(checklistStatusOnly.changes, [{ itemId: 'passport', value: true }]);

  const checklistWithTextEdit = getChecklistStatusOnlyChanges(checklistBefore, [
    { id: 'passport', text: 'Passport and visa', done: true },
    { id: 'charger', text: 'Charger', done: false }
  ]);
  assert.equal(checklistWithTextEdit.statusOnly, false);

  const shoppingStatusOnly = getShoppingStatusOnlyChanges(
    [{ id: 'milk', name: 'Milk', purchased: false }],
    [{ id: 'milk', name: 'Milk', purchased: true }]
  );
  assert.equal(shoppingStatusOnly.statusOnly, true);
  assert.deepEqual(shoppingStatusOnly.changes, [{ itemId: 'milk', value: true }]);

  const shoppingWithReorder = getShoppingStatusOnlyChanges(
    [
      { id: 'milk', name: 'Milk', purchased: false },
      { id: 'tea', name: 'Tea', purchased: false }
    ],
    [
      { id: 'tea', name: 'Tea', purchased: false },
      { id: 'milk', name: 'Milk', purchased: true }
    ]
  );
  assert.equal(shoppingWithReorder.statusOnly, false);
});

let failed = 0;
tests.forEach(({ name, fn }) => {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`not ok - ${name}`);
    console.error(error);
  }
});

if (failed) {
  process.exit(1);
}

console.log(`${tests.length} tests passed.`);
