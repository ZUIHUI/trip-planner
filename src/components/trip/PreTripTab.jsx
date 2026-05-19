import React from 'react';
import { CheckSquare } from 'lucide-react';
import Checklist from '../Checklist';
import { Card } from '../ui';
import { useTripWorkspace } from '../../contexts/TripWorkspaceContext';

const PreTripTab = () => {
  const { checklists, setChecklists } = useTripWorkspace();

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
          items={checklists.preTrip}
          onUpdate={(newItems) =>
            setChecklists((prev) => ({ ...prev, preTrip: newItems }))
          }
        />
      </Card>
    </div>
  );
};

export default PreTripTab;
