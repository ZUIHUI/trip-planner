import React from 'react';
import { CalendarDays, ChevronDown, ChevronRight, ChevronUp, Pencil, Plus, Wallet } from 'lucide-react';
import DaySelector from '../DaySelector';
import EventCard from '../EventCard';
import NextEventWidget from '../NextEventWidget';
import ItineraryRoutePanel from './ItineraryRoutePanel';
import { Button, Card, EmptyState, Input } from '../ui';
import { useTripWorkspace } from '../../contexts/TripWorkspaceContext';

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
    tripDetails,
    currentLocation,
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
    handleOpenGoogleMaps
  } = useTripWorkspace();

  const todayCostItems = (currentDayData?.events || [])
    .map(readEventCost)
    .filter(Boolean);
  const todayCostSummary = formatCostSummary(todayCostItems);
  const todayCostEventCount = todayCostItems.length;
  const shouldShowCostToggle = todayCostEventCount > 0;
  const currentDayIndex = itinerary.findIndex((item) => item.day === selectedDay);
  const nextDayItem = itinerary.length > 1
    ? itinerary[((currentDayIndex >= 0 ? currentDayIndex : 0) + 1) % itinerary.length]
    : null;

  const handleSelectNextDay = () => {
    if (!nextDayItem) return;
    setSelectedDay(nextDayItem.day);
  };

  return (
    <>
      <NextEventWidget
        itinerary={itinerary}
        selectedDay={selectedDay}
        currentDayData={currentDayData}
        currentDayDate={currentDayDate}
        tripDetails={tripDetails}
        currentLocation={currentLocation}
        onAddEvent={openAddModal}
        onNavigate={(destination) =>
          handleOpenGoogleMaps(
            currentLocation?.locationName ||
              tripDetails?.accommodation?.address ||
              tripDetails?.accommodation?.name ||
              '',
            destination
          )
        }
      />

      <DaySelector itinerary={itinerary} selectedDay={selectedDay} onSelectDay={setSelectedDay} />
      {nextDayItem && (
        <div className="mt-2 px-4 sm:hidden">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSelectNextDay}
            className="w-full justify-center"
            aria-label={`前往 Day ${nextDayItem.day}`}
          >
            下一天
            <span className="font-black">Day {nextDayItem.day}</span>
            <ChevronRight size={16} />
          </Button>
        </div>
      )}

      <div className="mt-4 px-4 pb-24 sm:px-6 lg:px-8">
        {shouldShowCostToggle && (
          <div className="flex justify-stretch sm:justify-end">
            <Button variant="secondary" size="sm" className="w-full sm:w-auto" onClick={toggleSecondaryModules} aria-expanded={showSecondaryModules}>
              {showSecondaryModules ? '收合花費' : '今日花費'}
              {showSecondaryModules ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Button>
          </div>
        )}

        <section className={`${shouldShowCostToggle ? 'mt-4' : 'mt-2'} flex flex-col gap-3 border-b border-slate-200 pb-4 sm:mt-4 sm:flex-row sm:items-end sm:justify-between dark:border-slate-800`}>
          <div className="min-w-0 flex-1">
            {currentDayData ? (
              isEditingDayMeta ? (
                <div className="grid gap-2 sm:grid-cols-[1fr_0.7fr_auto] sm:items-end">
                  <div>
                    <label className="tp-label" htmlFor="day-title">Day 標題</label>
                    <Input
                      id="day-title"
                      type="text"
                      value={dayMetaDraft.title}
                      onChange={(event) => setDayMetaDraft({ ...dayMetaDraft, title: event.target.value })}
                      placeholder={`Day ${selectedDay}`}
                    />
                  </div>
                  <div>
                    <label className="tp-label" htmlFor="day-date">日期</label>
                    <Input
                      id="day-date"
                      type="text"
                      value={dayMetaDraft.date}
                      onChange={(event) => setDayMetaDraft({ ...dayMetaDraft, date: event.target.value })}
                      placeholder={`Day ${selectedDay}`}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveDayMeta} size="sm">儲存</Button>
                    <Button onClick={cancelDayMetaEdit} variant="secondary" size="sm">取消</Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs font-bold uppercase tracking-wide text-brand-700 dark:text-brand-300">Day {selectedDay}</p>
                  <h2 className="mt-1 truncate text-2xl font-black text-slate-950 dark:text-white">{currentDayTitle}</h2>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                    <CalendarDays size={15} />
                    {currentDayDate}
                  </p>
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
              aria-label="編輯 Day"
              title="編輯 Day"
            >
              <Pencil size={15} />
              <span className="hidden sm:inline">編輯 Day</span>
            </Button>
          )}
        </section>

        <ItineraryRoutePanel
          currentDayData={currentDayData}
          tripDetails={tripDetails}
          currentLocation={currentLocation}
        />

        <div className="mt-5">
          {currentDayData && currentDayData.events.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="目前尚無行程"
              description="新增第一個行程後，旅途中模式會自動顯示下一個地點、備註、天氣和預估花費。"
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
                  onOpenGoogleMaps={handleOpenGoogleMaps}
                />
              );
            })
          )}
        </div>

        {showSecondaryModules && currentDayData && shouldShowCostToggle && (
          <Card className="mt-6 p-4">
            <div className="flex items-start gap-3">
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
    </>
  );
};

export default ItineraryTab;
