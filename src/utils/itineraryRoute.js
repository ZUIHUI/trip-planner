import { normalizePlaceText } from './placeText';
import { getEventDestination, formatEventTime } from './tripEvents';

export const getRouteEventDestination = getEventDestination;

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
