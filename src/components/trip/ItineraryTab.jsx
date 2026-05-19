import React from 'react';
import { CalendarDays, ChevronDown, ChevronUp, Pencil, Plus, Wallet } from 'lucide-react';
import DaySelector from '../DaySelector';
import EventCard from '../EventCard';
import NextEventWidget from '../NextEventWidget';
import WeatherWidget from '../WeatherWidget';
import { Button, Card, EmptyState, Input } from '../ui';
import { useTripWorkspace } from '../../contexts/TripWorkspaceContext';

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
    selectedEventLocation,
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

  const todayCost = (currentDayData?.events || [])
    .filter((event) => event.cost)
    .reduce((sum, event) => sum + (parseInt(event.cost, 10) || 0), 0);
  const todayCostEventCount = (currentDayData?.events || []).filter((event) => event.cost).length;

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

      <div className="mt-4 px-4 pb-24 sm:px-6 lg:px-8">
        <div className="flex justify-stretch sm:justify-end">
          <Button variant="secondary" size="sm" className="w-full sm:w-auto" onClick={toggleSecondaryModules} aria-expanded={showSecondaryModules}>
            {showSecondaryModules ? '收合資訊' : '查看更多資訊'}
            {showSecondaryModules ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
        </div>

        {showSecondaryModules && (
          <div className="mt-3">
            <WeatherWidget
              date={currentDayDate}
              currentLocation={currentLocation}
              accommodation={tripDetails?.accommodation?.address || tripDetails?.accommodation?.name || '東京'}
              firstEventLocation={currentDayData?.events?.[0]?.location || null}
              selectedEventLocation={selectedEventLocation}
            />
          </div>
        )}

        <section className="mt-4 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between dark:border-slate-800">
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
            <Button variant="ghost" size="sm" onClick={startDayMetaEdit}>
              <Pencil size={15} />
              編輯 Day
            </Button>
          )}
        </section>

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

        {showSecondaryModules && currentDayData && currentDayData.events.length > 0 && (
          <Card className="mt-6 p-4">
            <div className="flex items-start gap-3">
              <div className="tp-icon-chip bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                <Wallet size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">今日預估花費</h3>
                <p className="mt-1 text-2xl font-black text-amber-700 dark:text-amber-300">
                  {todayCost.toLocaleString()} 元
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  共 {todayCostEventCount} 個項目有記錄花費
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
