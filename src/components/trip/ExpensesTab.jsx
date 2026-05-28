import React, { useCallback, useRef } from 'react';
import ExpenseTracker from '../ExpenseTracker';
import { useTripWorkspace } from '../../contexts/TripWorkspaceContext';
import {
  getItemOrderKeyAtIndex,
  getTripItemChanges,
  getTripItemId
} from '../../utils/tripItemDocuments';

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
    saveTripExpenseDocument,
    deleteTripExpenseDocument,
    memberTravelers,
    exchangeRate,
    setIsExpenseModalOpen
  } = useTripWorkspace();
  const updateSeqRef = useRef(0);
  const handleExpensesChange = useCallback((updater) => {
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
    void Promise.all(operations).catch(fallbackToTripSave);
  }, [
    applyExpensesPatch,
    clientId,
    currentUser,
    deleteTripExpenseDocument,
    expenses,
    saveTripExpenseDocument,
    setExpenses,
    tripId
  ]);

  return (
    <div className="mt-2 px-4 pb-20 sm:px-6 lg:px-8">
      <ExpenseTracker
        ref={expenseTrackerRef}
        itinerary={itinerary}
        expenses={expenses}
        setExpenses={handleExpensesChange}
        travelers={memberTravelers || []}
        exchangeRate={exchangeRate}
        onModalOpenChange={setIsExpenseModalOpen}
      />
    </div>
  );
};

export default ExpensesTab;
