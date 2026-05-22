import React, { useMemo } from 'react';
import {
  AlertTriangle,
  Bed,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  Clock,
  Info,
  Luggage,
  MapPin,
  Navigation,
  Plane,
  Plus,
  ReceiptText,
  ShoppingCart,
  UsersRound,
  Wallet
} from 'lucide-react';
import { Badge, Button, Card, EmptyState } from '../ui';
import { useTripWorkspace } from '../../contexts/TripWorkspaceContext';

const emptyText = '未設定';
const eventTypeLabels = {
  flight: '航班',
  transport: '交通',
  accommodation: '住宿',
  sightseeing: '景點',
  food: '餐廳',
  shopping: '購物',
  activity: '活動',
  other: '其他'
};

const getLocationText = (event) => {
  if (!event) return '';
  if (typeof event.location === 'string') return event.location;
  return event.location?.address || event.location?.name || event.locationPlace?.address || event.locationPlace?.name || '';
};

const getSummaryNextEvent = (itinerary = [], selectedDay = 1) => {
  const day = itinerary.find((item) => item.day === selectedDay) || itinerary[0] || null;
  const events = [...(day?.events || [])].sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));

  if (!day || events.length === 0) {
    return { day, event: null };
  }

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const nextEvent = events.find((event) => String(event.time || '') > currentTime) || events[0];

  return { day, event: nextEvent };
};

const getChecklistProgress = (items = []) => {
  const safeItems = Array.isArray(items) ? items : [];
  const done = safeItems.filter((item) => item.done).length;
  const total = safeItems.length;

  return {
    total,
    done,
    remaining: Math.max(total - done, 0),
    percent: total ? Math.round((done / total) * 100) : 0
  };
};

const getReadinessItems = ({
  tripDetails = {},
  itinerary = [],
  checklists = {},
  budgetTarget = 0,
  remainingBudget = 0
}) => {
  const items = [];
  const dateRange = tripDetails?.dateRange || {};
  const accommodation = tripDetails?.accommodation || {};
  const outbound = tripDetails?.flights?.outbound || {};
  const inbound = tripDetails?.flights?.inbound || {};
  const preTripProgress = getChecklistProgress(checklists.preTrip);
  const packingProgress = getChecklistProgress(checklists.packing);
  const totalEvents = itinerary.reduce((sum, day) => sum + (day.events?.length || 0), 0);

  if (!dateRange.start || !dateRange.end) {
    items.push({
      id: 'dates',
      title: '缺旅程日期',
      description: '設定開始與結束日。',
      tabId: 'flights',
      actionLabel: '補日期',
      tone: 'warning'
    });
  }

  if (!accommodation.address && !accommodation.name) {
    items.push({
      id: 'accommodation',
      title: '未填住宿',
      description: '補住宿名稱或地址。',
      tabId: 'flights',
      actionLabel: '補住宿',
      tone: 'warning'
    });
  }

  if (!outbound.code) {
    items.push({
      id: 'outbound-flight',
      title: '缺去程航班',
      description: '補去程航班。',
      tabId: 'flights',
      actionLabel: '補航班',
      tone: 'warning'
    });
  }

  if (!inbound.code) {
    items.push({
      id: 'inbound-flight',
      title: '缺回程航班',
      description: '補回程資料。',
      tabId: 'flights',
      actionLabel: '補航班',
      tone: 'warning'
    });
  }

  if (totalEvents === 0) {
    items.push({
      id: 'itinerary',
      title: '尚無行程',
      description: '新增第一個行程。',
      tabId: 'itinerary',
      actionLabel: '排行程',
      tone: 'info'
    });
  }

  if (budgetTarget > 0 && remainingBudget < 0) {
    items.push({
      id: 'budget',
      title: '預算已超出',
      description: `超出 ${Math.abs(remainingBudget).toLocaleString()} 元。`,
      tabId: 'expenses',
      actionLabel: '看記帳',
      tone: 'danger'
    });
  }

  if (preTripProgress.total === 0) {
    items.push({
      id: 'pretrip-empty',
      title: '行前待辦未建立',
      description: '建立出發前待辦。',
      tabId: 'preTrip',
      actionLabel: '看行前',
      tone: 'info'
    });
  } else if (preTripProgress.remaining > 0) {
    items.push({
      id: 'pretrip',
      title: '行前待辦未完成',
      description: `還有 ${preTripProgress.remaining} 項。`,
      tabId: 'preTrip',
      actionLabel: '去勾選',
      tone: 'info'
    });
  }

  if (packingProgress.total === 0) {
    items.push({
      id: 'packing-empty',
      title: '行李清單未建立',
      description: '建立行李清單。',
      tabId: 'packing',
      actionLabel: '看行李',
      tone: 'info'
    });
  } else if (packingProgress.remaining > 0) {
    items.push({
      id: 'packing',
      title: '行李尚未打包完成',
      description: `還有 ${packingProgress.remaining} 項。`,
      tabId: 'packing',
      actionLabel: '去打包',
      tone: 'info'
    });
  }

  return items;
};

