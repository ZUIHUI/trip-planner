import React, { useEffect, useMemo, useState } from 'react';
import { Map, Route } from 'lucide-react';
import {
  GOOGLE_MAPS_EMBED_PREVIEW_STATUS,
  buildGoogleMapsEmbedRouteUrl,
  getGoogleMapsEmbedPreviewStatus
} from '../../utils/googleMapsEmbed';

const googleMapsEmbedApiKey = String(
  import.meta.env.VITE_GOOGLE_MAPS_EMBED_API_KEY || ''
).trim();

const GoogleRoutePreview = ({
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
  const previewStatus = useMemo(
    () => getGoogleMapsEmbedPreviewStatus({
      apiKey: googleMapsEmbedApiKey,
      destinations
    }),
    [destinations]
  );
  // Keep the preview fitted to planned stops; live GPS remains available to the external navigation link.
  const embedUrl = useMemo(
    () => buildGoogleMapsEmbedRouteUrl({
      apiKey: googleMapsEmbedApiKey,
      destinations,
      mode: 'transit'
    }),
    [destinations]
  );

  useEffect(() => {
    setIsLoaded(false);
  }, [embedUrl]);

  if (previewStatus !== GOOGLE_MAPS_EMBED_PREVIEW_STATUS.ready) {
    const isMissingKey = previewStatus === GOOGLE_MAPS_EMBED_PREVIEW_STATUS.missingKey;

    return (
      <div className={`tp-route-preview-surface relative flex min-h-56 items-center justify-center overflow-hidden px-6 text-center ${className}`}>
        <div className="max-w-xs">
          <span className="tp-route-preview-icon mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full shadow-sm">
            <Map size={21} aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm font-black">
            {isMissingKey ? '地圖預覽暫時無法載入' : '尚無可預覽路線'}
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 opacity-75">
            {isMissingKey
              ? '地圖服務尚未完成設定，仍可使用「開路線」前往 Google Maps。'
              : '行程加入地點後，Google Maps 會依時間順序顯示今日路線。'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`tp-route-preview-surface relative isolate min-h-56 overflow-hidden ${className}`}
      aria-busy={!isLoaded}
    >
      {!isLoaded && (
        <div
          className="tp-route-preview-loading pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
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
