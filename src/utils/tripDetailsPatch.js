import { normalizeTripDateFields } from './tripDates';

const asObject = (value) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}
);
const cleanString = (value, fallback = '') => (typeof value === 'string' ? value : fallback);
const sameValue = (left, right) => JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
const omitTrackedSections = (tripDetails = {}) => {
  const {
    title,
    status,
    coverImage,
    dateRange,
    dates,
    budget,
    accommodation,
    flights,
    ...rest
  } = tripDetails;

  return rest;
};

export const normalizeTripDetailsMetaPatch = (tripDetails = {}) => {
  const normalized = normalizeTripDateFields(asObject(tripDetails));
  const dateRange = asObject(normalized.dateRange);

  return {
    title: cleanString(normalized.title),
    status: cleanString(normalized.status, 'planning'),
    coverImage: cleanString(normalized.coverImage),
    dateRange: {
      start: cleanString(dateRange.start),
      end: cleanString(dateRange.end)
    },
    dates: cleanString(normalized.dates)
  };
};

export const normalizeTripDetailsPatch = (tripDetails = {}) => {
  const normalized = normalizeTripDateFields(asObject(tripDetails));

  return {
    ...normalized,
    ...normalizeTripDetailsMetaPatch(normalized),
    budget: asObject(normalized.budget),
    accommodation: asObject(normalized.accommodation),
    flights: asObject(normalized.flights)
  };
};

export const getTripDetailsPatchSections = (previousTripDetails = {}, nextTripDetails = {}) => {
  const previous = normalizeTripDetailsPatch(previousTripDetails);
  const next = normalizeTripDetailsPatch(nextTripDetails);
  const previousMeta = normalizeTripDetailsMetaPatch(previous);
  const nextMeta = normalizeTripDetailsMetaPatch(next);
  const changed = {
    meta: !sameValue(previousMeta, nextMeta),
    accommodation: !sameValue(previous.accommodation, next.accommodation),
    flights: !sameValue(previous.flights, next.flights),
    budget: !sameValue(previous.budget, next.budget),
    untracked: !sameValue(omitTrackedSections(previous), omitTrackedSections(next))
  };

  return {
    nextTripDetails: next,
    meta: nextMeta,
    accommodation: next.accommodation,
    flights: next.flights,
    budget: next.budget,
    changed: {
      ...changed,
      any: Object.values(changed).some(Boolean)
    }
  };
};
