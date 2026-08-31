import React from 'react';
import {
  BookOpen,
  CheckSquare,
  ChevronRight,
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

const ModuleButton = ({ icon: Icon, title, description, meta, tone = 'neutral', onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`touch-target tp-module-button tp-v4-module-entry tp-v4-module-${tone}`}
  >
    <span className="tp-icon-chip tp-v4-module-icon">
      <Icon size={20} />
    </span>
    <span className="tp-v4-module-copy">
      <span className="tp-v4-module-title">{title}</span>
      {description && <span className="tp-v4-module-description">{description}</span>}
    </span>
    <span className="tp-v4-module-footer">
      {meta && <span>{meta}</span>}
      <ChevronRight size={16} aria-hidden="true" />
    </span>
  </button>
);

const ModuleSection = ({ title, children }) => (
  <section className="tp-v4-module-section">
    <h2>{title}</h2>
    <div className="tp-v4-module-grid">
      {children}
    </div>
  </section>
);

const MoreTab = ({ onTabChange, onOpenSettings, onOpenHandbook, section = 'home' }) => {
  const {
    tripId,
    tripDetails,
    itinerary,
    checklists,
    expenses,
    budgetProgress,
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
  const preTripProgress = getChecklistProgress(checklists?.preTrip);
  const packingProgress = getChecklistProgress(checklists?.packing);
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
        tone="success"
        className="mx-auto flex min-w-0 max-w-4xl flex-col gap-5 px-5 pb-24 sm:gap-6 sm:px-7 lg:max-w-6xl lg:px-10"
      >
        <Card className="p-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="tp-icon-chip h-11 w-11">
              <UsersRound size={20} />
            </span>
            <div className="min-w-0">
              <h2 className="tp-module-card-title">旅伴與邀請</h2>
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
      tone="primary"
      className="mx-auto flex min-w-0 max-w-4xl flex-col gap-5 px-5 pb-24 sm:gap-6 sm:px-7 lg:max-w-6xl lg:px-10"
    >
      <section className="tp-v4-module-summary" aria-label="旅程管理摘要">
        <div>
          <span>TRIP CONTROL</span>
          <h2>{tripDetails?.title || '我的旅程'}</h2>
          <p>{presenceUi?.summaryText || '已同步'} · {members?.length || 0} 位旅伴</p>
        </div>
        <div className="tp-v4-module-summary-stats">
          <div><strong>{preTripProgress.remaining}</strong><span>待辦</span></div>
          <div><strong>{packingProgress.done}/{packingProgress.total}</strong><span>行李</span></div>
          <div><strong>{budgetProgress || 0}%</strong><span>預算</span></div>
        </div>
      </section>

      <ModuleSection title="旅行準備">
        <ModuleButton
          icon={LayoutDashboard}
          title="旅程控制台"
          description="日期、住宿與旅程摘要"
          meta={`${eventCount} 行程`}
          tone="neutral"
          onClick={() => onTabChange?.('summary')}
        />
        <ModuleButton
          icon={Plane}
          title="航班與住宿"
          description="航班資料、住宿地址"
          meta={getLogisticsStatus(tripDetails)}
          tone="info"
          onClick={() => onTabChange?.('flights')}
        />
        <ModuleButton
          icon={CheckSquare}
          title="行前準備"
          description="票券、預約與提醒"
          meta={getChecklistStatus(checklists?.preTrip)}
          tone="success"
          onClick={() => onTabChange?.('preTrip')}
        />
        <ModuleButton
          icon={Luggage}
          title="行李清單"
          description="分類、數量與完成度"
          meta={getChecklistStatus(checklists?.packing, '尚未建立')}
          tone="neutral"
          onClick={() => onTabChange?.('packing')}
        />
      </ModuleSection>

      <ModuleSection title="共同工具">
        <ModuleButton
          icon={ReceiptText}
          title="支出與預算"
          description="共同分帳、預算與匯率"
          meta={Array.isArray(expenses) && expenses.length ? `${expenses.length} 筆` : '尚未記帳'}
          tone="primary"
          onClick={() => onTabChange?.('expenses')}
        />
        <ModuleButton
          icon={ShoppingCart}
          title="購物清單"
          description="店家、照片與備註"
          meta="共同清單"
          tone="warning"
          onClick={() => onTabChange?.('shopping')}
        />
        <ModuleButton
          icon={UsersRound}
          title="旅伴與分享"
          description="邀請碼、權限與在線狀態"
          meta={onlineCount ? `${onlineCount} 在線` : `${members?.length || 0} 位旅伴`}
          tone="success"
          onClick={() => onTabChange?.('companions')}
        />
        <ModuleButton
          icon={Settings}
          title="設定"
          description="主題、GPS 與介面偏好"
          meta="個人化"
          tone="neutral"
          onClick={onOpenSettings}
        />
      </ModuleSection>

      <ModuleSection title="旅程文件">
        <ModuleButton
          icon={BookOpen}
          title="旅遊手冊"
          description="整理旅程內容並匯出 PDF"
          meta="PDF"
          tone="info"
          onClick={onOpenHandbook}
        />
      </ModuleSection>

      <Card as="section" className="p-4" aria-label="協作活動">
        <CollaborationActivityList
          activities={recentActivities}
          currentUid={currentUser?.uid || ''}
          limit={5}
          emptyText="旅伴新增或更新行程後，會出現在這裡。"
        />
      </Card>

      <section className="space-y-3" aria-label="提醒與裝置">
        <h2 className="tp-module-section-title">提醒與裝置</h2>
        <InstallAppPrompt />
        <TripNotificationCard tripId={tripId} currentUser={currentUser} />
      </section>

      <div className="h-2" />
    </MobileMockupFrame>
  );
};

export default MoreTab;
