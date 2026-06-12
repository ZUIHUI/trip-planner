import React from 'react';
import { motion } from 'motion/react';
import { CircleX, PencilLine } from 'lucide-react';
import { Badge, cx } from './ui';

const dotSizes = {
  xs: 'h-2.5 w-2.5',
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-4 w-4'
};

const avatarSizes = {
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-11 w-11 text-sm'
};

const statusLabels = {
  online: '在線',
  editing: '正在編輯',
  offline: '離線',
  error: '同步失敗',
  syncing: '同步中'
};

const roleLabels = {
  owner: '主辦',
  editor: '可編輯',
  edit: '可編輯',
  viewer: '可檢視',
  view: '可檢視'
};

const statusDotClasses = {
  online: 'tp-status-dot-online tp-status-pulse ring-emerald-100 dark:ring-emerald-900/60',
  editing: 'tp-status-dot-editing ring-sky-100 dark:ring-sky-900/60',
  offline: 'tp-status-dot-offline ring-slate-100 dark:ring-slate-800',
  error: 'tp-status-dot-error ring-amber-100 dark:ring-amber-900/60',
  syncing: 'bg-sky-300 tp-soft-pulse ring-sky-100 dark:bg-sky-500 dark:ring-sky-900/60'
};

const readStatus = (person = {}) => (
  person.status || (person.editing ? 'editing' : person.online ? 'online' : 'offline')
);

export const PresenceStatusDot = ({
  status = 'offline',
  size = 'sm',
  className = '',
  label,
  showOfflineX = true
}) => {
  const safeStatus = statusDotClasses[status] ? status : 'offline';
  const accessibleLabel = label || statusLabels[safeStatus] || statusLabels.offline;

  return (
    <span
      className={cx(
        'tp-status-dot inline-flex shrink-0 items-center justify-center rounded-full ring-2 ring-white dark:ring-slate-950',
        dotSizes[size] || dotSizes.sm,
        statusDotClasses[safeStatus],
        className
      )}
      role="img"
      aria-label={accessibleLabel}
      title={accessibleLabel}
    >
      {safeStatus === 'offline' && showOfflineX && size !== 'xs' && (
        <span className="text-[9px] font-black leading-none text-white">x</span>
      )}
    </span>
  );
};

export const PresenceAvatar = ({
  person = {},
  size = 'md',
  showStatus = true,
  className = ''
}) => {
  const status = readStatus(person);
  const name = person.name || person.displayName || person.email || '旅伴';
  const initials = person.initials || Array.from(String(name).trim() || '?').slice(0, 2).join('').toUpperCase();

  return (
    <span
      className={cx(
        'relative inline-flex shrink-0 items-center justify-center rounded-full border border-white bg-gradient-to-br from-sky-50 to-rose-50 font-black text-brand-700 shadow-sm dark:border-slate-900 dark:from-brand-950/60 dark:to-violet-950/40 dark:text-brand-200',
        avatarSizes[size] || avatarSizes.md,
        className
      )}
      title={name}
    >
      {person.photoURL ? (
        <img src={person.photoURL} alt={name} className="h-full w-full rounded-full object-cover" />
      ) : (
        initials
      )}
      {showStatus && (
        <PresenceStatusDot
          status={status}
          size="xs"
          showOfflineX={false}
          className="absolute -bottom-0.5 -right-0.5"
          label={person.statusLabel}
        />
      )}
    </span>
  );
};

export const PresenceRosterRow = ({
  person = {},
  compact = false,
  showRole = true,
  className = ''
}) => {
  const status = readStatus(person);
  const statusLabel = person.statusLabel || statusLabels[status] || statusLabels.offline;
  const detailText = person.detailText || person.email || '';
  const role = person.role || person.accessRole || '';
  const roleLabel = roleLabels[role] || '';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 430, damping: 34, mass: 0.55 }}
      className={cx(
        'tp-motion-panel flex min-w-0 items-center justify-between gap-3 rounded-lg border border-transparent bg-slate-50 px-3 py-2 dark:bg-slate-800/70',
        status === 'editing' && 'border-sky-100 bg-sky-50/70 dark:border-sky-900/60 dark:bg-sky-950/25',
        status === 'online' && 'border-emerald-100 bg-emerald-50/55 dark:border-emerald-900/60 dark:bg-emerald-950/20',
        compact && 'px-2.5 py-2',
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <PresenceAvatar person={person} size={compact ? 'sm' : 'md'} />
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-900 dark:text-white">
            {person.name || person.displayName || person.email || '旅伴'}
          </p>
          <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
            {detailText || statusLabel}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span
          className={cx(
            'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black',
            status === 'editing' && 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200',
            status === 'online' && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200',
            status === 'offline' && 'bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400',
            status === 'error' && 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200',
            status === 'syncing' && 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200'
          )}
        >
          {status === 'editing' ? <PencilLine size={12} /> : status === 'offline' ? <CircleX size={12} /> : (
            <PresenceStatusDot status={status} size="xs" showOfflineX={false} />
          )}
          {statusLabel}
        </span>
        {showRole && roleLabel && <Badge variant={role === 'owner' ? 'success' : role === 'viewer' || role === 'view' ? 'muted' : 'info'}>{roleLabel}</Badge>}
      </div>
    </motion.div>
  );
};

export default PresenceStatusDot;
