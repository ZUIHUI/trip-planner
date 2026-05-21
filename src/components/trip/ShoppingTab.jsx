import React from 'react';
import ShoppingListContent from '../ShoppingListContent';
import { useTripWorkspace } from '../../contexts/TripWorkspaceContext';

const ShoppingTab = () => {
  const { shoppingListRef, tripId, setIsShoppingModalOpen, isReadOnly } = useTripWorkspace();

  return (
    <div className="mt-2 pb-20">
      <ShoppingListContent
        ref={shoppingListRef}
        tripId={tripId}
        readOnly={isReadOnly}
        onModalOpenChange={setIsShoppingModalOpen}
      />
    </div>
  );
};

export default ShoppingTab;
