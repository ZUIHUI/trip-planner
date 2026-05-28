import React, { useCallback, useMemo, useRef } from 'react';
import ShoppingListContent from '../ShoppingListContent';
import { useTripWorkspace } from '../../contexts/TripWorkspaceContext';
import { mergeRealtimeShoppingStatus } from '../../utils/tripRealtime';
import {
  getItemOrderKeyAtIndex,
  getSparseOrderKeyForItem,
  getTripItemChanges,
  getTripItemId
} from '../../utils/tripItemDocuments';
import { makeShoppingCategoryId } from '../../utils/tripCollectionDocuments';

const SHOPPING_ITEM_FIELDS = ['name', 'category', 'shop', 'quantity', 'notes', 'image', 'purchased'];

const ShoppingTab = () => {
  const {
    tripId,
    shoppingListRef,
    shoppingList,
    applyShoppingListPatch,
    setShoppingList,
    shoppingCategories,
    applyShoppingCategoriesPatch,
    setShoppingCategories,
    currentUser,
    clientId,
    shoppingItemStatusById,
    publishShoppingItemStatus,
    saveTripShoppingItemDocument,
    deleteTripShoppingItemDocument,
    moveTripShoppingItemDocument,
    saveTripShoppingCategoryDocument,
    deleteTripShoppingCategoryDocument,
    setIsShoppingModalOpen,
    isReadOnly,
    handleDocumentPersistenceError
  } = useTripWorkspace();
  const updateSeqRef = useRef(0);
  const categoryUpdateSeqRef = useRef(0);
  const visibleShoppingList = useMemo(
    () => mergeRealtimeShoppingStatus(shoppingList, shoppingItemStatusById),
    [shoppingList, shoppingItemStatusById]
  );
  const handleShoppingListChange = useCallback((nextItems) => {
    const updateSeq = updateSeqRef.current + 1;
    updateSeqRef.current = updateSeq;
    const normalizedNextItems = nextItems.map((item, index) => ({
      ...item,
      orderKey: getItemOrderKeyAtIndex(item, index)
    }));
    const changes = getTripItemChanges({
      previousItems: visibleShoppingList,
      nextItems: normalizedNextItems,
      fields: SHOPPING_ITEM_FIELDS
    });
    const previousById = new Map(
      visibleShoppingList.map((item) => [String(item?.id ?? ''), Boolean(item?.purchased)])
    );
    const statusChanges = [];

    normalizedNextItems.forEach((item) => {
      const itemId = String(item?.id ?? '');
      if (!itemId) return;
      const nextPurchased = Boolean(item?.purchased);
      if (previousById.has(itemId) && previousById.get(itemId) !== nextPurchased) {
        statusChanges.push({ itemId, purchased: nextPurchased });
      }
    });

    applyShoppingListPatch?.(normalizedNextItems);
    statusChanges.forEach(({ itemId, purchased }) => {
      void publishShoppingItemStatus?.({ itemId, purchased });
    });

    const fallbackToTripSave = () => {
      if (updateSeqRef.current === updateSeq) {
        setShoppingList(normalizedNextItems);
      }
    };
    const canWriteItemDocs = Boolean(
      tripId &&
      currentUser?.uid &&
      saveTripShoppingItemDocument &&
      deleteTripShoppingItemDocument &&
      moveTripShoppingItemDocument
    );

    if (!canWriteItemDocs) {
      fallbackToTripSave();
      return;
    }

    const operations = [
      ...changes.removed.map((item) => deleteTripShoppingItemDocument({
        tripId,
        item,
        itemId: item.id,
        user: currentUser,
        clientId
      })),
      ...changes.added.map((item) => saveTripShoppingItemDocument({
        tripId,
        item,
        orderKey: getItemOrderKeyAtIndex(item, normalizedNextItems.findIndex((nextItem) => getTripItemId(nextItem) === getTripItemId(item))),
        user: currentUser,
        clientId
      })),
      ...changes.changed
        .filter((item) => getTripItemId(item) !== changes.movedItemId)
        .map((item) => saveTripShoppingItemDocument({
          tripId,
          item,
          orderKey: getItemOrderKeyAtIndex(item, normalizedNextItems.findIndex((nextItem) => getTripItemId(nextItem) === getTripItemId(item))),
          user: currentUser,
          clientId
        }))
    ];

    if (changes.movedItemId) {
      const movedItem = normalizedNextItems.find((item) => getTripItemId(item) === changes.movedItemId);
      if (movedItem) {
        operations.push(moveTripShoppingItemDocument({
          tripId,
          item: movedItem,
          orderKey: getSparseOrderKeyForItem(normalizedNextItems, changes.movedItemId),
          user: currentUser,
          clientId
        }));
      }
    }

    if (!operations.length) return;
    void Promise.all(operations).catch((error) => {
      if (handleDocumentPersistenceError) {
        handleDocumentPersistenceError(error, {
          label: '購物清單更新',
          fallback: fallbackToTripSave,
          deniedLogMessage: 'Shopping item document update denied; skipping root trip autosave fallback.',
          fallbackLogMessage: 'Shopping item document update failed; falling back to full trip autosave.'
        });
        return;
      }
      fallbackToTripSave();
    });
  }, [
    applyShoppingListPatch,
    clientId,
    currentUser,
    deleteTripShoppingItemDocument,
    handleDocumentPersistenceError,
    moveTripShoppingItemDocument,
    publishShoppingItemStatus,
    saveTripShoppingItemDocument,
    setShoppingList,
    tripId,
    visibleShoppingList
  ]);
  const handleShoppingCategoriesChange = useCallback((nextCategoriesValue) => {
    const updateSeq = categoryUpdateSeqRef.current + 1;
    categoryUpdateSeqRef.current = updateSeq;
    const currentCategories = Array.isArray(shoppingCategories) ? shoppingCategories : [];
    const nextValue = typeof nextCategoriesValue === 'function'
      ? nextCategoriesValue(currentCategories)
      : nextCategoriesValue;
    const nextCategories = (Array.isArray(nextValue) ? nextValue : [])
      .map((category) => String(category || '').trim())
      .filter(Boolean);
    const categoryItems = currentCategories.map((name, index) => ({
      id: makeShoppingCategoryId(name),
      name,
      orderKey: getItemOrderKeyAtIndex({ orderKey: (index + 1) * 1000 }, index)
    }));
    const nextCategoryItems = nextCategories.map((name, index) => ({
      id: makeShoppingCategoryId(name),
      name,
      orderKey: getItemOrderKeyAtIndex({ orderKey: (index + 1) * 1000 }, index)
    }));
    const changes = getTripItemChanges({
      previousItems: categoryItems,
      nextItems: nextCategoryItems,
      fields: ['name']
    });

    applyShoppingCategoriesPatch?.(nextCategories);

    const fallbackToTripSave = () => {
      if (categoryUpdateSeqRef.current === updateSeq) {
        setShoppingCategories(nextCategories);
      }
    };
    const canWriteCategoryDocs = Boolean(
      tripId &&
      currentUser?.uid &&
      saveTripShoppingCategoryDocument &&
      deleteTripShoppingCategoryDocument
    );

    if (!canWriteCategoryDocs) {
      fallbackToTripSave();
      return;
    }

    const operations = [
      ...changes.removed.map((category) => deleteTripShoppingCategoryDocument({
        tripId,
        category,
        categoryId: category.id,
        name: category.name,
        user: currentUser,
        clientId
      })),
      ...changes.added.map((category) => saveTripShoppingCategoryDocument({
        tripId,
        category,
        name: category.name,
        orderKey: category.orderKey,
        user: currentUser,
        clientId
      })),
      ...changes.changed.map((category) => saveTripShoppingCategoryDocument({
        tripId,
        category,
        name: category.name,
        orderKey: category.orderKey,
        user: currentUser,
        clientId
      }))
    ];

    if (!operations.length) return;
    void Promise.all(operations).catch((error) => {
      if (handleDocumentPersistenceError) {
        handleDocumentPersistenceError(error, {
          label: '購物分類更新',
          fallback: fallbackToTripSave,
          deniedLogMessage: 'Shopping category document update denied; skipping root trip autosave fallback.',
          fallbackLogMessage: 'Shopping category document update failed; falling back to full trip autosave.'
        });
        return;
      }
      fallbackToTripSave();
    });
  }, [
    applyShoppingCategoriesPatch,
    clientId,
    currentUser,
    deleteTripShoppingCategoryDocument,
    handleDocumentPersistenceError,
    saveTripShoppingCategoryDocument,
    setShoppingCategories,
    shoppingCategories,
    tripId
  ]);

  return (
    <div className="mt-2 pb-20">
      <ShoppingListContent
        ref={shoppingListRef}
        shoppingList={visibleShoppingList}
        shoppingCategories={shoppingCategories}
        onShoppingListChange={handleShoppingListChange}
        onShoppingCategoriesChange={handleShoppingCategoriesChange}
        readOnly={isReadOnly}
        onModalOpenChange={setIsShoppingModalOpen}
      />
    </div>
  );
};

export default ShoppingTab;
