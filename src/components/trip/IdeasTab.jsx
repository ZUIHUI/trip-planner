import React, { useCallback, useRef } from 'react';
import { useTripWorkspace } from '../../contexts/TripWorkspaceContext';
import PlacePoolCard from './PlacePoolCard';
import {
  getItemOrderKeyAtIndex,
  getTripItemChanges,
  getTripItemId
} from '../../utils/tripItemDocuments';

const PLACE_IDEA_FIELDS = [
  'name',
  'address',
  'placeId',
  'lat',
  'lng',
  'note',
  'status',
  'plannedDay',
  'addedAt',
  'plannedAt',
  'votes'
];

const IdeasTab = () => {
  const {
    tripId,
    placePool,
    applyPlacePoolPatch,
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
    openAddModal,
    handleAppendEvent,
    saveTripPlaceIdeaDocument,
    deleteTripPlaceIdeaDocument,
    handleDocumentPersistenceError
  } = useTripWorkspace();
  const updateSeqRef = useRef(0);

  const canVote = Boolean(accessRole);
  const canManageIdeas = accessRole === 'owner' || accessRole === 'editor' || accessRole === 'edit';
  const canScheduleIdeas = canManageIdeas;
  const handlePlacePoolChange = useCallback((updater) => {
    const updateSeq = updateSeqRef.current + 1;
    updateSeqRef.current = updateSeq;
    const currentPlaces = Array.isArray(placePool) ? placePool : [];
    const nextValue = typeof updater === 'function' ? updater(currentPlaces) : updater;
    const nextPlaces = (Array.isArray(nextValue) ? nextValue : []).map((place, index) => ({
      ...place,
      orderKey: getItemOrderKeyAtIndex(place, index)
    }));
    const changes = getTripItemChanges({
      previousItems: currentPlaces,
      nextItems: nextPlaces,
      fields: PLACE_IDEA_FIELDS
    });

    applyPlacePoolPatch?.(nextPlaces);

    const fallbackToTripSave = () => {
      if (updateSeqRef.current === updateSeq) {
        setPlacePool(nextPlaces);
      }
    };
    const canWritePlaceDocs = Boolean(
      tripId &&
      currentUser?.uid &&
      saveTripPlaceIdeaDocument &&
      deleteTripPlaceIdeaDocument
    );

    if (!canWritePlaceDocs) {
      fallbackToTripSave();
      return;
    }

    const operations = [
      ...changes.removed.map((place) => deleteTripPlaceIdeaDocument({
        tripId,
        place,
        placeId: place.id,
        user: currentUser,
        clientId
      })),
      ...changes.added.map((place) => saveTripPlaceIdeaDocument({
        tripId,
        place,
        orderKey: getItemOrderKeyAtIndex(place, nextPlaces.findIndex((item) => getTripItemId(item) === getTripItemId(place))),
        user: currentUser,
        clientId
      })),
      ...changes.changed.map((place) => saveTripPlaceIdeaDocument({
        tripId,
        place,
        orderKey: getItemOrderKeyAtIndex(place, nextPlaces.findIndex((item) => getTripItemId(item) === getTripItemId(place))),
        user: currentUser,
        clientId
      }))
    ];

    if (!operations.length) return;
    void Promise.all(operations).catch((error) => {
      if (handleDocumentPersistenceError) {
        handleDocumentPersistenceError(error, {
          label: '想去地點更新',
          fallback: fallbackToTripSave,
          deniedLogMessage: 'Place idea document update denied; skipping root trip autosave fallback.',
          fallbackLogMessage: 'Place idea document update failed; falling back to full trip autosave.'
        });
        return;
      }
      fallbackToTripSave();
    });
  }, [
    applyPlacePoolPatch,
    clientId,
    currentUser,
    deleteTripPlaceIdeaDocument,
    handleDocumentPersistenceError,
    placePool,
    saveTripPlaceIdeaDocument,
    setPlacePool,
    tripId
  ]);

  return (
    <div className="mx-auto flex min-w-0 max-w-4xl flex-col gap-5 px-5 pb-40 sm:gap-6 sm:px-7 sm:pb-28 lg:max-w-6xl lg:px-10">
      <PlacePoolCard
        tripId={tripId}
        placePool={placePool}
        setPlacePool={handlePlacePoolChange}
        itinerary={itinerary}
        setItinerary={setItinerary}
        selectedDay={selectedDay}
        onAddEvent={openAddModal}
        onCreateEventFromPlace={handleAppendEvent}
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
