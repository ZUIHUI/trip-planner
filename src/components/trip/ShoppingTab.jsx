import React, { useCallback, useMemo } from 'react';
import ShoppingListContent from '../ShoppingListContent';
import { useTripWorkspace } from '../../contexts/TripWorkspaceContext';
import { mergeRealtimeShoppingStatus } from '../../utils/tripRealtime';

const ShoppingTab = () => {
  const {
    shoppingListRef,
    shoppingList,
    setShoppingList,
    shoppingCategories,
    setShoppingCategories,
    shoppingItemStatusById,
    publishShoppingItemStatus,
    setIsShoppingModalOpen,
    isReadOnly
  } = useTripWorkspace();
  const visibleShoppingList = useMemo(
    () => mergeRealtimeShoppingStatus(shoppingList, shoppingItemStatusById),
    [shoppingList, shoppingItemStatusById]
  );
  const handleShoppingListChange = useCallback((nextItems) => {
    const previousById = new Map(
      visibleShoppingList.map((item) => [String(item?.id ?? ''), Boolean(item?.purchased)])
    );

    nextItems.forEach((item) => {
      const itemId = String(item?.id ?? '');
      if (!itemId) return;
      const nextPurchased = Boolean(item?.purchased);
      if (previousById.has(itemId) && previousById.get(itemId) !== nextPurchased) {
        void publishShoppingItemStatus?.({ itemId, purchased: nextPurchased });
      }
    });

    setShoppingList(nextItems);
  }, [publishShoppingItemStatus, setShoppingList, visibleShoppingList]);

  return (
    <div className="mt-2 pb-20">
      <ShoppingListContent
        ref={shoppingListRef}
        shoppingList={visibleShoppingList}
        shoppingCategories={shoppingCategories}
        onShoppingListChange={handleShoppingListChange}
        onShoppingCategoriesChange={setShoppingCategories}
        readOnly={isReadOnly}
        onModalOpenChange={setIsShoppingModalOpen}
      />
    </div>
  );
};

export default ShoppingTab;
