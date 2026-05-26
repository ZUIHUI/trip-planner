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
