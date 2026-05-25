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

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test('normalizes only http and https external URLs', () => {
  assert.equal(normalizeExternalUrl('example.com/path'), 'https://example.com/path');
  assert.equal(normalizeExternalUrl('https://example.com/a'), 'https://example.com/a');
  assert.equal(normalizeExternalUrl('javascript:alert(1)'), '');
  assert.equal(getExternalUrlHost('https://maps.google.com/foo'), 'maps.google.com');
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
