import React from 'react';
import PackingListContent from '../PackingListContent';
import { useTripWorkspace } from '../../contexts/TripWorkspaceContext';

const PackingTab = () => {
  const { checklists, setChecklists, tripDetails, itinerary } = useTripWorkspace();

  return (
    <div className="px-4 sm:px-6 mt-6 space-y-4 pb-10">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4">🎒 打包清單</h3>
        <PackingListContent
          items={checklists.packing}
          onUpdate={(newItems) =>
            setChecklists((prev) => ({ ...prev, packing: newItems }))
          }
          travelers={tripDetails?.travelers || []}
          itinerary={itinerary}
        />
      </div>
    </div>
  );
};

export default PackingTab;
