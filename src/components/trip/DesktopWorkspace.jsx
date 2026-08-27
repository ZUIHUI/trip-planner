import React, { useMemo } from 'react';
import {
  CheckSquare,
  ChevronRight,
  CircleDollarSign,
  Compass,
  LayoutDashboard,
  Lightbulb,
  Luggage,
  Map,
  Navigation,
  Plane,
  Settings,
  ShoppingBag,
  UsersRound
} from 'lucide-react';
import { Badge, Button } from '../ui';
import { useTripWorkspace } from '../../contexts/TripWorkspaceContext';
import { getTripDayDisplayLabel, getTripDayDisplayTitle, getTripDisplayDates } from '../../utils/tripDates';
import { formatEventTime, getEventLocationText, getTripDayIsoDate } from '../../utils/tripEvents';
import { useTripDaySummary } from '../../hooks/useTripDaySummary';
import GoogleRoutePreview from './GoogleRoutePreview';
import TripContextRail from './TripContextRail';

const primaryModules = [
  { id: 'today', label: '旅程總覽', icon: Compass },
  { id: 'itinerary', label: '行程安排', icon: Map },
  { id: 'ideas', label: '靈感與地點', icon: Lightbulb }
];

const planningModules = [
  { id: 'summary', label: '旅程控制台', icon: LayoutDashboard },
  { id: 'flights', label: '航班與住宿', icon: Plane },
  { id: 'preTrip', label: '行前準備', icon: CheckSquare },
  { id: 'packing', label: '行李清單', icon: Luggage },
  { id: 'expenses', label: '支出與預算', icon: CircleDollarSign },
  { id: 'shopping', label: '購物清單', icon: ShoppingBag },
  { id: 'companions', label: '旅伴與分享', icon: UsersRound }
];

const NavigationGroup = ({ label, items, activeTab, onTabChange }) => (
  <section className="tp-v4-rail-section">
    <h2>{label}</h2>
    <div>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={isActive ? 'is-active' : ''}
            onClick={() => onTabChange(item.id)}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={17} />
            <span>{item.label}</span>
            {isActive && <ChevronRight size={15} aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  </section>
);

export const DesktopWorkspaceRail = ({ activeTab, onTabChange, onOpenSettings }) => {
  const { itinerary, selectedDay, setSelectedDay, tripDetails } = useTripWorkspace();

  const handleDayChange = (day) => {
    setSelectedDay(day);
    if (activeTab !== 'today' && activeTab !== 'itinerary') {
      onTabChange('itinerary');
    }
  };

  return (
    <aside className="tp-v4-workspace-rail" aria-label="桌面旅程導覽">
      <div className="tp-v4-rail-trip">
        <span>TRIP WORKSPACE</span>
        <strong>{tripDetails?.title || '我的旅程'}</strong>
        <small>{getTripDisplayDates(tripDetails) || '日期待設定'}</small>
      </div>

      <NavigationGroup label="旅途中" items={primaryModules} activeTab={activeTab} onTabChange={onTabChange} />

      {activeTab !== 'itinerary' && (
        <section className="tp-v4-rail-section tp-v4-rail-days">
          <h2>日期</h2>
          <div>
            {(Array.isArray(itinerary) ? itinerary : []).map((day) => {
              const isActive = String(day.day) === String(selectedDay);
              const dayLabel = getTripDayDisplayLabel(day, tripDetails);
              const dayTitle = getTripDayDisplayTitle(day, '');
              return (
                <button
                  key={day.day}
                  type="button"
                  className={isActive ? 'is-active' : ''}
                  onClick={() => handleDayChange(day.day)}
                  aria-current={isActive ? 'date' : undefined}
                >
                  <span className="tp-v4-rail-day-copy">
                    <strong>{dayLabel}</strong>
                    {dayTitle && <small>{dayTitle}</small>}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <NavigationGroup label="行前規劃" items={planningModules} activeTab={activeTab} onTabChange={onTabChange} />

      <button type="button" className="tp-v4-rail-settings" onClick={onOpenSettings}>
        <Settings size={17} />
        <span>旅程設定</span>
      </button>
    </aside>
  );
};

export const DesktopMapOverview = ({ activeTab }) => {
  const {
    currentDayData,
    currentDayDisplayTitle,
    currentDayLabel,
    selectedDay,
    tripDetails,
    currentLocation
  } = useTripWorkspace();
  const events = useMemo(
    () => Array.isArray(currentDayData?.events) ? [...currentDayData.events] : [],
    [currentDayData]
  );
  const selectedDayIsoDate = getTripDayIsoDate(tripDetails?.dateRange?.start, selectedDay);
  const { nextEvent, routeStops, routeUrl } = useTripDaySummary({
    events,
    selectedDayIsoDate,
    tripDetails,
    currentLocation
  });
  const destination = getEventLocationText(nextEvent);

  if (activeTab !== 'today') return null;

  return (
    <section className="tp-v4-desktop-map" aria-label="今日地圖概覽">
      <GoogleRoutePreview
        routeStops={routeStops}
        title="桌面旅程總覽 Google Maps 路線預覽"
        className="tp-v4-desktop-route-preview"
        loading="eager"
      />

      <div className="tp-v4-desktop-map-toolbar">
        <span>{currentDayLabel}</span>
        <strong>{currentDayDisplayTitle}</strong>
        <Badge variant="info">Google 路線 · {routeStops.length} 站</Badge>
      </div>

      <div className="tp-v4-desktop-map-card">
        <span className="tp-v4-map-card-kicker">NEXT · {formatEventTime(nextEvent)}</span>
        <h2>{nextEvent?.title || '今天尚未安排行程'}</h2>
        <p>{destination || '新增第一個地點後，這裡會整理下一站與導航入口。'}</p>
        {routeUrl ? (
          <Button as="a" href={routeUrl} target="_blank" rel="noopener noreferrer">
            <Navigation size={17} />
            開啟完整路線
          </Button>
        ) : (
          <Button disabled>
            <Navigation size={17} />
            尚無可導航地點
          </Button>
        )}
      </div>
    </section>
  );
};

export const DesktopPlannerPanel = ({ activeTab, onTabChange }) => {
  const {
    currentDayData,
    currentDayDisplayTitle,
    currentDayLabel,
    remainingBudget,
    budgetProgress,
    canEdit,
    checklists,
    checklistStatusByListId,
    currentLocation,
    selectedDay,
    openAddModal,
    openAiRecommendations,
    presenceUi,
    tripDetails
  } = useTripWorkspace();
  const events = useMemo(
    () => Array.isArray(currentDayData?.events) ? [...currentDayData.events] : [],
    [currentDayData]
  );
  const selectedDayIsoDate = getTripDayIsoDate(tripDetails?.dateRange?.start, selectedDay);
  const daySummary = useTripDaySummary({
    events,
    selectedDayIsoDate,
    tripDetails,
    currentLocation,
    checklists,
    checklistStatusByListId,
    remainingBudget
  });
  return (
    <TripContextRail
      activeTab={activeTab}
      onTabChange={onTabChange}
      dayLabel={currentDayLabel}
      dayTitle={currentDayDisplayTitle}
      syncText={presenceUi?.summaryText}
      canEdit={canEdit}
      onAddEvent={openAddModal}
      onOpenAi={() => openAiRecommendations?.('dayPlan')}
      events={events}
      budgetProgress={budgetProgress}
      remainingBudget={remainingBudget}
      daySummary={daySummary}
    />
  );
};
