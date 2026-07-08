import React from 'react';
import { motion } from 'motion/react';
import { Clock3 } from 'lucide-react';
import { Badge } from '../ui';

const readActivityTime = (activity = {}) => {
  const raw = activity.updatedAt || activity.createdAt || activity.timestamp || '';
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;

  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatRelativeTime = (activity = {}) => {
  const time = readActivityTime(activity);
  if (!time) return '剛剛';

  const diffMs = Math.max(0, Date.now() - time);
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return '剛剛';
  if (diffMinutes < 60) return `${diffMinutes} 分鐘前`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} 小時前`;

  return new Intl.DateTimeFormat('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(time));
};

const LEGACY_PACKING_CLOTHING_TITLES = new Set([
  '上衣',
  '褲子',
  '內衣',
  '襪子',
  '睡衣',
  '外套',
  '帽子',
  '圍巾',
  '雨衣'
]);

const ENTITY_KIND_LABELS = Object.freeze({
  'itinerary-event': '行程',
  'itinerary-day': '行程天',
  'trip-detail-meta': '基本資料',
  'trip-detail-logistics': '交通住宿',
  'trip-detail-finance': '預算設定',
  'pre-trip-todo': '行前待辦',
  packing: '行李',
  'packing-clothing': '行李衣物',
  'shopping-item': '購物項目',
  expense: '記帳',
  'place-idea': '景點靈感',
  'shopping-category': '購物分類'
});

const COLLECTION_LABELS = Object.freeze({
  events: '行程',
  days: '行程天',
  details: '旅程資料',
  checklistItems: '行前待辦',
  shoppingItems: '購物項目',
  expenses: '記帳',
  placeIdeas: '景點靈感',
  shoppingCategories: '購物分類'
});

const PACKING_CATEGORY_LABELS = Object.freeze({
  suitcase: '托運行李',
  carryOn: '隨身行李',
  clothing: '行李衣物',
  other: '行李物品'
});

const normalizeActivityLabel = (activity = {}) => {
  if (activity.entityKind === 'packing-clothing') return ENTITY_KIND_LABELS['packing-clothing'];
  if (activity.entityKind === 'packing' || activity.listId === 'packing') {
    return PACKING_CATEGORY_LABELS[activity.category] || '行李';
  }
  if (ENTITY_KIND_LABELS[activity.entityKind]) return ENTITY_KIND_LABELS[activity.entityKind];

  const body = String(activity.body || activity.entityTitle || '').trim();
  if (
    activity.collectionId === 'checklistItems' &&
    (activity.label === '待辦' || !activity.label) &&
    LEGACY_PACKING_CLOTHING_TITLES.has(body)
  ) {
    return '行李衣物';
  }

  return COLLECTION_LABELS[activity.collectionId] || activity.label || '旅程內容';
};

const formatActivityTitle = (activity = {}, currentUid = '') => {
  const label = normalizeActivityLabel(activity);
  const actionText = activity.actionText || '更新';

  if (activity.actorUid && currentUid && activity.actorUid === currentUid) {
    return `你${actionText}了${label}`;
  }

  if (activity.title && activity.label && activity.label !== label) {
    return activity.title.replace(activity.label, label);
  }

  return activity.title || `${activity.actorName || '旅伴'} ${actionText}了${label}`;
};

const getBadgeVariant = (action = '') => {
  if (action === 'created') return 'success';
  if (action === 'deleted') return 'warning';
  return 'info';
};

const CollaborationActivityList = ({
  activities = [],
  currentUid = '',
  limit = 4,
  emptyText = '還沒有新的協作活動。'
}) => {
  const collaborationActivities = activities
    .filter((activity) => activity?.type === 'collaboration-update')
    .slice(0, limit);

  if (!collaborationActivities.length) {
    return (
      <div className="rounded-lg bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-500 dark:bg-slate-800/70 dark:text-slate-300">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {collaborationActivities.map((activity) => (
        <motion.article
          key={activity.id || `${activity.actorUid}-${activity.documentId}-${activity.updatedAt || activity.createdAt}`}
          layout
          initial={{ opacity: 0, y: 8, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 430, damping: 34, mass: 0.55 }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80"
        >
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-950 dark:text-white">
                {formatActivityTitle(activity, currentUid)}
              </p>
              <p className="mt-0.5 line-clamp-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {activity.body || activity.entityTitle || '旅程內容已更新'}
              </p>
            </div>
            <Badge variant={getBadgeVariant(activity.action)} className="shrink-0">
              {activity.actionText || '更新'}
            </Badge>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500">
            <Clock3 size={13} />
            <span>{formatRelativeTime(activity)}</span>
          </div>
        </motion.article>
      ))}
    </div>
  );
};

export default CollaborationActivityList;
