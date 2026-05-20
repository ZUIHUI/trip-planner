const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const GOOGLE_GEOCODING_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json';
const GOOGLE_MAPS_SCRIPT_ID = 'trip-planner-google-maps-js';

const hasText = (value) => typeof value === 'string' && value.trim().length > 0;
let placesLibraryPromise = null;
let placesServiceElement = null;
let placesService = null;
let googleMapsAuthError = null;
const placePredictionCache = new Map();
const PLACE_PREDICTION_CACHE_LIMIT = 40;
const GOOGLE_MAPS_LOAD_TIMEOUT_MS = 12000;

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

export const hasGoogleMapsApiKey = () => hasText(GOOGLE_MAPS_API_KEY);

const debugGooglePlaces = (message, detail) => {
  if (import.meta.env.DEV) {
    console.warn(message, detail);
  }
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

  if (/ApiNotActivated|API_NOT_ACTIVATED|api_not_activated|not activated|not enabled/i.test(errorText)) {
    return GOOGLE_PLACE_PREDICTION_STATUS.apiNotActivated;
  }

  if (/ApiTargetBlocked|RefererNotAllowed|RefererDenied|blocked|referrer|referer|target/i.test(errorText)) {
    return GOOGLE_PLACE_PREDICTION_STATUS.apiTargetBlocked;
  }

  if (/Billing|InvalidKey|MissingKey|ExpiredKey|ProjectDenied|OverQuota|REQUEST_DENIED|key/i.test(errorText)) {
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

const getPlaceId = (place) => {
  if (!place || typeof place !== 'object') return '';
  return String(place.placeId || place.place_id || place.id || '').trim();
};

export const normalizePlaceText = (place) => {
  if (!place) return '';
  if (typeof place === 'string') return place.trim();
  if (typeof place === 'object') {
    const displayName = typeof place.displayName === 'object'
      ? place.displayName.text
      : place.displayName;
    return String(
      place.address ||
      place.formattedAddress ||
      place.formatted_address ||
      place.name ||
      displayName ||
      place.label ||
      ''
    ).trim();
  }
  return '';
};

const normalizeGoogleText = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value.text === 'string') return value.text.trim();
  if (typeof value.toString === 'function') return value.toString().trim();
  return '';
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
  const readCoordinate = (axis) => {
    if (!location) return null;
    const raw = typeof location[axis] === 'function' ? location[axis]() : location[axis];
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
  };

  return {
    name,
    address,
    placeId: getPlaceId(place),
    lat: readCoordinate('lat'),
    lng: readCoordinate('lng')
  };
};

