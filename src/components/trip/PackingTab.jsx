import React, { useCallback, useMemo, useRef } from 'react';
import { Luggage } from 'lucide-react';
import PackingListContent from '../PackingListContent';
import { Card } from '../ui';
import { useTripWorkspace } from '../../contexts/TripWorkspaceContext';
import { mergeRealtimeChecklistStatus } from '../../utils/tripRealtime';
import {
  getItemOrderKeyAtIndex,
  getSparseOrderKeyForItem,
  getTripItemChanges,
  getTripItemId
} from '../../utils/tripItemDocuments';

const CHECKLIST_ITEM_FIELDS = ['text', 'done', 'category', 'assignedTo', 'day'];

const PackingTab = () => {
  const {
    tripId,
    checklists,
    applyChecklistsPatch,
    setChecklists,
    currentUser,
    clientId,
    memberTravelers,
    itinerary,
    checklistStatusByListId,
    publishChecklistItemStatus,
    saveTripChecklistItemDocument,
    deleteTripChecklistItemDocument,
    moveTripChecklistItemDocument
  } = useTripWorkspace();
  const updateSeqRef = useRef(0);
  const visibleItems = useMemo(
    () => mergeRealtimeChecklistStatus(checklists.packing, checklistStatusByListId?.packing),
    [checklists.packing, checklistStatusByListId]
  );
  const handleUpdate = useCallback((newItems) => {
    const updateSeq = updateSeqRef.current + 1;
    updateSeqRef.current = updateSeq;
    const nextItems = newItems.map((item, index) => ({
      ...item,
      listId: 'packing',
      orderKey: getItemOrderKeyAtIndex(item, index)
    }));
    const changes = getTripItemChanges({
      previousItems: visibleItems,
      nextItems,
      fields: CHECKLIST_ITEM_FIELDS
    });
    const previousById = new Map(
      visibleItems.map((item) => [String(item?.id ?? ''), Boolean(item?.done)])
    );
    const statusChanges = [];

    nextItems.forEach((item) => {
      const itemId = String(item?.id ?? '');
      if (!itemId) return;
      const nextDone = Boolean(item?.done);
      if (previousById.has(itemId) && previousById.get(itemId) !== nextDone) {
        statusChanges.push({ itemId, done: nextDone });
      }
    });

    applyChecklistsPatch?.((prev) => ({ ...prev, packing: nextItems }));
    statusChanges.forEach(({ itemId, done }) => {
      void publishChecklistItemStatus?.({ listId: 'packing', itemId, done });
    });

    const fallbackToTripSave = () => {
      if (updateSeqRef.current === updateSeq) {
        setChecklists((prev) => ({ ...prev, packing: nextItems }));
      }
    };
    const canWriteItemDocs = Boolean(
      tripId &&
      currentUser?.uid &&
      saveTripChecklistItemDocument &&
      deleteTripChecklistItemDocument &&
      moveTripChecklistItemDocument
    );

    if (!canWriteItemDocs) {
      fallbackToTripSave();
      return;
    }

    const operations = [
      ...changes.removed.map((item) => deleteTripChecklistItemDocument({
        tripId,
        item,
        itemId: item.id,
        listId: 'packing',
        user: currentUser,
        clientId
      })),
      ...changes.added.map((item) => saveTripChecklistItemDocument({
        tripId,
        item,
        listId: 'packing',
        orderKey: getItemOrderKeyAtIndex(item, nextItems.findIndex((nextItem) => getTripItemId(nextItem) === getTripItemId(item))),
        user: currentUser,
        clientId
      })),
      ...changes.changed
        .filter((item) => getTripItemId(item) !== changes.movedItemId)
        .map((item) => saveTripChecklistItemDocument({
          tripId,
          item,
          listId: 'packing',
          orderKey: getItemOrderKeyAtIndex(item, nextItems.findIndex((nextItem) => getTripItemId(nextItem) === getTripItemId(item))),
          user: currentUser,
          clientId
        }))
    ];

    if (changes.movedItemId) {
      const movedItem = nextItems.find((item) => getTripItemId(item) === changes.movedItemId);
      if (movedItem) {
        operations.push(moveTripChecklistItemDocument({
          tripId,
          item: movedItem,
          listId: 'packing',
          orderKey: getSparseOrderKeyForItem(nextItems, changes.movedItemId),
          user: currentUser,
          clientId
        }));
      }
    }

    if (!operations.length) return;
    void Promise.all(operations).catch(fallbackToTripSave);
  }, [
    applyChecklistsPatch,
    clientId,
    currentUser,
    deleteTripChecklistItemDocument,
    moveTripChecklistItemDocument,
    publishChecklistItemStatus,
    saveTripChecklistItemDocument,
    setChecklists,
    tripId,
    visibleItems
  ]);

  return (
    <div className="mt-2 space-y-4 px-4 pb-10 sm:px-6 lg:px-8">
      <Card className="p-3 sm:p-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="tp-icon-chip">
            <Luggage size={20} />
          </div>
          <div>
            <h2 className="tp-section-title">行李清單</h2>
            <p className="tp-section-subtitle">出發前確認。</p>
          </div>
        </div>
        <PackingListContent
          items={visibleItems}
          onUpdate={handleUpdate}
          travelers={memberTravelers || []}
          itinerary={itinerary}
        />
      </Card>
    </div>
  );
};

export default PackingTab;
