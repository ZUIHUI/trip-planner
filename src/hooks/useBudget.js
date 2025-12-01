import { useMemo } from 'react';

/**
 * useBudget Hook - 計算預算相關統計
 */
export const useBudget = (itinerary) => {
  const budgetSummary = useMemo(() => {
    const totalEvents = itinerary.reduce((sum, day) => sum + (day.events?.length || 0), 0);
    const totalCost = itinerary.reduce((sum, day) => {
      return sum + (day.events?.reduce((daySum, event) => daySum + (parseInt(event.cost) || 0), 0) || 0);
    }, 0);

    const dailyCosts = itinerary.map(day => ({
      day: day.day,
      date: day.date,
      cost: day.events?.reduce((sum, event) => sum + (parseInt(event.cost) || 0), 0) || 0,
      eventCount: day.events?.filter(e => e.cost).length || 0
    }));

    return {
      totalEvents,
      totalCost,
      dailyCosts,
      averageDailyCost: Math.round(totalCost / itinerary.length) || 0
    };
  }, [itinerary]);

  return budgetSummary;
};
