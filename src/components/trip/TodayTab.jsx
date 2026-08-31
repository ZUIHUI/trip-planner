import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
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
import MobileMockupFrame from './MobileMockupFrame';
import {
  formatDailyCost,
  formatEventTime,
  formatEventCost,
  getEventDestination,
  getEventLocationText,
  getEventMemoText,
  getTripDayIsoDate
} from '../../utils/tripEvents';
import { getTripDayDisplayLabel } from '../../utils/tripDates';
import { getAirportDayFlights } from '../../utils/airportDayFlights';
import { useTripDaySummary } from '../../hooks/useTripDaySummary';
import GoogleRoutePreview from './GoogleRoutePreview';

const emptyFlightText = '未設定';

const quickActionMotion = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.055
    }
  }
};

const quickActionItemMotion = {
  hidden: { opacity: 0, y: 10, scale: 0.985 },
  visible: { opacity: 1, y: 0, scale: 1 }
};

const reminderClasses = {
  danger: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200',
  info: 'border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-900/70 dark:bg-brand-950/30 dark:text-brand-100',
  warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100'
};

const DaySwitcher = ({ itinerary, selectedDay, currentDayDisplayTitle, currentDayLabel, tripDetails, onSelectDay }) => {
  const currentIndex = itinerary.findIndex((day) => day.day === selectedDay);
  const hasMultipleDays = itinerary.length > 1;
  const previousDay = hasMultipleDays
    ? itinerary[(currentIndex <= 0 ? itinerary.length : currentIndex) - 1]
    : null;
  const nextDay = hasMultipleDays
    ? itinerary[((currentIndex >= 0 ? currentIndex : 0) + 1) % itinerary.length]
    : null;

  return (
    <div className="tp-day-switcher flex min-w-0 items-center justify-between gap-3 rounded-lg border border-[#e0e9e0] bg-white/80 p-3 shadow-sm supports-[backdrop-filter]:backdrop-blur sm:p-4 dark:border-brand-200/20 dark:bg-brand-50/80">
      <button
        type="button"
        onClick={() => previousDay && onSelectDay(previousDay.day)}
        disabled={!previousDay}
        className="touch-target inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        aria-label={previousDay ? `前往 ${getTripDayDisplayLabel(previousDay, tripDetails)}` : '前一天'}
        title={previousDay ? getTripDayDisplayLabel(previousDay, tripDetails) : '前一天'}
      >
        <ChevronLeft size={19} />
      </button>

      <div className="min-w-0 px-2 text-center">
        <p className="text-xs font-black uppercase text-brand-700 dark:text-brand-300">
          {currentDayLabel}
        </p>
        <h2 className="truncate text-lg font-black text-stone-800 dark:text-brand-900">{currentDayDisplayTitle}</h2>
      </div>

      <button
        type="button"
        onClick={() => nextDay && onSelectDay(nextDay.day)}
        disabled={!nextDay}
        className="touch-target inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        aria-label={nextDay ? `前往 ${getTripDayDisplayLabel(nextDay, tripDetails)}` : '下一天'}
        title={nextDay ? getTripDayDisplayLabel(nextDay, tripDetails) : '下一天'}
      >
        <ChevronRight size={19} />
      </button>
    </div>
  );
};

