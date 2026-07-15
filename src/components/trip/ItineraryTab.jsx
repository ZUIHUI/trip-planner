import React from 'react';
import { CalendarDays, ChevronDown, ChevronRight, ChevronUp, Pencil, Plus, Wallet } from 'lucide-react';
import DaySelector from '../DaySelector';
import EventCard from '../EventCard';
import DayReadinessStrip from './DayReadinessStrip';
import ItineraryRoutePanel from './ItineraryRoutePanel';
import { Button, Card, EmptyState, Input } from '../ui';
import { useTripWorkspace } from '../../contexts/TripWorkspaceContext';
import { useCollaborationEditing } from '../../hooks/useCollaborationEditing';
import { getEditingMembersForTarget } from '../../utils/presence';
import { plainTextInputProps } from '../../utils/mobileInputProps';
import { getTripDayDisplayLabel } from '../../utils/tripDates';
import EditingNotice from './EditingNotice';
import MobileMockupFrame from './MobileMockupFrame';

const currencySymbol = (currency) => (currency === 'TWD' ? 'NT$' : '¥');

const readEventCost = (event) => {
  const amount = Number(event?.cost?.amount ?? event?.cost);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return {
    amount,
    currency: event?.cost?.currency || event?.currency || 'JPY'
  };
};

const formatCostSummary = (costItems) => {
  if (!costItems.length) return '未設定';

  const totals = costItems.reduce((acc, item) => {
    acc[item.currency] = (acc[item.currency] || 0) + item.amount;
    return acc;
  }, {});

  return Object.entries(totals)
    .map(([currency, amount]) => `${currencySymbol(currency)}${amount.toLocaleString()}`)
    .join(' / ');
};

