import {
  getAppendItemOrderKey,
  getItemOrderKeyAtIndex
} from './tripItemDocuments';

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
const normalizeNullableNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const withOrderKeys = (items = []) => asArray(items).map((item, index) => ({
  ...item,
  orderKey: getItemOrderKeyAtIndex(item, index)
}));

const sortByOrderKey = (items = []) => asArray(items).slice().sort((a, b) => {
  const orderDiff = normalizeOrderKey(a?.orderKey) - normalizeOrderKey(b?.orderKey);
  if (orderDiff !== 0) return orderDiff;
  return normalizeId(a?.id).localeCompare(normalizeId(b?.id));
});

const applyDocumentsToItems = (items = [], documents = [], normalizeDocument) => {
  const baseItems = withOrderKeys(items);
  const normalizedDocuments = asArray(documents).map(normalizeDocument);
  if (!normalizedDocuments.length) return baseItems;

  const activeDocumentsById = new Map();
  const deletedIds = new Set();

  normalizedDocuments.forEach((item) => {
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

export const makeTripExpenseId = () => `expense-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
export const makeTripPlaceIdeaId = () => `place-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const makeShoppingCategoryId = (name = '') => {
  const normalizedName = cleanString(name).trim();
  const encoded = encodeURIComponent(normalizedName || 'uncategorized');
  return `category-${encoded}`.slice(0, 180);
};

export const normalizeTripExpenseDocumentForApp = (document = {}) => {
  const source = asObject(document);
  const id = normalizeId(source.id) || makeTripExpenseId();
  const amount = Number(source.amount);

  return {
    ...source,
    id,
    orderKey: normalizeOrderKey(source.orderKey),
    title: cleanString(source.title || source.name),
    amount: Number.isFinite(amount) ? amount : 0,
    currency: cleanString(source.currency, 'JPY'),
    date: cleanString(source.date),
    category: cleanString(source.category, 'other'),
    payer: cleanString(source.payer),
    splitType: cleanString(source.splitType, source.isSettled ? 'settled' : 'all'),
    involved: asArray(source.involved).map((item) => String(item || '').trim()).filter(Boolean),
    isSettled: Boolean(source.isSettled || source.splitType === 'settled'),
    note: cleanString(source.note),
    deleted: Boolean(source.deleted)
  };
};

export const buildTripExpenseDocument = ({
  expense = {},
  orderKey = ORDER_STEP,
  user = null,
  clientId = '',
  deleted = false,
  now = new Date().toISOString()
} = {}) => {
  const source = normalizeTripExpenseDocumentForApp({
    ...expense,
    orderKey,
    deleted
  });

  return {
    id: source.id,
    schemaVersion: 1,
    orderKey: Number(source.orderKey),
    title: cleanString(source.title),
    amount: Number(source.amount) || 0,
    currency: cleanString(source.currency, 'JPY'),
    date: cleanString(source.date),
    category: cleanString(source.category, 'other'),
    payer: cleanString(source.payer),
    splitType: cleanString(source.splitType, source.isSettled ? 'settled' : 'all'),
    involved: asArray(source.involved).map((item) => String(item || '').trim()).filter(Boolean),
    isSettled: Boolean(source.isSettled || source.splitType === 'settled'),
    note: cleanString(source.note),
    deleted: Boolean(deleted),
    updatedAt: now,
    updatedByUid: cleanString(user?.uid),
    updatedByClientId: cleanString(clientId)
  };
};

export const applyTripExpenseDocumentsToList = (expenses = [], expenseDocuments = []) => (
  applyDocumentsToItems(expenses, expenseDocuments, normalizeTripExpenseDocumentForApp)
);

export const normalizeTripPlaceIdeaDocumentForApp = (document = {}) => {
  const source = asObject(document);
  const id = normalizeId(source.id) || makeTripPlaceIdeaId();

  return {
    ...source,
    id,
    orderKey: normalizeOrderKey(source.orderKey),
    name: cleanString(source.name || source.address),
    address: cleanString(source.address || source.name),
    placeId: cleanString(source.placeId),
    lat: normalizeNullableNumber(source.lat),
    lng: normalizeNullableNumber(source.lng),
    note: cleanString(source.note),
    status: cleanString(source.status, 'idea'),
    plannedDay: normalizeNullableNumber(source.plannedDay),
    addedAt: cleanString(source.addedAt),
    plannedAt: cleanString(source.plannedAt),
    votes: asArray(source.votes).map((vote) => asObject(vote)),
    deleted: Boolean(source.deleted)
  };
};

export const buildTripPlaceIdeaDocument = ({
  place = {},
  orderKey = ORDER_STEP,
  user = null,
  clientId = '',
  deleted = false,
  now = new Date().toISOString()
} = {}) => {
  const source = normalizeTripPlaceIdeaDocumentForApp({
    ...place,
    orderKey,
    deleted
  });

  return {
    id: source.id,
    schemaVersion: 1,
    orderKey: Number(source.orderKey),
    name: cleanString(source.name),
    address: cleanString(source.address),
    placeId: cleanString(source.placeId),
    lat: source.lat,
    lng: source.lng,
    note: cleanString(source.note),
    status: cleanString(source.status, 'idea'),
    plannedDay: source.plannedDay,
    addedAt: cleanString(source.addedAt),
    plannedAt: cleanString(source.plannedAt),
    votes: asArray(source.votes).map((vote) => asObject(vote)),
    deleted: Boolean(deleted),
    updatedAt: now,
    updatedByUid: cleanString(user?.uid),
    updatedByClientId: cleanString(clientId)
  };
};

export const applyTripPlaceIdeaDocumentsToPool = (placePool = [], placeIdeaDocuments = []) => (
  applyDocumentsToItems(placePool, placeIdeaDocuments, normalizeTripPlaceIdeaDocumentForApp)
);

export const normalizeShoppingCategoryDocumentForApp = (document = {}) => {
  const source = asObject(document);
  const name = cleanString(source.name).trim();
  const id = normalizeId(source.id) || makeShoppingCategoryId(name);

  return {
    ...source,
    id,
    name,
    orderKey: normalizeOrderKey(source.orderKey),
    deleted: Boolean(source.deleted)
  };
};

export const buildShoppingCategoryDocument = ({
  category = {},
  name = '',
  orderKey = ORDER_STEP,
  user = null,
  clientId = '',
  deleted = false,
  now = new Date().toISOString()
} = {}) => {
  const source = normalizeShoppingCategoryDocumentForApp({
    ...category,
    name: category.name || name,
    orderKey,
    deleted
  });

  return {
    id: source.id || makeShoppingCategoryId(source.name),
    schemaVersion: 1,
    name: cleanString(source.name),
    orderKey: Number(source.orderKey),
    deleted: Boolean(deleted),
    updatedAt: now,
    updatedByUid: cleanString(user?.uid),
    updatedByClientId: cleanString(clientId)
  };
};

export const applyShoppingCategoryDocumentsToList = (categories = [], categoryDocuments = []) => {
  const baseCategories = asArray(categories)
    .map((name, index) => {
      const categoryName = String(name || '').trim();
      return {
        id: makeShoppingCategoryId(categoryName),
        name: categoryName,
        orderKey: (index + 1) * ORDER_STEP
      };
    })
    .filter((category) => category.name);
  const overlaid = applyDocumentsToItems(
    baseCategories,
    categoryDocuments,
    normalizeShoppingCategoryDocumentForApp
  );
  const seen = new Set();

  return overlaid
    .map((category) => cleanString(category.name).trim())
    .filter((name) => {
      if (!name || seen.has(name)) return false;
      seen.add(name);
      return true;
    });
};

export const getAppendCollectionOrderKey = getAppendItemOrderKey;
