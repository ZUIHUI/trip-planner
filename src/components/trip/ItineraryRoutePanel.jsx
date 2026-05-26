import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Map, MapPin, Navigation } from 'lucide-react';
import { buildGoogleMapsMultiStopDirectionsUrl } from '../../services/googleMapsService';
import { buildItineraryRouteState } from '../../utils/itineraryRoute';
import { Button, Card } from '../ui';

const readOrigin = (tripDetails, currentLocation) => (
  currentLocation?.locationName ||
  tripDetails?.accommodation?.address ||
  tripDetails?.accommodation?.name ||
  ''
);

const readOriginLabel = (tripDetails, currentLocation) => {
  if (currentLocation?.locationName) return '目前位置';
  if (tripDetails?.accommodation?.address || tripDetails?.accommodation?.name) return '住宿';
  return '未設定';
};

const RouteMetric = ({ label, value, tone = 'slate' }) => {
  const toneClasses = {
    amber: 'bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-100',
    emerald: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100',
    slate: 'bg-slate-50 text-slate-700 dark:bg-slate-800/70 dark:text-slate-200',
    sky: 'bg-sky-50 text-sky-800 dark:bg-sky-950/30 dark:text-sky-100'
  };

  return (
    <div className={`min-w-0 rounded-lg px-3 py-2 ${toneClasses[tone] || toneClasses.slate}`}>
      <p className="text-[11px] font-black uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 truncate text-sm font-black">{value}</p>
    </div>
  );
};

const MissingLocationNotice = ({ missingEvents }) => {
  if (!missingEvents.length) return null;

  const visibleMissingEvents = missingEvents.slice(0, 3);
  const hiddenCount = Math.max(0, missingEvents.length - visibleMissingEvents.length);

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
      <div className="flex items-start gap-2">
        <AlertTriangle size={17} className="mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-black">有行程缺少地點</p>
          <p className="mt-0.5 text-xs font-semibold opacity-85">
            缺地點的行程不會放進 Google Maps 路線，編輯後會自動加入導航。
          </p>
        </div>
      </div>

      <ul className="mt-2 space-y-1.5 text-xs font-bold">
        {visibleMissingEvents.map((event) => (
          <li key={event.id || `${event.time}-${event.itineraryIndex}`} className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 font-mono">{event.time}</span>
            <span className="min-w-0 truncate">{event.title}</span>
          </li>
        ))}
        {hiddenCount > 0 && (
          <li className="text-amber-800/75 dark:text-amber-100/75">
            還有 {hiddenCount} 個行程需要補地點
          </li>
        )}
      </ul>
    </div>
  );
};

const ItineraryRoutePanel = ({ currentDayData, tripDetails, currentLocation }) => {
  const events = Array.isArray(currentDayData?.events) ? currentDayData.events : [];
  const origin = readOrigin(tripDetails, currentLocation);
  const originLabel = readOriginLabel(tripDetails, currentLocation);
  const routeState = useMemo(
    () => buildItineraryRouteState(events, { origin }),
    [events, origin]
  );
  const {
    routeStops,
    missingEvents,
    totalEvents,
    routeStopCount,
    missingCount,
    completenessPercent,
    originText,
    hasCompleteRoute
  } = routeState;

  const routeUrl = buildGoogleMapsMultiStopDirectionsUrl(
    origin,
    routeStops.map((stop) => stop.destination)
  );
  const previewQuery = routeStops[0]?.text || originText;
  const mapPreviewUrl = previewQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(previewQuery)}&output=embed`
    : '';
  const routeStatusLabel = hasCompleteRoute
    ? '可完整導航'
    : routeStopCount
      ? '可部分導航'
      : '缺少地點';
  const routeStatusTone = hasCompleteRoute
    ? 'emerald'
    : routeStopCount
      ? 'amber'
      : 'slate';

  if (!currentDayData || totalEvents === 0) {
    return null;
  }

  return (
    <Card className="mb-5 overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="p-4">
          <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="tp-icon-chip bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                <Navigation size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="tp-section-title">今日路線視圖</h3>
                <p className="tp-section-subtitle mt-1">
                  {routeStopCount
                    ? `${routeStopCount} / ${totalEvents} 個行程可導航`
                    : '行程尚未設定地點'}
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

          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between gap-3 text-xs font-black text-slate-500 dark:text-slate-400">
              <span>路線完整度</span>
              <span>{completenessPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-300 ${hasCompleteRoute ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${completenessPercent}%` }}
              />
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2">
            <RouteMetric label="可導航" value={`${routeStopCount} 站`} tone={routeStopCount ? 'emerald' : 'slate'} />
            <RouteMetric label="缺地點" value={`${missingCount} 個`} tone={missingCount ? 'amber' : 'emerald'} />
            <RouteMetric label="起點" value={originLabel} tone={originText ? 'sky' : 'slate'} />
            <RouteMetric label="狀態" value={routeStatusLabel} tone={routeStatusTone} />
          </div>

          <div className="space-y-3">
            <MissingLocationNotice missingEvents={missingEvents} />

            {originText && (
              <div className="flex min-w-0 items-start gap-3 rounded-lg border border-sky-100 bg-sky-50 p-3 text-sky-900 dark:border-sky-900/70 dark:bg-sky-950/30 dark:text-sky-100">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-600 text-xs font-black text-white">
                  S
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black">{originLabel}</span>
                  <span className="mt-0.5 flex items-start gap-1.5 break-words text-xs font-semibold opacity-80">
                    <MapPin size={13} className="mt-0.5 shrink-0" />
                    {originText}
                  </span>
                </span>
              </div>
            )}

            {routeStops.length ? (
              <ol className="space-y-2">
                {routeStops.map((stop, index) => (
                  <li key={stop.id || `${stop.text}-${index}`} className="flex min-w-0 items-start gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-black text-white">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm font-black text-slate-900 dark:text-white">
                        <span className="font-mono">{stop.time}</span>
                        <span className="min-w-0 break-words">{stop.title}</span>
                      </span>
                      <span className="mt-0.5 flex items-start gap-1.5 break-words text-xs font-semibold text-slate-500 dark:text-slate-400">
                        <MapPin size={13} className="mt-0.5 shrink-0" />
                        {stop.text}
                      </span>
                      {stop.itineraryIndex !== index && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-black text-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                          原行程第 {stop.itineraryIndex + 1} 個
                        </span>
                      )}
                    </span>
                    {index === routeStops.length - 1 && (
                      <CheckCircle2 size={17} className="mt-1 shrink-0 text-emerald-600 dark:text-emerald-300" />
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                這天的行程還沒有可導航地點。
              </div>
            )}
          </div>
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
