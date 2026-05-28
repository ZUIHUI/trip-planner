const asObject = (value) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}
);

const asArray = (value) => (Array.isArray(value) ? value : []);

const readUpdatedAt = (value = {}) => {
  const rawValue = Number(value.updatedAt || value.lastUpdatedAt || value.votedAt || 0);
  return Number.isFinite(rawValue) ? rawValue : 0;
};

const withoutField = (value = {}, fieldName = '') => {
  const source = value && typeof value === 'object' ? value : {};
  const clone = { ...source };
  delete clone[fieldName];
  return clone;
};

export const getStatusOnlyChanges = (previousItems = [], nextItems = [], fieldName = '') => {
  if (!fieldName || !Array.isArray(previousItems) || !Array.isArray(nextItems)) {
    return { statusOnly: false, changes: [] };
  }

  if (previousItems.length !== nextItems.length) {
    return { statusOnly: false, changes: [] };
  }

  const changes = [];
  for (let index = 0; index < nextItems.length; index += 1) {
    const previousItem = previousItems[index] || {};
    const nextItem = nextItems[index] || {};
    const previousId = String(previousItem?.id ?? '');
    const nextId = String(nextItem?.id ?? '');

    if (!previousId || previousId !== nextId) {
      return { statusOnly: false, changes: [] };
    }

    const previousComparable = JSON.stringify(withoutField(previousItem, fieldName));
    const nextComparable = JSON.stringify(withoutField(nextItem, fieldName));
    if (previousComparable !== nextComparable) {
      return { statusOnly: false, changes: [] };
    }

    const previousStatus = Boolean(previousItem?.[fieldName]);
    const nextStatus = Boolean(nextItem?.[fieldName]);
    if (previousStatus !== nextStatus) {
      changes.push({
        itemId: nextId,
        value: nextStatus
      });
    }
  }

  return {
    statusOnly: changes.length > 0,
    changes
  };
};

export const getChecklistStatusOnlyChanges = (previousItems = [], nextItems = []) => (
  getStatusOnlyChanges(previousItems, nextItems, 'done')
);

export const getShoppingStatusOnlyChanges = (previousItems = [], nextItems = []) => (
  getStatusOnlyChanges(previousItems, nextItems, 'purchased')
);

const normalizeVoteValue = (value, fallback = 1) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  if (number > 0) return 1;
  if (number < 0) return -1;
  return 0;
};

const normalizeRealtimeVote = (uid, vote = {}) => ({
  voterId: String(vote.voterId || uid || ''),
  name: String(vote.name || vote.displayName || 'Member'),
  value: normalizeVoteValue(vote.value, 1),
  votedAt: vote.votedAt || vote.updatedAt || ''
});

export const normalizeRealtimePlaceVotes = (placeVotes = {}) => (
  Object.entries(asObject(placeVotes)).reduce((acc, [placeId, entry]) => {
    const source = asObject(entry);
    const votesSource = source.votes && typeof source.votes === 'object'
      ? source.votes
      : source;
    const votes = Object.entries(asObject(votesSource))
      .filter(([key]) => !['updatedAt', 'createdAt'].includes(key))
      .map(([uid, vote]) => normalizeRealtimeVote(uid, asObject(vote)))
      .filter((vote) => vote.voterId);

    acc[placeId] = votes;
    return acc;
  }, {})
);

export const mergeRealtimeVotesIntoPlaces = (places = [], votesByPlaceId = {}) => (
  asArray(places).map((place) => {
    const placeId = String(place?.id || '');
    if (!placeId || !Object.prototype.hasOwnProperty.call(votesByPlaceId, placeId)) {
      return place;
    }

    return {
      ...place,
      votes: asArray(votesByPlaceId[placeId])
    };
  })
);

export const readLatestRealtimeStatus = (statusByUid = {}, fieldName) => {
  const entries = Object.values(asObject(statusByUid))
    .map(asObject)
    .filter((entry) => typeof entry[fieldName] === 'boolean')
    .sort((a, b) => readUpdatedAt(b) - readUpdatedAt(a));

  return entries[0] || null;
};

export const normalizeRealtimeChecklistStatus = (checklistStatus = {}) => (
  Object.entries(asObject(checklistStatus)).reduce((acc, [listId, items]) => {
    acc[listId] = Object.entries(asObject(items)).reduce((itemAcc, [itemId, byUid]) => {
      const latest = readLatestRealtimeStatus(byUid, 'done');
      if (latest) {
        itemAcc[itemId] = latest;
      }
      return itemAcc;
    }, {});
    return acc;
  }, {})
);

export const normalizeRealtimeShoppingStatus = (shoppingStatus = {}) => (
  Object.entries(asObject(shoppingStatus)).reduce((acc, [itemId, byUid]) => {
    const latest = readLatestRealtimeStatus(byUid, 'purchased');
    if (latest) {
      acc[itemId] = latest;
    }
    return acc;
  }, {})
);

export const mergeRealtimeChecklistStatus = (items = [], itemStatusById = {}) => (
  asArray(items).map((item) => {
    const itemId = String(item?.id ?? '');
    const status = itemStatusById[itemId];
    return status
      ? { ...item, done: Boolean(status.done) }
      : item;
  })
);

export const mergeRealtimeShoppingStatus = (items = [], itemStatusById = {}) => (
  asArray(items).map((item) => {
    const itemId = String(item?.id ?? '');
    const status = itemStatusById[itemId];
    return status
      ? { ...item, purchased: Boolean(status.purchased) }
      : item;
  })
);

export const normalizeRealtimeEditing = (editing = {}, now = Date.now()) => {
  const staleMs = 60 * 1000;
  const byUid = {};
  const byTarget = {};

  Object.entries(asObject(editing)).forEach(([uid, entry]) => {
    const source = asObject(entry);
    const updatedAt = readUpdatedAt(source);
    if (!updatedAt || now - updatedAt > staleMs) return;

    const target = String(source.target || '');
    const normalized = {
      uid,
      target,
      activeTab: String(source.activeTab || ''),
      label: String(source.label || ''),
      updatedAt
    };

    byUid[uid] = normalized;
    if (target) {
      byTarget[target] = [...(byTarget[target] || []), normalized];
    }
  });

  return { byUid, byTarget };
};

export const normalizeTripRealtimeValue = (value = {}) => {
  const source = asObject(value);
  const editing = normalizeRealtimeEditing(source.editing);

  return {
    placeVotesByPlaceId: normalizeRealtimePlaceVotes(source.placeVotes),
    checklistStatusByListId: normalizeRealtimeChecklistStatus(source.checklistStatus),
    shoppingItemStatusById: normalizeRealtimeShoppingStatus(source.shoppingStatus),
    realtimeEditingByUid: editing.byUid,
    realtimeEditingByTarget: editing.byTarget,
    recentActivities: Object.entries(asObject(source.activityLog))
      .map(([id, activity]) => ({ id, ...asObject(activity) }))
      .sort((a, b) => readUpdatedAt(b) - readUpdatedAt(a))
      .slice(0, 50)
  };
};
