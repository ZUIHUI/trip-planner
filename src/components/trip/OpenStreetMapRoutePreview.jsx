import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LocateFixed, Map as MapIcon, Minus, Plus, Route } from 'lucide-react';
import { geocodePlace } from '../../services/googleMapsService';
import {
  OPEN_STREET_MAP_TILE_SIZE,
  OPEN_STREET_MAP_MAX_ZOOM,
  OPEN_STREET_MAP_MIN_ZOOM,
  buildOpenStreetMapRoutePreviewModel,
  getRoutePreviewCoordinate,
  panOpenStreetMapCenter,
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
  const dragRef = useRef(null);
  const [size, setSize] = useState({ width: 800, height: 400 });
  const [points, setPoints] = useState([]);
  const [isResolving, setIsResolving] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [view, setView] = useState(null);
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
        setView(null);
      })
      .finally(() => {
        if (isActive) setIsResolving(false);
      });

    return () => {
      isActive = false;
    };
  }, [selectedStops]);

  const model = useMemo(
    () => buildOpenStreetMapRoutePreviewModel(points, {
      ...size,
      center: view?.center,
      zoom: view?.zoom
    }),
    [points, size, view]
  );
  const routeLine = model?.points.map((point) => `${point.x},${point.y}`).join(' ') || '';

  const updateZoom = (step) => {
    if (!model) return;
    setView((current) => ({
      center: current?.center || model.center,
      zoom: Math.min(
        OPEN_STREET_MAP_MAX_ZOOM,
        Math.max(OPEN_STREET_MAP_MIN_ZOOM, (current?.zoom ?? model.zoom) + step)
      )
    }));
  };

  const panBy = (deltaX, deltaY) => {
    if (!model) return;
    const center = panOpenStreetMapCenter(model.center, model.zoom, deltaX, deltaY);
    if (center) setView({ center, zoom: model.zoom });
  };

  const handlePointerDown = (event) => {
    if (!model || (event.button !== undefined && event.button !== 0)) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      center: model.center,
      zoom: model.zoom
    };
    setIsDragging(true);
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const center = panOpenStreetMapCenter(
      drag.center,
      drag.zoom,
      event.clientX - drag.clientX,
      event.clientY - drag.clientY
    );
    if (center) setView({ center, zoom: drag.zoom });
  };

  const finishPointerInteraction = (event) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    dragRef.current = null;
    setIsDragging(false);
  };

  const handleWheel = (event) => {
    if (!model || Math.abs(event.deltaY) < 1) return;
    event.preventDefault();
    updateZoom(event.deltaY < 0 ? 1 : -1);
  };

  const handleKeyDown = (event) => {
    const keyboardActions = {
      ArrowLeft: () => panBy(48, 0),
      ArrowRight: () => panBy(-48, 0),
      ArrowUp: () => panBy(0, 48),
      ArrowDown: () => panBy(0, -48),
      '+': () => updateZoom(1),
      '=': () => updateZoom(1),
      '-': () => updateZoom(-1)
    };
    const action = keyboardActions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  };

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
          <div
            className={`tp-osm-route-canvas absolute inset-0 z-0 overflow-hidden ${isDragging ? 'is-dragging' : ''}`}
            role="application"
            aria-label={`${title}，可拖曳地圖，使用加減按鈕或滾輪縮放`}
            tabIndex={0}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishPointerInteraction}
            onPointerCancel={finishPointerInteraction}
            onWheel={handleWheel}
            onKeyDown={handleKeyDown}
          >
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
                className="tp-osm-route-marker pointer-events-none absolute z-20 inline-flex items-center justify-center rounded-full"
                style={{ left: point.x, top: point.y }}
                title={`${point.number}. ${point.label || '停靠點'}`}
                aria-hidden="true"
              >
                {point.number}
              </span>
            ))}
          </div>

          <span className="tp-osm-route-badge absolute left-2 top-2 z-20 rounded-full px-2 py-1 text-[11px] font-semibold">
            可拖曳・可縮放
          </span>
          <div className="tp-osm-route-controls absolute right-2 top-2 z-30 flex flex-col gap-1.5" aria-label="地圖控制">
            <button type="button" onClick={() => updateZoom(1)} disabled={model.zoom >= OPEN_STREET_MAP_MAX_ZOOM} aria-label="放大地圖">
              <Plus size={18} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => updateZoom(-1)} disabled={model.zoom <= OPEN_STREET_MAP_MIN_ZOOM} aria-label="縮小地圖">
              <Minus size={18} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setView(null)} disabled={!view} aria-label="重設路線範圍">
              <LocateFixed size={18} aria-hidden="true" />
            </button>
          </div>
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
