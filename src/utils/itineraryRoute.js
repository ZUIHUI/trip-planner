import { normalizePlaceText } from './placeText';
import { readFiniteCoordinate } from './placeCoordinates';
import { getEventDestination, formatEventTime } from './tripEvents';

export const getRouteEventDestination = getEventDestination;

export const getTripRouteOrigin = (tripDetails = {}, currentLocation = null) => {
  const currentLocationName = normalizePlaceText(currentLocation?.locationName);
  const currentLatitude = readFiniteCoordinate(currentLocation?.latitude);
  const currentLongitude = readFiniteCoordinate(currentLocation?.longitude);
  const hasCurrentCoordinates = currentLatitude !== null && currentLongitude !== null;
  const currentLabel = currentLocationName || (hasCurrentCoordinates ? '目前位置' : '');

  if (currentLocationName || hasCurrentCoordinates) {
    return {
      name: currentLabel,
      address: currentLabel,
      lat: hasCurrentCoordinates ? currentLatitude : null,
      lng: hasCurrentCoordinates ? currentLongitude : null
    };
  }

  const accommodation = tripDetails?.accommodation;
  if (!accommodation) return '';
  return accommodation.locationPlace || accommodation.location || accommodation;
};

export const getTripRouteOriginLabel = (tripDetails = {}, currentLocation = null) => {
  const hasCurrentCoordinates = readFiniteCoordinate(currentLocation?.latitude) !== null
    && readFiniteCoordinate(currentLocation?.longitude) !== null;
  if (normalizePlaceText(currentLocation?.locationName) || hasCurrentCoordinates) return '目前位置';
  if (normalizePlaceText(tripDetails?.accommodation)) return '住宿';
  return '未設定';
};

export const buildRouteStop = (event, itineraryIndex = 0) => {
  const destination = getRouteEventDestination(event);
  const text = normalizePlaceText(destination);
  if (!text) return null;

  return {
    id: event?.id || '',
    title: event?.title || text,
    time: formatEventTime(event),
    destination,
    text,
    itineraryIndex
  };
};

export const buildMissingRouteEvent = (event, itineraryIndex = 0) => ({
  id: event?.id || `missing-${itineraryIndex}`,
  title: event?.title || `行程 ${itineraryIndex + 1}`,
  time: formatEventTime(event),
  itineraryIndex
});

export const buildItineraryRouteState = (events = [], { origin = '' } = {}) => {
  const sourceEvents = Array.isArray(events) ? events : [];
  const routeStops = [];
  const missingEvents = [];

  sourceEvents.forEach((event, index) => {
    const routeStop = buildRouteStop(event, index);
    if (routeStop) {
      routeStops.push(routeStop);
      return;
    }
    missingEvents.push(buildMissingRouteEvent(event, index));
  });

  const totalEvents = sourceEvents.length;
  const routeStopCount = routeStops.length;
  const missingCount = missingEvents.length;
  const completenessPercent = totalEvents
    ? Math.round((routeStopCount / totalEvents) * 100)
    : 0;

  return {
    routeStops,
    missingEvents,
    totalEvents,
    routeStopCount,
    missingCount,
    completenessPercent,
    originText: normalizePlaceText(origin),
    hasCompleteRoute: routeStopCount > 0 && missingCount === 0,
    hasPartialRoute: routeStopCount > 0 && missingCount > 0
  };
};
