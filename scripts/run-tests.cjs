const fs = require('fs');
const path = require('path');
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
const {
  buildPresenceUiState,
  formatEditingMembersText,
  getEditingMembersForTarget,
  getEditingTargetLabel
} = require('../src/utils/presence.js');
const {
  getChecklistStatusOnlyChanges,
  getShoppingStatusOnlyChanges,
  mergeRealtimeChecklistStatus,
  mergeRealtimeShoppingStatus,
  mergeRealtimeVotesIntoPlaces,
  normalizeTripRealtimeValue
} = require('../src/utils/tripRealtime.js');
const { buildItineraryRouteState } = require('../src/utils/itineraryRoute.js');
const {
  getEventLocationText,
  getTripDayIsoDate,
  normalizeEventTime,
  pickNextEvent
} = require('../src/utils/tripEvents.js');
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
  TRIP_DOCUMENT_TOUCH_OPERATIONS,
  buildSyncConflictSummary,
  getTripSyncOperationLabel,
  isSaveResultCurrent,
  isOwnPlaceVoteWrite,
  isTripDocumentTouchOperation,
  mergePlaceVoteIntoPlacePool,
  shouldKeepLocalChangesForSameClientSnapshot,
  shouldTreatRemoteAsConflict
} = require('../src/utils/tripSync.js');
const { getLatestIsoTimestamp } = require('../src/utils/tripTimestamps.js');
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
const {
  getPermissionDeniedToast,
  getSaveErrorMessage,
  isPermissionDeniedError
} = require('../src/utils/persistenceErrors.js');
const {
  buildGooglePlaceSearchQueries,
  buildTripRecommendationSnapshot,
  normalizeMode: normalizeTripRecommendationMode,
  normalizeExternalGoogleCandidate,
  normalizeRecommendationResponse,
  recommendationResponseSchema
} = require('../functions/tripRecommendations.js');
const {
  buildTripHandbookSnapshot,
  handbookResponseSchema,
  normalizeHandbookResponse
} = require('../functions/tripHandbook.js');
const {
  buildTripNotificationCandidates,
  buildWebPushPayload,
  normalizeCategories,
  zonedDateTimeToUtcMs
} = require('../functions/tripNotificationReminders.js');
const {
  createEventFromAiRecommendation,
  createPlaceFromAiRecommendation,
  normalizeAiRecommendationResponse
} = require('../src/utils/tripAiRecommendations.js');

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test('normalizes only http and https external URLs', () => {
  assert.equal(normalizeExternalUrl('example.com/path'), 'https://example.com/path');
  assert.equal(normalizeExternalUrl('https://example.com/a'), 'https://example.com/a');
  assert.equal(normalizeExternalUrl('javascript:alert(1)'), '');
  assert.equal(getExternalUrlHost('https://maps.google.com/foo'), 'maps.google.com');
});

test('uses the namespaced trip storage key when creating trips', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src/pages/TripListPage.jsx'), 'utf8');
  assert.match(source, /getTripStorageKey\(tripId,\s*uid\)/);
  assert.doesNotMatch(source, /[^\w]getStorageKey\(/);
});

test('classifies permission denied persistence errors for safe save handling', () => {
  assert.equal(isPermissionDeniedError({ code: 'permission-denied' }), true);
  assert.equal(isPermissionDeniedError(new Error('Missing or insufficient permissions.')), true);
  assert.equal(isPermissionDeniedError({ code: 'unavailable', message: 'network unavailable' }), false);
  assert.equal(
    getSaveErrorMessage(new Error('Missing or insufficient permissions.')),
    '權限不足，這次變更沒有儲存。請重新整理確認你仍有編輯權限。'
  );
  assert.deepEqual(getPermissionDeniedToast('行程更新'), {
    variant: 'warning',
    title: '儲存權限不足',
    description: '行程更新被權限規則拒絕，已停止自動重試。請重新整理後再試一次。'
  });
});

