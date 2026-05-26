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
  mergeRealtimeChecklistStatus,
  mergeRealtimeShoppingStatus,
  mergeRealtimeVotesIntoPlaces,
  normalizeTripRealtimeValue
} = require('../src/utils/tripRealtime.js');
const { buildItineraryRouteState } = require('../src/utils/itineraryRoute.js');
const {
  PLACE_VOTE_OPERATION,
  isOwnPlaceVoteWrite,
  mergePlaceVoteIntoPlacePool,
  shouldTreatRemoteAsConflict
} = require('../src/utils/tripSync.js');

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
