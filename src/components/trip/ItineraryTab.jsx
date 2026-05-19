import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import DaySelector from '../DaySelector';
import EventCard from '../EventCard';
import NextEventWidget from '../NextEventWidget';
import WeatherWidget from '../WeatherWidget';
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
    enableGPS,
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

  return (
    <>
      <DaySelector itinerary={itinerary} selectedDay={selectedDay} onSelectDay={setSelectedDay} />

    <div className="px-6 mt-2 pb-20">
      <NextEventWidget
        itinerary={itinerary}
        selectedDay={selectedDay}
        enableGPS={enableGPS}
        currentLocation={currentLocation}
        onNavigate={(destination) =>
          handleOpenGoogleMaps(
            currentLocation?.locationName || tripDetails?.accommodation || '',
            destination
          )
        }
      />

      <button
        onClick={toggleSecondaryModules}
        className="inline-flex items-center gap-1 text-sm font-medium text-gray-600"
      >
        {showSecondaryModules ? '收合次要資訊' : '查看更多資訊'}
        {showSecondaryModules ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

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

      <div className="flex justify-between items-end mb-4 border-b border-gray-200 pb-2 gap-3">
        <div className="flex-1">
          {currentDayData ? (
            isEditingDayMeta ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={dayMetaDraft.title}
                  onChange={(event) => setDayMetaDraft({ ...dayMetaDraft, title: event.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-base font-bold text-gray-800"
                  placeholder={`Day ${selectedDay}`}
                />
                <input
                  type="text"
                  value={dayMetaDraft.date}
                  onChange={(event) => setDayMetaDraft({ ...dayMetaDraft, date: event.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600"
                  placeholder={`Day ${selectedDay}`}
                />
                <div className="flex gap-2 touch-row">
                  <button
                    onClick={saveDayMeta}
                    className="touch-target text-sm px-3 py-1 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
                  >
                    儲存
                  </button>
                  <button
                    onClick={cancelDayMetaEdit}
                    className="touch-target text-sm px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-800">{currentDayTitle}</h2>
                <p className="tp-caption-text text-gray-500">{currentDayDate}</p>
              </>
            )
          ) : (
            <p className="text-gray-500">載入中...</p>
          )}
        </div>

        {currentDayData && !isEditingDayMeta && (
          <button
            onClick={startDayMetaEdit}
            className="text-sm px-2 py-1 text-gray-500 underline underline-offset-2"
          >
            編輯 Day
          </button>
        )}
      </div>

      <div className="mt-4">
        {currentDayData && currentDayData.events.length === 0 ? (
          <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
            <p>尚無行程</p>
            <button
              onClick={openAddModal}
              className="touch-target mt-2 text-blue-500 font-bold text-sm px-2"
            >
              + 新增第一個行程
            </button>
          </div>
        ) : (
          (currentDayData?.events || []).map((event, index) => {
            const prevEvent = index > 0 ? currentDayData.events[index - 1] : null;
            const prevLocation = prevEvent
              ? prevEvent.locationPlace || prevEvent.location
              : tripDetails?.accommodation || '';

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
        <div className="mt-6 p-4 bg-gradient-to-r from-orange-100 to-yellow-100 rounded-xl border border-orange-200">
          <h3 className="font-bold text-orange-800 mb-2">💰 今日預估花費</h3>
          <div className="text-2xl font-bold text-orange-600">
            {currentDayData.events
              .filter((event) => event.cost)
              .reduce((sum, event) => sum + (parseInt(event.cost, 10) || 0), 0)
              .toLocaleString()} 元
          </div>
          <p className="text-xs text-orange-700 mt-2">
            共 {currentDayData.events.filter((event) => event.cost).length} 個項目有記錄花費
          </p>
        </div>
      )}
    </div>
    </>
  );
};

export default ItineraryTab;
