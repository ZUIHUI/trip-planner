import React from 'react';
import {
  BookOpen,
  CalendarDays,
  Map,
  MapPin,
  Plus,
  Sparkles
} from 'lucide-react';
import { Button } from '../ui';
import { formatEventTime, getEventLocationText } from '../../utils/tripEvents';
import TripTaskSummary from './TripTaskSummary';

const TripContextRail = ({
  activeTab,
  onTabChange,
  dayLabel,
  dayTitle,
  syncText,
  canEdit,
  onAddEvent,
  onOpenAi,
  events = [],
  budgetProgress = 0,
  remainingBudget,
  daySummary
}) => {
  const {
    routeStops = [],
    routeUrl = '',
    nextEvent = null,
    readiness = {},
    preTripTasks = [],
    pendingPreTripTasks = [],
    completedPreTripCount = 0
  } = daySummary || {};
  const contextItems = activeTab === 'itinerary'
    ? routeStops
    : nextEvent
      ? [nextEvent]
      : [];

  return (
    <aside className="tp-v4-planner-panel" aria-label="所選日期規劃摘要">
      <div className="tp-v4-planner-heading">
        <span>{dayLabel}</span>
        <h2>{dayTitle}</h2>
        <p>{syncText || '已同步'}</p>
      </div>

      <div className="tp-v4-planner-actions">
        <Button onClick={onAddEvent} disabled={!canEdit}>
          <Plus size={16} />
          新增行程
        </Button>
        <Button variant="secondary" onClick={onOpenAi} disabled={!canEdit}>
          <Sparkles size={16} />
          智慧建議
        </Button>
      </div>

      <div className="tp-v4-planner-stats">
        <div><strong>{events.length}</strong><span>今日行程</span></div>
        <div><strong>{readiness.readyCount || 0}</strong><span>資料完整</span></div>
        <div><strong>{activeTab === 'itinerary' ? pendingPreTripTasks.length : `${budgetProgress || 0}%`}</strong><span>{activeTab === 'itinerary' ? '未完待辦' : '預算使用'}</span></div>
      </div>

      <section className="tp-v4-panel-timeline tp-v4-panel-route-summary">
        <div className="tp-v4-panel-section-heading">
          <div>
            <span>{activeTab === 'itinerary' ? 'ROUTE' : 'NEXT'}</span>
            <h3>{activeTab === 'itinerary' ? '今日路線' : '下一站'}</h3>
          </div>
          {activeTab === 'itinerary' && routeUrl ? (
            <Button as="a" href={routeUrl} target="_blank" rel="noopener noreferrer" variant="ghost" size="sm">
              <Map size={14} />
              地圖
            </Button>
          ) : activeTab !== 'itinerary' && (
            <button type="button" onClick={() => onTabChange('itinerary')}>完整行程</button>
          )}
        </div>

        {contextItems.length ? (
          <ol>
            {contextItems.slice(0, activeTab === 'itinerary' ? 6 : 1).map((event, index) => {
              const locationText = event.text || getEventLocationText(event);
              return (
                <li key={event.id || `${event.title}-${index}`}>
                  <time>{event.time || formatEventTime(event)}</time>
                  <span className={index === 0 ? 'is-next' : ''} aria-hidden="true" />
                  <div>
                    <strong>{event.title || '未命名行程'}</strong>
                    <small>
                      {locationText ? <MapPin size={12} /> : <CalendarDays size={12} />}
                      {locationText || '尚未設定地點'}
                    </small>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="tp-v4-panel-empty">
            <CalendarDays size={22} />
            <strong>這一天還沒有行程</strong>
            <p>新增第一個停靠點後，摘要會在這裡更新。</p>
          </div>
        )}
      </section>

      {activeTab === 'itinerary' ? (
        <TripTaskSummary
          tasks={preTripTasks}
          pendingTasks={pendingPreTripTasks}
          completedCount={completedPreTripCount}
          onViewAll={() => onTabChange('preTrip')}
        />
      ) : (
        <section className="tp-v4-panel-note">
          <BookOpen size={18} />
          <div>
            <strong>預算餘額</strong>
            <p>{Number.isFinite(remainingBudget) ? Math.round(remainingBudget).toLocaleString() : '--'} 元；旅途中可回到總覽快速查看下一站。</p>
          </div>
        </section>
      )}
    </aside>
  );
};

export default TripContextRail;
