import React, { useCallback, useMemo } from 'react';
import { CheckSquare } from 'lucide-react';
import Checklist from '../Checklist';
import { Card } from '../ui';
import { useTripWorkspace } from '../../contexts/TripWorkspaceContext';
import { mergeRealtimeChecklistStatus } from '../../utils/tripRealtime';

const PreTripTab = () => {
  const {
    checklists,
    setChecklists,
    checklistStatusByListId,
    publishChecklistItemStatus
  } = useTripWorkspace();
  const visibleItems = useMemo(
    () => mergeRealtimeChecklistStatus(checklists.preTrip, checklistStatusByListId?.preTrip),
    [checklists.preTrip, checklistStatusByListId]
  );
  const handleUpdate = useCallback((newItems) => {
    const previousById = new Map(
      visibleItems.map((item) => [String(item?.id ?? ''), Boolean(item?.done)])
    );

    newItems.forEach((item) => {
      const itemId = String(item?.id ?? '');
      if (!itemId) return;
      const nextDone = Boolean(item?.done);
      if (previousById.has(itemId) && previousById.get(itemId) !== nextDone) {
        void publishChecklistItemStatus?.({ listId: 'preTrip', itemId, done: nextDone });
      }
    });

    setChecklists((prev) => ({ ...prev, preTrip: newItems }));
  }, [publishChecklistItemStatus, setChecklists, visibleItems]);

  return (
    <div className="mt-2 space-y-4 px-4 pb-10 sm:px-6 lg:px-8">
      <Card className="p-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="tp-icon-chip">
            <CheckSquare size={20} />
          </div>
          <div>
            <h2 className="tp-section-title">出國前待辦</h2>
            <p className="tp-section-subtitle">簽證、保險、票券、預約和出發前準備。</p>
          </div>
        </div>
        <Checklist
          items={visibleItems}
          onUpdate={handleUpdate}
        />
      </Card>
    </div>
  );
};

export default PreTripTab;