test('keeps background collaboration sync failures out of visible trip errors', () => {
  const presenceSource = fs.readFileSync(path.join(__dirname, '..', 'src/hooks/useTripPresence.js'), 'utf8');
  assert.doesNotMatch(presenceSource, /PRESENCE_SYNC_ERROR/);
  assert.doesNotMatch(presenceSource, /setPresenceError\(\s*['"`]在線狀態/);

  const realtimeSource = fs.readFileSync(path.join(__dirname, '..', 'src/hooks/useTripRealtime.js'), 'utf8');
  const publishIndex = realtimeSource.indexOf('const publishChecklistItemStatus');
  assert.notEqual(publishIndex, -1);
  const realtimeBackgroundSource = realtimeSource.slice(0, publishIndex);
  assert.doesNotMatch(realtimeBackgroundSource, /setRealtimeError\(TRIP_REALTIME_SYNC_ERROR\)/);
  assert.match(realtimeSource, /const publishChecklistItemStatus[\s\S]+setRealtimeError\(TRIP_REALTIME_SYNC_ERROR\)/);
});

test('keeps viewer collaboration writes gated in frontend hooks and tabs', () => {
  const presenceSource = fs.readFileSync(path.join(__dirname, '..', 'src/hooks/useTripPresence.js'), 'utf8');
  const realtimeSource = fs.readFileSync(path.join(__dirname, '..', 'src/hooks/useTripRealtime.js'), 'utf8');
  const preTripSource = fs.readFileSync(path.join(__dirname, '..', 'src/components/trip/PreTripTab.jsx'), 'utf8');
  const packingSource = fs.readFileSync(path.join(__dirname, '..', 'src/components/trip/PackingTab.jsx'), 'utf8');
  const shoppingSource = fs.readFileSync(path.join(__dirname, '..', 'src/components/trip/ShoppingTab.jsx'), 'utf8');
  const expensesSource = fs.readFileSync(path.join(__dirname, '..', 'src/components/trip/ExpensesTab.jsx'), 'utf8');

  assert.match(presenceSource, /canWritePresenceEditingRole/);
  assert.match(presenceSource, /if \(!canPublishPresenceEditing && target\) return/);
  assert.match(realtimeSource, /canWriteRealtimeRole/);
  assert.match(realtimeSource, /if \(!isEnabled \|\| !canPublishRealtimeWrites\) return false/);
  assert.match(preTripSource, /if \(!canEdit\) return/);
  assert.match(packingSource, /readOnly=\{!canEdit\}/);
  assert.match(shoppingSource, /readOnly=\{!canEdit\}/);
  assert.match(expensesSource, /readOnly=\{!canEdit\}/);
});

test('does not autosave no-op or date-range maintenance updates', () => {
  const tripHookSource = fs.readFileSync(path.join(__dirname, '..', 'src/hooks/useTrip.js'), 'utf8');
  assert.match(tripHookSource, /Object\.is\(resolvedValue,\s*previousValue\)/);
  assert.match(tripHookSource, /if \(!markLocalChange\(\)\) return previousValue/);

  const detailPageSource = fs.readFileSync(path.join(__dirname, '..', 'src/pages/TripDetailPage.jsx'), 'utf8');
  assert.match(detailPageSource, /applyItineraryPatch\(\(prev\) => \{/);
  assert.doesNotMatch(detailPageSource, /setItinerary\(\(prev\) => \{\s*if \(!Array\.isArray\(prev\)\) return prev;\s*const next = buildAutoItineraryFromDateRange/s);
});

test('renders event card action menus above the timeline stack', () => {
  const eventCardSource = fs.readFileSync(path.join(__dirname, '..', 'src/components/EventCard.jsx'), 'utf8');
  assert.match(eventCardSource, /createPortal\(/);
  assert.match(eventCardSource, /document\.body/);
  assert.match(eventCardSource, /className="[^"]*fixed[^"]*z-\[120\]/);
  assert.doesNotMatch(eventCardSource, /absolute right-0 top-11 z-20/);
});

test('sanitizes trip snapshots for AI recommendations', () => {
  const snapshot = buildTripRecommendationSnapshot({
    trip: {
      access: { ownerEmail: 'owner@example.com' },
      tripDetails: {
        title: '東京吃喝行',
        dateRange: { start: '2026-05-01', end: '2026-05-03' },
        accommodation: { name: 'Ueno Hotel', address: 'Ueno' },
        budget: { total: '50000', currency: 'JPY' }
      },
      itinerary: [
        {
          day: 1,
          title: '上野',
          date: '5/1',
          events: [{ title: '抵達飯店', time: '16:00', location: 'Ueno', updatedByUid: 'uid-private' }]
        },
        { day: 2, title: '淺草', date: '5/2', events: [] }
      ]
    },
    details: [
      { id: 'logistics', accommodation: { name: 'Split Hotel', address: 'Taito' } }
    ],
    placeIdeas: [
      {
        id: 'place-1',
        name: '淺草寺',
        address: 'Asakusa',
        votes: [{ voterId: 'uid-1', name: 'Private Name', value: 1 }]
      }
    ],
    checklistItems: [
      { id: 'check-1', text: '買交通卡', done: false, assignedTo: 'private person' },
      { id: 'check-2', text: '已完成', done: true }
    ],
    expenses: [
      { id: 'expense-1', title: '晚餐', amount: 3000, currency: 'JPY', payer: 'private payer' }
    ]
  }, {
    mode: 'dayPlan',
    selectedDay: 99,
    userIdea: '想晚點出門，晚上吃燒肉，不要排太滿'
  });

  assert.equal(snapshot.mode, 'dayPlan');
  assert.equal(snapshot.selectedDay, 1);
  assert.equal(snapshot.userIdea, '想晚點出門，晚上吃燒肉，不要排太滿');
  assert.deepEqual(snapshot.validDayNumbers, [1, 2]);
  assert.equal(snapshot.trip.accommodation.name, 'Split Hotel');
  assert.equal(snapshot.placeIdeas[0].voteScore, 1);
  assert.equal(snapshot.checklists.preTripRemaining, 1);
  assert.equal(snapshot.expenses.totalByCurrency[0].amount, 3000);

  const serialized = JSON.stringify(snapshot);
  assert.doesNotMatch(serialized, /owner@example\.com/);
  assert.doesNotMatch(serialized, /uid-private|uid-1|Private Name|private person|private payer/);
});

test('builds sanitized Google candidate queries for place recommendations', () => {
  const snapshot = buildTripRecommendationSnapshot({
    trip: {
      access: { ownerEmail: 'owner@example.com' },
      tripDetails: {
        title: 'Osaka family trip',
        accommodation: { name: 'Namba Stay', address: 'Namba Osaka' }
      },
      itinerary: [
        { day: 1, events: [{ title: 'Castle', location: 'Osaka Castle', updatedByUid: 'uid-private' }] }
      ]
    },
    placeIdeas: [
      { id: 'idea-1', name: 'Aquarium', address: 'Osaka Bay', votes: [{ voterId: 'uid-1', value: 1 }] }
    ]
  }, {
    mode: 'placeIdeas',
    selectedDay: 1
  });
  const queries = buildGooglePlaceSearchQueries(snapshot);
  const candidate = normalizeExternalGoogleCandidate({
    query: queries[0],
    placeId: 'google-place-1',
    name: 'Namba Parks',
    address: 'Naniwa, Osaka',
    lat: 34.661,
    lng: 135.502,
    types: ['shopping_mall', 'point_of_interest', 'extra-one', 'extra-two', 'extra-three', 'extra-four', 'extra-five', 'extra-six', 'extra-seven']
  });

  assert.equal(queries.length > 0 && queries.length <= 5, true);
  assert.match(queries[0], /Osaka family trip|Namba Osaka|Namba Stay/);
  assert.doesNotMatch(JSON.stringify(queries), /owner@example\.com|uid-private|uid-1/);
  assert.equal(candidate.source, 'google_places');
  assert.equal(candidate.placeId, 'google-place-1');
  assert.equal(candidate.types.length, 8);
});

test('normalizes AI recommendation responses and clamps invalid days', () => {
  const payload = {
    headline: '  今日小提案  ',
    companionLine: '  我幫你看過目前安排  ',
    recommendations: Array.from({ length: 6 }, (_, index) => ({
      id: `raw-${index}`,
      kind: index % 2 ? 'event' : 'place',
      title: `推薦 ${index}`,
      locationText: `地點 ${index}`,
      suggestedDay: 99,
      time: index === 0 ? '9:5' : '09:30',
      durationMinutes: 90,
      reason: '符合目前路線',
      caution: '請自行確認營業時間',
      tags: ['親子', '雨天', '很長很長很長很長很長很長'],
      placeDraft: { name: `點 ${index}`, address: `地址 ${index}`, note: 'note' },
      eventDraft: { title: `行程 ${index}`, location: `地址 ${index}`, time: '25:00', type: 'bad-type', desc: 'desc', durationMinutes: 90 }
    }))
  };
  const result = normalizeRecommendationResponse(payload, {
    mode: 'dayPlan',
    selectedDay: 2,
    validDayNumbers: [1, 2, 3]
  });

  assert.equal(result.headline, '今日小提案');
  assert.equal(result.recommendations.length, 5);
  assert.equal(result.recommendations[0].suggestedDay, 2);
  assert.equal(result.recommendations[0].kind, 'event');
  assert.equal(result.recommendations[0].time, '');
  assert.equal(result.recommendations[0].eventDraft.type, 'sightseeing');
  assert.equal(result.recommendations[1].time, '09:30');
});

test('normalizes AI recommendations with Google place source data', () => {
  const result = normalizeRecommendationResponse({
    headline: 'Google-backed ideas',
    companionLine: 'Grounded candidates',
    recommendations: [{
      id: 'rec-google-1',
      kind: 'place',
      title: 'Namba Parks',
      locationText: 'Naniwa, Osaka',
      suggestedDay: 1,
      time: '',
      durationMinutes: 0,
      reason: 'Fits the Namba base.',
      caution: 'Check opening hours manually.',
      tags: ['shopping'],
      source: 'google_places',
      googlePlace: {
        placeId: 'google-place-1',
        name: 'Namba Parks',
        address: 'Naniwa, Osaka',
        lat: 34.661,
        lng: 135.502,
        types: ['shopping_mall']
      },
      placeDraft: { name: 'Namba Parks', address: 'Naniwa, Osaka', note: 'Near the stay.' },
      eventDraft: { title: 'Namba Parks', location: 'Naniwa, Osaka', time: '', type: 'shopping', desc: 'Browse nearby.', durationMinutes: 90 }
    }]
  }, {
    mode: 'placeIdeas',
    selectedDay: 1,
    validDayNumbers: [1, 2]
  });

  assert.equal(result.recommendations[0].source, 'google_places');
  assert.equal(result.recommendations[0].googlePlace.placeId, 'google-place-1');
  assert.equal(result.recommendations[0].googlePlace.lat, 34.661);
});

test('wires AI recommendations through server-only OpenAI configuration', () => {
  const functionsSource = fs.readFileSync(path.join(__dirname, '..', 'functions', 'index.js'), 'utf8');

  assert.equal(normalizeTripRecommendationMode('placeIdeas'), 'placeIdeas');
  assert.equal(normalizeTripRecommendationMode('bad'), '');
  assert.equal(recommendationResponseSchema.properties.recommendations.maxItems, 5);
  assert.equal(recommendationResponseSchema.properties.recommendations.items.properties.source.enum.includes('google_places'), true);
  assert.equal(recommendationResponseSchema.properties.recommendations.items.properties.googlePlace.required.includes('placeId'), true);
  assert.match(functionsSource, /const OPENAI_API_KEY = defineSecret\('OPENAI_API_KEY'\)/);
  assert.match(functionsSource, /getConfiguredOpenAIKey/);
  assert.match(functionsSource, /exports\.generateTripRecommendations = onCall\(\s*\{\s*secrets: \[OPENAI_API_KEY,\s*GOOGLE_GEOCODING_API_KEY\]/);
  assert.match(functionsSource, /buildExternalPlaceCandidateContext/);
  assert.match(functionsSource, /mode !== 'placeIdeas'/);
  assert.match(functionsSource, /userIdea: request\.data\?\.userIdea/);
  assert.match(functionsSource, /AI place recommendation Google fallback/);
  assert.doesNotMatch(functionsSource, /VITE_OPENAI_API_KEY/);
});

test('builds sanitized AI handbook snapshots with trip-only data', () => {
  const snapshot = buildTripHandbookSnapshot({
    trip: {
      access: { ownerEmail: 'owner@example.com', shareToken: 'secret-token', ownerUid: 'owner-uid' },
      meta: {
        title: '京都散步',
        dateRange: { start: '2026-07-01', end: '2026-07-03' },
        coverImage: 'data:image/png;base64,private-cover'
      },
      tripDetails: {
        accommodation: { name: 'Kyoto Stay', address: 'Kyoto Station' },
        budget: { total: '60000', currency: 'JPY' }
      },
      itinerary: [
        {
          day: 1,
          title: '抵達',
          date: '7/1',
          events: [
            {
              title: '入住飯店',
              time: '16:00',
              location: 'Kyoto Station',
              updatedByUid: 'uid-private'
            }
          ]
        }
      ],
      checklists: {
        preTrip: [{ id: 'check-root', text: '確認護照', done: false, assignedTo: 'private person' }],
        packing: [{ id: 'pack-root', text: '雨傘', done: false }]
      },
      shoppingList: [{ id: 'shop-root', name: '抹茶伴手禮', category: '伴手禮', purchased: false }]
    },
    events: [
      {
        id: 'event-doc',
        dayNumber: 1,
        title: '晚餐',
        time: '19:00',
        location: { address: 'Gion' },
        cost: { amount: 5000, currency: 'JPY' },
        updatedByUid: 'uid-event'
      }
    ],
    checklistItems: [
      { id: 'check-doc', listId: 'preTrip', text: '列印訂房資料', done: false, assignedTo: 'private person' }
    ],
    shoppingItems: [
      { id: 'shop-doc', name: '交通卡', category: '交通', purchased: false, updatedByUid: 'uid-shop' }
    ],
    expenses: [
      { id: 'expense-doc', title: '晚餐', amount: 5000, currency: 'JPY', payer: 'private payer' }
    ],
    placeIdeas: [
      { id: 'place-doc', name: '伏見稻荷', address: 'Kyoto', votes: [{ voterId: 'uid-1', name: 'Private Name', value: 1 }] }
    ]
  });

  assert.equal(snapshot.trip.title, '京都散步');
  assert.equal(snapshot.trip.dayCount, 1);
  assert.equal(snapshot.trip.eventCount, 1);
  assert.equal(snapshot.trip.accommodation.name, 'Kyoto Stay');
  assert.equal(snapshot.itinerary[0].events[0].title, '晚餐');
  assert.equal(snapshot.checklists.preTrip.some((item) => item.text === '列印訂房資料'), true);
  assert.equal(snapshot.shopping.some((item) => item.name === '交通卡'), true);
  assert.equal(snapshot.expenses.totalByCurrency[0].amount, 5000);
  assert.equal(Object.prototype.hasOwnProperty.call(snapshot.trip, 'coverImage'), false);

  const serialized = JSON.stringify(snapshot);
  assert.doesNotMatch(serialized, /owner@example\.com|secret-token|owner-uid|uid-private|uid-event|uid-shop|private person|private payer|Private Name|private-cover/);
});

test('normalizes AI handbook responses with predictable fallbacks', () => {
  const snapshot = buildTripHandbookSnapshot({
    trip: {
      meta: { title: '京都散步', dateRange: { start: '2026-07-01', end: '2026-07-03' } },
      itinerary: [
        {
          day: 1,
          title: '抵達',
          date: '7/1',
          events: [{ title: '入住飯店', time: '16:00', location: 'Kyoto Station' }]
        }
      ]
    },
    expenses: [{ id: 'expense-doc', title: '晚餐', amount: 5000, currency: 'JPY' }]
  });
  const normalized = normalizeHandbookResponse({
    cover: { title: '', subtitle: '  小旅行  ', dateText: '', intro: '' },
    overview: { summary: '', highlights: ['第一站', '', '第二站'] },
    days: [],
    logistics: { accommodation: {}, flights: [], notes: [] },
    lists: { preTrip: [], packing: [], shopping: [] },
    expenses: { summary: '', totals: [] },
    manualChecks: ['請自行確認營業時間'],
    visuals: {
      coverImageStatus: 'generated',
      coverImageUrl: 'https://firebasestorage.googleapis.com/v0/b/trip-planner-36455.firebasestorage.app/o/trip-handbooks%2Ftrip%2Flatest-cover.jpg?alt=media&token=test-token',
      coverImagePath: 'trip-handbooks/trip/latest-cover.jpg',
      coverImageDataUrl: 'data:image/jpeg;base64,abc123'
    }
  }, snapshot);

  assert.equal(normalized.cover.title, '京都散步');
  assert.equal(normalized.cover.subtitle, '小旅行');
  assert.equal(normalized.days.length, 1);
  assert.equal(normalized.days[0].schedule[0].title, '入住飯店');
  assert.equal(normalized.expenses.totals[0].currency, 'JPY');
  assert.equal(normalized.manualChecks[0], '請自行確認營業時間');
  assert.equal(normalized.visuals.coverImageStatus, 'generated');
  assert.match(normalized.visuals.coverImageUrl, /firebasestorage\.googleapis\.com/);
  assert.equal(normalized.visuals.coverImageDataUrl, 'data:image/jpeg;base64,abc123');
});

test('wires AI handbook generation and print-only handbook UI', () => {
  const functionsSource = fs.readFileSync(path.join(__dirname, '..', 'functions', 'index.js'), 'utf8');
  const detailPageSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'pages', 'TripDetailPage.jsx'), 'utf8');
  const moreTabSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'trip', 'MoreTab.jsx'), 'utf8');
  const summarySource = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'trip', 'SummaryTab.jsx'), 'utf8');
  const modalSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'trip', 'TripHandbookModal.jsx'), 'utf8');
  const hookSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'hooks', 'useTripHandbook.js'), 'utf8');
  const serviceSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'services', 'tripHandbookService.js'), 'utf8');
  const pdfSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'utils', 'tripHandbookPdf.js'), 'utf8');
  const stylesSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles', 'index.css'), 'utf8');

  assert.equal(handbookResponseSchema.required.includes('cover'), true);
  assert.equal(handbookResponseSchema.properties.days.maxItems, 30);
  assert.match(functionsSource, /exports\.generateTripHandbook = onCall\(\s*\{\s*secrets: \[OPENAI_API_KEY\]/);
  assert.match(functionsSource, /timeoutSeconds: 180/);
  assert.match(functionsSource, /OPENAI_IMAGES_ENDPOINT/);
  assert.match(functionsSource, /OPENAI_IMAGE_MODEL/);
  assert.match(functionsSource, /admin\.storage\(\)\.bucket/);
  assert.match(functionsSource, /firebaseStorageDownloadTokens/);
  assert.match(functionsSource, /coverImageDataUrl/);
  assert.match(functionsSource, /exports\.getTripHandbook = onCall/);
  assert.match(functionsSource, /collection\('handbooks'\)\.doc\(TRIP_HANDBOOK_DOC_ID\)/);
  assert.match(functionsSource, /handbook: storedResult/);
  assert.match(functionsSource, /aiHandbookRateLimits/);
  assert.match(functionsSource, /role !== 'owner' && role !== 'editor'/);
  assert.match(functionsSource, /buildTripHandbookSnapshot/);
  assert.match(serviceSource, /httpsCallable\(functions,\s*'generateTripHandbook'\)/);
  assert.match(serviceSource, /httpsCallable\(functions,\s*'getTripHandbook'\)/);
  assert.match(hookSource, /requestSavedTripHandbook/);
  assert.match(hookSource, /exportTripHandbookPdf/);
  assert.match(hookSource, /response\.visuals\?\.coverImageDataUrl/);
  assert.doesNotMatch(hookSource, /window\.print\(\)/);
  assert.match(detailPageSource, /useTripHandbook/);
  assert.match(detailPageSource, /TripHandbookModal/);
  assert.doesNotMatch(detailPageSource, /trip-handbook-print-root/);
  assert.match(detailPageSource, /tripHandbook\.isOpen/);
  assert.match(moreTabSource, /旅遊手冊/);
  assert.match(summarySource, /onOpenHandbook/);
  assert.match(modalSource, /normalizeCoverImageUrl/);
  assert.match(modalSource, /getHandbookCoverImage/);
  assert.match(modalSource, /trip-handbook-cover-visual/);
  assert.match(modalSource, /匯出 PDF/);
  assert.doesNotMatch(modalSource, /AI Travel Handbook|AI 旅遊手冊|AI 情境圖/);
  assert.match(pdfSource, /buildPdfFromJpegs/);
  assert.match(pdfSource, /drawDoodleCluster/);
  assert.match(pdfSource, /drawSuitcase/);
  assert.match(pdfSource, /handbook\.visuals\?\.coverImageDataUrl/);
  assert.doesNotMatch(pdfSource, /AI 只整理/);
  assert.match(pdfSource, /application\/pdf/);
  assert.match(stylesSource, /@media print/);
  assert.match(stylesSource, /body\.trip-handbook-printing \*/);
  assert.match(stylesSource, /print-color-adjust: exact/);
  assert.doesNotMatch(functionsSource, /VITE_OPENAI_API_KEY/);
});