export const loadGoogleMapsPlacesLibrary = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(null);
  }

  if (!hasGoogleMapsApiKey()) {
    return Promise.resolve(null);
  }

  if (googleMapsAuthError) {
    return Promise.reject(googleMapsAuthError);
  }

  if (window.google?.maps?.importLibrary || window.google?.maps?.places) {
    return Promise.resolve().then(async () => {
      if (window.google?.maps?.importLibrary) {
        const importedPlaces = await window.google.maps.importLibrary('places');
        return importedPlaces || window.google?.maps?.places || null;
      }

      return window.google.maps.places;
    });
  }

  if (placesLibraryPromise) {
    return placesLibraryPromise;
  }

  placesLibraryPromise = new Promise((resolve, reject) => {
    let didSettle = false;
    let loadTimeout = null;

    const settleResolve = (places) => {
      if (didSettle) return;
      didSettle = true;
      if (loadTimeout) clearTimeout(loadTimeout);
      resolve(places);
    };

    const settleReject = (error) => {
      if (didSettle) return;
      didSettle = true;
      if (loadTimeout) clearTimeout(loadTimeout);
      placesLibraryPromise = null;
      reject(error);
    };

    const resolvePlaces = async () => {
      try {
        if (googleMapsAuthError) {
          settleReject(googleMapsAuthError);
          return;
        }

        if (window.google?.maps?.importLibrary) {
          const places = await window.google.maps.importLibrary('places');
          settleResolve(places || window.google?.maps?.places || null);
          return;
        }

        if (window.google?.maps?.places) {
          settleResolve(window.google.maps.places);
          return;
        }

        settleReject(new Error('Google Places library is unavailable'));
      } catch (error) {
        settleReject(error);
      }
    };

    const previousAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      googleMapsAuthError = buildGooglePlacesError(
        GOOGLE_PLACE_PREDICTION_STATUS.billingOrKeyError,
        'Google Maps JavaScript API authentication failed'
      );
      if (typeof previousAuthFailure === 'function') {
        previousAuthFailure();
      }
      settleReject(googleMapsAuthError);
    };

    loadTimeout = window.setTimeout(() => {
      settleReject(
        googleMapsAuthError ||
        buildGooglePlacesError(
          GOOGLE_PLACE_PREDICTION_STATUS.loadingFailed,
          'Google Maps JavaScript API load timed out'
        )
      );
    }, GOOGLE_MAPS_LOAD_TIMEOUT_MS);

    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener('load', resolvePlaces, { once: true });
      existingScript.addEventListener('error', () => settleReject(new Error('Google Maps JavaScript API failed to load')), { once: true });
      resolvePlaces();
      return;
    }

    window.__tripPlannerGoogleMapsReady = resolvePlaces;

    const params = new URLSearchParams({
      key: GOOGLE_MAPS_API_KEY,
      libraries: 'places',
      language: 'zh-TW',
      v: 'weekly',
      loading: 'async',
      callback: '__tripPlannerGoogleMapsReady'
    });

    const script = document.createElement('script');
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.onerror = () => {
      settleReject(new Error('Google Maps JavaScript API failed to load'));
    };
    document.head.appendChild(script);
  });

  return placesLibraryPromise;
};

const normalizeLegacyPrediction = (prediction) => ({
  source: 'legacy',
  placeId: prediction.place_id || '',
  description: prediction.description || '',
  mainText: prediction.structured_formatting?.main_text || prediction.description || '',
  secondaryText: prediction.structured_formatting?.secondary_text || '',
  types: prediction.types || []
});

const normalizeNewPrediction = (suggestion) => {
  const placePrediction = suggestion?.placePrediction || suggestion;
  const description = normalizeGoogleText(placePrediction?.text);
  const mainText = normalizeGoogleText(placePrediction?.mainText) || description;
  const secondaryText = normalizeGoogleText(placePrediction?.secondaryText);

  return {
    source: 'new',
    placeId: placePrediction?.placeId || '',
    description,
    mainText,
    secondaryText,
    types: Array.isArray(placePrediction?.types) ? placePrediction.types : [],
    placePrediction
  };
};

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

const requestNewPlacePredictions = async (places, request) => {
  if (!places?.AutocompleteSuggestion?.fetchAutocompleteSuggestions) {
    throw buildGooglePlacesError(
      GOOGLE_PLACE_PREDICTION_STATUS.loadingFailed,
      'Google Places AutocompleteSuggestion is unavailable'
    );
  }

  const autocompleteRequest = {
    input: request.input,
    language: request.language || 'zh-TW'
  };

  if (Array.isArray(request.types) && request.types.length > 0) {
    autocompleteRequest.includedPrimaryTypes = request.types;
  }

  const result = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions(autocompleteRequest);
  return Array.isArray(result?.suggestions) ? result.suggestions : [];
};

const requestLegacyPlacePredictions = (places, request) => {
  if (!places?.AutocompleteService) {
    return Promise.reject(
      buildGooglePlacesError(
        GOOGLE_PLACE_PREDICTION_STATUS.loadingFailed,
        'Google Places AutocompleteService is unavailable'
      )
    );
  }

  const service = new places.AutocompleteService();
  const okStatus = places?.PlacesServiceStatus?.OK || window.google?.maps?.places?.PlacesServiceStatus?.OK;
  const zeroResultsStatus = places?.PlacesServiceStatus?.ZERO_RESULTS || window.google?.maps?.places?.PlacesServiceStatus?.ZERO_RESULTS;

  return new Promise((resolve, reject) => {
    service.getPlacePredictions(request, (predictions, status) => {
      if (status === okStatus) {
        resolve(Array.isArray(predictions) ? predictions : []);
        return;
      }

      if (status === zeroResultsStatus) {
        resolve([]);
        return;
      }

      const error = new Error(status || 'Google Places request failed');
      error.status = status;
      reject(error);
    });
  });
};

