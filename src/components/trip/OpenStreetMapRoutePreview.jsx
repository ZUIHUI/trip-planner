import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Map as MapIcon, Route } from 'lucide-react';
import { geocodePlace } from '../../services/googleMapsService';
import {
  OPEN_STREET_MAP_TILE_SIZE,
  buildOpenStreetMapRoutePreviewModel,
  getRoutePreviewCoordinate,
  selectOpenStreetMapRouteStops
} from '../../utils/openStreetMapPreview';
import { normalizePlaceText } from '../../utils/placeText';

const geocodeCache = new Map();

const getStopDestination = (stop) => stop?.destination || stop;

const getStopLabel = (stop) => (
  String(stop?.text || '').trim() || normalizePlaceText(getStopDestination(stop))
);

const geocodeRouteStop = async (stop) => {
  const destination = getStopDestination(stop);
  const label = getStopLabel(stop);
  const existingCoordinate = getRoutePreviewCoordinate(destination, label);
  if (existingCoordinate) return existingCoordinate;
  if (!label) return null;

  const cacheKey = label.toLocaleLowerCase('zh-TW');
  if (!geocodeCache.has(cacheKey)) {
    geocodeCache.set(cacheKey, geocodePlace(label)
      .then((result) => getRoutePreviewCoordinate(result, label))
      .catch(() => null));
  }

  return geocodeCache.get(cacheKey);
};

const OpenStreetMapRoutePreview = ({
  routeStops = [],
  title = '今日路線地圖預覽',
  className = '',
  loading = 'lazy'
}) => {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 800, height: 400 });
  const [points, setPoints] = useState([]);
  const [isResolving, setIsResolving] = useState(true);
  const selectedStops = useMemo(
    () => selectOpenStreetMapRouteStops(routeStops),
    [routeStops]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return undefined;

    const updateSize = () => {
      const nextWidth = Math.round(container.clientWidth);
      const nextHeight = Math.round(container.clientHeight);
      if (nextWidth < 1 || nextHeight < 1) return;
      setSize((current) => (
        current.width === nextWidth && current.height === nextHeight
          ? current
          : { width: nextWidth, height: nextHeight }
      ));
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isActive = true;
    setIsResolving(true);

    Promise.all(selectedStops.map(geocodeRouteStop))
      .then((resolvedPoints) => {
        if (!isActive) return;
        setPoints(resolvedPoints.filter(Boolean));
      })
      .finally(() => {
        if (isActive) setIsResolving(false);
      });

    return () => {
      isActive = false;
    };
  }, [selectedStops]);

  const model = useMemo(
    () => buildOpenStreetMapRoutePreviewModel(points, size),
    [points, size]
  );
  const routeLine = model?.points.map((point) => `${point.x},${point.y}`).join(' ') || '';

  return (
    <div
      ref={containerRef}
      className={`tp-route-preview-surface tp-osm-route-preview relative isolate min-h-56 overflow-hidden ${className}`}
      role="group"
      aria-label={title}
      aria-busy={isResolving}
    >
      {!model && (
        <div className="tp-route-preview-loading absolute inset-0 z-20 flex items-center justify-center px-6 text-center">
          <div className="max-w-xs">
            <span className="tp-route-preview-icon mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full shadow-sm">
              {isResolving ? <Route size={21} aria-hidden="true" /> : <MapIcon size={21} aria-hidden="true" />}
            </span>
            <p className="mt-3 text-sm font-black">
              {isResolving ? '正在整理路線地圖…' : '地圖暫時無法定位'}
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 opacity-75">
              {isResolving
                ? '正在透過雲端服務取得停靠點座標。'
                : '仍可使用「開路線」前往 Google Maps。'}
            </p>
          </div>
        </div>
      )}

      {model && (
        <>
          <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
            {model.tiles.map((tile) => (
              <img
                key={tile.id}
                src={tile.url}
                alt=""
                width={OPEN_STREET_MAP_TILE_SIZE}
                height={OPEN_STREET_MAP_TILE_SIZE}
                loading={loading}
                draggable="false"
                className="tp-osm-route-tile absolute max-w-none select-none"
                style={{ left: tile.left, top: tile.top }}
              />
            ))}
          </div>

          <svg
            className="pointer-events-none absolute inset-0 z-10 h-full w-full"
            viewBox={`0 0 ${model.width} ${model.height}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {model.points.length > 1 && (
              <>
                <polyline className="tp-osm-route-line-halo" points={routeLine} />
                <polyline className="tp-osm-route-line" points={routeLine} />
              </>
            )}
          </svg>

          {model.points.map((point) => (
            <span
              key={`${point.number}-${point.lat}-${point.lng}`}
              className="tp-osm-route-marker absolute z-20 inline-flex items-center justify-center rounded-full"
              style={{ left: point.x, top: point.y }}
              title={`${point.number}. ${point.label || '停靠點'}`}
              aria-hidden="true"
            >
              {point.number}
            </span>
          ))}

          <span className="tp-osm-route-badge absolute left-2 top-2 z-20 rounded-full px-2 py-1 text-[11px] font-semibold">
            路線地圖
          </span>
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="tp-osm-attribution absolute bottom-1 right-1 z-20 rounded px-1.5 py-0.5 text-[10px] font-medium"
          >
            © OpenStreetMap contributors
          </a>
        </>
      )}
    </div>
  );
};

export default OpenStreetMapRoutePreview;
