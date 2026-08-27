import React from 'react';
import { CalendarDays } from 'lucide-react';
import EventCard from '../EventCard';
import { EmptyState } from '../ui';
import { getTripDayDisplayLabel } from '../../utils/tripDates';

const TripTimeline = ({
  events = [],
  tripDetails = {},
  previousDay = null,
  nextDay = null,
  canEdit = false,
  onEdit,
  onDelete,
  onMove,
  onMoveToDay,
  onOpenGoogleMaps,
  editingByEventId = {},
  className = ''
}) => {
  if (!events.length) {
    return (
      <div className={`tp-itinerary-timeline mt-6 ${className}`.trim()}>
        <EmptyState
          icon={CalendarDays}
          title="目前尚無行程"
          description="使用畫面上的新增行程按鈕，放入第一個停靠點。"
        />
      </div>
    );
  }

  return (
    <div className={`tp-itinerary-timeline mt-6 space-y-4 ${className}`.trim()} aria-label="每日行程時間軸">
      {events.map((event, index) => {
        const previousEvent = index > 0 ? events[index - 1] : null;
        const previousLocation = previousEvent
          ? previousEvent.locationPlace || previousEvent.location
          : tripDetails?.accommodation?.address || tripDetails?.accommodation?.name || '';

        return (
          <EventCard
            key={event.id || `${event.title}-${index}`}
            event={event}
            prevLocation={previousLocation}
            onEdit={onEdit}
            onDelete={onDelete}
            onMove={onMove}
            onMoveToDay={onMoveToDay}
            canMoveUp={index > 0}
            canMoveDown={index < events.length - 1}
            canMoveToPreviousDay={Boolean(previousDay)}
            canMoveToNextDay={Boolean(nextDay)}
            previousDayLabel={previousDay ? getTripDayDisplayLabel(previousDay, tripDetails) : ''}
            nextDayLabel={nextDay ? getTripDayDisplayLabel(nextDay, tripDetails) : ''}
            canEdit={canEdit}
            onOpenGoogleMaps={onOpenGoogleMaps}
            editingMembers={editingByEventId?.[event.id] || []}
          />
        );
      })}
    </div>
  );
};

export default TripTimeline;
