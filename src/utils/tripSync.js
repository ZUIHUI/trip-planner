import { formatDateTimeWithWeekday } from './tripDates';

export const PLACE_VOTE_OPERATION = 'place-vote';

export const TRIP_DOCUMENT_TOUCH_OPERATIONS = Object.freeze({
  event: 'trip-event',
  checklistItem: 'trip-checklist-item',
  shoppingItem: 'trip-shopping-item',
  expense: 'trip-expense',
  placeIdea: 'trip-place-idea',
  shoppingCategory: 'trip-shopping-category'
});

const TRIP_DOCUMENT_TOUCH_OPERATION_VALUES = Object.freeze(Object.values(TRIP_DOCUMENT_TOUCH_OPERATIONS));

const TRIP_SYNC_OPERATION_LABELS = Object.freeze({
  'trip-details': '旅程資訊',
  'trip-collaboration': '協作設定',
  'trip-day': '日期資訊',
  [PLACE_VOTE_OPERATION]: '想去回應',
  [TRIP_DOCUMENT_TOUCH_OPERATIONS.event]: '行程',
  [TRIP_DOCUMENT_TOUCH_OPERATIONS.checklistItem]: '清單',
  [TRIP_DOCUMENT_TOUCH_OPERATIONS.shoppingItem]: '購物清單',
  [TRIP_DOCUMENT_TOUCH_OPERATIONS.expense]: '費用',
  [TRIP_DOCUMENT_TOUCH_OPERATIONS.placeIdea]: '想去地點',
  [TRIP_DOCUMENT_TOUCH_OPERATIONS.shoppingCategory]: '購物分類'
});

export const isTripDocumentTouchOperation = (syncMeta = {}) => (
  TRIP_DOCUMENT_TOUCH_OPERATION_VALUES.includes(String(syncMeta?.updatedByOperation || ''))
);

export const isSameClientWrite = (syncMeta = {}, { uid = '', clientId = '' } = {}) => {
  const localUid = String(uid || '').trim();
  const localClientId = String(clientId || '').trim();
  if (!localUid || !localClientId) return false;
  return (
    String(syncMeta?.updatedByUid || '') === localUid &&
    String(syncMeta?.updatedByClientId || '') === localClientId
  );
};

export const isOwnPlaceVoteWrite = (syncMeta = {}, { uid = '', clientId = '' } = {}) => (
  isSameClientWrite(syncMeta, { uid, clientId }) &&
  String(syncMeta?.updatedByOperation || '') === PLACE_VOTE_OPERATION &&
  Boolean(String(syncMeta?.updatedEntityId || '').trim())
);

export const shouldTreatRemoteAsConflict = ({
  hasLocalChanges = false,
  syncMeta = {},
  uid = '',
  clientId = ''
} = {}) => (
  Boolean(hasLocalChanges) && !isSameClientWrite(syncMeta, { uid, clientId })
);

export const shouldKeepLocalChangesForSameClientSnapshot = ({
  hasLocalChanges = false,
  syncMeta = {},
  uid = '',
  clientId = ''
} = {}) => (
  Boolean(hasLocalChanges) && isSameClientWrite(syncMeta, { uid, clientId })
);

export const isSaveResultCurrent = (saveStartedAtSeq = 0, currentSeq = 0) => (
  Number(saveStartedAtSeq) === Number(currentSeq)
);

export const getTripSyncOperationLabel = (operation = '') => (
  TRIP_SYNC_OPERATION_LABELS[String(operation || '')] || '旅程內容'
);

const getMemberNameByUid = (members = [], uid = '') => {
  const safeUid = String(uid || '').trim();
  if (!safeUid) return '';
  const member = (Array.isArray(members) ? members : []).find((item) => (
    String(item?.uid || item?.id || '') === safeUid
  ));
  return member?.displayName || member?.email || '';
};

const formatSyncUpdatedAt = (value = '') => {
  if (!value) return '';
  return formatDateTimeWithWeekday(value, { includeYear: false });
};

export const buildSyncConflictSummary = ({
  syncConflict = null,
  members = [],
  currentUser = null
} = {}) => {
  const syncMeta = syncConflict?.remoteData?.syncMeta || {};
  if (!syncMeta.updatedByUid && !syncMeta.updatedByOperation && !syncMeta.updatedAt) {
    return '';
  }

  const actorUid = String(syncMeta.updatedByUid || '');
  const actorName = actorUid === currentUser?.uid
    ? '你的另一個裝置'
    : getMemberNameByUid(members, actorUid) || '另一位旅伴';
  const operationLabel = getTripSyncOperationLabel(syncMeta.updatedByOperation);
  const updatedAt = formatSyncUpdatedAt(syncMeta.updatedAt);
  const entityHint = syncMeta.updatedEntityId ? ` (${String(syncMeta.updatedEntityId).slice(0, 24)})` : '';
  const actorSeparator = /[A-Za-z0-9]$/.test(actorName) ? ' ' : '';
  const summary = `${actorName}${actorSeparator}更新了${operationLabel}${entityHint}`;

  return updatedAt ? `${summary} · ${updatedAt}` : summary;
};

export const mergePlaceVoteIntoPlacePool = (
  localPlacePool = [],
  remotePlacePool = [],
  placeId = ''
) => {
  const safePlaceId = String(placeId || '').trim();
  if (!safePlaceId) {
    return { placePool: Array.isArray(localPlacePool) ? localPlacePool : [], changed: false };
  }

  const localPlaces = Array.isArray(localPlacePool) ? localPlacePool : [];
  const remotePlaces = Array.isArray(remotePlacePool) ? remotePlacePool : [];
  const remotePlace = remotePlaces.find((place) => String(place?.id || '') === safePlaceId);
  if (!remotePlace) return { placePool: localPlaces, changed: false };

  let changed = false;
  const nextPlacePool = localPlaces.map((place) => {
    if (String(place?.id || '') !== safePlaceId) return place;
    changed = true;
    return {
      ...place,
      votes: Array.isArray(remotePlace.votes) ? remotePlace.votes : []
    };
  });

  return { placePool: nextPlacePool, changed };
};
