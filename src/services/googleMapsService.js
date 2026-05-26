import { httpsCallable } from 'firebase/functions';
import { logger } from '../utils/logger';
import {
  getPlaceId,
  normalizePlaceText as normalizeSharedPlaceText
} from '../utils/placeText';
import { functions } from './firebase';

const PLACE_PREDICTION_CACHE_LIMIT = 40;
const placePredictionCache = new Map();

export const GOOGLE_PLACE_PREDICTION_STATUS = {
  idle: 'idle',
  missingApiKey: 'missing_api_key',
  loadingFailed: 'loading_failed',
  apiNotActivated: 'api_not_activated',
  apiTargetBlocked: 'api_target_blocked',
  billingOrKeyError: 'billing_or_key_error',
  legacyFallbackUsed: 'legacy_fallback_used',
  requestFailed: 'request_failed',
  empty: 'empty',
  success: 'success'
};

// The key now lives in Firebase Functions, so the browser only needs to know
// that the callable service exists.
export const hasGoogleMapsApiKey = () => true;

export const normalizePlaceText = normalizeSharedPlaceText;

const debugGooglePlaces = (message, detail) => {
  logger.warn(message, detail);
};

const buildGooglePlacesError = (status, message, cause = null) => {
  const error = new Error(message);
  error.googlePlacesStatus = status;
  if (cause) {
    error.cause = cause;
    error.originalStatus = cause.googlePlacesStatus || cause.status || cause.code || cause.name || cause.message || '';
  }
  return error;
};

const getGoogleErrorText = (error) => {
  if (!error) return '';
  if (typeof error === 'string') return error;
  return String(
    error.googlePlacesStatus ||
    error.details?.googlePlacesStatus ||
    error.originalStatus ||
    error.status ||
    error.code ||
    error.name ||
    error.message ||
    ''
  );
};

const classifyGooglePlacesError = (error, fallbackStatus = GOOGLE_PLACE_PREDICTION_STATUS.requestFailed) => {
  const errorText = getGoogleErrorText(error);

  if (/missing_api_key|failed-precondition|InvalidKey|MissingKey|ExpiredKey|ProjectDenied|REQUEST_DENIED|key/i.test(errorText)) {
    return GOOGLE_PLACE_PREDICTION_STATUS.billingOrKeyError;
  }

  if (/ApiNotActivated|API_NOT_ACTIVATED|api_not_activated|not activated|not enabled/i.test(errorText)) {
    return GOOGLE_PLACE_PREDICTION_STATUS.apiNotActivated;
  }

  if (/ApiTargetBlocked|RefererNotAllowed|RefererDenied|blocked|referrer|referer|target/i.test(errorText)) {
    return GOOGLE_PLACE_PREDICTION_STATUS.apiTargetBlocked;
  }

  if (/Billing|OverQuota|resource-exhausted/i.test(errorText)) {
    return GOOGLE_PLACE_PREDICTION_STATUS.billingOrKeyError;
  }

  return fallbackStatus;
};

const createPredictionState = (status, predictions = [], error = null, extra = {}) => ({
  status,
  predictions,
  error,
  ...extra
});

const callGoogleFunction = async (name, payload) => {
  const callable = httpsCallable(functions, name);
  const response = await callable(payload);
  return response.data || {};
};

const readCoordinate = (...values) => {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
};

export const buildGoogleMapsSearchUrl = (query) => {
  const normalizedQuery = normalizePlaceText(query);
  if (!normalizedQuery) return '';

  const params = new URLSearchParams({
    api: '1',
    query: normalizedQuery
  });

  const placeId = getPlaceId(query);
  if (placeId) {
    params.set('query_place_id', placeId);
  }

  return `https://www.google.com/maps/search/?${params.toString()}`;
};

