import React from 'react';
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
    clientId,
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
        clientId={clientId}
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
