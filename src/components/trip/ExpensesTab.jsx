import React, { useCallback, useRef } from 'react';
import ExpenseTracker from '../ExpenseTracker';
import { useTripWorkspace } from '../../contexts/TripWorkspaceContext';
import { useCollaborationEditing } from '../../hooks/useCollaborationEditing';
import { getEditingMembersForTarget } from '../../utils/presence';
import {
  getItemOrderKeyAtIndex,
  getTripItemChanges,
  getTripItemId
} from '../../utils/tripItemDocuments';
import EditingNotice from './EditingNotice';

const EXPENSE_FIELDS = [
  'title',
  'amount',
  'currency',
  'date',
  'category',
  'payer',
  'splitType',
  'involved',
  'isSettled',
  'note'
];

const ExpensesTab = () => {
  const {
    tripId,
    expenseTrackerRef,
    itinerary,
    expenses,
    applyExpensesPatch,
    setExpenses,
    currentUser,
    clientId,
    canEdit,
    editingByTarget,
    updatePresenceEditingTarget,
    updateRealtimeEditingTarget,
    saveTripExpenseDocument,
    deleteTripExpenseDocument,
    memberTravelers,
    exchangeRate,
    setIsExpenseModalOpen,
    handleDocumentPersistenceError
  } = useTripWorkspace();
  const updateSeqRef = useRef(0);
  const editingTarget = 'expenses:list';
  const {
    getEditingHandlers,
    startEditing,
    stopEditing
  } = useCollaborationEditing({
    canEdit,
    updatePresenceEditingTarget,
    updateRealtimeEditingTarget
  });
  const handleExpensesChange = useCallback((updater) => {
    if (!canEdit) return;
    const updateSeq = updateSeqRef.current + 1;
    updateSeqRef.current = updateSeq;
    const currentExpenses = Array.isArray(expenses) ? expenses : [];
    const nextValue = typeof updater === 'function' ? updater(currentExpenses) : updater;
    const nextExpenses = (Array.isArray(nextValue) ? nextValue : []).map((expense, index) => ({
      ...expense,
      orderKey: getItemOrderKeyAtIndex(expense, index)
    }));
    const changes = getTripItemChanges({
      previousItems: currentExpenses,
      nextItems: nextExpenses,
      fields: EXPENSE_FIELDS
    });

    applyExpensesPatch?.(nextExpenses);

    const fallbackToTripSave = () => {
      if (updateSeqRef.current === updateSeq) {
        setExpenses(nextExpenses);
      }
    };
    const canWriteExpenseDocs = Boolean(
      tripId &&
      currentUser?.uid &&
      saveTripExpenseDocument &&
      deleteTripExpenseDocument
    );

    if (!canWriteExpenseDocs) {
      fallbackToTripSave();
      return;
    }

    const operations = [
      ...changes.removed.map((expense) => deleteTripExpenseDocument({
        tripId,
        expense,
        expenseId: expense.id,
        user: currentUser,
        clientId
      })),
      ...changes.added.map((expense) => saveTripExpenseDocument({
        tripId,
        expense,
        orderKey: getItemOrderKeyAtIndex(expense, nextExpenses.findIndex((item) => getTripItemId(item) === getTripItemId(expense))),
        user: currentUser,
        clientId
      })),
      ...changes.changed.map((expense) => saveTripExpenseDocument({
        tripId,
        expense,
        orderKey: getItemOrderKeyAtIndex(expense, nextExpenses.findIndex((item) => getTripItemId(item) === getTripItemId(expense))),
        user: currentUser,
        clientId
      }))
    ];

    if (!operations.length) return;
    void Promise.all(operations).catch((error) => {
      if (handleDocumentPersistenceError) {
        handleDocumentPersistenceError(error, {
          label: '支出更新',
          fallback: fallbackToTripSave,
          deniedLogMessage: 'Expense document update denied; skipping root trip autosave fallback.',
          fallbackLogMessage: 'Expense document update failed; falling back to full trip autosave.'
        });
        return;
      }
      fallbackToTripSave();
    });
  }, [
    applyExpensesPatch,
    canEdit,
    clientId,
    currentUser,
    deleteTripExpenseDocument,
    expenses,
    handleDocumentPersistenceError,
    saveTripExpenseDocument,
    setExpenses,
    tripId
  ]);
  const handleExpenseModalOpenChange = useCallback((open) => {
    setIsExpenseModalOpen?.(open);
    if (open) {
      startEditing(editingTarget);
      return;
    }
    stopEditing();
  }, [setIsExpenseModalOpen, startEditing, stopEditing]);

  return (
    <div className="mt-2 px-4 pb-20 sm:px-6 lg:px-8" {...getEditingHandlers(editingTarget)}>
      <EditingNotice target={editingTarget} members={getEditingMembersForTarget(editingByTarget, editingTarget)} />
      <ExpenseTracker
        ref={expenseTrackerRef}
        itinerary={itinerary}
        expenses={expenses}
        setExpenses={handleExpensesChange}
        travelers={memberTravelers || []}
        exchangeRate={exchangeRate}
        onModalOpenChange={handleExpenseModalOpenChange}
        readOnly={!canEdit}
      />
    </div>
  );
};

export default ExpensesTab;
