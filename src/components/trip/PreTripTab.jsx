import React from 'react';
import Checklist from '../Checklist';
import { useTripWorkspace } from '../../contexts/TripWorkspaceContext';

const PreTripTab = () => {
  const { checklists, setChecklists } = useTripWorkspace();

  return (
    <div className="px-4 sm:px-6 mt-6 space-y-4 pb-10">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4">📋 出國前待辦</h3>
        <Checklist
          items={checklists.preTrip}
          onUpdate={(newItems) =>
            setChecklists((prev) => ({ ...prev, preTrip: newItems }))
          }
        />
      </div>
    </div>
  );
};

export default PreTripTab;
