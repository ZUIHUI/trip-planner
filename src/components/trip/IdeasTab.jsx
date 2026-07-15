import React, { useCallback, useRef } from 'react';
import { Lightbulb } from 'lucide-react';
import { useTripWorkspace } from '../../contexts/TripWorkspaceContext';
import { useCollaborationEditing } from '../../hooks/useCollaborationEditing';
import PlacePoolCard from './PlacePoolCard';
import { getEditingMembersForTarget } from '../../utils/presence';
import {
  getItemOrderKeyAtIndex,
  getTripItemChanges,
  getTripItemId
} from '../../utils/tripItemDocuments';
import MobileMockupFrame from './MobileMockupFrame';

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
    tripDetails,
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
    editingByTarget,
    updatePresenceEditingTarget,
    updateRealtimeEditingTarget,
    saveTripPlaceIdeaDocument,
    deleteTripPlaceIdeaDocument,
    handleDocumentPersistenceError
  } = useTripWorkspace();
  const updateSeqRef = useRef(0);

  const canVote = Boolean(accessRole);
  const canManageIdeas = accessRole === 'owner' || accessRole === 'editor' || accessRole === 'edit';
  const canScheduleIdeas = canManageIdeas;
  const ideasEditingTarget = 'ideas:list';
  const { getEditingHandlers } = useCollaborationEditing({
    canEdit: canManageIdeas,
    updatePresenceEditingTarget,
    updateRealtimeEditingTarget
  });
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
    <MobileMockupFrame
      icon={Lightbulb}
      eyebrow="靈感池"
      title="想去清單"
      subtitle="收集景點、投票，並排進旅程。"
      stats={[
        { value: Array.isArray(placePool) ? placePool.length : 0, label: '地點' },
        { value: selectedDay, label: '天數' },
        { value: canManageIdeas ? '可編輯' : '唯讀', label: '權限' }
      ]}
      tone="coral"
      className="mx-auto flex min-w-0 max-w-4xl flex-col gap-5 px-5 pb-40 sm:gap-6 sm:px-7 sm:pb-28 lg:max-w-6xl lg:px-10"
    >
      <PlacePoolCard
        tripId={tripId}
        placePool={placePool}
        setPlacePool={handlePlacePoolChange}
        itinerary={itinerary}
        tripDetails={tripDetails}
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
        editingTarget={ideasEditingTarget}
        editingMembers={getEditingMembersForTarget(editingByTarget, ideasEditingTarget)}
        editingHandlers={getEditingHandlers(ideasEditingTarget)}
      />
    </MobileMockupFrame>
  );
};

export default IdeasTab;
