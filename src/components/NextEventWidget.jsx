import React, { useMemo } from 'react';
import { Clock, Navigation, MapPin } from 'lucide-react';

const NextEventWidget = ({ itinerary, selectedDay, enableGPS, currentLocation, onNavigate }) => {
  const currentDayData = useMemo(
    () => itinerary.find((day) => day.day === selectedDay),
    [itinerary, selectedDay]
  );

  const nextEvent = useMemo(() => {
    if (!currentDayData?.events || currentDayData.events.length === 0) return null;
    
    // Get current time
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Find next event
    const upcomingEvent = currentDayData.events.find(event => event.time > currentTimeStr);
    return upcomingEvent || currentDayData.events[0]; // Return first event if no upcoming
  }, [currentDayData]);

  if (!nextEvent) {
    return null;
  }

  return (
    <div className="mx-4 sm:mx-6 lg:mx-8 mb-4 mt-3 bg-gradient-to-r from-brand-500 to-brand-600 dark:from-brand-900/50 dark:to-brand-800/50 rounded-lg p-4 text-white shadow-md border border-brand-400/50 dark:border-brand-700/50 animate-in fade-in slide-in-from-top-2">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-brand-100 font-medium mb-1 uppercase tracking-wide">下一個行程</p>
          <h3 className="font-bold text-lg truncate mb-2">{nextEvent.title}</h3>
          <div className="flex items-center gap-2 text-sm text-brand-50 flex-wrap">
            <Clock size={14} className="flex-shrink-0" />
            <span className="font-mono">{nextEvent.time}</span>
            {nextEvent.location && (
              <>
                <span className="mx-1">•</span>
                <MapPin size={14} className="flex-shrink-0" />
                <span className="truncate">{nextEvent.location}</span>
              </>
            )}
          </div>
        </div>

        {/* Navigation Button */}
        {nextEvent.location && (
          <button
            onClick={() => onNavigate?.(nextEvent.location)}
            className="flex-shrink-0 p-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-all active:scale-95 border border-white/30"
            title="導航到此地點"
          >
            <Navigation size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

export default NextEventWidget;
