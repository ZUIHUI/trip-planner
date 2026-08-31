import React, { useCallback, useMemo, useRef } from 'react';
import { CheckSquare } from 'lucide-react';
import Checklist from '../Checklist';
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

const PreTripTab = () => {
  const {
    tripId,
    checklists,
    applyChecklistsPatch,
    setChecklists,
    currentUser,
    clientId,
    canEdit,
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
  const editingTarget = 'checklist:preTrip';
  const { getEditingHandlers } = useCollaborationEditing({
    canEdit,
    updatePresenceEditingTarget,
    updateRealtimeEditingTarget
  });
  const visibleItems = useMemo(
    () => mergeRealtimeChecklistStatus(checklists.preTrip, checklistStatusByListId?.preTrip),
    [checklists.preTrip, checklistStatusByListId]
  );
  const doneCount = visibleItems.filter((item) => item.done).length;
  const remainingCount = Math.max(visibleItems.length - doneCount, 0);
  const handleUpdate = useCallback((newItems) => {
    if (!canEdit) return;
    const updateSeq = updateSeqRef.current + 1;
    updateSeqRef.current = updateSeq;
    const nextItems = newItems.map((item, index) => ({
      ...item,
      listId: 'preTrip',
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

    applyChecklistsPatch?.((prev) => ({ ...prev, preTrip: nextItems }));
    statusChanges.forEach(({ itemId, done }) => {
      void publishChecklistItemStatus?.({ listId: 'preTrip', itemId, done });
    });

    const fallbackToTripSave = () => {
      if (updateSeqRef.current === updateSeq) {
        setChecklists((prev) => ({ ...prev, preTrip: nextItems }));
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
        listId: 'preTrip',
        user: currentUser,
        clientId
      })),
      ...changes.added.map((item) => saveTripChecklistItemDocument({
        tripId,
        item,
        listId: 'preTrip',
        orderKey: getItemOrderKeyAtIndex(item, nextItems.findIndex((nextItem) => getTripItemId(nextItem) === getTripItemId(item))),
        user: currentUser,
        clientId
      })),
      ...changes.changed
        .filter((item) => getTripItemId(item) !== changes.movedItemId)
        .map((item) => saveTripChecklistItemDocument({
          tripId,
          item,
          listId: 'preTrip',
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
          listId: 'preTrip',
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
          label: '行前清單更新',
          fallback: fallbackToTripSave,
          deniedLogMessage: 'Pre-trip checklist document update denied; skipping root trip autosave fallback.',
          fallbackLogMessage: 'Pre-trip checklist document update failed; falling back to full trip autosave.'
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
      icon={CheckSquare}
      eyebrow="出發前"
      title="行前清單"
      subtitle="出發前確認證件、預訂與重要事項。"
      stats={[
        { value: visibleItems.length, label: '事項' },
        { value: doneCount, label: '完成' },
        { value: remainingCount, label: '剩餘' }
      ]}
      tone="success"
      className="mt-2 space-y-4 px-4 pb-10 sm:px-6 lg:px-8"
    >
      <Card className="tp-mobile-feature-card p-4" {...getEditingHandlers(editingTarget)}>
        <div className="mb-4 flex items-center gap-3">
          <div className="tp-icon-chip">
            <CheckSquare size={20} />
          </div>
          <div>
            <h2 className="tp-section-title">出國前待辦</h2>
          </div>
        </div>
        <EditingNotice target={editingTarget} members={getEditingMembersForTarget(editingByTarget, editingTarget)} />
        <Checklist
          items={visibleItems}
          onUpdate={handleUpdate}
          readOnly={!canEdit}
        />
      </Card>
    </MobileMockupFrame>
  );
};

export default PreTripTab;
