import React from 'react';
import { Bell, BellOff, BellRing, Loader2, ShieldAlert, Smartphone } from 'lucide-react';
import useTripNotifications from '../../hooks/useTripNotifications';
import { Badge, Button, Card } from '../ui';

const stateCopy = {
  enabled: {
    icon: BellRing,
    badge: '已開啟',
    badgeVariant: 'success',
    title: '手機提醒已開啟',
    description: '航班、行程前與出發待辦會送到這台裝置。',
    action: '關閉提醒',
    actionVariant: 'secondary'
  },
  available: {
    icon: Bell,
    badge: '可開啟',
    badgeVariant: 'info',
    title: '開啟旅程提醒',
    description: '用智慧預設提醒今天行程、航班時間和出發前待辦。',
    action: '開啟提醒',
    actionVariant: 'primary'
  },
  'needs-install': {
    icon: Smartphone,
    badge: '需加入桌面',
    badgeVariant: 'warning',
    title: '加入主畫面後可提醒',
    description: 'iPhone 需從主畫面開啟 Trip Planner 才能接收通知。',
    action: '等待加入',
    actionVariant: 'secondary',
    disabled: true
  },
  blocked: {
    icon: ShieldAlert,
    badge: '已封鎖',
    badgeVariant: 'warning',
    title: '通知權限已封鎖',
    description: '請先到瀏覽器或系統設定允許 Trip Planner 通知。',
    action: '已封鎖',
    actionVariant: 'secondary',
    disabled: true
  },
  unsupported: {
    icon: BellOff,
    badge: '不支援',
    badgeVariant: 'muted',
    title: '此裝置暫不支援提醒',
    description: '可改用支援 Web Push 的瀏覽器或安裝成 PWA 後再試。',
    action: '無法開啟',
    actionVariant: 'secondary',
    disabled: true
  },
  'signed-out': {
    icon: BellOff,
    badge: '未登入',
    badgeVariant: 'muted',
    title: '登入後可開啟提醒',
    description: '旅程提醒會綁定目前登入帳號與這台裝置。',
    action: '未登入',
    actionVariant: 'secondary',
    disabled: true
  }
};

const notificationCategoryLabels = [
  '行程提醒',
  '航班提醒',
  '待辦提醒'
];

const TripNotificationCard = ({ tripId, currentUser }) => {
  const {
    status,
    isLoading,
    isBusy,
    error,
    enable,
    disable
  } = useTripNotifications({ tripId, currentUser });
  const copy = stateCopy[status] || stateCopy.available;
  const Icon = isBusy || isLoading ? Loader2 : copy.icon;
  const disabled = isBusy || isLoading || copy.disabled;
  const handleAction = status === 'enabled' ? disable : enable;

  return (
    <Card className="border-sky-100 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="tp-icon-chip bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
            <Icon size={18} className={isBusy || isLoading ? 'animate-spin' : ''} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-black text-slate-950 dark:text-white">
                {isLoading ? '讀取提醒狀態' : copy.title}
              </h3>
              <Badge variant={copy.badgeVariant}>{copy.badge}</Badge>
            </div>
            <p className="mt-1 text-sm font-semibold leading-5 text-slate-600 dark:text-slate-300">
              {copy.description}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {notificationCategoryLabels.map((label) => (
                <Badge key={label} variant="muted">{label}</Badge>
              ))}
            </div>
            {error && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                {error}
              </p>
            )}
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant={copy.actionVariant}
          onClick={handleAction}
          disabled={disabled}
          className="shrink-0 justify-center"
        >
          {copy.action}
        </Button>
      </div>
    </Card>
  );
};

export default TripNotificationCard;
