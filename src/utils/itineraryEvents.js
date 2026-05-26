const normalizeId = (value) => String(value ?? '');

export const moveEventInDay = (events = [], eventId, direction) => {
  const sourceEvents = Array.isArray(events) ? events : [];
  const offset = direction === 'up' ? -1 : direction === 'down' ? 1 : 0;
  if (!offset) return sourceEvents;

  const currentIndex = sourceEvents.findIndex((event) => normalizeId(event?.id) === normalizeId(eventId));
  const nextIndex = currentIndex + offset;

  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= sourceEvents.length) {
    return sourceEvents;
  }

  const nextEvents = [...sourceEvents];
  [nextEvents[currentIndex], nextEvents[nextIndex]] = [nextEvents[nextIndex], nextEvents[currentIndex]];
  return nextEvents;
};

export const canMoveEventInDay = (events = [], eventId, direction) => {
  const sourceEvents = Array.isArray(events) ? events : [];
  const currentIndex = sourceEvents.findIndex((event) => normalizeId(event?.id) === normalizeId(eventId));
  if (currentIndex < 0) return false;
  if (direction === 'up') return currentIndex > 0;
  if (direction === 'down') return currentIndex < sourceEvents.length - 1;
  return false;
};

export const moveEventToDay = (
  itinerary = [],
  eventId,
  sourceDayNumber,
  targetDayNumber,
  { insertIndex = null } = {}
) => {
  const sourceItinerary = Array.isArray(itinerary) ? itinerary : [];
  if (sourceDayNumber === targetDayNumber) return sourceItinerary;

  const sourceDay = sourceItinerary.find((day) => day?.day === sourceDayNumber);
  const targetDay = sourceItinerary.find((day) => day?.day === targetDayNumber);
  if (!sourceDay || !targetDay) return sourceItinerary;

  const sourceEvents = Array.isArray(sourceDay.events) ? sourceDay.events : [];
  const targetEvents = Array.isArray(targetDay.events) ? targetDay.events : [];
  const eventIndex = sourceEvents.findIndex((event) => normalizeId(event?.id) === normalizeId(eventId));
  if (eventIndex < 0) return sourceItinerary;

  const eventToMove = sourceEvents[eventIndex];
  const targetEventsWithoutMoved = targetEvents.filter((event) => normalizeId(event?.id) !== normalizeId(eventId));
  const normalizedInsertIndex = Number.isInteger(insertIndex)
    ? Math.max(0, Math.min(insertIndex, targetEventsWithoutMoved.length))
    : targetEventsWithoutMoved.length;
  const nextTargetEvents = [...targetEventsWithoutMoved];
  nextTargetEvents.splice(normalizedInsertIndex, 0, eventToMove);

  return sourceItinerary.map((day) => {
    if (day?.day === sourceDayNumber) {
      return {
        ...day,
        events: sourceEvents.filter((event) => normalizeId(event?.id) !== normalizeId(eventId))
      };
    }

    if (day?.day === targetDayNumber) {
      return {
        ...day,
        events: nextTargetEvents
      };
    }

    return day;
  });
};
