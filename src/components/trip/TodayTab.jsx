import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Info,
  Map,
  MapPin,
  Navigation,
  Plane,
  Plus,
  Sparkles,
  StickyNote,
  Wallet
} from 'lucide-react';
import WeatherWidget from '../WeatherWidget';
import { Badge, Button, Card } from '../ui';
import { useTripWorkspace } from '../../contexts/TripWorkspaceContext';
import DayReadinessStrip from './DayReadinessStrip';
import {
  buildGoogleMapsMultiStopDirectionsUrl,
  normalizePlaceText
} from '../../services/googleMapsService';
import {
  formatDailyCost,
  formatEventTime,
  formatEventCost,
  getEventDestination,
  getEventLocationText,
  getEventMemoText,
  getLocalIsoDate,
  pickNextEvent,
  getTripDayIsoDate,
  sortEventsByTime
} from '../../utils/tripEvents';
import { getAirportDayFlights } from '../../utils/airportDayFlights';

const emptyFlightText = '未設定';

const getRouteStop = (event) => {
  const destination = getEventDestination(event);
  const text = normalizePlaceText(destination);
  if (!text) return null;

  return {
    id: event.id,
    title: event.title || text,
    time: formatEventTime(event),
    destination,
    text
  };
};

const getChecklistRemaining = (items = []) => (
  Array.isArray(items) ? items.filter((item) => !item.done).length : 0
);

