import React from 'react';
import { Bed, CalendarDays, MapPin, Plane, Wallet } from 'lucide-react';
import { Card } from '../ui';
import { useTripWorkspace } from '../../contexts/TripWorkspaceContext';

const emptyText = '未設定';

const SectionHeader = ({ icon: Icon, title, description, iconClass = '' }) => (
  <div className="mb-4 flex items-center gap-3">
    <div className={`tp-icon-chip ${iconClass}`}>
      <Icon size={20} />
    </div>
    <div>
      <h3 className="tp-section-title">{title}</h3>
      <p className="tp-section-subtitle">{description}</p>
    </div>
  </div>
);

const InfoPill = ({ label, value }) => (
  <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/70">
    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</p>
    <p className="mt-0.5 text-sm font-black text-slate-900 dark:text-white">{value || emptyText}</p>
  </div>
);

const FlightSummary = ({ label, colorClass, flight }) => {
  if (!flight?.code) {
    return (
      <div>
        <div className="flex items-center justify-between gap-3">
          <span className={`font-bold ${colorClass}`}>{label}</span>
          <span className="text-sm font-bold text-slate-400">{emptyText}</span>
        </div>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">尚未設定航班資訊</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className={`font-bold ${colorClass}`}>{label}</span>
        <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-100">{flight.code}</span>
      </div>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{flight.airline || emptyText}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {flight.date || emptyText}
        {flight.departureTime && ` 起飛：${flight.departureTime}`}
        {flight.arrivalTime && ` 抵達：${flight.arrivalTime}`}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <InfoPill label="出發機場" value={flight.dep} />
        <InfoPill label="出發航廈" value={flight.depTerminal} />
        <InfoPill label="抵達機場" value={flight.arr} />
        <InfoPill label="抵達航廈" value={flight.arrTerminal} />
      </div>
    </div>
  );
};

const BudgetSummary = ({ budgetInfo, budgetTarget, remainingBudget, budgetProgress }) => {
  const hasBudgetTarget = budgetTarget > 0;
  const hasEstimatedCost = budgetInfo.totalCost > 0;

  return (
    <Card className="order-4 p-4 sm:order-2">
      <SectionHeader
        icon={Wallet}
        title="旅程預算"
        description="預估花費、每日平均與預算使用進度"
        iconClass="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
      />
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">預估總花費</span>
          <span className="text-2xl font-black text-brand-700 dark:text-brand-300">
            {hasEstimatedCost ? `${budgetInfo.totalCost.toLocaleString()} 元` : emptyText}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-slate-500 dark:text-slate-400">每日平均</span>
          <span className="font-bold text-slate-900 dark:text-white">
            {hasEstimatedCost ? `${Math.round(budgetInfo.averageDailyCost).toLocaleString()} 元` : emptyText}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {hasEstimatedCost ? `來自 ${budgetInfo.totalEvents} 個有費用的行程` : '尚未設定行程預估費用'}
        </p>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-slate-500 dark:text-slate-400">預算上限</span>
          <span className="font-bold text-slate-900 dark:text-white">
            {hasBudgetTarget ? `${budgetTarget.toLocaleString()} 元` : emptyText}
          </span>
        </div>
        {hasBudgetTarget && (
          <>
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
    <div className="flex flex-col gap-4 px-4 pb-10 sm:px-6 lg:px-8">
      <Card className="order-1 p-4">
        <SectionHeader
          icon={CalendarDays}
          title="旅程概要"
          description="快速查看旅程日期與規劃天數"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/70">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">旅程日期</p>
            <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">{tripDisplayDates || emptyText}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/70">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">規劃天數</p>
            <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">{itinerary.length} 天</p>
          </div>
        </div>
      </Card>

      <BudgetSummary
        budgetInfo={budgetInfo}
        budgetTarget={budgetTarget}
        remainingBudget={remainingBudget}
        budgetProgress={budgetProgress}
      />

      <div className="order-2 grid gap-4 sm:order-3 lg:grid-cols-2">
        <Card className="order-2 p-4 lg:order-1">
          <SectionHeader
            icon={Bed}
            title="住宿"
            description="入住資訊與住宿地址"
          />
          <p className="font-black text-slate-900 dark:text-white">{tripDetails?.accommodation?.name || emptyText}</p>
          <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-500 dark:text-slate-400">
            <MapPin size={15} className="mt-0.5 shrink-0" />
            <span>{tripDetails?.accommodation?.address || '未設定地址'}</span>
          </p>
          <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
            <p>入住：{tripDetails?.accommodation?.checkIn || emptyText}</p>
            <p>退房：{tripDetails?.accommodation?.checkOut || emptyText}</p>
          </div>
        </Card>

        <Card className="order-1 p-4 lg:order-2">
          <SectionHeader
            icon={Plane}
            title="航班"
            description="去程與回程的時間、機場與航廈"
          />
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