const ItineraryTab = () => {
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
    canEdit,
    showSecondaryModules,
    toggleSecondaryModules,
    isEditingDayMeta,
    dayMetaDraft,
    setDayMetaDraft,
    startDayMetaEdit,
    cancelDayMetaEdit,
    saveDayMeta,
    openAddModal,
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

  const todayCostItems = (currentDayData?.events || [])
    .map(readEventCost)
    .filter(Boolean);
  const todayCostSummary = formatCostSummary(todayCostItems);
  const todayCostEventCount = todayCostItems.length;
  const shouldShowCostToggle = todayCostEventCount > 0;
  const currentDayIndex = itinerary.findIndex((item) => item.day === selectedDay);
  const previousDayItem = currentDayIndex > 0 ? itinerary[currentDayIndex - 1] : null;
  const nextMoveDayItem = currentDayIndex >= 0 && currentDayIndex < itinerary.length - 1
    ? itinerary[currentDayIndex + 1]
    : null;
  const nextDayItem = itinerary.length > 1
    ? itinerary[((currentDayIndex >= 0 ? currentDayIndex : 0) + 1) % itinerary.length]
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

  const handleSelectNextDay = () => {
    if (!nextDayItem) return;
    selectDayWithoutViewportJump(nextDayItem.day);
  };

  return (
    <MobileMockupFrame
      icon={CalendarDays}
      eyebrow={currentDayLabel}
      title={currentDayDisplayTitle}
      stats={[
        { value: currentDayData?.events?.length || 0, label: '行程' },
        { value: todayCostEventCount, label: '含費用' },
        { value: itinerary.length || 0, label: '天數' }
      ]}
      tone="teal"
    >
      <DaySelector itinerary={itinerary} selectedDay={selectedDay} onSelectDay={selectDayWithoutViewportJump} tripDetails={tripDetails} />
      {nextDayItem && (
        <div className="mt-3 px-5 sm:hidden">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSelectNextDay}
            className="w-full justify-center"
            aria-label={`前往 ${getTripDayDisplayLabel(nextDayItem, tripDetails)}`}
          >
            下一天
            <span className="font-black">{getTripDayDisplayLabel(nextDayItem, tripDetails)}</span>
            <ChevronRight size={16} />
          </Button>
        </div>
      )}

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
          className={`${shouldShowCostToggle ? 'mt-5' : 'mt-3'} flex flex-col gap-4 border-b border-slate-200 pb-5 sm:mt-5 sm:flex-row sm:items-end sm:justify-between dark:border-slate-800`}
          {...(isEditingDayMeta ? getEditingHandlers(dayEditingTarget) : {})}
        >
          <div className="min-w-0 flex-1">
            <EditingNotice target={dayEditingTarget} members={dayEditingMembers} />
            {currentDayData ? (
              isEditingDayMeta ? (
                <div className="grid gap-3 sm:grid-cols-[1fr_0.7fr_auto] sm:items-end">
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
                  <div>
                    <label className="tp-label" htmlFor="day-date">日期</label>
                    <Input
                      id="day-date"
                      {...plainTextInputProps}
                      value={dayMetaDraft.date}
                      onChange={(event) => setDayMetaDraft({ ...dayMetaDraft, date: event.target.value })}
                      placeholder={currentDayLabel}
                      enterKeyHint="done"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveDayMeta} size="sm">儲存</Button>
                    <Button onClick={cancelDayMetaEdit} variant="secondary" size="sm">取消</Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs font-bold tracking-wide text-brand-700 dark:text-brand-300">{currentDayLabel}</p>
                  <h2 className="mt-1 truncate text-2xl font-black text-slate-950 dark:text-white">{currentDayDisplayTitle}</h2>
                </>
              )
            ) : (
              <p className="text-slate-500 dark:text-slate-400">載入中...</p>
            )}
          </div>

          {currentDayData && !isEditingDayMeta && (
            <Button
              variant="ghost"
              size="sm"
              onClick={startDayMetaEdit}
              className="self-start !px-2 sm:self-auto sm:!px-3"
              aria-label="編輯日期"
              title="編輯日期"
            >
              <Pencil size={15} />
              <span className="hidden sm:inline">編輯日期</span>
            </Button>
          )}
        </section>

        <DayReadinessStrip
          events={currentDayData?.events || []}
          canEdit={canEdit}
          onOpenEvent={openEditModal}
          className="mt-4"
        />

        <ItineraryRoutePanel
          currentDayData={currentDayData}
          tripDetails={tripDetails}
          currentLocation={currentLocation}
        />

        <div className="mt-6 space-y-4">
          {currentDayData && currentDayData.events.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="目前尚無行程"
              actionLabel="新增第一個行程"
              onAction={openAddModal}
            />
          ) : (
            (currentDayData?.events || []).map((event, index) => {
              const prevEvent = index > 0 ? currentDayData.events[index - 1] : null;
              const prevLocation = prevEvent
                ? prevEvent.locationPlace || prevEvent.location
                : tripDetails?.accommodation?.address || tripDetails?.accommodation?.name || '';

              return (
                <EventCard
                  key={event.id}
                  event={event}
                  prevLocation={prevLocation}
                  onEdit={openEditModal}
                  onDelete={handleDeleteEvent}
                  onMove={handleMoveEvent}
                  onMoveToDay={handleMoveEventToAdjacentDay}
                  canMoveUp={index > 0}
                  canMoveDown={index < currentDayData.events.length - 1}
                  canMoveToPreviousDay={Boolean(previousDayItem)}
                  canMoveToNextDay={Boolean(nextMoveDayItem)}
                  previousDayLabel={previousDayItem ? getTripDayDisplayLabel(previousDayItem, tripDetails) : ''}
                  nextDayLabel={nextMoveDayItem ? getTripDayDisplayLabel(nextMoveDayItem, tripDetails) : ''}
                  canEdit={canEdit}
                  onOpenGoogleMaps={handleOpenGoogleMaps}
                  editingMembers={editingByEventId?.[event.id] || []}
                />
              );
            })
          )}
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
