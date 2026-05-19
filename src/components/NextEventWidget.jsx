import React, { useMemo } from 'react';
import { CalendarDays, Clock, MapPin, Navigation, Plus, StickyNote, Wallet } from 'lucide-react';
import WeatherWidget from './WeatherWidget';

const readCost = (event) => {
  const rawAmount = event?.cost?.amount ?? event?.cost;
  const amount = Number(rawAmount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return {
    amount,
    currency: event?.cost?.currency || event?.currency || 'JPY'
  };
};

const formatCurrencyAmount = ({ amount, currency }) => {
  const formattedAmount = amount.toLocaleString();
  return currency === 'TWD' ? `NT$${formattedAmount}` : `¥${formattedAmount}`;
};

const formatEventCost = (event) => {
  const cost = readCost(event);
  return cost ? formatCurrencyAmount(cost) : '未設定';
};

const formatDailyCost = (events = []) => {
  const totals = events.reduce((acc, event) => {
    const cost = readCost(event);
    if (!cost) return acc;
    acc[cost.currency] = (acc[cost.currency] || 0) + cost.amount;
    return acc;
  }, {});

  const parts = Object.entries(totals).map(([currency, amount]) =>
    formatCurrencyAmount({ amount, currency })
  );

  return parts.length > 0 ? parts.join(' / ') : '未設定';
};

const getMemoText = (event) => {
  const firstMemo = Array.isArray(event?.memos) ? event.memos[0] : null;
  const memoText = typeof firstMemo === 'string'
    ? firstMemo
    : firstMemo?.text || firstMemo?.note || '';
  return event?.desc || memoText || '尚無備註';
};

const getLocationText = (event) => {
  if (!event) return '';
  if (typeof event.location === 'string') return event.location;
  return event.location?.address || event.location?.name || event.locationPlace?.address || event.locationPlace?.name || '';
};

const pickNextEvent = (events = []) => {
  if (events.length === 0) return null;

  const sortedEvents = [...events].sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return sortedEvents.find((event) => String(event.time || '') > currentTime) || sortedEvents[0];
};

const NextEventWidget = ({
  itinerary = [],
  selectedDay = 1,
  currentDayData: providedCurrentDayData = null,
  currentDayDate = '',
  tripDetails = {},
  currentLocation = null,
  onNavigate,
  onAddEvent
}) => {
  const currentDayData = useMemo(
    () => providedCurrentDayData || itinerary.find((day) => day.day === selectedDay) || null,
    [itinerary, providedCurrentDayData, selectedDay]
  );

  const events = currentDayData?.events || [];
  const nextEvent = useMemo(() => pickNextEvent(events), [events]);
  const nextLocationText = getLocationText(nextEvent);
  const weatherLocation = nextLocationText || tripDetails?.accommodation?.address || tripDetails?.accommodation?.name || '東京';

  if (!nextEvent) {
    return (
      <section className="mx-4 mb-4 mt-3 rounded-lg border border-brand-400/50 bg-gradient-to-r from-brand-500 to-brand-600 p-4 text-white shadow-md sm:mx-6 lg:mx-8 dark:from-brand-900/70 dark:to-brand-800/70 dark:border-brand-700/60">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-100">旅途中模式</p>
            <h3 className="mt-1 text-xl font-bold">今天還沒有行程</h3>
            <p className="mt-1 text-sm text-brand-50">{currentDayDate || currentDayData?.date || `Day ${selectedDay}`}</p>
          </div>
          <CalendarDays size={24} className="text-white/80" />
        </div>

        <div className="mt-4 border-t border-white/20 pt-4">
          <WeatherWidget
            variant="compact"
            date={currentDayDate || currentDayData?.date}
            currentLocation={currentLocation}
            accommodation={weatherLocation}
          />
        </div>

        <button
          type="button"
          onClick={onAddEvent}
          className="touch-target mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-bold text-brand-700 shadow-sm transition hover:bg-brand-50"
        >
          <Plus size={18} />
          新增行程
        </button>
      </section>
    );
  }

  return (
    <section className="mx-4 mb-4 mt-3 rounded-lg border border-brand-400/50 bg-gradient-to-r from-brand-500 to-brand-600 p-4 text-white shadow-md sm:mx-6 lg:mx-8 dark:from-brand-900/70 dark:to-brand-800/70 dark:border-brand-700/60">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-100">下一個行程</p>
          <h3 className="mt-1 text-xl font-bold leading-tight">{nextEvent.title || '未命名行程'}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-brand-50">
            <Clock size={15} className="shrink-0" />
            <span className="font-mono font-semibold">{nextEvent.time || '--:--'}</span>
            {nextLocationText && (
              <>
                <span className="text-white/40">•</span>
                <MapPin size={15} className="shrink-0" />
                <span className="min-w-0 truncate">{nextLocationText}</span>
              </>
            )}
          </div>
        </div>

        {nextLocationText && (
          <button
            type="button"
            onClick={() => onNavigate?.(nextEvent.locationPlace || nextEvent.location)}
            className="touch-target shrink-0 rounded-full border border-white/30 bg-white/20 p-3 transition hover:bg-white/30 active:scale-95"
            title="導航到此地點"
            aria-label="導航到此地點"
          >
            <Navigation size={20} />
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <WeatherWidget
          variant="compact"
          date={currentDayDate || currentDayData?.date}
          currentLocation={currentLocation}
          accommodation={tripDetails?.accommodation?.address || tripDetails?.accommodation?.name || weatherLocation}
          firstEventLocation={nextLocationText}
          selectedEventLocation={nextLocationText}
        />

        <div className="grid grid-cols-2 gap-3 sm:min-w-64">
          <div className="border-l border-white/20 pl-3">
            <div className="flex items-center gap-1.5 text-xs text-brand-100">
              <Wallet size={13} />
              <span>本行程</span>
            </div>
            <p className="mt-1 text-sm font-bold">{formatEventCost(nextEvent)}</p>
          </div>
          <div className="border-l border-white/20 pl-3">
            <div className="flex items-center gap-1.5 text-xs text-brand-100">
              <CalendarDays size={13} />
              <span>當日預估</span>
            </div>
            <p className="mt-1 text-sm font-bold">{formatDailyCost(events)}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-white/20 pt-3">
        <div className="flex items-start gap-2 text-sm text-brand-50">
          <StickyNote size={16} className="mt-0.5 shrink-0 text-white/80" />
          <p className="line-clamp-3 whitespace-pre-wrap">{getMemoText(nextEvent)}</p>
        </div>
      </div>
    </section>
  );
};

export default NextEventWidget;
