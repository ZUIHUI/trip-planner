import React, { useEffect, useMemo, useState } from 'react';
import { Map, Route } from 'lucide-react';
import {
  GOOGLE_MAPS_EMBED_PREVIEW_STATUS,
  buildGoogleMapsEmbedRouteUrl,
  getGoogleMapsEmbedPreviewStatus
} from '../../utils/googleMapsEmbed';
import { firebaseWebApiKey } from '../../services/firebase';

const googleMapsEmbedApiKey = String(
  import.meta.env.VITE_GOOGLE_MAPS_EMBED_API_KEY || firebaseWebApiKey || ''
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

  if (previewStatus === GOOGLE_MAPS_EMBED_PREVIEW_STATUS.missingKey) {
    return (
      <div className={`tp-route-preview-surface relative flex min-h-56 items-center justify-center overflow-hidden px-6 text-center ${className}`}>
        <div className="max-w-xs">
          <span className="tp-route-preview-icon mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full shadow-sm">
            <Map size={21} aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm font-black">Google 地圖目前無法載入</p>
          <p className="mt-1 text-xs font-semibold leading-5 opacity-75">
            請確認網站建置已包含可使用 Maps Embed API 的瀏覽器金鑰。
          </p>
        </div>
      </div>
    );
  }

  if (previewStatus !== GOOGLE_MAPS_EMBED_PREVIEW_STATUS.ready) {
    return (
      <div className={`tp-route-preview-surface relative flex min-h-56 items-center justify-center overflow-hidden px-6 text-center ${className}`}>
        <div className="max-w-xs">
          <span className="tp-route-preview-icon mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full shadow-sm">
            <Map size={21} aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm font-black">尚無可預覽路線</p>
          <p className="mt-1 text-xs font-semibold leading-5 opacity-75">
            行程加入地點後，地圖會依時間順序顯示今日路線。
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
        sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  );
};

export default GoogleRoutePreview;
