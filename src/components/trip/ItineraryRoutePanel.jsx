import React, { useMemo } from 'react';
import { Map, MapPin, Navigation } from 'lucide-react';
import {
  buildGoogleMapsMultiStopDirectionsUrl,
  normalizePlaceText
} from '../../services/googleMapsService';
import { Button, Card } from '../ui';

const getEventLocation = (event) => {
  const destination = event?.locationPlace || event?.location;
  const text = normalizePlaceText(destination);
  if (!text) return null;

  return {
    id: event.id,
    title: event.title || text,
    time: event.time || '--:--',
    destination,
    text
  };
};

const ItineraryRoutePanel = ({ currentDayData, tripDetails, currentLocation }) => {
  const routeStops = useMemo(
    () => (currentDayData?.events || []).map(getEventLocation).filter(Boolean),
    [currentDayData]
  );

  const origin = currentLocation?.locationName ||
    tripDetails?.accommodation?.address ||
    tripDetails?.accommodation?.name ||
    '';

  const routeUrl = buildGoogleMapsMultiStopDirectionsUrl(
    origin,
    routeStops.map((stop) => stop.destination)
  );
  const previewQuery = routeStops[0]?.text || normalizePlaceText(origin);
  const mapPreviewUrl = previewQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(previewQuery)}&output=embed`
    : '';

  if (!currentDayData || currentDayData.events.length === 0) {
    return null;
  }

  return (
    <Card className="mb-5 overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="p-4">
          <div className="mb-3 flex min-w-0 items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="tp-icon-chip bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                <Navigation size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="tp-section-title">今日路線視圖</h3>
                <p className="tp-section-subtitle mt-1">
                  {routeStops.length ? `${routeStops.length} 個可導航地點` : '行程尚未設定地點'}
                </p>
              </div>
            </div>
            {routeUrl && (
              <Button
                as="a"
                href={routeUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="secondary"
                size="sm"
                className="shrink-0"
              >
                <Map size={14} />
                開路線
              </Button>
            )}
          </div>

          {routeStops.length ? (
            <ol className="space-y-2">
              {routeStops.map((stop, index) => (
                <li key={stop.id || `${stop.text}-${index}`} className="flex min-w-0 items-start gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-black text-white">
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-black text-slate-900 dark:text-white">
                      {stop.time} · {stop.title}
                    </span>
                    <span className="mt-0.5 flex items-start gap-1.5 break-words text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <MapPin size={13} className="mt-0.5 shrink-0" />
                      {stop.text}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
              這天的行程還沒有可導航地點。
            </div>
          )}
        </div>

        <div className="min-h-64 border-t border-slate-200 bg-slate-100 lg:border-l lg:border-t-0 dark:border-slate-800 dark:bg-slate-950">
          {mapPreviewUrl ? (
            <iframe
              title="daily-route-map-preview"
              src={mapPreviewUrl}
              className="h-64 w-full lg:h-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="flex h-64 items-center justify-center text-sm font-semibold text-slate-500 dark:text-slate-400">
              尚無地圖預覽
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ItineraryRoutePanel;
