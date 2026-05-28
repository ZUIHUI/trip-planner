import { normalizeTripDateFields } from './tripDates';
import {
  normalizeTripDetailsMetaPatch,
  normalizeTripDetailsPatch
} from './tripDetailsPatch';

export const TRIP_DETAIL_SECTION_IDS = Object.freeze({
  meta: 'meta',
  logistics: 'logistics',
  finance: 'finance'
});

const asObject = (value) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}
);
const asArray = (value) => (Array.isArray(value) ? value : []);
const cleanString = (value, fallback = '') => (typeof value === 'string' ? value : fallback);
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(asObject(value), key);

export const normalizeTripDetailDocumentForApp = (document = {}) => {
  const source = asObject(document);
  const id = cleanString(source.id || source.section);

  if (id === TRIP_DETAIL_SECTION_IDS.meta) {
    return {
      id,
      section: TRIP_DETAIL_SECTION_IDS.meta,
      ...normalizeTripDetailsMetaPatch(source),
      updatedAt: cleanString(source.updatedAt),
      updatedByUid: cleanString(source.updatedByUid),
      updatedByClientId: cleanString(source.updatedByClientId)
    };
  }

  if (id === TRIP_DETAIL_SECTION_IDS.logistics) {
    const normalized = {
      id,
      section: TRIP_DETAIL_SECTION_IDS.logistics,
      updatedAt: cleanString(source.updatedAt),
      updatedByUid: cleanString(source.updatedByUid),
      updatedByClientId: cleanString(source.updatedByClientId)
    };

    if (hasOwn(source, 'accommodation')) normalized.accommodation = asObject(source.accommodation);
    if (hasOwn(source, 'flights')) normalized.flights = asObject(source.flights);
    if (hasOwn(source, 'travelers')) normalized.travelers = asArray(source.travelers);
    return normalized;
  }

  if (id === TRIP_DETAIL_SECTION_IDS.finance) {
    const normalized = {
      id,
      section: TRIP_DETAIL_SECTION_IDS.finance,
      updatedAt: cleanString(source.updatedAt),
      updatedByUid: cleanString(source.updatedByUid),
      updatedByClientId: cleanString(source.updatedByClientId)
    };

    if (hasOwn(source, 'budget')) normalized.budget = asObject(source.budget);
    return normalized;
  }

  return {
    ...source,
    id,
    section: id
  };
};

export const applyTripDetailDocumentsToTripDetails = (tripDetails = {}, detailDocuments = []) => {
  const normalizedDetails = normalizeTripDetailsPatch(tripDetails);
  const documentsById = asArray(detailDocuments).reduce((acc, document) => {
    const normalizedDocument = normalizeTripDetailDocumentForApp(document);
    if (normalizedDocument.id) acc[normalizedDocument.id] = normalizedDocument;
    return acc;
  }, {});

  const meta = documentsById[TRIP_DETAIL_SECTION_IDS.meta];
  const logistics = documentsById[TRIP_DETAIL_SECTION_IDS.logistics];
  const finance = documentsById[TRIP_DETAIL_SECTION_IDS.finance];
  const nextTripDetails = {
    ...normalizedDetails
  };

  if (meta) {
    Object.assign(nextTripDetails, normalizeTripDetailsMetaPatch({
      ...nextTripDetails,
      ...meta
    }));
  }

  if (logistics) {
    if (hasOwn(logistics, 'accommodation')) {
      nextTripDetails.accommodation = asObject(logistics.accommodation);
    }
    if (hasOwn(logistics, 'flights')) {
      nextTripDetails.flights = asObject(logistics.flights);
    }
    if (hasOwn(logistics, 'travelers') && asArray(logistics.travelers).length) {
      nextTripDetails.travelers = asArray(logistics.travelers);
    }
  }

  if (finance && hasOwn(finance, 'budget')) {
    nextTripDetails.budget = asObject(finance.budget);
  }

  return normalizeTripDateFields(nextTripDetails);
};
