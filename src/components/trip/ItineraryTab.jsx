import React from 'react';
import { CalendarDays, ChevronDown, ChevronUp, Map, Pencil, Wallet } from 'lucide-react';
import DayReadinessStrip from './DayReadinessStrip';
import { Button, Card, Input, Select } from '../ui';
import { useTripWorkspace } from '../../contexts/TripWorkspaceContext';
import { useCollaborationEditing } from '../../hooks/useCollaborationEditing';
import { getEditingMembersForTarget } from '../../utils/presence';
import { plainTextInputProps } from '../../utils/mobileInputProps';
import {
  buildTripDayDateText,
  getTripDayDateParts,
  getTripDayMonthLength
} from '../../utils/tripDates';
import { getTripDayIsoDate } from '../../utils/tripEvents';
import { useTripDaySummary } from '../../hooks/useTripDaySummary';
import EditingNotice from './EditingNotice';
import MobileMockupFrame from './MobileMockupFrame';
import TripDayStrip from './TripDayStrip';
import TripRoutePanel from './TripRoutePanel';
import TripTaskSummary from './TripTaskSummary';
import TripTimeline from './TripTimeline';

const tripDayMonthOptions = Array.from(
  { length: 12 },
  (_, index) => String(index + 1).padStart(2, '0')
);

