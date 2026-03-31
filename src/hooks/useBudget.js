import { useMemo } from 'react';

/**
 * useBudget Hook - 計算預算相關統計
 */
export const useBudget = (itinerary = [], expenses = [], exchangeRate = 1) => {
  const budgetSummary = useMemo(() => {
    const safeItinerary = Array.isArray(itinerary) ? itinerary : [];
    const safeExpenses = Array.isArray(expenses) ? expenses : [];

    const totalEvents = safeExpenses.length;

    const totalCost = safeExpenses.reduce((sum, expense) => {
      const amount = Number(expense?.amount) || 0;
      const convertedAmount = expense?.currency === 'JPY' ? Math.round(amount * exchangeRate) : amount;
      return sum + convertedAmount;
    }, 0);

    const dailyExpenseMap = safeExpenses.reduce((map, expense) => {
      const date = expense?.date || '未分類日期';
      const amount = Number(expense?.amount) || 0;
      const convertedAmount = expense?.currency === 'JPY' ? Math.round(amount * exchangeRate) : amount;

      if (!map[date]) {
        map[date] = {
          date,
          cost: 0,
          eventCount: 0
        };
      }

      map[date].cost += convertedAmount;
      map[date].eventCount += 1;
      return map;
    }, {});

    const dailyCosts = safeItinerary.map(day => ({
      day: day.day,
      date: day.date,
      cost: dailyExpenseMap[day.date]?.cost || 0,
      eventCount: dailyExpenseMap[day.date]?.eventCount || 0
    }));

    return {
      totalEvents,
      totalCost,
      dailyCosts,
      averageDailyCost: safeItinerary.length > 0 ? Math.round(totalCost / safeItinerary.length) : 0
    };
  }, [itinerary, expenses, exchangeRate]);

  return budgetSummary;
};
