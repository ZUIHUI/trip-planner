export const readFiniteCoordinate = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || String(value).trim() === '') continue;
    const coordinate = Number(value);
    if (Number.isFinite(coordinate)) return coordinate;
  }

  return null;
};

export const hasUsableCoordinatePair = (lat, lng) => (
  lat !== null
  && lng !== null
  && lat >= -90
  && lat <= 90
  && lng >= -180
  && lng <= 180
  && !(lat === 0 && lng === 0)
);
