import { getEventLocationText } from './tripEvents';

export const hasEventTime = (event) => {
  const time = String(event?.time || '').trim();
  return Boolean(time && time !== '--:--');
};

export const buildEventReadiness = (event) => {
  const locationText = getEventLocationText(event).trim();
  const hasTime = hasEventTime(event);
  const hasLocation = Boolean(locationText);
  const missingItems = [];

  if (!hasTime) {
    missingItems.push({
      id: 'time',
      label: '缺時間'
    });
  }

  if (!hasLocation) {
    missingItems.push({
      id: 'location',
      label: '缺地點'
    });
  }

  return {
    hasTime,
    hasLocation,
    canNavigate: hasLocation,
    locationText,
    missingItems,
    isReadyForRoute: hasTime && hasLocation
  };
};

export const buildDayReadiness = (events = []) => {
  const sourceEvents = Array.isArray(events) ? events : [];
  const eventStates = sourceEvents.map((event, index) => ({
    event,
    index,
    readiness: buildEventReadiness(event)
  }));
  const incompleteEvents = eventStates.filter((item) => !item.readiness.isReadyForRoute);

  return {
    totalEvents: sourceEvents.length,
    readyCount: eventStates.length - incompleteEvents.length,
    incompleteCount: incompleteEvents.length,
    missingTimeCount: eventStates.filter((item) => !item.readiness.hasTime).length,
    missingLocationCount: eventStates.filter((item) => !item.readiness.hasLocation).length,
    incompleteEvents,
    firstIncompleteEvent: incompleteEvents[0]?.event || null,
    isComplete: sourceEvents.length > 0 && incompleteEvents.length === 0
  };
};
