import React from 'react';
import {
  CheckSquare,
  LayoutDashboard,
  Luggage,
  Plane,
  ReceiptText,
  Settings,
  ShoppingCart,
  UsersRound
} from 'lucide-react';
import { Card } from '../ui';
import { useTripWorkspace } from '../../contexts/TripWorkspaceContext';
import ShareCollaborationCard from './ShareCollaborationCard';

const getChecklistProgress = (items = []) => {
  const safeItems = Array.isArray(items) ? items : [];
  const done = safeItems.filter((item) => item.done).length;
  const total = safeItems.length;

  return {
    total,
    done,
    remaining: Math.max(total - done, 0)
  };
};

const getChecklistStatus = (items = [], emptyText = '尚未建立') => {
  const progress = getChecklistProgress(items);
  if (!progress.total) return emptyText;
  if (!progress.remaining) return '已完成';
  return `${progress.remaining} 項未完成`;
};

const getLogisticsStatus = (tripDetails = {}) => {
  const accommodation = tripDetails?.accommodation || {};
  const flights = tripDetails?.flights || {};
  const hasStay = Boolean(accommodation.name || accommodation.address);
  const flightCount = [flights.outbound?.code, flights.inbound?.code].filter(Boolean).length;

  if (hasStay && flightCount) return `住宿 + ${flightCount} 段航班`;
  if (hasStay) return '已填住宿';
  if (flightCount) return `${flightCount} 段航班`;
  return '尚未補齊';
};

const ModuleButton = ({ icon: Icon, title, meta, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="touch-target flex w-full min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-brand-200 hover:bg-brand-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-800 dark:hover:bg-brand-950/25"
  >
    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-200">
      <Icon size={20} />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-black text-slate-950 dark:text-white">{title}</span>
    </span>
    {meta && (
      <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        {meta}
      </span>
    )}
  </button>
);

const ModuleSection = ({ title, children }) => (
  <Card className="p-4">
    <h2 className="text-sm font-black text-slate-950 dark:text-white">{title}</h2>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {children}
    </div>
  </Card>
);

const MoreTab = ({ onTabChange, onOpenSettings }) => {
  const {
    tripId,
    tripDetails,
    itinerary,
    checklists,
    expenses,
    collaboration,
    setCollaboration,
    currentUser,
    userProfile,
    updateDisplayName,
    isSharedSession,
    accessRole,
    members,
    onlineMembers,
    presenceByUid,
    presenceUi,
    presenceError
  } = useTripWorkspace();

  const eventCount = (Array.isArray(itinerary) ? itinerary : [])
    .reduce((total, day) => total + (day.events?.length || 0), 0);
  const onlineCount = presenceUi?.otherOnlineMembers?.length || 0;

  return (
    <div className="mx-auto flex min-w-0 max-w-3xl flex-col gap-4 px-4 pb-20 sm:px-6 lg:max-w-5xl lg:px-8">
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-black uppercase tracking-wide text-brand-700 dark:text-brand-300">更多工具</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">更多</h1>
      </div>

      <ModuleSection title="旅行準備">
        <ModuleButton
          icon={LayoutDashboard}
          title="控制台"
          description="檢查旅程資料、下一步與整體進度。"
          meta={`${eventCount} 行程`}
          onClick={() => onTabChange?.('summary')}
        />
        <ModuleButton
          icon={Plane}
          title="住宿航班"
          description="日期、住宿地址、去回程航班與交通資訊。"
          meta={getLogisticsStatus(tripDetails)}
          onClick={() => onTabChange?.('flights')}
        />
        <ModuleButton
          icon={CheckSquare}
          title="行前"
          description="票券、文件、保險、簽證和出發前待辦。"
          meta={getChecklistStatus(checklists?.preTrip)}
          onClick={() => onTabChange?.('preTrip')}
        />
        <ModuleButton
          icon={Luggage}
          title="行李"
          description="打包清單、行李分配與尚未打包項目。"
          meta={getChecklistStatus(checklists?.packing, '尚未建立')}
          onClick={() => onTabChange?.('packing')}
        />
      </ModuleSection>

      <ModuleSection title="旅行中工具">
        <ModuleButton
          icon={ReceiptText}
          title="記帳"
          description="記錄支出、查看預算與分帳。"
          meta={Array.isArray(expenses) && expenses.length ? `${expenses.length} 筆` : '尚未記帳'}
          onClick={() => onTabChange?.('expenses')}
        />
        <ModuleButton
          icon={ShoppingCart}
          title="購物"
          description="伴手禮、藥妝、購物清單與待買項目。"
          meta="購物清單"
          onClick={() => onTabChange?.('shopping')}
        />
      </ModuleSection>

      <ModuleSection title="旅伴與設定">
        <ModuleButton
          icon={UsersRound}
          title="旅伴與邀請"
          description="查看旅伴、在線狀態、邀請碼與我的顯示名稱。"
          meta={onlineCount ? `${onlineCount} 在線` : `${members?.length || 0} 位旅伴`}
          onClick={() => document.getElementById('trip-collaboration-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        />
        <ModuleButton
          icon={Settings}
          title="設定"
          description="主題、顯示大小、GPS、匯率與封面。"
          meta="偏好"
          onClick={onOpenSettings}
        />
      </ModuleSection>

      <div id="trip-collaboration-card" className="scroll-mt-24">
        <ShareCollaborationCard
          tripId={tripId}
          collaboration={collaboration}
          setCollaboration={setCollaboration}
          currentUser={currentUser}
          userProfile={userProfile}
          updateDisplayName={updateDisplayName}
          isSharedSession={isSharedSession}
          accessRole={accessRole}
          members={members}
          onlineMembers={onlineMembers}
          presenceByUid={presenceByUid}
          presenceError={presenceError}
        />
      </div>

      <div className="h-2" />
    </div>
  );
};

export default MoreTab;
