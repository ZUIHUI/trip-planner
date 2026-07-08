import React from 'react';
import {
  BookOpen,
  CheckSquare,
  LayoutDashboard,
  Luggage,
  Plane,
  ReceiptText,
  Settings,
  ShoppingCart,
  UsersRound
} from 'lucide-react';
import InstallAppPrompt from '../InstallAppPrompt';
import { Card } from '../ui';
import { useTripWorkspace } from '../../contexts/TripWorkspaceContext';
import ShareCollaborationCard from './ShareCollaborationCard';
import TripNotificationCard from './TripNotificationCard';
import MobileMockupFrame from './MobileMockupFrame';
import CollaborationActivityList from './CollaborationActivityList';

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
    className="touch-target tp-module-button flex w-full min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-white/90 p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50/70 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-800 dark:hover:bg-slate-800/80"
  >
    <span className="tp-icon-chip h-11 w-11">
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

const MoreTab = ({ onTabChange, onOpenSettings, onOpenHandbook, section = 'home' }) => {
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
    presenceError,
    recentActivities
  } = useTripWorkspace();

  const eventCount = (Array.isArray(itinerary) ? itinerary : [])
    .reduce((total, day) => total + (day.events?.length || 0), 0);
  const onlineCount = presenceUi?.otherOnlineMembers?.length || 0;
  const collaborationCard = (
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
  );

  if (section === 'companions') {
    return (
      <MobileMockupFrame
        icon={UsersRound}
        eyebrow="共享旅程"
        title="旅伴"
        subtitle="邀請成員，查看目前在線旅伴。"
        stats={[
          { value: members?.length || 0, label: '成員' },
          { value: onlineCount, label: '在線' }
        ]}
        tone="teal"
        className="mx-auto flex min-w-0 max-w-4xl flex-col gap-5 px-5 pb-24 sm:gap-6 sm:px-7 lg:max-w-6xl lg:px-10"
      >
        <Card className="p-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="tp-icon-chip h-11 w-11">
              <UsersRound size={20} />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-slate-950 dark:text-white">旅伴與邀請</h2>
            </div>
          </div>
        </Card>
        {collaborationCard}
        <div className="h-2" />
      </MobileMockupFrame>
    );
  }

  return (
    <MobileMockupFrame
      icon={Settings}
      eyebrow="更多"
      title="旅行工具"
      subtitle="從同一個儀表板開啟所有規劃模組。"
      stats={[
        { value: eventCount, label: '行程' },
        { value: members?.length || 0, label: '成員' },
        { value: onlineCount, label: '在線' }
      ]}
      tone="coral"
      className="mx-auto flex min-w-0 max-w-4xl flex-col gap-5 px-5 pb-24 sm:gap-6 sm:px-7 lg:max-w-6xl lg:px-10"
    >
      <ModuleSection title="旅行準備">
        <ModuleButton
          icon={LayoutDashboard}
          title="控制台"
          meta={`${eventCount} 行程`}
          onClick={() => onTabChange?.('summary')}
        />
        <ModuleButton
          icon={Plane}
          title="住宿航班"
          meta={getLogisticsStatus(tripDetails)}
          onClick={() => onTabChange?.('flights')}
        />
        <ModuleButton
          icon={BookOpen}
          title="旅遊手冊"
          meta="PDF"
          onClick={onOpenHandbook}
        />
        <ModuleButton
          icon={CheckSquare}
          title="行前"
          meta={getChecklistStatus(checklists?.preTrip)}
          onClick={() => onTabChange?.('preTrip')}
        />
        <ModuleButton
          icon={Luggage}
          title="行李"
          meta={getChecklistStatus(checklists?.packing, '尚未建立')}
          onClick={() => onTabChange?.('packing')}
        />
      </ModuleSection>

      <ModuleSection title="旅行中工具">
        <ModuleButton
          icon={ReceiptText}
          title="記帳"
          meta={Array.isArray(expenses) && expenses.length ? `${expenses.length} 筆` : '尚未記帳'}
          onClick={() => onTabChange?.('expenses')}
        />
        <ModuleButton
          icon={ShoppingCart}
          title="購物"
          meta="購物清單"
          onClick={() => onTabChange?.('shopping')}
        />
      </ModuleSection>

      <ModuleSection title="旅伴與設定">
        <ModuleButton
          icon={UsersRound}
          title="旅伴與邀請"
          meta={onlineCount ? `${onlineCount} 在線` : `${members?.length || 0} 位旅伴`}
          onClick={() => onTabChange?.('companions')}
        />
        <ModuleButton
          icon={Settings}
          title="設定"
          meta="偏好"
          onClick={onOpenSettings}
        />
      </ModuleSection>

      <ModuleSection title="最近協作">
        <div className="sm:col-span-2">
          <CollaborationActivityList
            activities={recentActivities}
            currentUid={currentUser?.uid || ''}
            limit={5}
            emptyText="旅伴新增或更新行程後，會出現在這裡。"
          />
        </div>
      </ModuleSection>

      <section className="space-y-3" aria-label="提醒與裝置">
        <h2 className="px-1 text-sm font-black text-slate-950 dark:text-white">提醒與裝置</h2>
        <InstallAppPrompt />
        <TripNotificationCard tripId={tripId} currentUser={currentUser} />
      </section>

      <div className="h-2" />
    </MobileMockupFrame>
  );
};

export default MoreTab;