const FlightDetailTile = ({ label, value }) => (
  <div className="min-w-0 rounded-lg bg-white/75 px-4 py-3 dark:bg-brand-100/35">
    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</p>
    <p className="mt-0.5 truncate text-sm font-black text-stone-800 dark:text-brand-900" title={value || emptyFlightText}>
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
    <div className="min-w-0 rounded-lg border border-[#e0e9e0] bg-[#f4f8f5]/70 p-4 dark:border-brand-200/20 dark:bg-brand-100/45">
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase text-brand-700 dark:text-brand-300">
            {flight.label}航班
          </p>
          {flight.hasFlightCode ? (
            <p className="mt-1 truncate font-mono text-lg font-black text-stone-800 dark:text-brand-900" title={flight.code}>
              {flight.code}
            </p>
          ) : (
            <p className="mt-1 text-base font-black text-stone-800 dark:text-brand-900">
              尚未設定{flight.label}航班
            </p>
          )}
        </div>
        <Badge variant={flight.hasFlightCode ? 'info' : 'warning'}>{flight.hasFlightCode ? '已設定' : '待補'}</Badge>
      </div>

      <p className="mt-1 truncate text-sm font-semibold text-slate-600 dark:text-slate-300" title={flight.airline || emptyFlightText}>
        {flight.airline || emptyFlightText}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
    <Card className="tp-flight-card border-[#e0e9e0] bg-white/80 p-5 shadow-sm dark:border-brand-200/20 dark:bg-brand-50/85">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="tp-icon-chip">
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

      <div className="grid gap-4 lg:grid-cols-2">
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
  onOpenEvent,
  tripDetails,
  canEdit
}) => {
  const nextLocationText = getEventLocationText(nextEvent);
  const weatherLocation = nextLocationText || tripDetails?.accommodation?.address || tripDetails?.accommodation?.name || '東京';
  const memoText = getEventMemoText(nextEvent);

  if (!nextEvent) {
    return (
      <motion.section
        layout
        initial={{ opacity: 0, y: 14, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 390, damping: 34, mass: 0.6 }}
        className="tp-journey-hero relative overflow-hidden rounded-lg border border-brand-700 bg-brand-700 p-5 text-white shadow-sm sm:p-6 dark:border-brand-300/20 dark:bg-brand-100/80 dark:text-brand-900"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black text-brand-100">今日小隊</p>
            <h3 className="mt-1 text-2xl font-black leading-tight">今天還空著</h3>
            <p className="mt-1 text-sm font-semibold text-brand-50">{currentDayDate || currentDayData?.date || '未設定日期'}</p>
          </div>
          <CalendarDays size={26} className="shrink-0 text-white/80" />
        </div>

        <div className="mt-5 border-t border-white/20 pt-5">
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
          className="touch-target tp-press-feedback tp-hover-icon mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-brand-800 shadow-sm transition hover:bg-brand-50 disabled:opacity-70 dark:bg-brand-900 dark:text-brand-50"
        >
          <Plus size={18} />
          放進今日行程
        </button>
      </motion.section>
    );
  }

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 390, damping: 34, mass: 0.6 }}
      className="tp-journey-hero relative overflow-hidden rounded-lg border border-brand-700 bg-brand-700 p-5 text-white shadow-sm sm:p-6 dark:border-brand-300/20 dark:bg-brand-100/80 dark:text-brand-900"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="tp-v4-next-kicker text-xs font-black text-brand-100">
            <span>NEXT</span>
            <span>{formatEventTime(nextEvent)}</span>
          </p>
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

      </div>

      <div className="mt-5 border-t border-white/20 pt-5">
        <WeatherWidget
          variant="compact"
          date={currentDayDate || currentDayData?.date}
          currentLocation={currentLocation}
          accommodation={tripDetails?.accommodation?.address || tripDetails?.accommodation?.name || weatherLocation}
          firstEventLocation={nextLocationText}
          selectedEventLocation={nextLocationText}
        />
      </div>

      <div className="tp-v4-next-actions">
        <button
          type="button"
          onClick={onNavigateNext}
          disabled={!nextLocationText}
          className="tp-v4-next-action-primary"
        >
          <Navigation size={17} />
          開始導航
        </button>
        <button
          type="button"
          onClick={() => onOpenEvent?.(nextEvent, true)}
          className="tp-v4-next-action-secondary"
        >
          查看詳情
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/20 pt-4">
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
        <div className="mt-5 flex items-start gap-3 border-t border-white/20 pt-4 text-sm font-semibold text-brand-50">
          <StickyNote size={16} className="mt-0.5 shrink-0 text-white/80" />
          <p className="line-clamp-2 whitespace-pre-wrap">{memoText}</p>
        </div>
      )}
    </motion.section>
  );
};

