import React from 'react';
import {
  AlertCircle,
  Camera,
  Coffee,
  Edit2,
  ExternalLink,
  Home,
  Link as LinkIcon,
  Map,
  MapPin,
  Navigation,
  Plane,
  ShoppingBag,
  Train,
  Wallet
} from 'lucide-react';
import { Badge, Button } from './ui';
import { getExternalUrlHost, normalizeExternalUrl } from '../utils/externalUrl';
import { formatEventTime, getEventDestination, getEventLocationText } from '../utils/tripEvents';

const eventTypeMeta = {
  flight: { label: '航班', icon: Plane, className: 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300' },
  transport: { label: '交通', icon: Train, className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  sightseeing: { label: '景點', icon: Camera, className: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300' },
  food: { label: '餐廳', icon: Coffee, className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' },
  shopping: { label: '購物', icon: ShoppingBag, className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' },
  hotel: { label: '住宿', icon: Home, className: 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' }
};

const getEventMeta = (type) =>
  eventTypeMeta[type] || { label: '行程', icon: MapPin, className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };

const readCost = (event) => {
  const rawAmount = event?.cost?.amount ?? event?.cost;
  const amount = Number(rawAmount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return {
    amount,
    currency: event?.cost?.currency || event?.currency || 'JPY'
  };
};

const formatCost = (event) => {
  const cost = readCost(event);
  if (!cost) return '';
  const symbol = cost.currency === 'TWD' ? 'NT$' : '¥';
  return `${symbol}${cost.amount.toLocaleString()}`;
};

const getUrlHost = (url = '') => getExternalUrlHost(url) || String(url || '').replace(/^https?:\/\//i, '').split('/')[0];

const openExternalUrl = (url) => {
  const normalizedUrl = normalizeExternalUrl(url);
  if (!normalizedUrl) return;
  const openedWindow = window.open(normalizedUrl, '_blank', 'noopener,noreferrer');
  if (!openedWindow) {
    window.location.href = normalizedUrl;
  }
};

const DetailRow = ({ icon: Icon, label, children }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
    <div className="mb-1 flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
      <Icon size={14} />
      {label}
    </div>
    <div className="break-words text-sm font-semibold leading-6 text-slate-800 dark:text-slate-100">
      {children}
    </div>
  </div>
);

const EventDetailView = ({ event, prevLocation, onEdit, onClose, onOpenGoogleMaps }) => {
  const meta = getEventMeta(event?.type);
  const Icon = meta.icon;
  const locationText = getEventLocationText(event);
  const mapDestination = getEventDestination(event);
  const costText = formatCost(event);
  const hasUrl = Boolean(String(event?.url || '').trim());
  const hasNavigation = Boolean(locationText && prevLocation && onOpenGoogleMaps);
  const hasMap = Boolean(locationText && onOpenGoogleMaps);

  const handleNavigate = () => {
    if (!hasNavigation) return;
    onOpenGoogleMaps(prevLocation, mapDestination);
  };

  const handleOpenMap = () => {
    if (!hasMap) return;
    onOpenGoogleMaps('', mapDestination);
  };

  return (
    <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden text-slate-700 dark:text-slate-200">
      <section className="flex min-w-0 items-start gap-3">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${meta.className}`}>
          <Icon size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-base font-black text-slate-800 dark:text-slate-100">
              {formatEventTime(event)}
            </span>
            <Badge variant="muted">{meta.label}</Badge>
            {event?.urgent && (
              <Badge variant="warning">
                <AlertCircle size={13} />
                重要
              </Badge>
            )}
          </div>
          <h3 className="mt-2 break-words text-2xl font-black leading-tight text-slate-950 dark:text-white">
            {event?.title || '未命名行程'}
          </h3>
        </div>
      </section>

      {(hasNavigation || hasMap || hasUrl) && (
        <div className="grid min-w-0 grid-cols-3 gap-2">
          {hasNavigation && (
            <Button type="button" className="w-full" onClick={handleNavigate}>
              <Navigation size={17} />
              導航
            </Button>
          )}
          {hasMap && (
            <Button type="button" variant="secondary" className="w-full" onClick={handleOpenMap}>
              <Map size={17} />
              開地圖
            </Button>
          )}
          {hasUrl && (
            <Button type="button" variant="secondary" className="w-full" onClick={() => openExternalUrl(event.url)}>
              <ExternalLink size={17} />
              開網址
            </Button>
          )}
        </div>
      )}

      {locationText && (
        <button
          type="button"
          onClick={handleOpenMap}
          className="flex w-full min-w-0 items-start gap-2 rounded-lg border border-brand-200 bg-brand-50 p-3 text-left text-sm font-semibold text-brand-800 transition hover:bg-brand-100 dark:border-brand-900/70 dark:bg-brand-950/25 dark:text-brand-200 dark:hover:bg-brand-950/40"
        >
          <MapPin size={17} className="mt-0.5 shrink-0" />
          <span className="min-w-0 flex-1 break-words">{locationText}</span>
          <ExternalLink size={14} className="mt-0.5 shrink-0" />
        </button>
      )}

      <div className="grid min-w-0 gap-3">
        {event?.desc && (
          <DetailRow icon={MapPin} label="備註">
            <p className="whitespace-pre-wrap">{event.desc}</p>
          </DetailRow>
        )}

        {(event?.transport?.duration || event?.transport?.route) && (
          <DetailRow icon={Navigation} label="交通">
            {event.transport.duration && <span>{event.transport.duration}</span>}
            {event.transport.duration && event.transport.route && <span className="mx-1 text-slate-300">/</span>}
            {event.transport.route && <span>{event.transport.route}</span>}
          </DetailRow>
        )}

        {costText && (
          <DetailRow icon={Wallet} label="預估花費">
            {costText}
          </DetailRow>
        )}

        {hasUrl && (
          <DetailRow icon={LinkIcon} label="相關連結">
            <button
              type="button"
              onClick={() => openExternalUrl(event.url)}
              className="inline-flex max-w-full items-center gap-1 text-left font-bold text-sky-700 hover:underline dark:text-sky-300"
            >
              <span className="truncate">{getUrlHost(event.url)}</span>
              <ExternalLink size={13} className="shrink-0" />
            </button>
          </DetailRow>
        )}
      </div>

      <div className={`grid min-w-0 gap-2 pt-1 ${onEdit ? 'sm:grid-cols-2' : ''}`}>
        <Button type="button" variant="secondary" onClick={onClose} className="w-full">
          關閉
        </Button>
        {onEdit && (
        <Button type="button" variant="secondary" onClick={onEdit} className="w-full">
          <Edit2 size={17} />
          編輯
        </Button>
        )}
      </div>
    </div>
  );
};

export default EventDetailView;