const readEventTimeMinutes = (event) => {
  const match = formatEventTime(event, '').match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const getCurrentTimeMinutes = (now = new Date()) => (
  now.getHours() * 60 + now.getMinutes()
);

const buildDayStatus = ({
  events,
  routeStops,
  checklists,
  nextEvent,
  dayIsoDate = '',
  now = new Date()
}) => {
  const currentMinutes = getCurrentTimeMinutes(now);
  const isCurrentTripDay = !dayIsoDate || dayIsoDate === getLocalIsoDate(now);
  const timedEvents = events
    .map((event) => ({ event, minutes: readEventTimeMinutes(event) }))
    .filter((item) => item.minutes !== null)
    .sort((a, b) => a.minutes - b.minutes);
  const completedTimedEvents = isCurrentTripDay
    ? timedEvents.filter((item) => item.minutes < currentMinutes).length
    : 0;
  const completedEvents = timedEvents.length
    ? completedTimedEvents
    : 0;
  const totalEvents = events.length;
  const progressPercent = totalEvents
    ? Math.min(100, Math.round((completedEvents / totalEvents) * 100))
    : 0;
  const missingLocationCount = Math.max(0, totalEvents - routeStops.length);
  const checklistRemaining = getChecklistRemaining(checklists?.preTrip) + getChecklistRemaining(checklists?.packing);

  return {
    completedEvents,
    totalEvents,
    progressPercent,
    routeStopCount: routeStops.length,
    missingLocationCount,
    checklistRemaining,
    nextTime: formatEventTime(nextEvent)
  };
};

const buildReminders = ({
  events,
  routeStops,
  tripDetails,
  budgetTarget,
  remainingBudget,
  checklists
}) => {
  const reminders = [];
  const accommodation = tripDetails?.accommodation || {};

  if (!events.length) {
    reminders.push({
      id: 'empty-day',
      tone: 'info',
      title: '今日還沒有行程',
      description: '新增下一站。'
    });
  }

  if (!accommodation.address && !accommodation.name) {
    reminders.push({
      id: 'accommodation',
      tone: 'warning',
      title: '住宿資訊未補',
      description: '補住宿地址。'
    });
  }

  if (events.length > 0 && routeStops.length === 0) {
    reminders.push({
      id: 'route',
      tone: 'warning',
      title: '今日行程缺地點',
      description: '補上地點。'
    });
  }

  if (budgetTarget > 0 && remainingBudget < 0) {
    reminders.push({
      id: 'budget',
      tone: 'danger',
      title: '旅程預算已超支',
      description: `目前超出 ${Math.abs(remainingBudget).toLocaleString()} 元。`
    });
  }

  const preTripRemaining = getChecklistRemaining(checklists?.preTrip);
  if (preTripRemaining > 0) {
    reminders.push({
      id: 'pre-trip',
      tone: 'info',
      title: '行前待辦尚未完成',
      description: `還有 ${preTripRemaining} 項。`
    });
  }

  return reminders.slice(0, 3);
};

const reminderClasses = {
  danger: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200',
  info: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/70 dark:bg-sky-950/30 dark:text-sky-200',
  warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100'
};

const DaySwitcher = ({ itinerary, selectedDay, currentDayTitle, currentDayDate, onSelectDay }) => {
  const currentIndex = itinerary.findIndex((day) => day.day === selectedDay);
  const hasMultipleDays = itinerary.length > 1;
  const previousDay = hasMultipleDays
    ? itinerary[(currentIndex <= 0 ? itinerary.length : currentIndex) - 1]
    : null;
  const nextDay = hasMultipleDays
    ? itinerary[((currentIndex >= 0 ? currentIndex : 0) + 1) % itinerary.length]
    : null;

  return (
    <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white/90 p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      <button
        type="button"
        onClick={() => previousDay && onSelectDay(previousDay.day)}
        disabled={!previousDay}
        className="touch-target inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        aria-label="前一天"
        title="前一天"
      >
        <ChevronLeft size={19} />
      </button>

      <div className="min-w-0 text-center">
        <p className="text-xs font-black uppercase tracking-wide text-brand-700 dark:text-brand-300">
          Day {selectedDay}
        </p>
        <h2 className="truncate text-base font-black text-slate-950 dark:text-white">{currentDayTitle}</h2>
        <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{currentDayDate}</p>
      </div>

      <button
        type="button"
        onClick={() => nextDay && onSelectDay(nextDay.day)}
        disabled={!nextDay}
        className="touch-target inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        aria-label="下一天"
        title="下一天"
      >
        <ChevronRight size={19} />
      </button>
    </div>
  );
};

const FlightDetailTile = ({ label, value }) => (
  <div className="min-w-0 rounded-lg bg-white/75 px-3 py-2 dark:bg-slate-950/35">
    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</p>
    <p className="mt-0.5 truncate text-sm font-black text-slate-950 dark:text-white" title={value || emptyFlightText}>
      {value || emptyFlightText}
    </p>
  </div>
);

const AirportDayFlightRow = ({ flight }) => {
  const timeText = [
    flight.departureTime ? `起飛 ${flight.departureTime}` : '',
    flight.arrivalTime ? `抵達 ${flight.arrivalTime}` : ''
  ].filter(Boolean).join(' / ');
  const terminalText = [
    flight.depTerminal ? `出發 ${flight.depTerminal}` : '',
    flight.arrTerminal ? `抵達 ${flight.arrTerminal}` : ''
  ].filter(Boolean).join(' / ');

  return (
    <div className="min-w-0 rounded-lg border border-sky-100 bg-sky-50/70 p-3 dark:border-sky-900/60 dark:bg-sky-950/25">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-sky-700 dark:text-sky-300">
            {flight.label}航班
          </p>
          {flight.hasFlightCode ? (
            <p className="mt-1 truncate font-mono text-lg font-black text-slate-950 dark:text-white" title={flight.code}>
              {flight.code}
            </p>
          ) : (
            <p className="mt-1 text-base font-black text-slate-950 dark:text-white">
              尚未設定{flight.label}航班
            </p>
          )}
        </div>
        <Badge variant={flight.hasFlightCode ? 'info' : 'warning'}>{flight.hasFlightCode ? '已設定' : '待補'}</Badge>
      </div>

      <p className="mt-1 truncate text-sm font-semibold text-slate-600 dark:text-slate-300" title={flight.airline || emptyFlightText}>
        {flight.airline || emptyFlightText}
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <FlightDetailTile label="出發機場" value={flight.dep} />
        <FlightDetailTile label="抵達機場" value={flight.arr} />
        <FlightDetailTile label="時間" value={timeText} />
        <FlightDetailTile label="航廈" value={terminalText} />
      </div>

      {flight.date && (
        <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">
          航班日期：{flight.date}
        </p>
      )}
    </div>
  );
};

const AirportDayFlightCard = ({ flights, onEditFlights }) => {
  if (!flights.length) return null;

  const hasAnyFlightCode = flights.some((flight) => flight.hasFlightCode);

  return (
    <Card className="border-sky-200 bg-white/95 p-4 shadow-sm dark:border-sky-900/70 dark:bg-slate-900/95">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="tp-icon-chip bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300">
            <Plane size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="tp-section-title">機場航班</h3>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onEditFlights} className="shrink-0">
          {hasAnyFlightCode ? '編輯' : '補航班'}
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {flights.map((flight) => (
          <AirportDayFlightRow key={flight.id} flight={flight} />
        ))}
      </div>
    </Card>
  );
};