export const buildGoogleMapsDirectionsUrl = (origin, destination) => {
  const normalizedDestination = normalizePlaceText(destination);
  if (!normalizedDestination) return '';

  const params = new URLSearchParams({
    api: '1',
    destination: normalizedDestination,
    travelmode: 'transit'
  });

  const normalizedOrigin = normalizePlaceText(origin);
  if (normalizedOrigin) {
    params.set('origin', normalizedOrigin);
  }

  const destinationPlaceId = getPlaceId(destination);
  if (destinationPlaceId) {
    params.set('destination_place_id', destinationPlaceId);
  }

  const originPlaceId = getPlaceId(origin);
  if (originPlaceId) {
    params.set('origin_place_id', originPlaceId);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

export const buildGoogleMapsMultiStopDirectionsUrl = (origin, destinations = []) => {
  const normalizedDestinations = (Array.isArray(destinations) ? destinations : [destinations])
    .map(normalizePlaceText)
    .filter(Boolean);

  if (!normalizedDestinations.length) return '';

  const finalDestination = normalizedDestinations[normalizedDestinations.length - 1];
  const waypoints = normalizedDestinations.slice(0, -1);
  const params = new URLSearchParams({
    api: '1',
    destination: finalDestination,
    travelmode: 'transit'
  });

  const normalizedOrigin = normalizePlaceText(origin);
  if (normalizedOrigin) {
    params.set('origin', normalizedOrigin);
  }

  if (waypoints.length) {
    params.set('waypoints', waypoints.join('|'));
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

export const normalizeGooglePlaceResult = (place, fallbackText = '') => {
  if (!place || typeof place !== 'object') {
    const fallback = String(fallbackText || '').trim();
    return {
      name: fallback,
      address: fallback,
      placeId: '',
      lat: null,
      lng: null
    };
  }

  const displayName = typeof place.displayName === 'object'
    ? place.displayName.text
    : place.displayName;
  const name = String(place.name || displayName || fallbackText || '').trim();
  const address = String(
    place.formattedAddress ||
    place.formatted_address ||
    place.address ||
    name ||
    fallbackText ||
    ''
  ).trim();
  const location = place.location || place.geometry?.location || null;

  return {
    name,
    address,
    placeId: getPlaceId(place),
    lat: readCoordinate(place.lat, location?.lat, location?.latitude),
    lng: readCoordinate(place.lng, location?.lng, location?.longitude)
  };
};

export const loadGoogleMapsPlacesLibrary = () => Promise.resolve(null);

const normalizeServerPrediction = (prediction) => ({
  source: prediction.source || 'server',
  placeId: prediction.placeId || prediction.place_id || '',
  description: prediction.description || '',
  mainText: prediction.mainText || prediction.structured_formatting?.main_text || prediction.description || '',
  secondaryText: prediction.secondaryText || prediction.structured_formatting?.secondary_text || '',
  types: Array.isArray(prediction.types) ? prediction.types : []
});

const getPredictionCacheKey = (input, options = {}) => {
  const placeTypesKey = Array.isArray(options.placeTypes) ? options.placeTypes.join('|') : '';
  return `${placeTypesKey}::${String(input || '').trim().toLowerCase()}`;
};

const cachePredictionState = (key, state) => {
  const nonCacheableStatuses = new Set([
    GOOGLE_PLACE_PREDICTION_STATUS.requestFailed,
    GOOGLE_PLACE_PREDICTION_STATUS.loadingFailed,
    GOOGLE_PLACE_PREDICTION_STATUS.apiNotActivated,
    GOOGLE_PLACE_PREDICTION_STATUS.apiTargetBlocked,
    GOOGLE_PLACE_PREDICTION_STATUS.billingOrKeyError
  ]);

  if (!key || nonCacheableStatuses.has(state.status)) {
    return state;
  }

  if (placePredictionCache.size >= PLACE_PREDICTION_CACHE_LIMIT) {
    const firstKey = placePredictionCache.keys().next().value;
    if (firstKey) {
      placePredictionCache.delete(firstKey);
    }
  }

  placePredictionCache.set(key, state);
  return state;
};

export const fetchGooglePlacePredictions = async (input, options = {}) => {
  const result = await getGooglePlacePredictionsState(input, options);
  return result.predictions;
};

export const getGooglePlacePredictionsState = async (input, options = {}) => {
  const normalizedInput = String(input || '').trim();
  if (normalizedInput.length < 2) {
    return createPredictionState(GOOGLE_PLACE_PREDICTION_STATUS.idle);
  }

  const cacheKey = getPredictionCacheKey(normalizedInput, options);
  if (placePredictionCache.has(cacheKey)) {
    return placePredictionCache.get(cacheKey);
  }

  try {
    const payload = await callGoogleFunction('searchGooglePlaces', {
      input: normalizedInput,
      placeTypes: Array.isArray(options.placeTypes) ? options.placeTypes : []
    });
    const predictions = Array.isArray(payload.predictions)
      ? payload.predictions.map(normalizeServerPrediction)
      : [];
    const status = payload.status || (
      predictions.length
        ? GOOGLE_PLACE_PREDICTION_STATUS.success
        : GOOGLE_PLACE_PREDICTION_STATUS.empty
    );

    return cachePredictionState(cacheKey, createPredictionState(
      status,
      predictions,
      null,
      { provider: payload.provider || 'google_places_server' }
    ));
  } catch (error) {
    const status = classifyGooglePlacesError(error);
    debugGooglePlaces('Google Places autocomplete failed:', {
      status,
      originalStatus: getGoogleErrorText(error),
      error
    });

    return createPredictionState(status, [], error, {
      provider: 'google_places_server'
    });
  }
};

const getPlaceReferenceId = (placeReference) => {
  if (typeof placeReference === 'string') return placeReference.trim();
  if (!placeReference || typeof placeReference !== 'object') return '';
  return String(placeReference.placeId || placeReference.place_id || placeReference.id || '').trim();
};

export const fetchGooglePlaceDetails = async (placeReference, fallbackText = '') => {
  const normalizedPlaceId = getPlaceReferenceId(placeReference);
  if (!normalizedPlaceId) {
    return normalizeGooglePlaceResult(null, fallbackText);
  }

  try {
    const payload = await callGoogleFunction('getGooglePlaceDetails', {
      placeId: normalizedPlaceId,
      fallbackText
    });
    return {
      ...normalizeGooglePlaceResult(payload.place, fallbackText),
      placeId: payload.place?.placeId || normalizedPlaceId
    };
  } catch (error) {
    debugGooglePlaces('Google Places details failed:', {
      status: classifyGooglePlacesError(error),
      originalStatus: getGoogleErrorText(error),
      error
    });

    return {
      ...normalizeGooglePlaceResult(null, fallbackText),
      placeId: normalizedPlaceId
    };
  }
};

export const geocodePlace = async (query) => {
  const normalizedQuery = normalizePlaceText(query);
  if (!normalizedQuery) {
    throw new Error('Place query is required.');
  }

  try {
    return await callGoogleFunction('geocodeGooglePlace', {
      query: normalizedQuery
    });
  } catch (error) {
    throw buildGooglePlacesError(
      classifyGooglePlacesError(error),
      error?.message || 'Google Geocoding API request failed.',
      error
    );
  }
};
