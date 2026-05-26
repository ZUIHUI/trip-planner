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
