import React from 'react';
import ExpenseTracker from '../ExpenseTracker';
import { useTripWorkspace } from '../../contexts/TripWorkspaceContext';

const ExpensesTab = () => {
  const {
    expenseTrackerRef,
    itinerary,
    expenses,
    setExpenses,
    tripDetails,
    exchangeRate,
    setIsExpenseModalOpen
  } = useTripWorkspace();

  return (
    <div className="mt-2 px-4 pb-20 sm:px-6 lg:px-8">
      <ExpenseTracker
        ref={expenseTrackerRef}
        itinerary={itinerary}
        expenses={expenses}
        setExpenses={setExpenses}
        travelers={tripDetails?.travelers || []}
        exchangeRate={exchangeRate}
        onModalOpenChange={setIsExpenseModalOpen}
      />
    </div>
  );
};

export default ExpensesTab;
