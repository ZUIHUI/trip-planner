import React from 'react';
import { Bed, CalendarDays, Plane, Wallet } from 'lucide-react';
import { Card } from '../ui';
import { useTripWorkspace } from '../../contexts/TripWorkspaceContext';

const FlightSummary = ({ label, colorClass, flight }) => {
  if (!flight?.code) {
    return <p className="text-sm text-slate-400">{`未設定${label}`}</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className={`font-bold ${colorClass}`}>{label}</span>
        <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-100">{flight.code}</span>
      </div>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{flight.airline || '航空公司未設定'}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {flight.date || '日期未設定'}
        {flight.departureTime && ` 起飛：${flight.departureTime}`}
        {flight.arrivalTime && ` 抵達：${flight.arrivalTime}`}
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
    <div className="space-y-4 px-4 pb-10 sm:px-6 lg:px-8">
      <Card className="p-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="tp-icon-chip">
            <CalendarDays size={20} />
          </div>
          <div>
            <h3 className="tp-section-title">旅程概覽</h3>
            <p className="tp-section-subtitle">目前旅程的日期與天數。</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/70">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">旅程期間</p>
            <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">{tripDisplayDates || '未設定'}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/70">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">天數</p>
            <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">{itinerary.length} 天</p>
          </div>
        </div>
      </Card>

      {(budgetInfo.totalCost > 0 || budgetTarget > 0) && (
        <Card className="p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="tp-icon-chip bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
              <Wallet size={20} />
            </div>
            <div>
              <h3 className="tp-section-title">旅程預算</h3>
              <p className="tp-section-subtitle">預估花費與預算使用狀態。</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">總花費</span>
              <span className="text-2xl font-black text-brand-700 dark:text-brand-300">{budgetInfo.totalCost.toLocaleString()} 元</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-500 dark:text-slate-400">每日平均</span>
              <span className="font-bold text-slate-900 dark:text-white">{Math.round(budgetInfo.averageDailyCost).toLocaleString()} 元</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">共 {budgetInfo.totalEvents} 個活動記錄花費</p>
            {budgetTarget > 0 && (
              <>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-500 dark:text-slate-400">預算上限</span>
                  <span className="font-bold text-slate-900 dark:text-white">{budgetTarget.toLocaleString()} 元</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-500 dark:text-slate-400">剩餘預算</span>
                  <span className={`font-bold ${remainingBudget < 0 ? 'text-red-600 dark:text-red-300' : 'text-emerald-600 dark:text-emerald-300'}`}>
                    {remainingBudget.toLocaleString()} 元
                  </span>
                </div>
                <div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-2 rounded-full ${remainingBudget < 0 ? 'bg-red-500' : 'bg-brand-600'}`}
                      style={{ width: `${budgetProgress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">已使用 {budgetProgress}%</p>
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="tp-icon-chip">
              <Bed size={20} />
            </div>
            <div>
              <h3 className="tp-section-title">住宿</h3>
              <p className="tp-section-subtitle">入住、退房與地址。</p>
            </div>
          </div>
          <p className="font-black text-slate-900 dark:text-white">{tripDetails?.accommodation?.name || '未設定'}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tripDetails?.accommodation?.address || '未設定地址'}</p>
          <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
            <p>入住：{tripDetails?.accommodation?.checkIn || '未設定'}</p>
            <p>退房：{tripDetails?.accommodation?.checkOut || '未設定'}</p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="tp-icon-chip">
              <Plane size={20} />
            </div>
            <div>
              <h3 className="tp-section-title">航班</h3>
              <p className="tp-section-subtitle">去程與回程資訊。</p>
            </div>
          </div>
          <div className="space-y-4">
            <FlightSummary label="去程" colorClass="text-sky-700 dark:text-sky-300" flight={tripDetails?.flights?.outbound} />
            <div className="border-t border-slate-100 dark:border-slate-800" />
            <FlightSummary label="回程" colorClass="text-brand-700 dark:text-brand-300" flight={tripDetails?.flights?.inbound} />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SummaryTab;
