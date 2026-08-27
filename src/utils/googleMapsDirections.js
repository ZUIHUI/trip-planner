import { getPlaceId, normalizePlaceText } from './placeText';

export const buildGoogleMapsSearchUrl = (query) => {
  const normalizedQuery = normalizePlaceText(query);
  if (!normalizedQuery) return '';

  const params = new URLSearchParams({ api: '1', query: normalizedQuery });
  const placeId = getPlaceId(query);
  if (placeId) params.set('query_place_id', placeId);

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
  if (normalizedOrigin) params.set('origin', normalizedOrigin);

  const destinationPlaceId = getPlaceId(destination);
  if (destinationPlaceId) params.set('destination_place_id', destinationPlaceId);

  const originPlaceId = getPlaceId(origin);
  if (originPlaceId) params.set('origin_place_id', originPlaceId);

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
  if (normalizedOrigin) params.set('origin', normalizedOrigin);
  if (waypoints.length) params.set('waypoints', waypoints.join('|'));

  return `https://www.google.com/maps/dir/?${params.toString()}`;
};