const QuickActions = ({
  canEdit,
  nextEvent,
  routeUrl,
  selectedDayLabel,
  onAddEvent,
  onNavigateNext,
  onOpenAiRecommendations
}) => {
  const hasNextDestination = Boolean(getEventLocationText(nextEvent));

  return (
    <motion.div
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      aria-label="旅途中快速操作"
      variants={quickActionMotion}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={quickActionItemMotion} transition={{ type: 'spring', stiffness: 430, damping: 34, mass: 0.55 }}>
        <Button
          variant="secondary"
          onClick={onNavigateNext}
          disabled={!hasNextDestination}
          className="w-full min-w-0 !px-2 !py-3 text-sm sm:text-xs"
        >
          <Navigation size={16} />
          導航
        </Button>
      </motion.div>
      <motion.div variants={quickActionItemMotion} transition={{ type: 'spring', stiffness: 430, damping: 34, mass: 0.55 }}>
        {routeUrl ? (
          <Button
            as="a"
            href={routeUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="secondary"
            className="w-full min-w-0 !px-2 !py-3 text-sm sm:text-xs"
          >
            <Map size={16} />
            路線
          </Button>
        ) : (
          <Button variant="secondary" disabled className="w-full min-w-0 !px-2 !py-3 text-sm sm:text-xs">
            <Map size={16} />
            路線
          </Button>
        )}
      </motion.div>
      <motion.div variants={quickActionItemMotion} transition={{ type: 'spring', stiffness: 430, damping: 34, mass: 0.55 }}>
        <Button onClick={onAddEvent} disabled={!canEdit} className="w-full min-w-0 !px-2 !py-3 text-sm sm:text-xs">
          <Plus size={16} />
          新增
        </Button>
      </motion.div>
      <motion.div variants={quickActionItemMotion} transition={{ type: 'spring', stiffness: 430, damping: 34, mass: 0.55 }}>
        <Button
          variant="secondary"
          onClick={onOpenAiRecommendations}
          disabled={!canEdit}
          className="w-full min-w-0 !px-2 !py-3 text-sm sm:text-xs"
          aria-label={`幫我排 ${selectedDayLabel}`}
          title={`幫我排 ${selectedDayLabel}`}
        >
          <Sparkles size={16} />
          幫排
        </Button>
      </motion.div>
    </motion.div>
  );
};

const ReminderStrip = ({ reminders }) => {
  if (!reminders.length) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-100">
        <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-black">今天看起來準備好了</p>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-3" aria-label="重要提醒">
      <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
        <AlertTriangle size={17} className="text-amber-600 dark:text-amber-300" />
        重要提醒
      </div>
      {reminders.map((reminder) => (
        <div
          key={reminder.id}
          className={`rounded-lg border px-4 py-3 ${reminderClasses[reminder.tone] || reminderClasses.info}`}
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
    <Card className="p-4 sm:p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="tp-icon-chip">
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
        <ol className="space-y-4">
          {events.map((event, index) => {
            const locationText = getEventLocationText(event);
            const previousEvent = index > 0 ? events[index - 1] : null;
            const previousLocation = previousEvent
              ? getEventDestination(previousEvent)
              : tripDetails?.accommodation?.address || tripDetails?.accommodation?.name || '';

            return (
              <li key={event.id || `${event.time}-${event.title}-${index}`} className="flex min-w-0 gap-2 sm:gap-4">
                <div className="w-12 shrink-0 pt-1 text-right font-mono text-sm font-black text-slate-700 sm:w-14 dark:text-slate-200">
                  {formatEventTime(event)}
                </div>
                <div className="flex flex-col items-center">
                  <span className="mt-1 h-3 w-3 rounded-full bg-brand-600 ring-4 ring-brand-50 dark:bg-brand-300 dark:ring-brand-950/50" />
                  {index < events.length - 1 && <span className="mt-1 h-full min-h-10 w-px bg-slate-200 dark:bg-slate-800" />}
                </div>
                <div className="relative min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => onOpenEvent(event, true)}
                    className="min-w-0 w-full rounded-lg border border-[#e0e9e0] bg-white/80 px-4 py-3 pr-14 text-left transition hover:border-brand-200 hover:bg-brand-50 supports-[backdrop-filter]:backdrop-blur dark:border-brand-200/20 dark:bg-brand-50/60 dark:hover:border-brand-400/40 dark:hover:bg-brand-100/50"
                  >
                    <span className="block break-words text-sm font-black text-stone-800 dark:text-brand-900">
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
                      className="touch-target absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-brand-100 bg-brand-50 text-brand-700 transition hover:bg-brand-100 dark:border-brand-900/70 dark:bg-brand-950/30 dark:text-brand-300"
                      aria-label={`導航到 ${event.title || locationText}`}
                      title="導航"
                    >
                      <Navigation size={17} />
                    </button>
                  )}
                </div>
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

  return (
    <Card className="overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
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
      </div>

      <GoogleRoutePreview
        routeStops={routeStops}
        title="旅程總覽 Google Maps 路線預覽"
        className="h-60 border-y border-[#e0e9e0] dark:border-brand-200/20"
      />

      <div className="p-5 pt-4">
        <button
          type="button"
          onClick={() => setShowDetails((open) => !open)}
          className="touch-target inline-flex w-full items-center justify-between rounded-lg border border-[#e0e9e0] bg-[#f4f8f5]/80 px-3 py-2 text-sm font-black text-stone-700 transition hover:bg-brand-50 dark:border-brand-200/20 dark:bg-brand-100/45 dark:text-brand-800 dark:hover:bg-brand-100/60"
          aria-expanded={showDetails}
        >
          路線細節
          {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showDetails && (
          <div className="mt-5 space-y-3">
            {routeStops.length ? routeStops.map((stop, index) => (
              <div key={stop.id || `${stop.text}-${index}`} className="flex min-w-0 items-start gap-3 rounded-lg bg-[#f4f8f5]/80 p-4 dark:bg-brand-100/45">
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
    currentDayDisplayTitle,
    currentDayLabel,
    tripDetails,
    currentLocation,
    checklists,
    checklistStatusByListId,
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
    () => [...dayEvents],
    [dayEvents]
  );
  const selectedDayIsoDate = useMemo(
    () => getTripDayIsoDate(tripDetails?.dateRange?.start, selectedDay),
    [tripDetails?.dateRange?.start, selectedDay]
  );
  const daySummary = useTripDaySummary({
    events,
    selectedDayIsoDate,
    tripDetails,
    currentLocation,
    checklists,
    checklistStatusByListId,
    budgetTarget,
    remainingBudget
  });
  const {
    nextEvent,
    routeStops,
    origin,
    routeUrl,
    reminders
  } = daySummary;
  const airportDayFlights = useMemo(
    () => getAirportDayFlights({ itinerary, selectedDay, tripDetails }),
    [itinerary, selectedDay, tripDetails]
  );

  const handleNavigateNext = () => {
    const destination = getEventDestination(nextEvent);
    if (!destination) return;
    handleOpenGoogleMaps(origin, destination);
  };

  const handleOpenDayPlanAi = () => {
    openAiRecommendations?.('dayPlan');
  };

  return (
    <MobileMockupFrame
      icon={CalendarDays}
      eyebrow={currentDayLabel}
      title={currentDayDisplayTitle}
      stats={[
        { value: events.length, label: '行程' },
        { value: routeStops.length, label: '停靠點' },
        { value: reminders.length, label: '提醒' }
      ]}
      tone="primary"
      className="mx-auto flex min-w-0 max-w-4xl flex-col gap-5 px-5 pb-24 sm:gap-6 sm:px-7 lg:max-w-6xl lg:px-10"
    >
      <DaySwitcher
        itinerary={itinerary}
        selectedDay={selectedDay}
        currentDayDisplayTitle={currentDayDisplayTitle}
        currentDayLabel={currentDayLabel}
        tripDetails={tripDetails}
        onSelectDay={setSelectedDay}
      />

      <TodayHero
        currentDayData={currentDayData}
        currentDayDate={currentDayDate}
        currentLocation={currentLocation}
        events={events}
        nextEvent={nextEvent}
        onAddEvent={openAddModal}
        onNavigateNext={handleNavigateNext}
        onOpenEvent={openEditModal}
        tripDetails={tripDetails}
        canEdit={canEdit}
      />

      <QuickActions
        canEdit={canEdit}
        nextEvent={nextEvent}
        routeUrl={routeUrl}
        selectedDayLabel={currentDayLabel}
        onAddEvent={openAddModal}
        onNavigateNext={handleNavigateNext}
        onOpenAiRecommendations={handleOpenDayPlanAi}
      />

      <ReminderStrip reminders={reminders} />

      <AirportDayFlightCard
        flights={airportDayFlights}
        onEditFlights={() => onTabChange?.('flights')}
      />

      <TodayTimeline
        events={events}
        tripDetails={tripDetails}
        onOpenEvent={openEditModal}
        onOpenMaps={handleOpenGoogleMaps}
      />

      <TodayRouteCard routeStops={routeStops} routeUrl={routeUrl} />
    </MobileMockupFrame>
  );
};

export default TodayTab;