test('builds app objects from AI recommendation cards', () => {
  const response = normalizeAiRecommendationResponse({
    generatedAt: '2026-06-05T00:00:00.000Z',
    headline: 'AI 建議',
    companionLine: '先試試這些',
    recommendations: [{
      id: 'rec-1',
      kind: 'event',
      title: '上野散步',
      locationText: 'Ueno Park',
      suggestedDay: 2,
      time: '9:05',
      durationMinutes: 75,
      reason: '離住宿近',
      caution: '雨天備案',
      tags: ['輕鬆'],
      placeDraft: { name: '上野公園', address: 'Ueno Park', note: '靠近住宿' },
      eventDraft: { title: '上野公園散步', location: 'Ueno Park', time: '09:05', type: 'bad', desc: '散步', durationMinutes: 75 }
    }]
  });
  const recommendation = response.recommendations[0];
  const place = createPlaceFromAiRecommendation(recommendation);
  const event = createEventFromAiRecommendation(recommendation);

  assert.equal(response.headline, '旅伴建議');
  assert.equal(response.recommendations.length, 1);
  assert.equal(place.status, 'idea');
  assert.equal(place.plannedDay, null);
  assert.match(place.note, /可以這樣排/);
  assert.equal(event.title, '上野公園散步');
  assert.equal(event.time, '09:05');
  assert.equal(event.type, 'sightseeing');
  assert.equal(event.transport.duration, '75 分鐘');
});

