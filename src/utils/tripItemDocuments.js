const ORDER_STEP = 1000;

const asArray = (value) => (Array.isArray(value) ? value : []);
const asObject = (value) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}
);
const cleanString = (value, fallback = '') => (typeof value === 'string' ? value : fallback);
const normalizeId = (value) => String(value ?? '').trim();
const normalizeOrderKey = (value, fallback = ORDER_STEP) => {
  const orderKey = Number(value);
  return Number.isFinite(orderKey) ? orderKey : fallback;
};

export const makeTripChecklistItemId = () => `checklist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
export const makeTripShoppingItemId = () => `shopping-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const readItemOrderKey = (item, fallback = null) => {
  const value = Number(item?.orderKey);
  if (Number.isFinite(value)) return value;
  return fallback;
};

export const getItemOrderKeyAtIndex = (item, index = 0) => (
  readItemOrderKey(item, (index + 1) * ORDER_STEP)
);

export const getItemOrderKeyBetween = (previousItem = null, nextItem = null, fallbackIndex = 0) => {
  const previousKey = readItemOrderKey(previousItem);
  const nextKey = readItemOrderKey(nextItem);

  if (Number.isFinite(previousKey) && Number.isFinite(nextKey) && nextKey > previousKey) {
    return previousKey + ((nextKey - previousKey) / 2);
  }

  if (Number.isFinite(previousKey)) return previousKey + ORDER_STEP;
  if (Number.isFinite(nextKey)) return nextKey - ORDER_STEP;
  return (fallbackIndex + 1) * ORDER_STEP;
};

export const getAppendItemOrderKey = (items = []) => {
  const sourceItems = asArray(items);
  const lastItem = sourceItems[sourceItems.length - 1] || null;
  return getItemOrderKeyBetween(lastItem, null, sourceItems.length);
};

const sortByOrderKey = (items = []) => asArray(items).slice().sort((a, b) => {
  const orderDiff = readItemOrderKey(a, ORDER_STEP) - readItemOrderKey(b, ORDER_STEP);
  if (orderDiff !== 0) return orderDiff;
  return normalizeId(a?.id).localeCompare(normalizeId(b?.id));
});

const withOrderKeys = (items = []) => asArray(items).map((item, index) => ({
  ...item,
  orderKey: getItemOrderKeyAtIndex(item, index)
}));

export const getTripItemId = (itemOrId) => {
  if (itemOrId && typeof itemOrId === 'object') return normalizeId(itemOrId.id);
  return normalizeId(itemOrId);
};

export const moveTripItemByOffset = (items = [], itemId = '', offset = 0) => {
  const sourceItems = asArray(items);
  const safeItemId = getTripItemId(itemId);
  const safeOffset = Number(offset);
  if (!safeItemId || !Number.isInteger(safeOffset) || safeOffset === 0) return sourceItems;

  const sourceIndex = sourceItems.findIndex((item) => getTripItemId(item) === safeItemId);
  const targetIndex = sourceIndex + safeOffset;
  if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= sourceItems.length) return sourceItems;

  const nextItems = sourceItems.slice();
  const [movedItem] = nextItems.splice(sourceIndex, 1);
  nextItems.splice(targetIndex, 0, movedItem);
  return nextItems;
};

const sameIds = (left = [], right = []) => (
  left.length === right.length && left.every((item, index) => item === right[index])
);

const sameValue = (left, right) => JSON.stringify(left ?? null) === JSON.stringify(right ?? null);

export const getTripItemChanges = ({
  previousItems = [],
  nextItems = [],
  fields = []
} = {}) => {
  const previous = asArray(previousItems);
  const next = asArray(nextItems);
  const previousById = new Map(previous.map((item) => [getTripItemId(item), item]));
  const nextById = new Map(next.map((item) => [getTripItemId(item), item]));
  const previousIds = previous.map(getTripItemId).filter(Boolean);
  const nextIds = next.map(getTripItemId).filter(Boolean);

  const added = next.filter((item) => {
    const id = getTripItemId(item);
    return id && !previousById.has(id);
  });
  const removed = previous.filter((item) => {
    const id = getTripItemId(item);
    return id && !nextById.has(id);
  });
  const changed = next.filter((item) => {
    const id = getTripItemId(item);
    const previousItem = previousById.get(id);
    if (!id || !previousItem) return false;
    return fields.some((field) => !sameValue(previousItem?.[field], item?.[field]));
  });

  let movedItemId = '';
  if (
    !added.length &&
    !removed.length &&
    previousIds.length === nextIds.length &&
    !sameIds(previousIds, nextIds)
  ) {
    movedItemId = nextIds.find((id) => (
      sameIds(
        previousIds.filter((previousId) => previousId !== id),
        nextIds.filter((nextId) => nextId !== id)
      )
    )) || '';
  }

  return { added, removed, changed, movedItemId };
};

export const getSparseOrderKeyForItem = (items = [], itemId = '') => {
  const safeItems = asArray(items);
  const targetIndex = safeItems.findIndex((item) => getTripItemId(item) === getTripItemId(itemId));
  if (targetIndex < 0) return getAppendItemOrderKey(safeItems);
  return getItemOrderKeyBetween(
    safeItems[targetIndex - 1] || null,
    safeItems[targetIndex + 1] || null,
    targetIndex
  );
};

