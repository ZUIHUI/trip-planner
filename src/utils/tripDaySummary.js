import { buildGoogleMapsMultiStopDirectionsUrl } from './googleMapsDirections';
import { buildDayReadiness } from './eventReadiness';
import { buildItineraryRouteState, getTripRouteOrigin } from './itineraryRoute';
import {
  formatDailyCost,
  formatEventTime,
  getLocalIsoDate,
  pickNextEvent,
  readEventCost
} from './tripEvents';
import { mergeRealtimeChecklistStatus } from './tripRealtime';

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

export const buildDayProgressStatus = ({
  events = [],
  routeStops = [],
  checklists = {},
  nextEvent = null,
  dayIsoDate = '',
  now = new Date()
} = {}) => {
  const currentMinutes = getCurrentTimeMinutes(now);
  const isCurrentTripDay = !dayIsoDate || dayIsoDate === getLocalIsoDate(now);
  const timedEvents = events
    .map((event) => ({ event, minutes: readEventTimeMinutes(event) }))
    .filter((item) => item.minutes !== null);
  const completedTimedEvents = isCurrentTripDay
    ? timedEvents.filter((item) => item.minutes < currentMinutes).length
    : 0;
  const completedEvents = timedEvents.length ? completedTimedEvents : 0;
  const totalEvents = events.length;

  return {
    completedEvents,
    totalEvents,
    progressPercent: totalEvents
      ? Math.min(100, Math.round((completedEvents / totalEvents) * 100))
      : 0,
    routeStopCount: routeStops.length,
    missingLocationCount: Math.max(0, totalEvents - routeStops.length),
    checklistRemaining: getChecklistRemaining(checklists.preTrip)
      + getChecklistRemaining(checklists.packing),
    nextTime: formatEventTime(nextEvent)
  };
};

export const buildDayReminders = ({
  events = [],
  routeStops = [],
  tripDetails = {},
  budgetTarget = 0,
  remainingBudget = 0,
  checklists = {}
} = {}) => {
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

  const preTripRemaining = getChecklistRemaining(checklists.preTrip);
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

const addTaskContext = (items = [], listId, listLabel) => (
  items.map((item) => ({ ...item, listId, listLabel }))
);

export const buildTripDaySummary = ({
  events = [],
  selectedDayIsoDate = '',
  tripDetails = {},
  currentLocation = null,
  checklists = {},
  checklistStatusByListId = {},
  budgetTarget = 0,
  remainingBudget = 0,
  now = new Date()
} = {}) => {
  const orderedEvents = Array.isArray(events) ? [...events] : [];
  const origin = getTripRouteOrigin(tripDetails, currentLocation);
  const route = buildItineraryRouteState(orderedEvents, { origin });
  const routeUrl = buildGoogleMapsMultiStopDirectionsUrl(
    origin,
    route.routeStops.map((stop) => stop.destination)
  );
  const nextEvent = pickNextEvent(orderedEvents, now, selectedDayIsoDate);
  const preTripTasks = mergeRealtimeChecklistStatus(
    checklists?.preTrip,
    checklistStatusByListId?.preTrip
  );
  const packingTasks = mergeRealtimeChecklistStatus(
    checklists?.packing,
    checklistStatusByListId?.packing
  );
  const resolvedChecklists = { ...checklists, preTrip: preTripTasks, packing: packingTasks };
  const tasks = [
    ...addTaskContext(preTripTasks, 'preTrip', '行前準備'),
    ...addTaskContext(packingTasks, 'packing', '行李清單')
  ];
  const pendingTasks = tasks.filter((item) => !item.done);
  const costByCurrency = orderedEvents.reduce((totals, event) => {
    const cost = readEventCost(event);
    if (cost) totals[cost.currency] = (totals[cost.currency] || 0) + cost.amount;
    return totals;
  }, {});
  const reminders = buildDayReminders({
    events: orderedEvents,
    routeStops: route.routeStops,
    tripDetails,
    budgetTarget,
    remainingBudget,
    checklists: resolvedChecklists
  });

  return {
    events: orderedEvents,
    selectedDayIsoDate,
    origin,
    route,
    routeStops: route.routeStops,
    routeUrl,
    nextEvent,
    readiness: buildDayReadiness(orderedEvents),
    reminders,
    dayStatus: buildDayProgressStatus({
      events: orderedEvents,
      routeStops: route.routeStops,
      checklists: resolvedChecklists,
      nextEvent,
      dayIsoDate: selectedDayIsoDate,
      now
    }),
    preTripTasks,
    packingTasks,
    tasks,
    pendingTasks,
    pendingPreTripTasks: preTripTasks.filter((item) => !item.done),
    completedPreTripCount: preTripTasks.filter((item) => item.done).length,
    costByCurrency,
    costEventCount: orderedEvents.filter((event) => Boolean(readEventCost(event))).length,
    costSummary: formatDailyCost(orderedEvents)
  };
};