test('builds place ideas with Google place fields from AI recommendations', () => {
  const response = normalizeAiRecommendationResponse({
    generatedAt: '2026-06-05T00:00:00.000Z',
    headline: 'Google candidates',
    companionLine: 'Pick one',
    recommendations: [{
      id: 'rec-google-1',
      kind: 'place',
      title: 'Namba Parks',
      locationText: 'Naniwa, Osaka',
      suggestedDay: 1,
      time: '',
      durationMinutes: 0,
      reason: 'Near the hotel.',
      caution: 'Check hours manually.',
      tags: ['shopping'],
      source: 'google_places',
      googlePlace: {
        placeId: 'google-place-1',
        name: 'Namba Parks',
        address: 'Naniwa, Osaka',
        lat: 34.661,
        lng: 135.502,
        types: ['shopping_mall']
      },
      placeDraft: { name: 'Namba Parks', address: 'Naniwa, Osaka', note: 'Near the hotel.' },
      eventDraft: { title: 'Namba Parks', location: 'Naniwa, Osaka', time: '', type: 'shopping', desc: 'Browse.', durationMinutes: 90 }
    }]
  });
  const place = createPlaceFromAiRecommendation(response.recommendations[0]);

  assert.equal(place.name, 'Namba Parks');
  assert.equal(place.address, 'Naniwa, Osaka');
  assert.equal(place.placeId, 'google-place-1');
  assert.equal(place.lat, 34.661);
  assert.equal(place.lng, 135.502);
});

test('keeps Google sign-in on the login page when popup auth is unavailable', () => {
  const authSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'contexts', 'AuthContext.jsx'), 'utf8');
  const loginSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'pages', 'LoginPage.jsx'), 'utf8');

  assert.match(authSource, /signInWithPopup\(auth, provider\)/);
  assert.match(authSource, /auth\/popup-unavailable/);
  assert.doesNotMatch(authSource, /signInWithRedirect/);
  assert.match(loginSource, /popup-unavailable/);
  assert.match(loginSource, /Email 驗證碼/);
});