const toneClasses = {
  danger: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300',
  info: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/70 dark:bg-sky-950/30 dark:text-sky-300',
  warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200'
};

const SectionHeader = ({ icon: Icon, title, description, iconClass = '', action }) => (
  <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
    <div className="flex min-w-0 items-center gap-3">
      <div className={`tp-icon-chip ${iconClass}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <h3 className="tp-section-title">{title}</h3>
        {description && <p className="tp-section-subtitle mt-1 hidden sm:block">{description}</p>}
      </div>
    </div>
    {action}
  </div>
);

const InfoPill = ({ label, value }) => (
  <div className="min-w-0 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/70">
    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</p>
    <p className="mt-0.5 truncate text-sm font-black text-slate-900 dark:text-white" title={value || emptyText}>
      {value || emptyText}
    </p>
  </div>
);

const CommandCenterCard = ({
  tripDetails,
  itinerary,
  placePool,
  budgetProgress,
  onTabChange,
  onAddEvent
}) => {
  const dateRange = tripDetails?.dateRange || {};
  const accommodation = tripDetails?.accommodation || {};
  const flights = tripDetails?.flights || {};
  const totalEvents = itinerary.reduce((sum, day) => sum + (day.events?.length || 0), 0);
  const safePlacePool = Array.isArray(placePool) ? placePool : [];
  const steps = [
    {
      id: 'dates',
      label: '日期',
      done: Boolean(dateRange.start && dateRange.end),
      action: () => onTabChange?.('flights')
    },
    {
      id: 'logistics',
      label: '住宿航班',
      done: Boolean((accommodation.name || accommodation.address) && (flights.outbound?.code || flights.inbound?.code)),
      action: () => onTabChange?.('flights')
    },
    {
      id: 'ideas',
      label: '想去清單',
      done: safePlacePool.length > 0 || totalEvents > 0,
      action: () => onTabChange?.('ideas')
    },
    {
      id: 'itinerary',
      label: '每日行程',
      done: totalEvents > 0,
      action: onAddEvent
    }
  ];
  const completedSteps = steps.filter((step) => step.done).length;
  const progress = Math.round((completedSteps / steps.length) * 100);
  const nextStep = steps.find((step) => !step.done);

  return (
    <Card className="order-0 overflow-hidden p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={progress >= 75 ? 'success' : 'info'}>{progress}% 就緒</Badge>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {completedSteps}/{steps.length} 個關鍵資料
            </span>
          </div>
          <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">規劃總覽</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
            {nextStep ? `下一步：補齊${nextStep.label}` : '資料已就緒。'}
          </p>
        </div>

        <div className="grid min-w-0 gap-3 sm:grid-cols-[1fr_auto] lg:w-[420px]">
          <div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
              <div className="h-2 rounded-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {steps.map((step) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={step.action}
                  className={`rounded-lg border px-3 py-2 text-left text-xs font-black transition ${
                    step.done
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-800 dark:hover:bg-brand-950/25'
                  }`}
                >
                  {step.done ? '完成' : '待補'} · {step.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:w-44 sm:grid-cols-1">
            <InfoPill label="行程" value={`${totalEvents} 個`} />
            <InfoPill label="想去" value={`${safePlacePool.length} 個`} />
            <InfoPill label="預算" value={budgetProgress ? `${budgetProgress}%` : '未設定'} />
          </div>
        </div>
      </div>
    </Card>
  );
};

const NextStepCard = ({ nextSummary, onAddEvent, onOpenMaps, onTabChange }) => {
  const { day, event } = nextSummary;
  const locationText = getLocationText(event);

  return (
    <Card className="order-1 overflow-hidden p-4">
      <SectionHeader
        icon={Navigation}
        title="下一步"
        description={day ? `${day.title || `Day ${day.day}`} · ${day.date || ''}` : '目前沒有可顯示的日期'}
        iconClass="bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
      />

      {event ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-brand-100 bg-brand-50 p-4 dark:border-brand-900/60 dark:bg-brand-950/25">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="info">{eventTypeLabels[event.type] || '行程'}</Badge>
                  <span className="inline-flex items-center gap-1 text-sm font-black text-brand-700 dark:text-brand-300">
                    <Clock size={14} />
                    {event.time || '--:--'}
                  </span>
                </div>
                <h3 className="mt-2 break-words text-xl font-black leading-tight text-slate-950 dark:text-white">
                  {event.title || '未命名行程'}
                </h3>
                {locationText && (
                  <p className="mt-2 flex items-start gap-1.5 break-words text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <MapPin size={15} className="mt-0.5 shrink-0" />
                    <span>{locationText}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Button onClick={() => onTabChange?.('itinerary')} className="w-full">
              查看行程
            </Button>
            {locationText && (
              <Button
                variant="secondary"
                onClick={() => onOpenMaps?.('', event.locationPlace || event.location)}
                className="w-full"
              >
                <MapPin size={16} />
                開地圖
              </Button>
            )}
            <Button variant="ghost" onClick={onAddEvent} className="w-full">
              <Plus size={16} />
              新增
            </Button>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={CalendarDays}
          title="目前尚無行程"
          description="新增第一個行程。"
          actionLabel="新增行程"
          onAction={onAddEvent}
          className="py-6"
        />
      )}
    </Card>
  );
};

const ReadinessCard = ({ items, onTabChange }) => (
  <Card className="order-2 p-4 lg:order-3">
    <SectionHeader
      icon={AlertTriangle}
      title="需要處理"
      description="先補必要資料。"
      iconClass={items.length ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'}
    />

    {items.length === 0 ? (
      <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200">
        <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-black">目前看起來都準備好了</p>
          <p className="mt-1 text-sm font-semibold text-emerald-700/80 dark:text-emerald-200/75">
            直接開始。
          </p>
        </div>
      </div>
    ) : (
      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onTabChange?.(item.tabId)}
            className={`flex w-full min-w-0 items-start justify-between gap-3 rounded-lg border p-3 text-left transition hover:shadow-sm ${toneClasses[item.tone] || toneClasses.info}`}
          >
            <span className="min-w-0">
              <span className="block font-black">{item.title}</span>
              <span className="mt-1 block text-sm font-semibold opacity-85">{item.description}</span>
            </span>
            <span className="shrink-0 rounded-full bg-white/70 px-2.5 py-1 text-xs font-black dark:bg-slate-950/30">
              {item.actionLabel}
            </span>
          </button>
        ))}
      </div>
    )}
  </Card>
);

const QuickActionsCard = ({ onTabChange, onAddEvent }) => {
  const actions = [
    { label: '新增行程', icon: Plus, onClick: onAddEvent, primary: true },
    { label: '大家想去', icon: MapPin, tabId: 'ideas' },
    { label: '補旅程資訊', icon: Info, tabId: 'flights' },
    { label: '行前待辦', icon: CheckSquare, tabId: 'preTrip' },
    { label: '行李清單', icon: Luggage, tabId: 'packing' },
    { label: '記帳', icon: ReceiptText, tabId: 'expenses' },
    { label: '購物清單', icon: ShoppingCart, tabId: 'shopping' }
  ];

  return (
    <Card className="order-3 p-4 lg:order-2">
      <SectionHeader
        icon={Plus}
        title="快速操作"
        description="常用入口。"
        iconClass="bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300"
      />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map(({ label, icon: Icon, tabId, onClick, primary }) => (
          <button
            key={label}
            type="button"
            onClick={onClick || (() => onTabChange?.(tabId))}
            className={`min-h-16 rounded-lg border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
              primary
                ? 'border-brand-500 bg-brand-600 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand-800 dark:hover:bg-brand-950/25'
            }`}
          >
            <span className="flex items-center gap-2 font-black">
              <Icon size={17} />
              {label}
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
};

const RealtimeActivityCard = ({ presenceUi, presenceError }) => {
  const others = presenceUi?.otherOnlineMembers || [];
  const selfOnline = Boolean(presenceUi?.selfOnline);

  return (
    <Card className="order-4 p-4">
      <SectionHeader
        icon={UsersRound}
        title="即時動態"
        description="旅伴在線狀態。"
        iconClass="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
      />

      {presenceError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
          在線狀態暫時無法顯示，旅程內容仍可正常使用。
        </div>
      ) : others.length ? (
        <div className="grid gap-2">
          {others.map((person) => (
            <div key={person.uid} className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/70">
              <div className="flex min-w-0 items-center gap-2">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50 text-xs font-black text-brand-700 dark:bg-brand-950/50 dark:text-brand-200">
                  {person.photoURL ? (
                    <img src={person.photoURL} alt={person.name} className="h-full w-full object-cover" />
                  ) : (
                    person.initials
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900 dark:text-white">{person.name}</p>
                  <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {person.detailText || '在線'}
                  </p>
                </div>
              </div>
              <Badge variant={person.editingLabel ? 'success' : 'info'}>{person.editingLabel || person.tabLabel}</Badge>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-500 dark:bg-slate-800/70 dark:text-slate-300">
          {selfOnline ? '目前只有你在線。' : '目前沒有旅伴在線。'}
        </div>
      )}
    </Card>
  );
};

const TripOverviewCard = ({ tripDisplayDates, itinerary, onTabChange }) => (
  <Card className="order-4 p-4">
    <SectionHeader
      icon={CalendarDays}
      title="旅程概要"
      description="日期與規劃天數。"
      action={(
        <Button variant="ghost" size="sm" onClick={() => onTabChange?.('itinerary')} className="shrink-0">
          查看行程
        </Button>
      )}
    />
    <div className="grid gap-3 sm:grid-cols-2">
      <InfoPill label="旅程日期" value={tripDisplayDates} />
      <InfoPill label="規劃天數" value={itinerary.length ? `${itinerary.length} 天` : emptyText} />
    </div>
  </Card>
);

const BudgetSummary = ({ budgetInfo, budgetTarget, remainingBudget, budgetProgress, onTabChange }) => {
  const hasBudgetTarget = budgetTarget > 0;
  const hasExpense = budgetInfo.totalCost > 0;

  return (
    <Card className="order-5 p-4">
      <SectionHeader
        icon={Wallet}
        title="旅程預算"
        description="實際記帳與預算使用。"
        iconClass="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
        action={(
          <Button variant="ghost" size="sm" onClick={() => onTabChange?.('expenses')} className="shrink-0">
            查看記帳
          </Button>
        )}
      />
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">已記帳</span>
          <span className="text-2xl font-black text-brand-700 dark:text-brand-300">
            {hasExpense ? `${budgetInfo.totalCost.toLocaleString()} 元` : emptyText}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-slate-500 dark:text-slate-400">每日平均</span>
          <span className="font-bold text-slate-900 dark:text-white">
            {hasExpense ? `${Math.round(budgetInfo.averageDailyCost).toLocaleString()} 元` : emptyText}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {hasExpense ? `來自 ${budgetInfo.totalEvents} 筆支出` : '尚未新增記帳資料'}
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
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
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

const AccommodationCard = ({ accommodation, onTabChange }) => (
  <Card className="p-4">
    <SectionHeader
      icon={Bed}
      title="住宿"
      description="住宿地址與入住時間。"
      action={(
        <Button variant="ghost" size="sm" onClick={() => onTabChange?.('flights')} className="shrink-0">
          編輯
        </Button>
      )}
    />
    <p className="break-words font-black text-slate-900 dark:text-white">{accommodation?.name || emptyText}</p>
    <p className="mt-2 flex items-start gap-1.5 break-words text-sm text-slate-500 dark:text-slate-400">
      <MapPin size={15} className="mt-0.5 shrink-0" />
      <span>{accommodation?.address || '尚未設定地址'}</span>
    </p>
    <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
      <p>入住：{accommodation?.checkIn || emptyText}</p>
      <p>退房：{accommodation?.checkOut || emptyText}</p>
    </div>
  </Card>
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

const FlightsCard = ({ flights, onTabChange }) => (
  <Card className="p-4">
    <SectionHeader
      icon={Plane}
      title="航班"
      description="去程與回程時間。"
      action={(
        <Button variant="ghost" size="sm" onClick={() => onTabChange?.('flights')} className="shrink-0">
          編輯
        </Button>
      )}
    />
    <div className="space-y-4">
      <FlightSummary label="去程" colorClass="text-sky-700 dark:text-sky-300" flight={flights?.outbound} />
      <div className="border-t border-slate-100 dark:border-slate-800" />
      <FlightSummary label="回程" colorClass="text-brand-700 dark:text-brand-300" flight={flights?.inbound} />
    </div>
  </Card>
);

const SummaryTab = ({ onTabChange, onAddEvent }) => {
  const {
    tripDetails,
    itinerary,
    selectedDay,
    tripDisplayDates,
    checklists,
    budgetInfo,
    budgetTarget,
    remainingBudget,
    budgetProgress,
    placePool,
    presenceUi,
    presenceError,
    handleOpenGoogleMaps
  } = useTripWorkspace();

  const nextSummary = useMemo(
    () => getSummaryNextEvent(itinerary, selectedDay),
    [itinerary, selectedDay]
  );

  const readinessItems = useMemo(
    () => getReadinessItems({ tripDetails, itinerary, checklists, budgetTarget, remainingBudget }),
    [tripDetails, itinerary, checklists, budgetTarget, remainingBudget]
  );

  return (
    <div className="flex min-w-0 flex-col gap-4 px-4 pb-10 sm:px-6 lg:px-8">
      <CommandCenterCard
        tripDetails={tripDetails}
        itinerary={itinerary}
        placePool={placePool}
        budgetProgress={budgetProgress}
        onTabChange={onTabChange}
        onAddEvent={onAddEvent}
      />

      <NextStepCard
        nextSummary={nextSummary}
        onAddEvent={onAddEvent}
        onOpenMaps={handleOpenGoogleMaps}
        onTabChange={onTabChange}
      />

      <ReadinessCard items={readinessItems} onTabChange={onTabChange} />

      <QuickActionsCard onTabChange={onTabChange} onAddEvent={onAddEvent} />

      <RealtimeActivityCard presenceUi={presenceUi} presenceError={presenceError} />

      <TripOverviewCard
        tripDisplayDates={tripDisplayDates}
        itinerary={itinerary}
        onTabChange={onTabChange}
      />

      <BudgetSummary
        budgetInfo={budgetInfo}
        budgetTarget={budgetTarget}
        remainingBudget={remainingBudget}
        budgetProgress={budgetProgress}
        onTabChange={onTabChange}
      />

      <div className="order-6 grid gap-4 lg:grid-cols-2">
        <AccommodationCard
          accommodation={tripDetails?.accommodation}
          onTabChange={onTabChange}
        />
        <FlightsCard
          flights={tripDetails?.flights}
          onTabChange={onTabChange}
        />
      </div>
    </div>
  );
};

export default SummaryTab;
