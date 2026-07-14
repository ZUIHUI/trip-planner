import { normalizePlaceText } from './placeText';
import { getEventDestination, formatEventTime } from './tripEvents';

export const getRouteEventDestination = getEventDestination;

export const getItineraryRouteEvents = (events = []) => (
  Array.isArray(events) ? [...events] : []
);

const readEventMinuteOfDay = (event) => {
  const match = formatEventTime(event, '').match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  return (Number(match[1]) * 60) + Number(match[2]);
};

export const formatRouteStopTime = (stop) => {
  const time = stop?.time || '--:--';
  const dayOffset = Math.max(0, Number(stop?.dayOffset) || 0);
  if (!dayOffset) return time;
  return `${dayOffset === 1 ? '翌日' : `+${dayOffset}日`} ${time}`;
};

const readFiniteCoordinate = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
};

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
  const sourceEvents = getItineraryRouteEvents(events);
  const routeStops = [];
  const missingEvents = [];
  let dayOffset = 0;
  let previousMinute = null;

  sourceEvents.forEach((event, index) => {
    const eventMinute = readEventMinuteOfDay(event);
    if (eventMinute !== null) {
      if (previousMinute !== null && eventMinute < previousMinute) dayOffset += 1;
      previousMinute = eventMinute;
    }

    const routeStop = buildRouteStop(event, index);
    if (routeStop) {
      routeStops.push({ ...routeStop, dayOffset });
      return;
    }
    missingEvents.push({ ...buildMissingRouteEvent(event, index), dayOffset });
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