const getPlacesService = (places) => {
  if (!places?.PlacesService || typeof document === 'undefined') return null;

  if (!placesServiceElement) {
    placesServiceElement = document.createElement('div');
    placesServiceElement.setAttribute('aria-hidden', 'true');
    placesServiceElement.style.display = 'none';
    document.body.appendChild(placesServiceElement);
  }

  if (!placesService) {
    placesService = new places.PlacesService(placesServiceElement);
  }

  return placesService;
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

  if (!hasGoogleMapsApiKey()) {
    return createPredictionState(GOOGLE_PLACE_PREDICTION_STATUS.missingApiKey);
  }

  const cacheKey = getPredictionCacheKey(normalizedInput, options);
  if (placePredictionCache.has(cacheKey)) {
    return placePredictionCache.get(cacheKey);
  }

  let places = null;
  try {
    places = await loadGoogleMapsPlacesLibrary();
  } catch (error) {
    placesLibraryPromise = null;
    const status = classifyGooglePlacesError(error, GOOGLE_PLACE_PREDICTION_STATUS.loadingFailed);
    debugGooglePlaces('Google Maps JavaScript API failed to load:', {
      status,
      originalStatus: getGoogleErrorText(error),
      error
    });
    return createPredictionState(status, [], error);
  }

  const request = {
    input: normalizedInput,
    language: 'zh-TW'
  };

  if (Array.isArray(options.placeTypes) && options.placeTypes.length > 0) {
    request.types = options.placeTypes;
  }

  let newApiError = null;
  try {
    const rawPredictions = await requestNewPlacePredictions(places, request);
    const predictions = rawPredictions.map(normalizeNewPrediction);
    const status = predictions.length
      ? GOOGLE_PLACE_PREDICTION_STATUS.success
      : GOOGLE_PLACE_PREDICTION_STATUS.empty;
    return cachePredictionState(cacheKey, createPredictionState(
      status,
      predictions,
      null,
      { provider: 'places_new' }
    ));
  } catch (error) {
    newApiError = error;
    debugGooglePlaces('Google Places AutocompleteSuggestion failed:', {
      status: classifyGooglePlacesError(error),
      originalStatus: getGoogleErrorText(error),
      error
    });
  }

  try {
    const rawPredictions = await requestLegacyPlacePredictions(places, request);
    const predictions = rawPredictions.map(normalizeLegacyPrediction);
    const status = predictions.length
      ? GOOGLE_PLACE_PREDICTION_STATUS.legacyFallbackUsed
      : GOOGLE_PLACE_PREDICTION_STATUS.empty;

    return cachePredictionState(cacheKey, createPredictionState(
      status,
      predictions,
      newApiError,
      {
        provider: 'places_legacy',
        fallbackUsed: true
      }
    ));
  } catch (legacyError) {
    const specificStatus = classifyGooglePlacesError(legacyError);
    const newApiStatus = classifyGooglePlacesError(newApiError);
    const status = newApiStatus !== GOOGLE_PLACE_PREDICTION_STATUS.requestFailed
      ? newApiStatus
      : specificStatus;
    const error = buildGooglePlacesError(status, 'Google Places autocomplete failed', legacyError);
    error.newApiError = newApiError;

    debugGooglePlaces('Google Places autocomplete failed:', {
      status,
      newApiStatus,
      legacyStatus: specificStatus,
      newApiError,
      legacyError
    });

    return createPredictionState(status, [], error, {
      provider: 'none'
    });
  }
};

