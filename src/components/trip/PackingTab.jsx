import React from 'react';
import { Luggage } from 'lucide-react';
import PackingListContent from '../PackingListContent';
import { Card } from '../ui';
import { useTripWorkspace } from '../../contexts/TripWorkspaceContext';

const PackingTab = () => {
  const { checklists, setChecklists, memberTravelers, itinerary } = useTripWorkspace();

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
          items={checklists.packing}
          onUpdate={(newItems) =>
            setChecklists((prev) => ({ ...prev, packing: newItems }))
          }
          travelers={memberTravelers || []}
          itinerary={itinerary}
        />
      </Card>
    </div>
  );
};

export default PackingTab;