const ItineraryTab = ({ onTabChange }) => {
  const {
    itinerary,
    selectedDay,
    setSelectedDay,
    currentDayData,
    currentDayDisplayTitle,
    currentDayLabel,
    tripDetails,
    currentLocation,
    checklists,
    checklistStatusByListId,
    canEdit,
    showSecondaryModules,
    toggleSecondaryModules,
    isEditingDayMeta,
    dayMetaDraft,
    setDayMetaDraft,
    startDayMetaEdit,
    cancelDayMetaEdit,
    saveDayMeta,
    openEditModal,
    handleDeleteEvent,
    handleMoveEvent,
    handleMoveEventToAdjacentDay,
    handleOpenGoogleMaps,
    editingByEventId,
    editingByTarget,
    updatePresenceEditingTarget,
    updateRealtimeEditingTarget
  } = useTripWorkspace();
  const dayEditingTarget = currentDayData ? `day:${selectedDay}` : '';
  const dayEditingMembers = getEditingMembersForTarget(editingByTarget, dayEditingTarget);
  const {
    getEditingHandlers,
    stopEditing: stopCollaborationEditing
  } = useCollaborationEditing({
    canEdit,
    updatePresenceEditingTarget,
    updateRealtimeEditingTarget
  });

  React.useEffect(() => {
    if (!isEditingDayMeta) {
      stopCollaborationEditing();
    }
  }, [isEditingDayMeta, stopCollaborationEditing]);

  const selectedDayIsoDate = getTripDayIsoDate(tripDetails?.dateRange?.start, selectedDay);
  const selectedDateParts = getTripDayDateParts(dayMetaDraft.date, selectedDayIsoDate);
  const fallbackDateParts = getTripDayDateParts(selectedDayIsoDate, selectedDayIsoDate);
  const dayDateParts = {
    month: selectedDateParts.month || fallbackDateParts.month || '01',
    day: selectedDateParts.day || fallbackDateParts.day || '01'
  };
  const tripDayDateOptions = Array.from(
    { length: getTripDayMonthLength(dayDateParts.month, selectedDayIsoDate) },
    (_, index) => String(index + 1).padStart(2, '0')
  );

  const handleDayDatePartChange = (part, value) => {
    const nextParts = { ...dayDateParts, [part]: value };

    if (part === 'month') {
      const monthLength = getTripDayMonthLength(value, selectedDayIsoDate);
      nextParts.day = String(Math.min(Number(nextParts.day), monthLength)).padStart(2, '0');
    }

    const nextDate = buildTripDayDateText(nextParts, selectedDayIsoDate);
    if (!nextDate) return;
    setDayMetaDraft((previousDraft) => ({ ...previousDraft, date: nextDate }));
  };

  const daySummary = useTripDaySummary({
    events: currentDayData?.events || [],
    selectedDayIsoDate,
    tripDetails,
    currentLocation,
    checklists,
    checklistStatusByListId
  });
  const todayCostSummary = daySummary.costSummary;
  const todayCostEventCount = daySummary.costEventCount;
  const shouldShowCostToggle = todayCostEventCount > 0;
  const currentDayIndex = itinerary.findIndex((item) => item.day === selectedDay);
  const previousDayItem = currentDayIndex > 0 ? itinerary[currentDayIndex - 1] : null;
  const nextMoveDayItem = currentDayIndex >= 0 && currentDayIndex < itinerary.length - 1
    ? itinerary[currentDayIndex + 1]
    : null;
  const pendingViewportRef = React.useRef(null);

  const selectDayWithoutViewportJump = React.useCallback((day) => {
    if (String(day) === String(selectedDay)) return;
    if (typeof window !== 'undefined') {
      pendingViewportRef.current = {
        left: window.scrollX,
        top: window.scrollY
      };
    }
    setSelectedDay(day);
  }, [selectedDay, setSelectedDay]);

  React.useLayoutEffect(() => {
    const pendingViewport = pendingViewportRef.current;
    if (!pendingViewport || typeof window === 'undefined') return;
    pendingViewportRef.current = null;
    window.scrollTo({
      left: pendingViewport.left,
      top: pendingViewport.top,
      behavior: 'auto'
    });
  }, [selectedDay]);

  return (
    <MobileMockupFrame
      icon={CalendarDays}
      eyebrow={currentDayLabel}
      title={currentDayDisplayTitle}
      stats={[
        { value: currentDayData?.events?.length || 0, label: '行程' },
        { value: todayCostEventCount, label: '含費用' }
      ]}
      tone="primary"
    >
      <TripDayStrip itinerary={itinerary} selectedDay={selectedDay} onSelectDay={selectDayWithoutViewportJump} tripDetails={tripDetails} />

      <div className="mx-auto mt-5 max-w-6xl px-5 pb-40 sm:px-7 sm:pb-28 lg:px-10">
        {shouldShowCostToggle && (
          <div className="flex justify-stretch sm:justify-end">
            <Button variant="secondary" size="sm" className="w-full sm:w-auto" onClick={toggleSecondaryModules} aria-expanded={showSecondaryModules}>
              {showSecondaryModules ? '收合花費' : '今日花費'}
              {showSecondaryModules ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Button>
          </div>
        )}

        <section
          className={`${shouldShowCostToggle ? 'mt-5' : 'mt-3'} tp-itinerary-day-heading border-b border-slate-200 pb-5 sm:mt-5 dark:border-slate-800`}
          {...(isEditingDayMeta ? getEditingHandlers(dayEditingTarget) : {})}
        >
          <div className="min-w-0 flex-1">
            <EditingNotice target={dayEditingTarget} members={dayEditingMembers} />
            {currentDayData ? (
              isEditingDayMeta ? (
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(13rem,0.85fr)_auto] sm:items-end">
                  <div>
                    <label className="tp-label" htmlFor="day-title">日期標題</label>
                    <Input
                      id="day-title"
                      {...plainTextInputProps}
                      value={dayMetaDraft.title}
                      onChange={(event) => setDayMetaDraft({ ...dayMetaDraft, title: event.target.value })}
                      placeholder="當日行程"
                      enterKeyHint="next"
                    />
                  </div>
                  <fieldset className="min-w-0">
                    <legend className="tp-label">日期</legend>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="sr-only" htmlFor="day-date-month">月份</label>
                      <Select
                        id="day-date-month"
                        aria-label="月份"
                        value={dayDateParts.month}
                        onChange={(event) => handleDayDatePartChange('month', event.target.value)}
                        className="min-w-0"
                      >
                        {tripDayMonthOptions.map((month) => (
                          <option key={month} value={month}>{Number(month)} 月</option>
                        ))}
                      </Select>
                      <label className="sr-only" htmlFor="day-date-day">日期</label>
                      <Select
                        id="day-date-day"
                        aria-label="日期"
                        value={dayDateParts.day}
                        onChange={(event) => handleDayDatePartChange('day', event.target.value)}
                        className="min-w-0"
                      >
                        {tripDayDateOptions.map((day) => (
                          <option key={day} value={day}>{Number(day)} 日</option>
                        ))}
                      </Select>
                    </div>
                  </fieldset>
                  <div className="flex gap-2">
                    <Button onClick={saveDayMeta} size="sm">儲存</Button>
                    <Button onClick={cancelDayMetaEdit} variant="secondary" size="sm">取消</Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs font-bold tracking-wide text-brand-700 dark:text-brand-300">{currentDayLabel}</p>
                  <div className="mt-1 flex min-w-0 items-center gap-1.5">
                    <h2 className="min-w-0 truncate text-2xl font-black text-slate-950 dark:text-white">{currentDayDisplayTitle}</h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={startDayMetaEdit}
                      className="shrink-0"
                      aria-label="編輯日期"
                      title="編輯日期"
                    >
                      <Pencil size={15} />
                    </Button>
                  </div>
                  <p className="tp-itinerary-day-note mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                    已排 {currentDayData.events.length} 個行程
                    {todayCostEventCount > 0 ? ` · ${todayCostEventCount} 個含費用` : ' · 尚未記錄花費'}
                  </p>
                </>
              )
            ) : (
              <p className="text-slate-500 dark:text-slate-400">載入中...</p>
            )}
          </div>
        </section>

        <DayReadinessStrip
          events={currentDayData?.events || []}
          canEdit={canEdit}
          onOpenEvent={openEditModal}
          className="mt-4"
        />

        <div className="tp-itinerary-route-panel tp-itinerary-route-primary">
          <TripRoutePanel
            currentDayData={currentDayData}
            tripDetails={tripDetails}
            currentLocation={currentLocation}
            daySummary={daySummary}
          />
        </div>

        <TripTimeline
          events={currentDayData?.events || []}
          tripDetails={tripDetails}
          previousDay={previousDayItem}
          nextDay={nextMoveDayItem}
          canEdit={canEdit}
          onEdit={openEditModal}
          onDelete={handleDeleteEvent}
          onMove={handleMoveEvent}
          onMoveToDay={handleMoveEventToAdjacentDay}
          onOpenGoogleMaps={handleOpenGoogleMaps}
          editingByEventId={editingByEventId}
        />

        <div className="tp-itinerary-tablet-context" aria-label="平板每日摘要">
          <details className="tp-itinerary-tablet-route">
            <summary>
              <span><Map size={17} aria-hidden="true" /> 今日路線</span>
              <strong>{daySummary.routeStops.length} 站</strong>
            </summary>
            <TripRoutePanel
              currentDayData={currentDayData}
              tripDetails={tripDetails}
              currentLocation={currentLocation}
              daySummary={daySummary}
            />
          </details>
          <TripTaskSummary
            tasks={daySummary.preTripTasks}
            pendingTasks={daySummary.pendingPreTripTasks}
            completedCount={daySummary.completedPreTripCount}
            collapsible
            onViewAll={onTabChange ? () => onTabChange('preTrip') : undefined}
          />
        </div>

        {showSecondaryModules && currentDayData && shouldShowCostToggle && (
          <Card className="mt-7 p-5">
            <div className="flex items-start gap-4">
              <div className="tp-icon-chip bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                <Wallet size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">今日預估花費</h3>
                <p className="mt-1 text-2xl font-black text-amber-700 dark:text-amber-300">
                  {todayCostSummary}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {todayCostEventCount > 0
                    ? `共 ${todayCostEventCount} 個項目有記錄花費`
                    : '今日行程尚未設定預估花費'}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </MobileMockupFrame>
  );
};

export default ItineraryTab;
