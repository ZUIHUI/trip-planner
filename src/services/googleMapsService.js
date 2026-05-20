const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const GOOGLE_GEOCODING_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json';
const GOOGLE_MAPS_SCRIPT_ID = 'trip-planner-google-maps-js';

const hasText = (value) => typeof value === 'string' && value.trim().length > 0;
let placesLibraryPromise = null;
let placesServiceElement = null;
let placesService = null;
const placePredictionCache = new Map();
const PLACE_PREDICTION_CACHE_LIMIT = 40;

export const GOOGLE_PLACE_PREDICTION_STATUS = {
  idle: 'idle',
  missingApiKey: 'missing_api_key',
  loadingFailed: 'loading_failed',
  requestFailed: 'request_failed',
  empty: 'empty',
  success: 'success'
};

export const hasGoogleMapsApiKey = () => hasText(GOOGLE_MAPS_API_KEY);

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

  if (window.google?.maps?.places) {
    return Promise.resolve(window.google.maps.places);
  }

  if (placesLibraryPromise) {
    return placesLibraryPromise;
  }

  placesLibraryPromise = new Promise((resolve, reject) => {
    const resolvePlaces = async () => {
      try {
        if (window.google?.maps?.places) {
          resolve(window.google.maps.places);
          return;
        }

        if (window.google?.maps?.importLibrary) {
          const places = await window.google.maps.importLibrary('places');
          resolve(places);
          return;
        }

        reject(new Error('Google Places library is unavailable'));
      } catch (error) {
        reject(error);
      }
    };

    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener('load', resolvePlaces, { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Google Maps JavaScript API failed to load')), { once: true });
      resolvePlaces();
      return;
    }

    window.__tripPlannerGoogleMapsReady = resolvePlaces;

    const params = new URLSearchParams({
      key: GOOGLE_MAPS_API_KEY,
      libraries: 'places',
      language: 'zh-TW',
      loading: 'async',
      callback: '__tripPlannerGoogleMapsReady'
    });

    const script = document.createElement('script');
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.onerror = () => {
      placesLibraryPromise = null;
      reject(new Error('Google Maps JavaScript API failed to load'));
    };
    document.head.appendChild(script);
  });

  return placesLibraryPromise;
};

const normalizePrediction = (prediction) => ({
  placeId: prediction.place_id || '',
  description: prediction.description || '',
  mainText: prediction.structured_formatting?.main_text || prediction.description || '',
  secondaryText: prediction.structured_formatting?.secondary_text || '',
  types: prediction.types || []
});

const getPredictionCacheKey = (input, options = {}) => {
  const placeTypesKey = Array.isArray(options.placeTypes) ? options.placeTypes.join('|') : '';
  return `${placeTypesKey}::${String(input || '').trim().toLowerCase()}`;
};

const cachePredictionState = (key, state) => {
  if (!key || state.status === GOOGLE_PLACE_PREDICTION_STATUS.requestFailed || state.status === GOOGLE_PLACE_PREDICTION_STATUS.loadingFailed) {
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

const requestPlacePredictions = (places, request) => {
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

      reject(new Error(status || 'Google Places request failed'));
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
    return {
      status: GOOGLE_PLACE_PREDICTION_STATUS.idle,
      predictions: [],
      error: null
    };
  }

  if (!hasGoogleMapsApiKey()) {
    return {
      status: GOOGLE_PLACE_PREDICTION_STATUS.missingApiKey,
      predictions: [],
      error: null
    };
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
    return {
      status: GOOGLE_PLACE_PREDICTION_STATUS.loadingFailed,
      predictions: [],
      error
    };
  }

  if (!places?.AutocompleteService) {
    return {
      status: GOOGLE_PLACE_PREDICTION_STATUS.loadingFailed,
      predictions: [],
      error: new Error('Google Places autocomplete is unavailable')
    };
  }

  const request = {
    input: normalizedInput,
    language: 'zh-TW'
  };

  if (Array.isArray(options.placeTypes) && options.placeTypes.length > 0) {
    request.types = options.placeTypes;
  }

  try {
    const rawPredictions = await requestPlacePredictions(places, request);
    const predictions = rawPredictions.map(normalizePrediction);
    return cachePredictionState(cacheKey, {
      status: predictions.length
        ? GOOGLE_PLACE_PREDICTION_STATUS.success
        : GOOGLE_PLACE_PREDICTION_STATUS.empty,
      predictions,
      error: null
    });
  } catch (error) {
    console.warn('Google Places predictions failed:', error);
    return {
      status: GOOGLE_PLACE_PREDICTION_STATUS.requestFailed,
      predictions: [],
      error
    };
  }
};

export const fetchGooglePlaceDetails = async (placeId, fallbackText = '') => {
  const normalizedPlaceId = String(placeId || '').trim();
  if (!normalizedPlaceId) {
    return normalizeGooglePlaceResult(null, fallbackText);
  }

  let places = null;
  try {
    places = await loadGoogleMapsPlacesLibrary();
  } catch (error) {
    console.warn('Google Places details failed to load:', error);
    return {
      ...normalizeGooglePlaceResult(null, fallbackText),
      placeId: normalizedPlaceId
    };
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
