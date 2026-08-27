import { useMemo } from 'react';
import { buildTripDaySummary } from '../utils/tripDaySummary';

export const useTripDaySummary = ({
  events,
  selectedDayIsoDate,
  tripDetails,
  currentLocation,
  checklists,
  checklistStatusByListId,
  budgetTarget,
  remainingBudget,
  now
} = {}) => useMemo(
  () => buildTripDaySummary({
    events,
    selectedDayIsoDate,
    tripDetails,
    currentLocation,
    checklists,
    checklistStatusByListId,
    budgetTarget,
    remainingBudget,
    now
  }),
  [
    budgetTarget,
    checklistStatusByListId,
    checklists,
    currentLocation,
    events,
    now,
    remainingBudget,
    selectedDayIsoDate,
    tripDetails
  ]
);
