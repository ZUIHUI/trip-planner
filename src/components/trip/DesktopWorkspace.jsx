import React, { useMemo } from 'react';
import {
  BookOpen,
  CalendarDays,
  CheckSquare,
  ChevronRight,
  CircleDollarSign,
  Compass,
  LayoutDashboard,
  Lightbulb,
  Luggage,
  Map,
  MapPin,
  Navigation,
  Plane,
  Plus,
  Settings,
  ShoppingBag,
  Sparkles,
  UsersRound
} from 'lucide-react';
import { Badge, Button } from '../ui';
import { useTripWorkspace } from '../../contexts/TripWorkspaceContext';
import { buildGoogleMapsMultiStopDirectionsUrl } from '../../services/googleMapsService';
import { buildItineraryRouteState, getTripRouteOrigin } from '../../utils/itineraryRoute';
import GoogleRoutePreview from './GoogleRoutePreview';

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

const readLocation = (event) => (
  event?.locationPlace?.name
  || event?.locationPlace?.address
  || event?.location
  || event?.address
  || ''
);

const formatEventTime = (event) => event?.time || event?.startTime || '--:--';

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
        <small>{tripDetails?.dateRange?.start || '日期待設定'}</small>
      </div>

      <NavigationGroup label="旅途中" items={primaryModules} activeTab={activeTab} onTabChange={onTabChange} />

      <section className="tp-v4-rail-section tp-v4-rail-days">
        <h2>日期</h2>
        <div>
          {(Array.isArray(itinerary) ? itinerary : []).map((day) => {
            const isActive = String(day.day) === String(selectedDay);
            return (
              <button
                key={day.day}
                type="button"
                className={isActive ? 'is-active' : ''}
                onClick={() => handleDayChange(day.day)}
                aria-current={isActive ? 'date' : undefined}
              >
                <span className="tp-v4-rail-day-number">{day.day}</span>
                <span className="tp-v4-rail-day-copy">
                  <strong>{day.title?.trim() || `第 ${day.day} 天`}</strong>
                  <small>{day.date?.trim() || '日期待設定'}</small>
                </span>
              </button>
            );
          })}
        </div>
      </section>

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
    currentDayTitle,
    selectedDay,
    tripDetails,
    currentLocation
  } = useTripWorkspace();
  const events = useMemo(
    () => Array.isArray(currentDayData?.events) ? [...currentDayData.events] : [],
    [currentDayData]
  );
  const nextEvent = events.find((event) => readLocation(event)) || events[0];
  const destination = readLocation(nextEvent);
  const origin = useMemo(
    () => getTripRouteOrigin(tripDetails, currentLocation),
    [currentLocation, tripDetails]
  );
  const routeStops = useMemo(
    () => buildItineraryRouteState(events, { origin }).routeStops,
    [events, origin]
  );
  const routeUrl = buildGoogleMapsMultiStopDirectionsUrl(
    origin,
    routeStops.map((stop) => stop.destination)
  );

  if (activeTab !== 'today' && activeTab !== 'itinerary') return null;

  return (
    <section className="tp-v4-desktop-map" aria-label="今日地圖概覽">
      <GoogleRoutePreview
        routeStops={routeStops}
        title="桌面旅程總覽 Google Maps 路線預覽"
        className="tp-v4-desktop-route-preview"
        loading="eager"
      />

      <div className="tp-v4-desktop-map-toolbar">
        <span>DAY {selectedDay}</span>
        <strong>{currentDayTitle || '今日路線'}</strong>
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
    selectedDay,
    currentDayData,
    currentDayTitle,
    currentDayDate,
    remainingBudget,
    budgetProgress,
    canEdit,
    openAddModal,
    openAiRecommendations,
    presenceUi
  } = useTripWorkspace();
  const events = useMemo(
    () => Array.isArray(currentDayData?.events) ? [...currentDayData.events] : [],
    [currentDayData]
  );

  return (
    <aside className="tp-v4-planner-panel" aria-label="今日規劃摘要">
      <div className="tp-v4-planner-heading">
        <span>DAY {selectedDay} · PLAN</span>
        <h2>{currentDayTitle || '今日計畫'}</h2>
        <p>{currentDayDate || '日期待設定'} · {presenceUi?.summaryText || '已同步'}</p>
      </div>

      <div className="tp-v4-planner-actions">
        <Button onClick={openAddModal} disabled={!canEdit}>
          <Plus size={16} />
          新增行程
        </Button>
        <Button variant="secondary" onClick={() => openAiRecommendations?.('dayPlan')} disabled={!canEdit}>
          <Sparkles size={16} />
          智慧建議
        </Button>
      </div>

      <div className="tp-v4-planner-stats">
        <div><strong>{events.length}</strong><span>今日行程</span></div>
        <div><strong>{budgetProgress || 0}%</strong><span>預算使用</span></div>
        <div><strong>{Number.isFinite(remainingBudget) ? Math.round(remainingBudget).toLocaleString() : '--'}</strong><span>預算餘額</span></div>
      </div>

      <section className="tp-v4-panel-timeline">
        <div className="tp-v4-panel-section-heading">
          <div>
            <span>TIME LINE</span>
            <h3>今日時間線</h3>
          </div>
          {activeTab !== 'itinerary' && (
            <button type="button" onClick={() => onTabChange('itinerary')}>完整行程</button>
          )}
        </div>

        {events.length ? (
          <ol>
            {events.slice(0, 6).map((event, index) => (
              <li key={event.id || `${event.title}-${index}`}>
                <time>{formatEventTime(event)}</time>
                <span className={index === 0 ? 'is-next' : ''} aria-hidden="true" />
                <div>
                  <strong>{event.title || '未命名行程'}</strong>
                  <small>
                    {readLocation(event) ? <MapPin size={12} /> : <CalendarDays size={12} />}
                    {readLocation(event) || '尚未設定地點'}
                  </small>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="tp-v4-panel-empty">
            <CalendarDays size={22} />
            <strong>這一天還沒有行程</strong>
            <p>先新增一個停靠點，時間線會在這裡整理完成。</p>
          </div>
        )}
      </section>

      <section className="tp-v4-panel-note">
        <BookOpen size={18} />
        <div>
          <strong>規劃提醒</strong>
          <p>桌面適合跨日調整與資料檢查；旅途中可回到「旅程總覽」快速查看下一站。</p>
        </div>
      </section>
    </aside>
  );
};
