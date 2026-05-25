import React from 'react';
import { Star } from 'lucide-react';
import { useTripWorkspace } from '../../contexts/TripWorkspaceContext';
import PlacePoolCard from './PlacePoolCard';

const IdeasTab = () => {
  const {
    tripId,
    placePool,
    setPlacePool,
    itinerary,
    setItinerary,
    selectedDay,
    collaboration,
    currentUser,
    userProfile,
    accessRole,
    placeVotesByPlaceId,
    realtimeError,
    openAddModal
  } = useTripWorkspace();

  const canVote = Boolean(accessRole);
  const canManageIdeas = accessRole === 'owner' || accessRole === 'editor' || accessRole === 'edit';
  const canScheduleIdeas = canManageIdeas;

  return (
    <div className="mx-auto flex min-w-0 max-w-3xl flex-col gap-4 px-4 pb-20 sm:px-6 lg:max-w-5xl lg:px-8">
      <div className="flex items-start gap-3 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/25 dark:text-rose-100">
        <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/80 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200">
          <Star size={19} />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-black">大家想去的地方</h2>
          <p className="mt-1 text-sm font-semibold leading-6 opacity-85">
            按「我想去」一起選。
          </p>
        </div>
      </div>

      <PlacePoolCard
        tripId={tripId}
        placePool={placePool}
        setPlacePool={setPlacePool}
        itinerary={itinerary}
        setItinerary={setItinerary}
        selectedDay={selectedDay}
        onAddEvent={openAddModal}
        collaboration={collaboration}
        currentUser={currentUser}
        userProfile={userProfile}
        placeVotesByPlaceId={placeVotesByPlaceId}
        realtimeError={realtimeError}
        canVote={canVote}
        canManageIdeas={canManageIdeas}
        canScheduleIdeas={canScheduleIdeas}
      />
    </div>
  );
};

export default IdeasTab;
