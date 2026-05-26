import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Camera,
  Coffee,
  Edit2,
  ExternalLink,
  Home,
  Link as LinkIcon,
  Map,
  MapPin,
  MoreVertical,
  Navigation,
  Plane,
  ShoppingBag,
  Train,
  Trash2,
  UsersRound,
  Wallet
} from 'lucide-react';
import { Badge, Button, Card } from './ui';
import { normalizeExternalUrl } from '../utils/externalUrl';

const eventTypeMeta = {
  flight: { label: '航班', icon: Plane, className: 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300' },
  transport: { label: '交通', icon: Train, className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  sightseeing: { label: '景點', icon: Camera, className: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300' },
  food: { label: '餐廳', icon: Coffee, className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' },
  shopping: { label: '購物', icon: ShoppingBag, className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' },
  hotel: { label: '住宿', icon: Home, className: 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' }
};

const getEventMeta = (type) => eventTypeMeta[type] || { label: '行程', icon: MapPin, className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };

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
  if (!cost) return null;
  const symbol = cost.currency === 'TWD' ? 'NT$' : '¥';
  return `${symbol}${cost.amount.toLocaleString()}`;
};

const getLocationText = (event) => {
  if (!event) return '';
  if (typeof event.location === 'string') return event.location;
  return event.location?.address || event.location?.name || event.locationPlace?.address || event.locationPlace?.name || '';
};

const getEditingMembersText = (members = []) => {
  if (!members.length) return '';
  if (members.length === 1) return `${members[0].name} 正在編輯`;
  return `${members.length} 位旅伴正在編輯`;
};

const EventCard = ({
  event,
  prevLocation,
  onEdit,
  onDelete,
  onMove,
  onMoveToDay,
  onOpenGoogleMaps,
  editingMembers = [],
  canMoveUp = false,
  canMoveDown = false,
  canMoveToPreviousDay = false,
  canMoveToNextDay = false,
  previousDayLabel = '',
  nextDayLabel = '',
  canEdit = true
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const meta = getEventMeta(event.type);
  const Icon = meta.icon;
  const locationText = getLocationText(event);
  const costText = formatCost(event);
  const externalUrl = normalizeExternalUrl(event.url);
  const editingText = getEditingMembersText(editingMembers);
  const canReorder = Boolean(onMove) && canEdit && (canMoveUp || canMoveDown);
  const canMoveDay = Boolean(onMoveToDay) && canEdit && (canMoveToPreviousDay || canMoveToNextDay);

  const handleCardClick = () => {
    onEdit(event, true);
  };

  const handleEditClick = (clickEvent) => {
    clickEvent.preventDefault();
    clickEvent.stopPropagation();
    setShowMenu(false);
    onEdit(event, false);
  };

  const handleRouteClick = (clickEvent) => {
    clickEvent.preventDefault();
    clickEvent.stopPropagation();
    if (!locationText || !onOpenGoogleMaps) return;
    onOpenGoogleMaps(prevLocation, event.locationPlace || event.location);
  };

  const handleMapClick = (clickEvent) => {
    clickEvent.preventDefault();
    clickEvent.stopPropagation();
    if (!locationText || !onOpenGoogleMaps) return;
    onOpenGoogleMaps('', event.locationPlace || event.location);
  };

  const handleMoveClick = (direction) => (clickEvent) => {
    clickEvent.preventDefault();
    clickEvent.stopPropagation();
    const canMove = direction === 'up' ? canMoveUp : canMoveDown;
    if (!canMove || !onMove) return;
    onMove(event.id, direction);
    setShowMenu(false);
  };

  const handleMoveDayClick = (direction) => (clickEvent) => {
    clickEvent.preventDefault();
    clickEvent.stopPropagation();
    const canMove = direction === 'previous' ? canMoveToPreviousDay : canMoveToNextDay;
    if (!canMove || !onMoveToDay) return;
    onMoveToDay(event.id, direction);
    setShowMenu(false);
  };

  return (
    <div className="tp-animate-enter relative ml-3 border-l-2 border-slate-200 pb-6 pl-6 last:pb-0 dark:border-slate-800">
      <span className={`tp-soft-pulse absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 bg-white dark:bg-slate-950 ${
        event.urgent ? 'border-red-500' : 'border-brand-400'
      }`} />

      <Card interactive className="relative cursor-pointer p-3 sm:p-4" onClick={handleCardClick}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:h-11 sm:w-11 ${meta.className}`}>
              <Icon size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-base font-black text-slate-800 dark:text-slate-100">{event.time || '--:--'}</span>
                <Badge variant="muted">{meta.label}</Badge>
                {event.urgent && (
                  <Badge variant="warning">
                    <AlertCircle size={13} />
                    重要
                  </Badge>
                )}
              </div>
              <h3 className="mt-1.5 break-words text-lg font-black leading-tight text-slate-950 sm:mt-2 sm:text-xl dark:text-white">
                {event.title || '未命名行程'}
              </h3>
              {editingText && (
                <div
                  className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200"
                  title={editingMembers.map((member) => member.name).join('、')}
                >
                  <UsersRound size={13} className="shrink-0" />
                  <span className="truncate">{editingText}</span>
                </div>
              )}
            </div>
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={(clickEvent) => {
                clickEvent.preventDefault();
                clickEvent.stopPropagation();
                setShowMenu((prev) => !prev);
              }}
              className="touch-target tp-press-feedback inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title="更多操作"
              aria-label="更多操作"
              aria-expanded={showMenu}
            >
              <MoreVertical size={18} />
            </button>

            {showMenu && (
              <div className="tp-slide-up absolute right-0 top-11 z-20 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
                {canReorder && (
                  <>
                    <button
                      type="button"
                      onClick={handleMoveClick('up')}
                      disabled={!canMoveUp}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <ArrowUp size={14} />
                      往前一站
                    </button>
                    <button
                      type="button"
                      onClick={handleMoveClick('down')}
                      disabled={!canMoveDown}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <ArrowDown size={14} />
                      往後一站
                    </button>
                    <div className="h-px bg-slate-100 dark:bg-slate-800" />
                  </>
                )}
                {canMoveDay && (
                  <>
                    <button
                      type="button"
                      onClick={handleMoveDayClick('previous')}
                      disabled={!canMoveToPreviousDay}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <ArrowLeft size={14} />
                      移到{previousDayLabel || '前一天'}
                    </button>
                    <button
                      type="button"
                      onClick={handleMoveDayClick('next')}
                      disabled={!canMoveToNextDay}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <ArrowRight size={14} />
                      移到{nextDayLabel || '後一天'}
                    </button>
                    <div className="h-px bg-slate-100 dark:bg-slate-800" />
                  </>
                )}
                <button
                  type="button"
                  onClick={handleEditClick}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Edit2 size={14} />
                  編輯
                </button>
                <button
                  type="button"
                  onClick={(clickEvent) => {
                    clickEvent.preventDefault();
                    clickEvent.stopPropagation();
                    onDelete(event.id);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30"
                >
                  <Trash2 size={14} />
                  刪除
                </button>
              </div>
            )}
          </div>
        </div>

        {event.desc && (
          <p className="mt-3 hidden whitespace-pre-wrap break-words text-sm leading-6 text-slate-600 sm:block dark:text-slate-300">
            {event.desc}
          </p>
        )}

        <div className="mt-3 grid gap-2 sm:mt-4">
          {locationText && (
            <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
              <MapPin size={16} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-300" />
              <span className="break-words font-semibold leading-5">{locationText}</span>
            </div>
          )}

          {(event.transport?.duration || event.transport?.route) && (
            <div className="hidden items-start gap-2 text-sm text-slate-600 sm:flex dark:text-slate-300">
              <Navigation size={16} className="mt-0.5 shrink-0 text-slate-400" />
              <span>
                {event.transport.duration && <span className="font-semibold">{event.transport.duration}</span>}
                {event.transport.duration && event.transport.route && <span className="mx-1 text-slate-300">/</span>}
                {event.transport.route && <span>{event.transport.route}</span>}
              </span>
            </div>
          )}

          {costText && (
            <div className="hidden items-center gap-2 text-sm text-slate-600 sm:flex dark:text-slate-300">
              <Wallet size={16} className="shrink-0 text-amber-600 dark:text-amber-300" />
              <span className="font-semibold">{costText}</span>
            </div>
          )}

          {externalUrl && (
            <div className="hidden items-start gap-2 text-sm sm:flex">
              <LinkIcon size={16} className="mt-0.5 shrink-0 text-sky-600 dark:text-sky-300" />
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(clickEvent) => clickEvent.stopPropagation()}
                className="inline-flex min-w-0 items-center gap-1 font-semibold text-sky-700 hover:underline dark:text-sky-300"
              >
                <span className="truncate">{event.url.replace(/^https?:\/\//, '').split('/')[0]}</span>
                <ExternalLink size={12} className="shrink-0" />
              </a>
            </div>
          )}
        </div>

        {(canReorder || locationText || externalUrl) && (
          <div className="mt-3 flex items-center justify-end gap-2 sm:hidden">
            {canReorder && (
              <>
                <button
                  type="button"
                  onClick={handleMoveClick('up')}
                  disabled={!canMoveUp}
                  className="touch-target inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:opacity-35 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  aria-label={`將 ${event.title || '行程'} 往前一站`}
                  title="往前"
                >
                  <ArrowUp size={17} />
                </button>
                <button
                  type="button"
                  onClick={handleMoveClick('down')}
                  disabled={!canMoveDown}
                  className="touch-target inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:opacity-35 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  aria-label={`將 ${event.title || '行程'} 往後一站`}
                  title="往後"
                >
                  <ArrowDown size={17} />
                </button>
              </>
            )}
            {onOpenGoogleMaps && locationText && (
              <button
                type="button"
                onClick={handleMapClick}
                className="touch-target inline-flex h-10 w-10 items-center justify-center rounded-lg border border-brand-100 bg-brand-50 text-brand-700 transition hover:bg-brand-100 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-brand-900/70 dark:bg-brand-950/30 dark:text-brand-300"
                aria-label={`開啟 ${event.title || locationText} 的地圖`}
                title="開地圖"
              >
                <Map size={17} />
              </button>
            )}
            {externalUrl && (
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(clickEvent) => clickEvent.stopPropagation()}
                className="touch-target inline-flex h-10 w-10 items-center justify-center rounded-lg border border-sky-100 bg-sky-50 text-sky-700 transition hover:bg-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-sky-900/70 dark:bg-sky-950/30 dark:text-sky-300"
                aria-label={`開啟 ${event.title || '行程'} 網址`}
                title="開網址"
              >
                <ExternalLink size={17} />
              </a>
            )}
          </div>
        )}

        <div className="mt-4 hidden flex-wrap items-center justify-end gap-2 sm:flex">
          {onOpenGoogleMaps && locationText && (
            <Button variant="secondary" size="sm" onClick={handleRouteClick}>
              <Map size={14} />
              規劃路線
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default EventCard;
