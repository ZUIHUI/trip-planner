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
