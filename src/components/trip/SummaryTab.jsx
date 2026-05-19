import React from 'react';
import { useTripWorkspace } from '../../contexts/TripWorkspaceContext';

const FlightSummary = ({ label, colorClass, flight }) => {
  if (!flight?.code) {
    return <p className="text-sm text-gray-400">{`未設定${label}`}</p>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className={`font-bold ${colorClass}`}>{label}</span>
        <span className="font-mono text-gray-800 text-sm">{flight.code}</span>
      </div>
      <p className="text-sm text-gray-600">{flight.airline}</p>
      <p className="text-xs text-gray-500">
        {flight.date}
        {flight.departureTime && ` 起飛: ${flight.departureTime}`}
        {flight.arrivalTime && ` 抵達: ${flight.arrivalTime}`}
      </p>
    </div>
  );
};

const SummaryTab = () => {
  const {
    tripDetails,
    itinerary,
    tripDisplayDates,
    budgetInfo,
    budgetTarget,
    remainingBudget,
    budgetProgress
  } = useTripWorkspace();

  return (
    <div className="px-4 sm:px-6 space-y-4 pb-10">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4">旅程概覽</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="text-center">
            <p className="text-gray-500 text-xs mb-1">旅程期間</p>
            <p className="text-lg font-bold text-gray-800">{tripDisplayDates || '未設定'}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-500 text-xs mb-1">天數</p>
            <p className="text-lg font-bold text-gray-800">{itinerary.length} 天</p>
          </div>
        </div>
      </div>

      {(budgetInfo.totalCost > 0 || budgetTarget > 0) && (
        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-4 rounded-xl border border-blue-200">
          <h3 className="text-lg font-bold text-blue-800 mb-3">💰 旅程預算概覽</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">總花費</span>
              <span className="text-2xl font-bold text-blue-600">{budgetInfo.totalCost.toLocaleString()} 元</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">每日平均</span>
              <span className="text-lg font-bold text-indigo-600">
                {Math.round(budgetInfo.averageDailyCost).toLocaleString()} 元
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-2">共 {budgetInfo.totalEvents} 個活動記錄花費</p>
            {budgetTarget > 0 && (
              <>
                <div className="mt-2 flex justify-between items-center text-sm">
                  <span className="text-gray-600">預算上限</span>
                  <span className="font-bold text-gray-700">{budgetTarget.toLocaleString()} 元</span>
                </div>
                <div className="mt-1 flex justify-between items-center text-sm">
                  <span className="text-gray-600">剩餘預算</span>
                  <span className={`font-bold ${remainingBudget < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {remainingBudget.toLocaleString()} 元
                  </span>
                </div>
                <div className="mt-2">
                  <div className="w-full h-2 rounded-full bg-white/80">
                    <div
                      className={`h-2 rounded-full ${remainingBudget < 0 ? 'bg-red-500' : 'bg-blue-500'}`}
                      style={{ width: `${budgetProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">已使用 {budgetProgress}%</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tripDetails?.accommodation && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-3">🏨 住宿</h3>
          <p className="font-bold text-gray-800">{tripDetails.accommodation.name || '未設定'}</p>
          <p className="text-sm text-gray-500 mb-2">{tripDetails.accommodation.address || '未設定地址'}</p>
          <div className="text-xs text-gray-600 space-y-1 mb-3">
            <p>✓ 入住：{tripDetails.accommodation.checkIn || '未設定'}</p>
            <p>✓ 退住：{tripDetails.accommodation.checkOut || '未設定'}</p>
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-3">✈️ 航班</h3>
        <div className="mb-3">
          <FlightSummary label="去程" colorClass="text-blue-600" flight={tripDetails?.flights?.outbound} />
        </div>
        <div className="border-t border-gray-100 my-3" />
        <FlightSummary label="回程" colorClass="text-indigo-600" flight={tripDetails?.flights?.inbound} />
      </div>
    </div>
  );
};

export default SummaryTab;
