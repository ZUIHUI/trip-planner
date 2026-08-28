import { hasUsableCoordinatePair, readFiniteCoordinate } from './placeCoordinates';
import { normalizePlaceText } from './placeText';

export const OPEN_STREET_MAP_TILE_SIZE = 256;
export const OPEN_STREET_MAP_MAX_ROUTE_STOPS = 12;

const MAX_MERCATOR_LATITUDE = 85.05112878;
const MIN_ZOOM = 2;
const MAX_ZOOM = 16;
const DEFAULT_SINGLE_POINT_ZOOM = 14;

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

const normalizeLongitude = (longitude) => {
  const wrapped = ((longitude + 180) % 360 + 360) % 360;
  return wrapped - 180;
};

const projectCoordinate = ({ lat, lng }, zoom) => {
  const normalizedLatitude = clamp(lat, -MAX_MERCATOR_LATITUDE, MAX_MERCATOR_LATITUDE);
  const latitudeRadians = normalizedLatitude * Math.PI / 180;
  const worldSize = OPEN_STREET_MAP_TILE_SIZE * (2 ** zoom);

  return {
    x: ((normalizeLongitude(lng) + 180) / 360) * worldSize,
    y: (
      1 - Math.log(Math.tan(latitudeRadians) + (1 / Math.cos(latitudeRadians))) / Math.PI
    ) / 2 * worldSize
  };
};

export const getRoutePreviewCoordinate = (place, fallbackLabel = '') => {
  if (!place || typeof place !== 'object') return null;

  const location = place.location || place.geometry?.location || null;
  const lat = readFiniteCoordinate(place.lat, place.latitude, location?.lat, location?.latitude);
  const lng = readFiniteCoordinate(place.lng, place.longitude, location?.lng, location?.longitude);
  if (!hasUsableCoordinatePair(lat, lng)) return null;

  return {
    lat,
    lng,
    label: normalizePlaceText(place) || String(fallbackLabel || '').trim()
  };
};

export const selectOpenStreetMapRouteStops = (routeStops = []) => {
  const stops = Array.isArray(routeStops) ? routeStops.filter(Boolean) : [];
  if (stops.length <= OPEN_STREET_MAP_MAX_ROUTE_STOPS) return stops;

  return [
    ...stops.slice(0, OPEN_STREET_MAP_MAX_ROUTE_STOPS - 1),
    stops[stops.length - 1]
  ];
};

const getBoundsAtZoom = (points, zoom) => {
  const projected = points.map((point) => projectCoordinate(point, zoom));
  const xValues = projected.map((point) => point.x);
  const yValues = projected.map((point) => point.y);

  return {
    projected,
    minX: Math.min(...xValues),
    maxX: Math.max(...xValues),
    minY: Math.min(...yValues),
    maxY: Math.max(...yValues)
  };
};

const chooseZoom = (points, width, height, padding) => {
  if (points.length <= 1) return DEFAULT_SINGLE_POINT_ZOOM;

  const bounds = getBoundsAtZoom(points, 0);
  const availableWidth = Math.max(1, width - padding * 2);
  const availableHeight = Math.max(1, height - padding * 2);
  const widthRatio = availableWidth / Math.max(1e-9, bounds.maxX - bounds.minX);
  const heightRatio = availableHeight / Math.max(1e-9, bounds.maxY - bounds.minY);
  const zoom = Math.floor(Math.log2(Math.min(widthRatio, heightRatio)));

  return clamp(Number.isFinite(zoom) ? zoom : DEFAULT_SINGLE_POINT_ZOOM, MIN_ZOOM, MAX_ZOOM);
};

export const buildOpenStreetMapRoutePreviewModel = (
  points = [],
  { width = 800, height = 400, padding = 48 } = {}
) => {
  const normalizedPoints = (Array.isArray(points) ? points : [])
    .map((point, index) => {
      const coordinate = getRoutePreviewCoordinate(point, point?.label || `停靠點 ${index + 1}`);
      return coordinate ? { ...coordinate, index } : null;
    })
    .filter(Boolean);

  if (!normalizedPoints.length) return null;

  const safeWidth = Math.max(240, Number(width) || 800);
  const safeHeight = Math.max(200, Number(height) || 400);
  const safePadding = clamp(Number(padding) || 0, 20, Math.min(safeWidth, safeHeight) / 3);
  const zoom = chooseZoom(normalizedPoints, safeWidth, safeHeight, safePadding);
  const bounds = getBoundsAtZoom(normalizedPoints, zoom);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const topLeftX = centerX - safeWidth / 2;
  const topLeftY = centerY - safeHeight / 2;
  const tileCount = 2 ** zoom;
  const firstTileX = Math.floor(topLeftX / OPEN_STREET_MAP_TILE_SIZE);
  const lastTileX = Math.floor((topLeftX + safeWidth) / OPEN_STREET_MAP_TILE_SIZE);
  const firstTileY = Math.max(0, Math.floor(topLeftY / OPEN_STREET_MAP_TILE_SIZE));
  const lastTileY = Math.min(
    tileCount - 1,
    Math.floor((topLeftY + safeHeight) / OPEN_STREET_MAP_TILE_SIZE)
  );
  const tiles = [];

  for (let tileY = firstTileY; tileY <= lastTileY; tileY += 1) {
    for (let tileX = firstTileX; tileX <= lastTileX; tileX += 1) {
      const wrappedTileX = ((tileX % tileCount) + tileCount) % tileCount;
      tiles.push({
        id: `${zoom}-${wrappedTileX}-${tileY}`,
        url: `https://tile.openstreetmap.org/${zoom}/${wrappedTileX}/${tileY}.png`,
        left: tileX * OPEN_STREET_MAP_TILE_SIZE - topLeftX,
        top: tileY * OPEN_STREET_MAP_TILE_SIZE - topLeftY
      });
    }
  }

  return {
    width: safeWidth,
    height: safeHeight,
    zoom,
    tiles,
    points: normalizedPoints.map((point, index) => ({
      ...point,
      number: index + 1,
      x: bounds.projected[index].x - topLeftX,
      y: bounds.projected[index].y - topLeftY
    }))
  };
};