const TodayHero = ({
  currentDayData,
  currentDayDate,
  currentLocation,
  events,
  nextEvent,
  onAddEvent,
  onNavigateNext,
  tripDetails,
  canEdit
}) => {
  const nextLocationText = getEventLocationText(nextEvent);
  const weatherLocation = nextLocationText || tripDetails?.accommodation?.address || tripDetails?.accommodation?.name || '東京';
  const memoText = getEventMemoText(nextEvent);

  if (!nextEvent) {
    return (
      <section className="overflow-hidden rounded-lg border border-cyan-200/70 bg-gradient-to-br from-brand-500 via-sky-500 to-rose-400 p-4 text-white shadow-lg dark:border-brand-700/60 dark:from-brand-900/80 dark:via-brand-800/80 dark:to-violet-950/70">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-brand-100">旅途中</p>
            <h3 className="mt-1 text-2xl font-black leading-tight">今天還沒有行程</h3>
            <p className="mt-1 text-sm font-semibold text-brand-50">{currentDayDate || currentDayData?.date || '未設定日期'}</p>
          </div>
          <CalendarDays size={26} className="shrink-0 text-white/80" />
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
          disabled={!canEdit}
          className="touch-target mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-brand-700 shadow-sm transition hover:bg-brand-50 disabled:opacity-70"
        >
          <Plus size={18} />
          新增第一個行程
        </button>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-cyan-200/70 bg-gradient-to-br from-brand-500 via-sky-500 to-rose-400 p-4 text-white shadow-lg dark:border-brand-700/60 dark:from-brand-900/80 dark:via-brand-800/80 dark:to-violet-950/70">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-wide text-brand-100">下一站</p>
          <h3 className="mt-1 break-words text-2xl font-black leading-tight">
            {nextEvent.title || '未命名行程'}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-brand-50">
            <Clock size={15} className="shrink-0" />
            <span className="font-mono">{formatEventTime(nextEvent)}</span>
            {nextLocationText && (
              <>
                <span className="text-white/40">/</span>
                <MapPin size={15} className="shrink-0" />
                <span className="min-w-0 truncate">{nextLocationText}</span>
              </>
            )}
          </div>
        </div>

        {nextLocationText && (
          <button
            type="button"
            onClick={onNavigateNext}
            className="touch-target inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/20 text-white transition hover:bg-white/30 active:scale-95"
            aria-label="導航到下一站"
            title="導航"
          >
            <Navigation size={22} />
          </button>
        )}
      </div>

      <div className="mt-4 border-t border-white/20 pt-4">
        <WeatherWidget
          variant="compact"
          date={currentDayDate || currentDayData?.date}
          currentLocation={currentLocation}
          accommodation={tripDetails?.accommodation?.address || tripDetails?.accommodation?.name || weatherLocation}
          firstEventLocation={nextLocationText}
          selectedEventLocation={nextLocationText}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/20 pt-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-brand-100">
            <Wallet size={13} />
            <span>本行程</span>
          </div>
          <p className="mt-1 text-sm font-black">{formatEventCost(nextEvent)}</p>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-brand-100">
            <CalendarDays size={13} />
            <span>今日預估</span>
          </div>
          <p className="mt-1 text-sm font-black">{formatDailyCost(events)}</p>
        </div>
      </div>

      {memoText && (
        <div className="mt-4 flex items-start gap-2 border-t border-white/20 pt-3 text-sm font-semibold text-brand-50">
          <StickyNote size={16} className="mt-0.5 shrink-0 text-white/80" />
          <p className="line-clamp-2 whitespace-pre-wrap">{memoText}</p>
        </div>
      )}
    </section>
  );
};

const QuickActions = ({ canEdit, nextEvent, routeUrl, onAddEvent, onNavigateNext }) => {
  const hasNextDestination = Boolean(getEventLocationText(nextEvent));

  return (
    <div className="grid grid-cols-3 gap-2" aria-label="旅途中快速操作">
      <Button
        variant="secondary"
        onClick={onNavigateNext}
        disabled={!hasNextDestination}
        className="min-w-0 !px-2 text-xs"
      >
        <Navigation size={16} />
        導航
      </Button>
      {routeUrl ? (
        <Button
          as="a"
          href={routeUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="secondary"
          className="min-w-0 !px-2 text-xs"
        >
          <Map size={16} />
          路線
        </Button>
      ) : (
        <Button variant="secondary" disabled className="min-w-0 !px-2 text-xs">
          <Map size={16} />
          路線
        </Button>
      )}
      <Button onClick={onAddEvent} disabled={!canEdit} className="min-w-0 !px-2 text-xs">
        <Plus size={16} />
        新增
      </Button>
    </div>
  );
};

const StatusMetric = ({ icon: Icon, label, value, tone = 'slate' }) => {
  const toneClasses = {
    amber: 'bg-amber-50 text-amber-800 dark:bg-amber-950/35 dark:text-amber-100',
    brand: 'bg-brand-50 text-brand-800 dark:bg-brand-950/35 dark:text-brand-100',
    emerald: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-100',
    slate: 'bg-slate-50 text-slate-800 dark:bg-slate-800/70 dark:text-slate-100',
    sky: 'bg-sky-50 text-sky-800 dark:bg-sky-950/35 dark:text-sky-100'
  };

  return (
    <div className={`rounded-lg px-3 py-2 ${toneClasses[tone] || toneClasses.slate}`}>
      <div className="flex items-center gap-1.5 text-xs font-black opacity-75">
        <Icon size={13} />
        {label}
      </div>
      <p className="mt-1 truncate text-base font-black">{value}</p>
    </div>
  );
};

const StatusSummaryPill = ({ icon: Icon, label, value, tone = 'slate' }) => {
  const toneClasses = {
    amber: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100',
    brand: 'border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-900/70 dark:bg-brand-950/35 dark:text-brand-100',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-100',
    slate: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-200',
    sky: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/70 dark:bg-sky-950/30 dark:text-sky-100'
  };

  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black ${toneClasses[tone] || toneClasses.slate}`}>
      <Icon size={13} className="shrink-0" />
      <span className="shrink-0 opacity-75">{label}</span>
      <span className="min-w-0 truncate">{value}</span>
    </span>
  );
};

const TravelStatusPanel = ({ status }) => {
  const [showDetails, setShowDetails] = useState(false);
  const hasRouteWarning = status.missingLocationCount > 0;
  const hasChecklistWarning = status.checklistRemaining > 0;
  const summaryText = status.totalEvents
    ? `${status.completedEvents}/${status.totalEvents} 已過，下一站 ${status.nextTime}`
    : '未排程';

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-black text-slate-950 dark:text-white">今日狀態</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{summaryText}</p>
        </div>
        <Badge variant={status.totalEvents ? 'info' : 'muted'}>
          {status.totalEvents ? `${status.progressPercent}%` : '未排程'}
        </Badge>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 via-sky-500 to-emerald-500 transition-all duration-300"
          style={{ width: `${status.progressPercent}%` }}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <StatusSummaryPill
          icon={Navigation}
          label="導航"
          value={`${status.routeStopCount}/${status.totalEvents}`}
          tone={hasRouteWarning ? 'amber' : 'brand'}
        />
        <StatusSummaryPill
          icon={AlertTriangle}
          label="待確認"
          value={`${status.checklistRemaining} 項`}
          tone={hasChecklistWarning ? 'amber' : 'slate'}
        />
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowDetails((open) => !open)}
        aria-expanded={showDetails}
        className="mt-3 w-full justify-center"
      >
        {showDetails ? '收起細節' : '查看細節'}
        {showDetails ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </Button>

      {showDetails && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <StatusMetric
              icon={CheckCircle2}
              label="已過行程"
              value={`${status.completedEvents}/${status.totalEvents}`}
              tone="emerald"
            />
            <StatusMetric
              icon={Clock}
              label="下一站"
              value={status.nextTime}
              tone="sky"
            />
            <StatusMetric
              icon={Navigation}
              label="可導航"
              value={`${status.routeStopCount}/${status.totalEvents}`}
              tone={hasRouteWarning ? 'amber' : 'brand'}
            />
            <StatusMetric
              icon={AlertTriangle}
              label="待確認"
              value={`${status.checklistRemaining} 項`}
              tone={hasChecklistWarning ? 'amber' : 'slate'}
            />
          </div>

          {hasRouteWarning && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
              缺地點：{status.missingLocationCount} 個
            </p>
          )}
        </div>
      )}
    </Card>
  );
};

const ReminderStrip = ({ reminders }) => {
  if (!reminders.length) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-100">
        <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-black">今天看起來準備好了</p>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-2" aria-label="重要提醒">
      <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
        <AlertTriangle size={17} className="text-amber-600 dark:text-amber-300" />
        重要提醒
      </div>
      {reminders.map((reminder) => (
        <div
          key={reminder.id}
          className={`rounded-lg border px-3 py-2 ${reminderClasses[reminder.tone] || reminderClasses.info}`}
        >
          <p className="text-sm font-black">{reminder.title}</p>
          <p className="mt-0.5 text-xs font-semibold opacity-85">{reminder.description}</p>
        </div>
      ))}
    </section>
  );
};

const TodayTimeline = ({ events, tripDetails, onOpenEvent, onOpenMaps }) => {
  return (
    <Card className="p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="tp-icon-chip bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300">
            <Clock size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="tp-section-title">今日行程</h3>
          </div>
        </div>
        <Badge variant={events.length ? 'info' : 'muted'}>{events.length || 0}</Badge>
      </div>

      {events.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
          目前尚無行程
        </div>
      ) : (
        <ol className="space-y-3">
          {events.map((event, index) => {
            const locationText = getEventLocationText(event);
            const previousEvent = index > 0 ? events[index - 1] : null;
            const previousLocation = previousEvent
              ? getEventDestination(previousEvent)
              : tripDetails?.accommodation?.address || tripDetails?.accommodation?.name || '';

            return (
              <li key={event.id || `${event.time}-${event.title}-${index}`} className="flex min-w-0 gap-3">
                <div className="w-12 shrink-0 pt-1 text-right font-mono text-sm font-black text-slate-700 dark:text-slate-200">
                  {formatEventTime(event)}
                </div>
                <div className="flex flex-col items-center">
                  <span className="mt-1 h-3 w-3 rounded-full bg-brand-600 ring-4 ring-brand-50 dark:bg-brand-300 dark:ring-brand-950/50" />
                  {index < events.length - 1 && <span className="mt-1 h-full min-h-10 w-px bg-slate-200 dark:bg-slate-800" />}
                </div>
                <button
                  type="button"
                  onClick={() => onOpenEvent(event, true)}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-brand-200 hover:bg-brand-50 dark:border-slate-800 dark:bg-slate-950/50 dark:hover:border-brand-800 dark:hover:bg-brand-950/20"
                >
                  <span className="block break-words text-sm font-black text-slate-950 dark:text-white">
                    {event.title || '未命名行程'}
                  </span>
                  {locationText && (
                    <span className="mt-1 flex min-w-0 items-start gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <MapPin size={13} className="mt-0.5 shrink-0" />
                      <span className="line-clamp-2 break-words">{locationText}</span>
                    </span>
                  )}
                  {locationText && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-black text-brand-700 dark:bg-brand-950/40 dark:text-brand-200">
                      <Info size={12} />
                      查看詳情
                    </span>
                  )}
                </button>
                {locationText && (
                  <button
                    type="button"
                    onClick={() => onOpenMaps(previousLocation, getEventDestination(event))}
                    className="touch-target mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-brand-100 bg-brand-50 text-brand-700 transition hover:bg-brand-100 dark:border-brand-900/70 dark:bg-brand-950/30 dark:text-brand-300"
                    aria-label={`導航到 ${event.title || locationText}`}
                    title="導航"
                  >
                    <Navigation size={17} />
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
};

const TodayRouteCard = ({ routeStops, routeUrl }) => {
  const [showDetails, setShowDetails] = useState(false);
  const previewQuery = routeStops[0]?.text || '';
  const mapPreviewUrl = previewQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(previewQuery)}&output=embed`
    : '';

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="tp-icon-chip bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
              <Map size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="tp-section-title">今日路線</h3>
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

        <button
          type="button"
          onClick={() => setShowDetails((open) => !open)}
          className="touch-target mt-4 inline-flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          aria-expanded={showDetails}
        >
          路線細節
          {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showDetails && (
          <div className="mt-4 space-y-2">
            {routeStops.length ? routeStops.map((stop, index) => (
              <div key={stop.id || `${stop.text}-${index}`} className="flex min-w-0 items-start gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-black text-white">
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black text-slate-900 dark:text-white">
                    {stop.time} / {stop.title}
                  </span>
                  <span className="mt-0.5 block break-words text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {stop.text}
                  </span>
                </span>
              </div>
            )) : (
              <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                補上地點後顯示。
              </div>
            )}
          </div>
        )}
      </div>

      {showDetails && mapPreviewUrl && (
        <div className="h-56 border-t border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950">
          <iframe
            title="today-route-map-preview"
            src={mapPreviewUrl}
            className="h-full w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}
    </Card>
  );
};

const TodayTab = ({ onTabChange }) => {
  const {
    itinerary,
    selectedDay,
    setSelectedDay,
    currentDayData,
    currentDayTitle,
    currentDayDate,
    tripDetails,
    currentLocation,
    checklists,
    budgetTarget,
    remainingBudget,
    canEdit,
    openAddModal,
    openEditModal,
    handleOpenGoogleMaps,
    openAiRecommendations
  } = useTripWorkspace();

  const dayEvents = useMemo(
    () => Array.isArray(currentDayData?.events) ? currentDayData.events : [],
    [currentDayData]
  );
  const events = useMemo(
    () => sortEventsByTime(dayEvents),
    [dayEvents]
  );
  const selectedDayIsoDate = useMemo(
    () => getTripDayIsoDate(tripDetails?.dateRange?.start, selectedDay),
    [tripDetails?.dateRange?.start, selectedDay]
  );
  const nextEvent = useMemo(
    () => pickNextEvent(events, new Date(), selectedDayIsoDate),
    [events, selectedDayIsoDate]
  );
  const routeStops = useMemo(() => dayEvents.map(getRouteStop).filter(Boolean), [dayEvents]);
  const origin = currentLocation?.locationName ||
    tripDetails?.accommodation?.address ||
    tripDetails?.accommodation?.name ||
    '';
  const routeUrl = buildGoogleMapsMultiStopDirectionsUrl(
    origin,
    routeStops.map((stop) => stop.destination)
  );
  const reminders = useMemo(
    () => buildReminders({
      events,
      routeStops,
      tripDetails,
      budgetTarget,
      remainingBudget,
      checklists
    }),
    [events, routeStops, tripDetails, budgetTarget, remainingBudget, checklists]
  );
  const dayStatus = useMemo(
    () => buildDayStatus({
      events,
      routeStops,
      checklists,
      nextEvent,
      dayIsoDate: selectedDayIsoDate
    }),
    [events, routeStops, checklists, nextEvent, selectedDayIsoDate]
  );
  const airportDayFlights = useMemo(
    () => getAirportDayFlights({ itinerary, selectedDay, tripDetails }),
    [itinerary, selectedDay, tripDetails]
  );

  const handleNavigateNext = () => {
    const destination = getEventDestination(nextEvent);
    if (!destination) return;
    handleOpenGoogleMaps(origin, destination);
  };

  return (
    <div className="mx-auto flex min-w-0 max-w-3xl flex-col gap-4 px-4 pb-20 sm:px-6 lg:max-w-5xl lg:px-8">
      <div className="flex items-center gap-2 text-sm font-black text-brand-700 dark:text-brand-300">
        <Info size={16} />
        旅途
      </div>

      <DaySwitcher
        itinerary={itinerary}
        selectedDay={selectedDay}
        currentDayTitle={currentDayTitle}
        currentDayDate={currentDayDate}
        onSelectDay={setSelectedDay}
      />

      <AirportDayFlightCard
        flights={airportDayFlights}
        onEditFlights={() => onTabChange?.('flights')}
      />

      <TodayHero
        currentDayData={currentDayData}
        currentDayDate={currentDayDate}
        currentLocation={currentLocation}
        events={events}
        nextEvent={nextEvent}
        onAddEvent={openAddModal}
        onNavigateNext={handleNavigateNext}
        tripDetails={tripDetails}
        canEdit={canEdit}
      />

      <QuickActions
        canEdit={canEdit}
        nextEvent={nextEvent}
        routeUrl={routeUrl}
        onAddEvent={openAddModal}
        onNavigateNext={handleNavigateNext}
      />

      <Button
        variant="secondary"
        onClick={() => openAiRecommendations?.('dayPlan')}
        disabled={!canEdit}
        className="w-full justify-center"
      >
        <Sparkles size={16} />
        智慧旅伴幫我排 Day {selectedDay}
      </Button>

      <DayReadinessStrip
        events={dayEvents}
        canEdit={canEdit}
        onOpenEvent={openEditModal}
      />

      <TravelStatusPanel status={dayStatus} />

      <ReminderStrip reminders={reminders} />

      <TodayTimeline
        events={events}
        tripDetails={tripDetails}
        onOpenEvent={openEditModal}
        onOpenMaps={handleOpenGoogleMaps}
      />

      <TodayRouteCard routeStops={routeStops} routeUrl={routeUrl} />
    </div>
  );
};

export default TodayTab;