const getPlaceReferenceId = (placeReference) => {
  if (typeof placeReference === 'string') return placeReference.trim();
  if (!placeReference || typeof placeReference !== 'object') return '';
  return String(placeReference.placeId || placeReference.place_id || placeReference.id || '').trim();
};

const getNewPlacePrediction = (placeReference) => {
  if (!placeReference || typeof placeReference !== 'object') return null;
  if (placeReference.placePrediction?.toPlace) return placeReference.placePrediction;
  if (placeReference.rawPlacePrediction?.toPlace) return placeReference.rawPlacePrediction;
  if (placeReference.toPlace) return placeReference;
  return null;
};

const fetchNewPlaceDetails = async (placeReference, fallbackText) => {
  const placePrediction = getNewPlacePrediction(placeReference);
  if (!placePrediction?.toPlace) return null;

  const place = placePrediction.toPlace();
  await place.fetchFields({
    fields: ['id', 'displayName', 'formattedAddress', 'location']
  });

  return normalizeGooglePlaceResult(place, fallbackText);
};

export const fetchGooglePlaceDetails = async (placeReference, fallbackText = '') => {
  const normalizedPlaceId = getPlaceReferenceId(placeReference);
  if (!normalizedPlaceId) {
    return normalizeGooglePlaceResult(null, fallbackText);
  }

  let places = null;
  try {
    places = await loadGoogleMapsPlacesLibrary();
  } catch (error) {
    debugGooglePlaces('Google Places details failed to load:', error);
    return {
      ...normalizeGooglePlaceResult(null, fallbackText),
      placeId: normalizedPlaceId
    };
  }

  try {
    const newPlaceResult = await fetchNewPlaceDetails(placeReference, fallbackText);
    if (newPlaceResult) {
      return {
        ...newPlaceResult,
        placeId: newPlaceResult.placeId || normalizedPlaceId
      };
    }
  } catch (error) {
    debugGooglePlaces('Google Places new details failed, falling back to legacy details:', {
      originalStatus: getGoogleErrorText(error),
      error
    });
  }

  const service = getPlacesService(places);
  if (!service) {
    return {
      ...normalizeGooglePlaceResult(null, fallbackText),
      placeId: normalizedPlaceId
    };
  }

  return new Promise((resolve) => {
    service.getDetails(
      {
        placeId: normalizedPlaceId,
        fields: ['place_id', 'name', 'formatted_address', 'geometry', 'types']
      },
      (place, status) => {
        const okStatus = places?.PlacesServiceStatus?.OK || window.google?.maps?.places?.PlacesServiceStatus?.OK;
        if (status === okStatus && place) {
          resolve(normalizeGooglePlaceResult(place, fallbackText));
          return;
        }

        resolve({
          ...normalizeGooglePlaceResult(null, fallbackText),
          placeId: normalizedPlaceId
        });
      }
    );
  });
};

export const geocodePlace = async (query) => {
  const normalizedQuery = normalizePlaceText(query);
  if (!normalizedQuery) {
    throw new Error('缺少地點');
  }

  if (!hasGoogleMapsApiKey()) {
    return {
      success: false,
      reason: 'missing_api_key',
      query: normalizedQuery
    };
  }

  const params = new URLSearchParams({
    address: normalizedQuery,
    key: GOOGLE_MAPS_API_KEY,
    language: 'zh-TW'
  });

  const response = await fetch(`${GOOGLE_GEOCODING_ENDPOINT}?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Google Geocoding API 請求失敗');
  }

  const payload = await response.json();
  const firstResult = Array.isArray(payload.results) ? payload.results[0] : null;

  if (!firstResult) {
    return {
      success: false,
      reason: payload.status || 'not_found',
      query: normalizedQuery
    };
  }

  return {
    success: true,
    query: normalizedQuery,
    placeId: firstResult.place_id || '',
    formattedAddress: firstResult.formatted_address || normalizedQuery,
    lat: firstResult.geometry?.location?.lat ?? null,
    lng: firstResult.geometry?.location?.lng ?? null
  };
};
