import React from 'react';
import ShoppingListContent from '../ShoppingListContent';
import { useTripWorkspace } from '../../contexts/TripWorkspaceContext';

const ShoppingTab = () => {
  const {
    shoppingListRef,
    shoppingList,
    setShoppingList,
    shoppingCategories,
    setShoppingCategories,
    setIsShoppingModalOpen,
    isReadOnly
  } = useTripWorkspace();

  return (
    <div className="mt-2 pb-20">
      <ShoppingListContent
        ref={shoppingListRef}
        shoppingList={shoppingList}
        shoppingCategories={shoppingCategories}
        onShoppingListChange={setShoppingList}
        onShoppingCategoriesChange={setShoppingCategories}
        readOnly={isReadOnly}
        onModalOpenChange={setIsShoppingModalOpen}
      />
    </div>
  );
};

export default ShoppingTab;