test('keeps AI recommendation entry points visible in trip tabs', () => {
  const panelSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'trip', 'TripAiRecommendationPanel.jsx'), 'utf8');
  const hookSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'hooks', 'useTripAiRecommendations.js'), 'utf8');
  const serviceSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'services', 'tripAiService.js'), 'utf8');
  const tripDetailSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'pages', 'TripDetailPage.jsx'), 'utf8');
  const todaySource = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'trip', 'TodayTab.jsx'), 'utf8');
  const ideasSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'trip', 'IdeasTab.jsx'), 'utf8');
  const stylesSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles', 'index.css'), 'utf8');
  const petAssetPath = path.join(__dirname, '..', 'src', 'assets', 'ai', 'pixel-navibun.png');
  const petAtlasPath = path.join(__dirname, '..', 'src', 'assets', 'ai', 'pixel-navibun-atlas.png');

  assert.match(panelSource, /const AiTravelPet/);
  assert.match(panelSource, /pixel-navibun-atlas\.png/);
  assert.match(panelSource, /petAnimationStates/);
  assert.match(panelSource, /petMood/);
  assert.match(panelSource, /lastFrameIndex = Math\.max\(animation\.frames - 1, 0\)/);
  assert.match(panelSource, /tp-ai-pet-presence/);
  assert.match(panelSource, /叫回旅伴/);
  assert.match(panelSource, /EyeOff/);
  assert.match(panelSource, /isCompanionHidden/);
  assert.match(panelSource, /onHideCompanion/);
  assert.match(panelSource, /onSummon/);
  assert.match(panelSource, /PET_POSITION_STORAGE_KEY = 'tripPlanner\.aiCompanionPosition'/);
  assert.match(panelSource, /offsetLeft: 0/);
  assert.match(panelSource, /offsetTop: 0/);
  assert.doesNotMatch(panelSource, /visualViewport\?\.offsetLeft/);
  assert.doesNotMatch(panelSource, /visualViewport\?\.offsetTop/);
  assert.match(panelSource, /onPointerDown=\{handleCompanionPointerDown\}/);
  assert.match(panelSource, /onPointerMove=\{handleCompanionPointerMove\}/);
  assert.match(panelSource, /onPointerUp=\{handleCompanionPointerEnd\}/);
  assert.match(panelSource, /data-drag-state=\{companionDragState\}/);
  assert.match(panelSource, /floatingPetMood/);
  assert.match(panelSource, /AI_INITIAL_IDEA_MAX_LENGTH = 600/);
  assert.match(panelSource, /id="trip-ai-initial-idea"/);
  assert.match(panelSource, /title="旅伴"/);
  assert.match(panelSource, /onGenerate\?\.\('dayPlan', \{ userIdea: initialIdeaText \}\)/);
  assert.doesNotMatch(panelSource, /modeOptions\.map|id: 'placeIdeas'/);
  assert.doesNotMatch(panelSource, /召喚 AI 旅伴|開啟 AI 旅伴|隱藏 AI 旅伴|關閉 AI 旅伴|AI 推薦/);
  assert.doesNotMatch(panelSource, /Google 地點資料|AI 推測|我只會讀這趟旅程目前的內容/);
  assert.doesNotMatch(panelSource, /petMoodClasses|petMoodDotClasses/);
  assert.match(hookSource, /COMPANION_HIDDEN_STORAGE_KEY = 'tripPlanner\.aiCompanionHidden'/);
  assert.match(hookSource, /isCompanionHidden/);
  assert.match(hookSource, /hideCompanion/);
  assert.match(hookSource, /summonCompanion/);
  assert.match(hookSource, /const validModes = new Set\(\['dayPlan'\]\)/);
  assert.match(hookSource, /userIdea: requestOptions\.userIdea/);
  assert.match(serviceSource, /MAX_USER_IDEA_LENGTH = 600/);
  assert.match(serviceSource, /payload\.userIdea = safeUserIdea/);
  assert.match(tripDetailSource, /isCompanionHidden=\{tripAi\.isCompanionHidden\}/);
  assert.match(tripDetailSource, /onHideCompanion=\{tripAi\.hideCompanion\}/);
  assert.match(tripDetailSource, /onSummon=\{tripAi\.summonCompanion\}/);
  assert.match(todaySource, /幫我排第/);
  assert.doesNotMatch(todaySource, /AI 旅伴幫我排/);
  assert.equal(fs.existsSync(petAssetPath), true);
  assert.equal(fs.existsSync(petAtlasPath), true);
  assert.match(stylesSource, /@keyframes tp-ai-pet-sprite/);
  assert.match(stylesSource, /@keyframes tp-ai-pet-presence/);
  assert.match(stylesSource, /@keyframes tp-ai-companion-lift/);
  assert.match(stylesSource, /@keyframes tp-ai-companion-land/);
  assert.match(stylesSource, /\.tp-ai-pet-sprite/);
  assert.match(stylesSource, /animation-iteration-count: 1/);
  assert.match(stylesSource, /\.tp-ai-pet-presence/);
  assert.match(stylesSource, /\.tp-ai-companion-button\[data-drag-state="dragging"\]/);
  assert.match(stylesSource, /\.tp-ai-companion-button\[data-drag-state="landing"\]/);
  assert.match(todaySource, /openAiRecommendations\?\.\('dayPlan'\)/);
  assert.doesNotMatch(ideasSource, /openAiRecommendations\?\.\('placeIdeas'\)/);
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

test('uses manual event locations when saved place details are empty', () => {
  const event = {
    id: 'manual-location',
    title: 'Manual stop',
    time: '10:15:00.000',
    location: 'Taipei Main Station',
    locationPlace: {}
  };
  const state = buildItineraryRouteState([event]);

  assert.equal(getEventLocationText(event), 'Taipei Main Station');
  assert.equal(normalizeEventTime(event.time), '10:15');
  assert.equal(state.routeStopCount, 1);
  assert.equal(state.routeStops[0].text, 'Taipei Main Station');
  assert.equal(state.routeStops[0].time, '10:15');
});

test('picks next event with trip-day dates instead of only wall-clock time', () => {
  const events = [
    { id: 'late', title: 'Late stop', time: '12:00' },
    { id: 'early', title: 'Early stop', time: '10:00' }
  ];
  const now = new Date(2026, 4, 29, 11, 30);

  assert.equal(getTripDayIsoDate('2026/5/29', 3), '2026-05-31');
  assert.equal(pickNextEvent(events, now, '2026-06-02').id, 'early');
  assert.equal(pickNextEvent(events, now, '2026-05-29').id, 'late');
  assert.equal(pickNextEvent(events, now, '').id, 'late');
});

