import React, { useCallback, useMemo, useRef } from 'react';
import { Luggage } from 'lucide-react';
import PackingListContent from '../PackingListContent';
import { Card } from '../ui';
import { useTripWorkspace } from '../../contexts/TripWorkspaceContext';
import { useCollaborationEditing } from '../../hooks/useCollaborationEditing';
import { getEditingMembersForTarget } from '../../utils/presence';
import { mergeRealtimeChecklistStatus } from '../../utils/tripRealtime';
import EditingNotice from './EditingNotice';
import MobileMockupFrame from './MobileMockupFrame';
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
    canEdit,
    memberTravelers,
    itinerary,
    editingByTarget,
    checklistStatusByListId,
    updatePresenceEditingTarget,
    updateRealtimeEditingTarget,
    publishChecklistItemStatus,
    saveTripChecklistItemDocument,
    deleteTripChecklistItemDocument,
    moveTripChecklistItemDocument,
    handleDocumentPersistenceError
  } = useTripWorkspace();
  const updateSeqRef = useRef(0);
  const editingTarget = 'checklist:packing';
  const { getEditingHandlers } = useCollaborationEditing({
    canEdit,
    updatePresenceEditingTarget,
    updateRealtimeEditingTarget
  });
  const visibleItems = useMemo(
    () => mergeRealtimeChecklistStatus(checklists.packing, checklistStatusByListId?.packing),
    [checklists.packing, checklistStatusByListId]
  );
  const packedCount = visibleItems.filter((item) => item.done).length;
  const remainingCount = Math.max(visibleItems.length - packedCount, 0);
  const handleUpdate = useCallback((newItems) => {
    if (!canEdit) return;
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
    void Promise.all(operations).catch((error) => {
      if (handleDocumentPersistenceError) {
        handleDocumentPersistenceError(error, {
          label: '行李清單更新',
          fallback: fallbackToTripSave,
          deniedLogMessage: 'Packing checklist document update denied; skipping root trip autosave fallback.',
          fallbackLogMessage: 'Packing checklist document update failed; falling back to full trip autosave.'
        });
        return;
      }
      fallbackToTripSave();
    });
  }, [
    applyChecklistsPatch,
    canEdit,
    clientId,
    currentUser,
    deleteTripChecklistItemDocument,
    handleDocumentPersistenceError,
    moveTripChecklistItemDocument,
    publishChecklistItemStatus,
    saveTripChecklistItemDocument,
    setChecklists,
    tripId,
    visibleItems
  ]);

  return (
    <MobileMockupFrame
      icon={Luggage}
      eyebrow="行李"
      title="行李清單"
      subtitle="整理旅行裝備，出發前一眼確認。"
      stats={[
        { value: visibleItems.length, label: '項目' },
        { value: packedCount, label: '已打包' },
        { value: remainingCount, label: '剩餘' }
      ]}
      tone="coral"
      className="mt-2 space-y-4 px-4 pb-10 sm:px-6 lg:px-8"
    >
      <Card className="tp-mobile-feature-card p-3 sm:p-4" {...getEditingHandlers(editingTarget)}>
        <div className="mb-4 flex items-center gap-3">
          <div className="tp-icon-chip">
            <Luggage size={20} />
          </div>
          <div>
            <h2 className="tp-section-title">行李清單</h2>
          </div>
        </div>
        <EditingNotice target={editingTarget} members={getEditingMembersForTarget(editingByTarget, editingTarget)} />
        <PackingListContent
          items={visibleItems}
          onUpdate={handleUpdate}
          travelers={memberTravelers || []}
          itinerary={itinerary}
          readOnly={!canEdit}
        />
      </Card>
    </MobileMockupFrame>
  );
};

export default PackingTab;
