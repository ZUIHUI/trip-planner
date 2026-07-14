import React, { useEffect, useMemo, useState } from 'react';
import { Map, Route } from 'lucide-react';
import { buildGoogleMapsEmbedRouteUrl } from '../../utils/googleMapsEmbed';

const googleMapsEmbedApiKey = String(
  import.meta.env.VITE_GOOGLE_MAPS_EMBED_API_KEY || ''
).trim();

const GoogleRoutePreview = ({
  origin,
  routeStops = [],
  title = 'Google Maps 今日路線預覽',
  className = '',
  loading = 'lazy'
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const destinations = useMemo(
    () => routeStops.map((stop) => stop?.destination || stop).filter(Boolean),
    [routeStops]
  );
  const embedUrl = useMemo(
    () => buildGoogleMapsEmbedRouteUrl({
      apiKey: googleMapsEmbedApiKey,
      origin,
      destinations,
      mode: 'transit'
    }),
    [destinations, origin]
  );

  useEffect(() => {
    setIsLoaded(false);
  }, [embedUrl]);

  if (!embedUrl) {
    return (
      <div className={`relative flex min-h-56 items-center justify-center overflow-hidden bg-[#eef4f2] px-6 text-center dark:bg-slate-900 ${className}`}>
        <div className="max-w-xs text-slate-600 dark:text-slate-300">
          <span className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand-700 shadow-sm dark:bg-slate-800 dark:text-brand-300">
            <Map size={21} aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm font-black">尚無可預覽路線</p>
          <p className="mt-1 text-xs font-semibold leading-5 opacity-75">
            行程加入地點後，Google Maps 會依時間順序顯示今日路線。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative isolate min-h-56 overflow-hidden bg-[#eef4f2] dark:bg-slate-900 ${className}`}
      aria-busy={!isLoaded}
    >
      {!isLoaded && (
        <div
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[#eef4f2] text-brand-800 dark:bg-slate-900 dark:text-brand-200"
          role="status"
          aria-live="polite"
        >
          <div className="inline-flex items-center gap-2 text-sm font-black">
            <Route size={18} aria-hidden="true" />
            正在規劃 Google 路線…
          </div>
        </div>
      )}

      <iframe
        key={embedUrl}
        title={title}
        src={embedUrl}
        className="absolute inset-0 z-10 h-full w-full border-0"
        loading={loading}
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  );
};

export default GoogleRoutePreview;