test('builds due trip notification candidates with timezone-aware dedupe keys', () => {
  const source = {
    tripId: 'trip-notify',
    trip: {
      id: 'trip-notify',
      checklists: {
        preTrip: [{ id: 'passport', text: 'Passport', done: false }],
        packing: [{ id: 'charger', text: 'Charger', done: true }]
      }
    },
    details: [
      {
        id: 'meta',
        title: 'Tokyo',
        dateRange: { start: '2026-05-02', end: '2026-05-04' }
      },
      {
        id: 'logistics',
        flights: {
          outbound: {
            code: 'BR198',
            date: '2026-05-03',
            departureTime: '09:00'
          },
          inbound: {
            code: 'BR197',
            date: '2026-05-05',
            departureTime: ''
          }
        }
      }
    ],
    days: [
      { id: 'day-1', dayNumber: 1, title: 'Arrival', date: '2026-05-02' }
    ],
    events: [
      { id: 'event-1', dayNumber: 1, title: 'Hotel check-in', time: '10:30', location: 'Ueno' },
      { id: 'event-missing-time', dayNumber: 1, title: 'No time', location: 'Tokyo' }
    ],
    checklistItems: []
  };

  assert.equal(
    zonedDateTimeToUtcMs({ date: '2026-05-02', time: '08:00', timeZone: 'Asia/Taipei' }),
    Date.parse('2026-05-02T00:00:00.000Z')
  );

  const daily = buildTripNotificationCandidates({
    ...source,
    preference: { enabled: true, timezone: 'Asia/Taipei' },
    now: new Date('2026-05-02T00:05:00.000Z')
  });
  assert.equal(daily.some((candidate) => candidate.category === 'dailySummary'), false);

  const event = buildTripNotificationCandidates({
    ...source,
    preference: { enabled: true, timezone: 'Asia/Taipei' },
    now: new Date('2026-05-02T01:35:00.000Z')
  });
  const eventCandidate = event.find((candidate) => candidate.dedupeId === 'event:trip-notify:event-1:60');
  assert.ok(eventCandidate);
  assert.equal(eventCandidate.body, 'Ueno');
  assert.doesNotMatch(eventCandidate.body, /\d{2}:\d{2}/);
  assert.equal(event.some((candidate) => /missing-time/.test(candidate.dedupeId)), false);

  const flight = buildTripNotificationCandidates({
    ...source,
    preference: { enabled: true, timezone: 'Asia/Taipei' },
    now: new Date('2026-05-02T01:05:00.000Z')
  });
  const flightCandidate = flight.find((candidate) => (
    candidate.dedupeId === 'flight:trip-notify:outbound:2026-05-03:09:00:24'
  ));
  assert.ok(flightCandidate);
  assert.equal(flightCandidate.body, 'BR198 即將起飛');
  assert.doesNotMatch(flightCandidate.body, /\d{2}:\d{2}/);
  assert.equal(flight.some((candidate) => /inbound/.test(candidate.dedupeId)), false);

  const checklist = buildTripNotificationCandidates({
    ...source,
    preference: { enabled: true, timezone: 'Asia/Taipei' },
    now: new Date('2026-05-01T00:05:00.000Z')
  });
  assert.equal(checklist.some((candidate) => (
    candidate.dedupeId === 'checklist:trip-notify:2026-05-02:1'
  )), true);

  const payload = JSON.parse(buildWebPushPayload(event.find((candidate) => candidate.category === 'event')));
  assert.equal(payload.data.url, '/trip/trip-notify');
  assert.equal(payload.data.category, 'event');
});

