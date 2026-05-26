export const getPlaceId = (place) => {
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