export const normalizeChecklistItemDocumentForApp = (document = {}) => {
  const source = asObject(document);
  const id = normalizeId(source.id) || makeTripChecklistItemId();
  const listId = cleanString(source.listId, 'preTrip') === 'packing' ? 'packing' : 'preTrip';
  const day = Number(source.day);

  return {
    ...source,
    id,
    listId,
    orderKey: normalizeOrderKey(source.orderKey),
    text: cleanString(source.text),
    done: Boolean(source.done),
    category: cleanString(source.category, 'other'),
    assignedTo: source.assignedTo == null ? null : cleanString(String(source.assignedTo)),
    day: Number.isFinite(day) ? day : null,
    deleted: Boolean(source.deleted)
  };
};

export const buildChecklistItemDocument = ({
  item = {},
  listId = 'preTrip',
  orderKey = ORDER_STEP,
  user = null,
  clientId = '',
  deleted = false,
  now = new Date().toISOString()
} = {}) => {
  const source = normalizeChecklistItemDocumentForApp({
    ...item,
    listId,
    orderKey,
    deleted
  });

  return {
    id: source.id,
    schemaVersion: 1,
    listId: source.listId,
    orderKey: Number(source.orderKey),
    text: cleanString(source.text),
    done: Boolean(source.done),
    category: cleanString(source.category, 'other'),
    assignedTo: source.assignedTo == null ? null : cleanString(String(source.assignedTo)),
    day: source.day == null ? null : Number(source.day),
    deleted: Boolean(deleted),
    updatedAt: now,
    updatedByUid: cleanString(user?.uid),
    updatedByClientId: cleanString(clientId)
  };
};

export const applyChecklistItemDocumentsToChecklists = (checklists = {}, checklistItemDocuments = []) => {
  const base = asObject(checklists);
  const nextChecklists = {
    ...base,
    preTrip: withOrderKeys(base.preTrip),
    packing: withOrderKeys(base.packing)
  };
  const documents = asArray(checklistItemDocuments).map(normalizeChecklistItemDocumentForApp);
  if (!documents.length) return nextChecklists;

  const activeDocumentsById = new Map();
  const deletedIds = new Set();

  documents.forEach((item) => {
    const itemId = normalizeId(item.id);
    if (!itemId) return;
    if (item.deleted) {
      deletedIds.add(itemId);
      activeDocumentsById.delete(itemId);
    } else {
      activeDocumentsById.set(itemId, item);
      deletedIds.delete(itemId);
    }
  });

  ['preTrip', 'packing'].forEach((listId) => {
    nextChecklists[listId] = asArray(nextChecklists[listId]).filter((item) => {
      const itemId = normalizeId(item?.id);
      return itemId && !deletedIds.has(itemId) && !activeDocumentsById.has(itemId);
    });
  });

  activeDocumentsById.forEach((item) => {
    const listId = item.listId === 'packing' ? 'packing' : 'preTrip';
    nextChecklists[listId] = [...asArray(nextChecklists[listId]), item];
  });

  return {
    ...nextChecklists,
    preTrip: sortByOrderKey(nextChecklists.preTrip),
    packing: sortByOrderKey(nextChecklists.packing)
  };
};

export const normalizeShoppingItemDocumentForApp = (document = {}) => {
  const source = asObject(document);
  const id = normalizeId(source.id) || makeTripShoppingItemId();
  const quantity = Number(source.quantity);

  return {
    ...source,
    id,
    orderKey: normalizeOrderKey(source.orderKey),
    name: cleanString(source.name),
    category: cleanString(source.category),
    shop: cleanString(source.shop),
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    notes: cleanString(source.notes),
    image: source.image || null,
    purchased: Boolean(source.purchased),
    deleted: Boolean(source.deleted)
  };
};

export const buildShoppingItemDocument = ({
  item = {},
  orderKey = ORDER_STEP,
  user = null,
  clientId = '',
  deleted = false,
  now = new Date().toISOString()
} = {}) => {
  const source = normalizeShoppingItemDocumentForApp({
    ...item,
    orderKey,
    deleted
  });

  return {
    id: source.id,
    schemaVersion: 1,
    orderKey: Number(source.orderKey),
    name: cleanString(source.name),
    category: cleanString(source.category),
    shop: cleanString(source.shop),
    quantity: Number(source.quantity) || 1,
    notes: cleanString(source.notes),
    image: source.image || null,
    purchased: Boolean(source.purchased),
    deleted: Boolean(deleted),
    updatedAt: now,
    updatedByUid: cleanString(user?.uid),
    updatedByClientId: cleanString(clientId)
  };
};

export const applyShoppingItemDocumentsToList = (shoppingList = [], shoppingItemDocuments = []) => {
  const baseItems = withOrderKeys(shoppingList);
  const documents = asArray(shoppingItemDocuments).map(normalizeShoppingItemDocumentForApp);
  if (!documents.length) return baseItems;

  const activeDocumentsById = new Map();
  const deletedIds = new Set();

  documents.forEach((item) => {
    const itemId = normalizeId(item.id);
    if (!itemId) return;
    if (item.deleted) {
      deletedIds.add(itemId);
      activeDocumentsById.delete(itemId);
    } else {
      activeDocumentsById.set(itemId, item);
      deletedIds.delete(itemId);
    }
  });

  const nextItems = baseItems.filter((item) => {
    const itemId = normalizeId(item?.id);
    return itemId && !deletedIds.has(itemId) && !activeDocumentsById.has(itemId);
  });

  activeDocumentsById.forEach((item) => {
    nextItems.push(item);
  });

  return sortByOrderKey(nextItems);
};
