import { getPlaceId, normalizePlaceText } from './placeText';

export const GOOGLE_MAPS_EMBED_MAX_WAYPOINTS = 20;

const readCoordinate = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || String(value).trim() === '') continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
};

const hasValidCoordinates = (lat, lng) => (
  lat !== null
  && lng !== null
  && lat >= -90
  && lat <= 90
  && lng >= -180
  && lng <= 180
);

export const formatGoogleMapsEmbedPlace = (place) => {
  const placeId = getPlaceId(place);
  if (placeId) return `place_id:${placeId}`;

  if (place && typeof place === 'object') {
    const location = place.location || place.geometry?.location || null;
    const lat = readCoordinate(place.lat, place.latitude, location?.lat, location?.latitude);
    const lng = readCoordinate(place.lng, place.longitude, location?.lng, location?.longitude);

    if (hasValidCoordinates(lat, lng)) {
      return `${lat},${lng}`;
    }
  }

  return normalizePlaceText(place);
};

const uniqueRoutePoints = (points = []) => {
  const unique = [];
  points.forEach((point) => {
    if (!point || point === unique[unique.length - 1]) return;
    unique.push(point);
  });
  return unique;
};

const buildEmbedBaseParams = ({ apiKey, language, region }) => {
  const params = new URLSearchParams({ key: apiKey });
  if (language) params.set('language', language);
  if (region) params.set('region', region);
  return params;
};

export const buildGoogleMapsEmbedRouteUrl = ({
  apiKey,
  origin,
  destinations = [],
  mode = 'transit',
  language = 'zh-TW',
  region = 'TW'
} = {}) => {
  const normalizedApiKey = String(apiKey || '').trim();
  if (!normalizedApiKey) return '';

  const routePoints = uniqueRoutePoints(
    (Array.isArray(destinations) ? destinations : [destinations])
      .map(formatGoogleMapsEmbedPlace)
      .filter(Boolean)
  );
  if (!routePoints.length) return '';

  let originPoint = formatGoogleMapsEmbedPlace(origin);
  if (originPoint && routePoints[0] === originPoint) {
    routePoints.shift();
  }

  if (!originPoint) {
    originPoint = routePoints.shift() || '';
  }

  if (!routePoints.length) {
    const params = buildEmbedBaseParams({ apiKey: normalizedApiKey, language, region });
    params.set('q', originPoint);
    return `https://www.google.com/maps/embed/v1/place?${params.toString()}`;
  }

  const finalDestination = routePoints[routePoints.length - 1];
  const waypoints = routePoints
    .slice(0, -1)
    .slice(0, GOOGLE_MAPS_EMBED_MAX_WAYPOINTS);
  const params = buildEmbedBaseParams({ apiKey: normalizedApiKey, language, region });
  params.set('origin', originPoint);
  params.set('destination', finalDestination);
  params.set('mode', mode);
  params.set('units', 'metric');
  if (waypoints.length) {
    params.set('waypoints', waypoints.join('|'));
  }

  return `https://www.google.com/maps/embed/v1/directions?${params.toString()}`;
};