test('routes collaboration updates to in-app realtime notifications', () => {
  const normalizedCategories = normalizeCategories({});
  assert.equal(normalizedCategories.event, true);
  assert.equal(normalizedCategories.flight, true);
  assert.equal(normalizedCategories.checklist, true);
  assert.equal(Object.prototype.hasOwnProperty.call(normalizedCategories, 'collaboration'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(normalizedCategories, 'dailySummary'), false);

  const functionsSource = fs.readFileSync(path.join(__dirname, '..', 'functions/index.js'), 'utf8');
  const pushServiceSource = fs.readFileSync(path.join(__dirname, '..', 'src/services/pushNotificationService.js'), 'utf8');
  const cardSource = fs.readFileSync(path.join(__dirname, '..', 'src/components/trip/TripNotificationCard.jsx'), 'utf8');
  const moreSource = fs.readFileSync(path.join(__dirname, '..', 'src/components/trip/MoreTab.jsx'), 'utf8');
  const summarySource = fs.readFileSync(path.join(__dirname, '..', 'src/components/trip/SummaryTab.jsx'), 'utf8');
  const activityListSource = fs.readFileSync(path.join(__dirname, '..', 'src/components/trip/CollaborationActivityList.jsx'), 'utf8');
  const todaySource = fs.readFileSync(path.join(__dirname, '..', 'src/components/trip/TodayTab.jsx'), 'utf8');
  const tripDetailSource = fs.readFileSync(path.join(__dirname, '..', 'src/pages/TripDetailPage.jsx'), 'utf8');

  assert.doesNotMatch(pushServiceSource, /collaboration:\s*true/);
  assert.doesNotMatch(pushServiceSource, /dailySummary:\s*true/);
  assert.match(cardSource, /notificationCategoryLabels/);
  assert.doesNotMatch(cardSource, /旅伴更新/);
  assert.match(moreSource, /TripNotificationCard/);
  assert.match(moreSource, /提醒與裝置/);
  assert.match(moreSource, /CollaborationActivityList/);
  assert.match(summarySource, /CollaborationActivityList/);
  assert.match(activityListSource, /collaboration-update/);
  assert.match(activityListSource, /normalizeActivityLabel/);
  assert.match(activityListSource, /LEGACY_PACKING_CLOTHING_TITLES/);
  assert.doesNotMatch(todaySource, /TripNotificationCard/);
  assert.match(functionsSource, /type:\s*'collaboration-update'/);
  assert.match(functionsSource, /getCollaborationChecklistMeta/);
  assert.match(functionsSource, /entityKind:\s*'packing-clothing'/);
  assert.match(functionsSource, /appendRealtimeActivity/);
  assert.match(functionsSource, /publishTripCollaborationActivity/);
  assert.match(functionsSource, /getCollaborationDayLabel/);
  assert.match(functionsSource, /`第 \$\{dayNumber\} 天`/);
  assert.match(functionsSource, /eventSummary/);
  assert.doesNotMatch(functionsSource, /category:\s*'collaboration'/);
  assert.doesNotMatch(functionsSource, /isCollaborationNotificationEnabled/);
  assert.match(functionsSource, /notifyTripEventWrite/);
  assert.match(functionsSource, /notifyTripDayWrite/);
  assert.match(functionsSource, /notifyTripDetailWrite/);
  assert.match(functionsSource, /notifyTripChecklistItemWrite/);
  assert.match(functionsSource, /notifyTripShoppingItemWrite/);
  assert.match(functionsSource, /notifyTripExpenseWrite/);
  assert.match(functionsSource, /notifyTripPlaceIdeaWrite/);
  assert.match(functionsSource, /notifyTripShoppingCategoryWrite/);
  assert.doesNotMatch(functionsSource, /notifyTripRootWrite/);
  assert.match(tripDetailSource, /collaboration-update/);
  assert.match(tripDetailSource, /seenCollaborationActivityIdsRef/);
  assert.match(tripDetailSource, /activity\.actorUid && activity\.actorUid === currentUid/);
  assert.match(tripDetailSource, /duration:\s*4200/);
  assert.match(tripDetailSource, /size:\s*'compact'/);
});

test('passes trip-day dates into travel next-event surfaces', () => {
  const todaySource = fs.readFileSync(path.join(__dirname, '..', 'src/components/trip/TodayTab.jsx'), 'utf8');
  const summarySource = fs.readFileSync(path.join(__dirname, '..', 'src/components/trip/SummaryTab.jsx'), 'utf8');

  assert.match(todaySource, /getTripDayIsoDate\(tripDetails\?\.dateRange\?\.start,\s*selectedDay\)/);
  assert.match(todaySource, /pickNextEvent\(events,\s*new Date\(\),\s*selectedDayIsoDate\)/);
  assert.match(summarySource, /getSummaryNextEvent\(itinerary,\s*selectedDay,\s*tripDetails\)/);
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
      time: '12:00:00.000',
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
  assert.equal(document.time, '12:00');
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

  const normalized = buildEventReadiness({
    time: '09:30:00.000',
    location: 'Taipei Main Station',
    locationPlace: {}
  });
  assert.equal(normalized.hasTime, true);
  assert.equal(normalized.hasLocation, true);
  assert.equal(normalized.locationText, 'Taipei Main Station');

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

test('saves split trip detail documents before best-effort root mirrors', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src/services/tripService.js'), 'utf8');
  const metaBody = source.match(/export const updateTripMetaFields[\s\S]*?return meta;\n};/)?.[0] || '';
  const accommodationBody = source.match(/export const updateTripAccommodationFields[\s\S]*?return nextAccommodation;\n};/)?.[0] || '';
  const flightsBody = source.match(/export const updateTripFlightsFields[\s\S]*?return nextFlights;\n};/)?.[0] || '';
  const budgetBody = source.match(/export const updateTripBudgetFields[\s\S]*?return nextBudget;\n};/)?.[0] || '';

  assert.match(source, /const updateTripRootMirrorFields = async/);
  assert.match(metaBody, /await setDoc\(detailRef/);
  assert.match(metaBody, /await updateTripRootMirrorFields/);
  assert.doesNotMatch(metaBody, /batch\.update/);
  assert.match(accommodationBody, /await setDoc\(getTripDetailDocRef/);
  assert.match(accommodationBody, /await updateTripRootMirrorFields/);
  assert.doesNotMatch(accommodationBody, /batch\.update/);
  assert.match(flightsBody, /await setDoc\(getTripDetailDocRef/);
  assert.match(flightsBody, /await updateTripRootMirrorFields/);
  assert.doesNotMatch(flightsBody, /batch\.update/);
  assert.match(budgetBody, /await setDoc\(getTripDetailDocRef/);
  assert.match(budgetBody, /await updateTripRootMirrorFields/);
  assert.doesNotMatch(budgetBody, /batch\.update/);
});

test('keeps companion invite flows as an explicit navigation destination', () => {
  const detailPageSource = fs.readFileSync(path.join(__dirname, '..', 'src/pages/TripDetailPage.jsx'), 'utf8');
  const bottomNavigationSource = fs.readFileSync(path.join(__dirname, '..', 'src/components/BottomNavigation.jsx'), 'utf8');
  const moreTabSource = fs.readFileSync(path.join(__dirname, '..', 'src/components/trip/MoreTab.jsx'), 'utf8');
  const shareCardSource = fs.readFileSync(path.join(__dirname, '..', 'src/components/trip/ShareCollaborationCard.jsx'), 'utf8');

  assert.match(detailPageSource, /MORE_CHILD_TABS = new Set\(\[[^\]]*'companions'/);
  assert.match(detailPageSource, /activeTab === 'companions'/);
  assert.match(bottomNavigationSource, /id: 'companions'/);
  assert.match(bottomNavigationSource, /mobileMoreTabIds[\s\S]*'companions'/);
  assert.match(moreTabSource, /section === 'companions'/);
  assert.match(moreTabSource, /onTabChange\?\.\('companions'\)/);
  assert.doesNotMatch(moreTabSource, /trip-collaboration-card/);
  assert.match(shareCardSource, /isInviteLoading \? '邀請碼載入中\.\.\.'/);
});

test('keeps high-friction mobile form controls explicit', () => {
  const placePoolSource = fs.readFileSync(path.join(__dirname, '..', 'src/components/trip/PlacePoolCard.jsx'), 'utf8');
  const shoppingSource = fs.readFileSync(path.join(__dirname, '..', 'src/components/ShoppingListContent.jsx'), 'utf8');
  const summarySource = fs.readFileSync(path.join(__dirname, '..', 'src/components/trip/SummaryTab.jsx'), 'utf8');
  const logisticsSource = fs.readFileSync(path.join(__dirname, '..', 'src/components/trip/LogisticsTab.jsx'), 'utf8');
  const bottomNavigationSource = fs.readFileSync(path.join(__dirname, '..', 'src/components/BottomNavigation.jsx'), 'utf8');
  const ideasSource = fs.readFileSync(path.join(__dirname, '..', 'src/components/trip/IdeasTab.jsx'), 'utf8');
  const itinerarySource = fs.readFileSync(path.join(__dirname, '..', 'src/components/trip/ItineraryTab.jsx'), 'utf8');
  const shoppingTabSource = fs.readFileSync(path.join(__dirname, '..', 'src/components/trip/ShoppingTab.jsx'), 'utf8');
  const editEventSource = fs.readFileSync(path.join(__dirname, '..', 'src/components/EditEventForm.jsx'), 'utf8');
  const tripDetailSource = fs.readFileSync(path.join(__dirname, '..', 'src/pages/TripDetailPage.jsx'), 'utf8');

  assert.match(placePoolSource, /id="place-pool-target-day"/);
  assert.match(placePoolSource, /setTargetDay\(Number\(event\.target\.value\)\)/);
  assert.match(shoppingSource, /onFocus=\{\(event\) => event\.target\.select\(\)\}/);
  assert.match(shoppingSource, /onClick=\{\(event\) => event\.currentTarget\.select\(\)\}/);
  assert.match(shoppingSource, /onMouseUp=\{\(event\) => event\.preventDefault\(\)\}/);
  assert.match(bottomNavigationSource, /env\(safe-area-inset-bottom\)/);
  assert.match(tripDetailSource, /--footer-nav-height[\s\S]*env\(safe-area-inset-bottom\)/);
  assert.match(ideasSource, /pb-40/);
  assert.match(itinerarySource, /pb-40/);
  assert.match(shoppingTabSource, /pb-44/);
  assert.match(editEventSource, /fixed inset-x-0 bottom-0/);
  assert.match(summarySource, /budgetSummaryText/);
  assert.match(summarySource, /totalCost\.toLocaleString\(\)/);
  assert.match(logisticsSource, /compactSummary/);
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

test('recognizes split document writes as root timestamp touch snapshots', () => {
  Object.values(TRIP_DOCUMENT_TOUCH_OPERATIONS).forEach((operation) => {
    assert.equal(isTripDocumentTouchOperation({ updatedByOperation: operation }), true);
  });
  assert.equal(isTripDocumentTouchOperation({ updatedByOperation: 'trip-details' }), false);
  assert.equal(isTripDocumentTouchOperation({ updatedByOperation: PLACE_VOTE_OPERATION }), false);
});

test('chooses the latest valid trip activity timestamp', () => {
  assert.equal(getLatestIsoTimestamp(
    '2026-05-28T10:00:00.000Z',
    '2026-05-29T09:30:00.000Z',
    'not-a-date'
  ), '2026-05-29T09:30:00.000Z');
  assert.equal(getLatestIsoTimestamp(['', null, undefined]), '');
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

test('summarizes sync conflicts with actor and changed section', () => {
  assert.equal(getTripSyncOperationLabel(TRIP_DOCUMENT_TOUCH_OPERATIONS.expense), '費用');
  assert.equal(getTripSyncOperationLabel('unknown-operation'), '旅程內容');

  const summary = buildSyncConflictSummary({
    syncConflict: {
      remoteData: {
        syncMeta: {
          updatedByUid: 'member-1',
          updatedByOperation: TRIP_DOCUMENT_TOUCH_OPERATIONS.event,
          updatedEntityId: 'event-123456789012345678901234567890',
          updatedAt: '2026-06-26T07:05:00.000Z'
        }
      }
    },
    members: [{ uid: 'member-1', displayName: 'Ada' }],
    currentUser: { uid: 'owner-1' }
  });

  assert.match(summary, /Ada 更新了行程/);
  assert.match(summary, /event-123456789012345678/);
  assert.match(summary, /·/);

  const sameUserSummary = buildSyncConflictSummary({
    syncConflict: {
      remoteData: {
        syncMeta: {
          updatedByUid: 'owner-1',
          updatedByOperation: 'trip-details'
        }
      }
    },
    currentUser: { uid: 'owner-1' }
  });

  assert.equal(sameUserSummary, '你的另一個裝置更新了旅程資訊');

  const detailPageSource = fs.readFileSync(path.join(__dirname, '..', 'src/pages/TripDetailPage.jsx'), 'utf8');
  assert.match(detailPageSource, /buildSyncConflictSummary/);
  assert.match(detailPageSource, /syncConflictSummary/);
  assert.match(detailPageSource, /使用最新內容/);
  assert.match(detailPageSource, /保留我的內容/);
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

test('groups presence editing targets by event and trip detail section', () => {
  const state = buildPresenceUiState({
    currentUser: { uid: 'owner-1', displayName: 'Owner' },
    members: [
      { uid: 'owner-1', displayName: 'Owner', role: 'owner' },
      { uid: 'member-1', displayName: 'Ada', role: 'editor' },
      { uid: 'member-2', displayName: 'Ben', role: 'editor' },
      { uid: 'member-3', displayName: 'Cia', role: 'editor' }
    ],
    onlineMembers: [
      {
        uid: 'owner-1',
        online: true,
        profile: { displayName: 'Owner' },
        connections: [{ clientId: 'self', editingTarget: 'trip-details:meta' }]
      },
      {
        uid: 'member-1',
        online: true,
        profile: { displayName: 'Ada' },
        connections: [
          { clientId: 'a', editingTarget: 'trip-details:flights:outbound' },
          { clientId: 'b', editingTarget: 'event:event-1' }
        ]
      },
      {
        uid: 'member-2',
        online: true,
        profile: { displayName: 'Ben' },
        connections: [{ clientId: 'c', editingTarget: 'trip-details:flights:outbound' }]
      },
      {
        uid: 'member-3',
        online: true,
        profile: { displayName: 'Cia' },
        connections: [
          { clientId: 'd', editingTarget: 'trip-details:flights:outbound' },
          { clientId: 'e', editingTarget: 'trip-details:flights:outbound' }
        ]
      }
    ]
  });

  assert.deepEqual(state.editingByEventId['event-1'].map((member) => member.uid), ['member-1']);
  assert.deepEqual(
    state.editingByTarget['trip-details:flights:outbound'].map((member) => member.uid),
    ['member-1', 'member-2', 'member-3']
  );
  assert.equal(getEditingMembersForTarget(state.editingByTarget, 'trip-details:meta').length, 0);
  assert.equal(
    formatEditingMembersText(getEditingMembersForTarget(state.editingByTarget, 'trip-details:flights:outbound')),
    'Ada、Ben 等 1 人'
  );
});

test('groups top-level presence editing targets without connection targets', () => {
  const state = buildPresenceUiState({
    currentUser: { uid: 'owner-1', displayName: 'Owner' },
    onlineMembers: [
      {
        uid: 'owner-1',
        online: true,
        editingTarget: 'trip-details:meta',
        profile: { displayName: 'Owner' },
        connections: []
      },
      {
        uid: 'member-1',
        online: true,
        editingTarget: 'trip-details:flights:inbound',
        profile: { displayName: 'Ada' },
        connections: []
      },
      {
        uid: 'member-2',
        online: true,
        editingTarget: 'event:event-2',
        profile: { displayName: 'Ben' },
        connections: []
      }
    ]
  });

  assert.deepEqual(
    state.editingByTarget['trip-details:flights:inbound'].map((member) => member.uid),
    ['member-1']
  );
  assert.deepEqual(state.editingByEventId['event-2'].map((member) => member.uid), ['member-2']);
  assert.equal(getEditingMembersForTarget(state.editingByTarget, 'trip-details:meta').length, 0);
});

test('uses realtime editing entries when presence target details are missing', () => {
  const state = buildPresenceUiState({
    currentUser: { uid: 'owner-1', displayName: 'Owner' },
    members: [
      { uid: 'owner-1', displayName: 'Owner', role: 'owner' },
      { uid: 'member-1', displayName: 'Ada', role: 'editor' },
      { uid: 'member-2', displayName: 'Ben', role: 'editor' }
    ],
    onlineMembers: [
      {
        uid: 'member-1',
        online: true,
        profile: { displayName: 'Ada' },
        connections: []
      }
    ],
    realtimeEditingByTarget: {
      'shopping:list': [
        {
          uid: 'member-1',
          target: 'shopping:list',
          activeTab: 'shopping',
          updatedAt: 1767225600000
        }
      ],
      'event:event-3': [
        {
          uid: 'member-2',
          target: 'event:event-3',
          activeTab: 'itinerary',
          updatedAt: 1767225600000
        }
      ]
    }
  });

  assert.deepEqual(state.editingByTarget['shopping:list'].map((member) => member.uid), ['member-1']);
  assert.deepEqual(state.editingByEventId['event-3'].map((member) => member.uid), ['member-2']);
  assert.equal(state.editingByTarget['shopping:list'][0].editingLabel, '正在編輯購物清單');
});

test('labels supported editing targets', () => {
  assert.equal(getEditingTargetLabel('trip-details:meta'), '正在編輯旅程資訊');
  assert.equal(getEditingTargetLabel('trip-details:accommodation'), '正在編輯住宿資訊');
  assert.equal(getEditingTargetLabel('trip-details:budget'), '正在編輯旅程預算');
  assert.equal(getEditingTargetLabel('trip-details:flights:outbound'), '正在編輯去程航班');
  assert.equal(getEditingTargetLabel('trip-details:flights:inbound'), '正在編輯回程航班');
  assert.equal(getEditingTargetLabel('day:2'), '正在編輯 Day 資訊');
  assert.equal(getEditingTargetLabel('event:new'), '正在新增行程');
  assert.equal(getEditingTargetLabel('event:event-1'), '正在編輯行程');
  assert.equal(getEditingTargetLabel('ideas:list'), '正在編輯想去地點');
  assert.equal(getEditingTargetLabel('place:place-1'), '正在編輯想去地點');
  assert.equal(getEditingTargetLabel('checklist:preTrip'), '正在編輯行前清單');
  assert.equal(getEditingTargetLabel('checklist:preTrip:item-1'), '正在編輯行前清單');
  assert.equal(getEditingTargetLabel('checklist:packing'), '正在編輯行李清單');
  assert.equal(getEditingTargetLabel('shopping:list'), '正在編輯購物清單');
  assert.equal(getEditingTargetLabel('shopping:item-1'), '正在編輯購物清單');
  assert.equal(getEditingTargetLabel('expenses:list'), '正在編輯費用');
  assert.equal(getEditingTargetLabel('expense:expense-1'), '正在編輯費用');
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
