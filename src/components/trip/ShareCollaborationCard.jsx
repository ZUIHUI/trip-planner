import React, { useMemo, useState } from 'react';
import { CheckCircle2, Copy, Link2, Share2, UsersRound, Vote, XCircle } from 'lucide-react';
import {
  createTripShare,
  disableTripShare,
  updateTripMemberProfile,
  updateTripSharePermission
} from '../../services/tripService';
import { Badge, Button, Card, Field, Input, Select } from '../ui';

const defaultCollaboration = {
  enabled: false,
  shareToken: '',
  permission: 'view',
  votesEnabled: true,
  createdAt: '',
  updatedAt: ''
};

const tabLabels = {
  summary: '控制台',
  itinerary: '每日行程',
  preTrip: '行前',
  packing: '打包',
  flights: '交通住宿',
  shopping: '購物',
  expenses: '費用'
};

const normalizeSettings = (settings = {}) => ({
  ...defaultCollaboration,
  ...settings,
  permission: settings.permission === 'edit' ? 'edit' : 'view',
  votesEnabled: settings.votesEnabled === undefined ? true : Boolean(settings.votesEnabled)
});

const buildShareUrl = ({ tripId, shareToken, permission }) => {
  if (typeof window === 'undefined' || !tripId || !shareToken) return '';
  const url = new URL(`/trip/${encodeURIComponent(tripId)}`, window.location.origin);
  url.searchParams.set('share', shareToken);
  url.searchParams.set('access', permission === 'edit' ? 'edit' : 'view');
  return url.toString();
};

const writeClipboardText = async (text) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);
  return copied;
};

const getRoleLabel = (role) => {
  if (role === 'owner') return '管理者';
  if (role === 'editor' || role === 'edit') return '可一起規劃';
  return '可查看';
};

const getMemberName = (member = {}) => (
  member.displayName ||
  member.email ||
  '未命名旅伴'
);

const formatEditingTarget = (target = '') => {
  if (!target) return '';
  if (target === 'event:new') return '正在新增行程';
  if (target.startsWith('event:')) return '正在編輯行程';
  return '正在編輯';
};

const ShareCollaborationCard = ({
  tripId,
  collaboration,
  setCollaboration,
  currentUser,
  userProfile,
  updateDisplayName,
  isSharedSession = false,
  accessRole = '',
  members = [],
  onlineMembers = [],
  presenceByUid = {},
  presenceError = ''
}) => {
  const settings = normalizeSettings(collaboration);
  const [message, setMessage] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const [displayNameDraft, setDisplayNameDraft] = useState(userProfile?.displayName || currentUser?.displayName || '');
  const canManageSharing = accessRole === 'owner';
  const memberRows = Array.isArray(members) ? members : [];
  const onlineCount = Array.isArray(onlineMembers) ? onlineMembers.length : 0;
  const shareUrl = useMemo(
    () => (settings.enabled ? buildShareUrl({ tripId, shareToken: settings.shareToken, permission: settings.permission }) : ''),
    [tripId, settings.enabled, settings.shareToken, settings.permission]
  );

  const persistSettings = (patch) => {
    const now = new Date().toISOString();
    const nextSettings = normalizeSettings({
      ...settings,
      ...patch,
      createdAt: settings.createdAt || now,
      updatedAt: now
    });
    setCollaboration(nextSettings);
    return nextSettings;
  };

  const runOwnerAction = async (action) => {
    if (!canManageSharing) {
      setMessage('這項設定只能由建立旅程的人調整。');
      return null;
    }

    setIsWorking(true);
    try {
      return await action();
    } catch (error) {
      setMessage(error?.message || '邀請設定更新失敗，請稍後再試。');
      return null;
    } finally {
      setIsWorking(false);
    }
  };

  const handleCreateLink = async () => {
    const share = await runOwnerAction(() => createTripShare({
      tripId,
      permission: settings.permission,
      user: currentUser
    }));
    if (!share?.token) return;

    persistSettings({
      enabled: true,
      shareToken: share.token,
      permission: share.permission || settings.permission
    });
    setMessage('邀請連結已建立。對方登入後即可加入這趟旅程。');
  };

  const handlePermissionChange = async (event) => {
    const permission = event.target.value === 'edit' ? 'edit' : 'view';
    if (!settings.shareToken) {
      persistSettings({ permission, enabled: settings.enabled });
      setMessage('已先記住這個加入方式，建立連結後會套用。');
      return;
    }

    const updated = await runOwnerAction(() => updateTripSharePermission({
      token: settings.shareToken,
      permission
    }));
    if (!updated) return;

    persistSettings({ permission, enabled: true });
    setMessage(permission === 'edit' ? '新旅伴加入後可以一起規劃。' : '新旅伴加入後只能查看。');
  };

  const handleVotesToggle = () => {
    if (!canManageSharing) {
      setMessage('這項設定只能由建立旅程的人調整。');
      return;
    }
    const nextSettings = persistSettings({ votesEnabled: !settings.votesEnabled, enabled: settings.enabled });
    setMessage(nextSettings.votesEnabled ? '地點投票已開啟。' : '地點投票已關閉。');
  };

  const handleDisableSharing = async () => {
    if (!settings.shareToken) return;
    const disabled = await runOwnerAction(() => disableTripShare(settings.shareToken));
    if (!disabled) return;

    persistSettings({ enabled: false });
    setMessage('邀請連結已停用，已加入的旅伴不受影響。');
  };

  const handleCopyLink = async () => {
    let nextSettings = settings;
    if (!nextSettings.shareToken || !nextSettings.enabled) {
      const share = await runOwnerAction(() => createTripShare({
        tripId,
        permission: settings.permission,
        user: currentUser
      }));
      if (!share?.token) return;
      nextSettings = persistSettings({
        enabled: true,
        shareToken: share.token,
        permission: share.permission || settings.permission
      });
    }

    const nextUrl = buildShareUrl({
      tripId,
      shareToken: nextSettings.shareToken,
      permission: nextSettings.permission
    });

    if (!nextUrl) {
      setMessage('目前無法產生邀請連結。');
      return;
    }

    try {
      const copied = await writeClipboardText(nextUrl);
      setMessage(copied ? '邀請連結已複製。' : '無法自動複製，請手動選取連結。');
    } catch {
      setMessage('無法自動複製，請手動選取連結。');
    }
  };

  const handleSaveDisplayName = async () => {
    const nextName = displayNameDraft.trim();
    if (!nextName) {
      setMessage('請輸入要顯示在旅伴清單中的名稱。');
      return;
    }

    setIsWorking(true);
    try {
      await updateDisplayName(nextName);
      await updateTripMemberProfile({
        tripId,
        user: currentUser,
        displayName: nextName,
        photoURL: currentUser?.photoURL || ''
      });
      setMessage('顯示名稱已更新。');
    } catch (error) {
      setMessage(error?.message || '顯示名稱更新失敗。');
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <Card className="order-4 p-4">
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="tp-icon-chip bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300">
            <Share2 size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="tp-section-title">共同規劃</h3>
            <p className="tp-section-subtitle mt-1">
              邀請旅伴一起查看或規劃，這裡也會顯示誰正在旅程中。
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isSharedSession && <Badge variant="info">從邀請加入</Badge>}
          <Badge variant={canManageSharing ? 'success' : 'muted'}>{getRoleLabel(accessRole)}</Badge>
          <Badge variant={settings.enabled ? 'success' : 'muted'}>{settings.enabled ? '可邀請' : '未開放邀請'}</Badge>
          <Badge variant={onlineCount ? 'success' : 'muted'}>{onlineCount} 人在線</Badge>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
        <Field label="邀請連結" htmlFor="trip-share-url" hint="把連結傳給旅伴，對方登入後就會出現在這趟旅程。">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
            <Input
              id="trip-share-url"
              value={shareUrl || '尚未建立邀請連結'}
              readOnly
              className="font-mono text-xs"
              onFocus={(event) => event.target.select()}
            />
            <Button variant="secondary" onClick={handleCopyLink} disabled={!canManageSharing || isWorking} className="justify-center">
              <Copy size={16} />
              複製
            </Button>
          </div>
        </Field>

        <Field label="新旅伴加入後" htmlFor="trip-share-permission">
          <Select
            id="trip-share-permission"
            value={settings.permission}
            onChange={handlePermissionChange}
            disabled={!canManageSharing || isWorking}
          >
            <option value="view">只能查看</option>
            <option value="edit">可以一起規劃</option>
          </Select>
        </Field>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <Field label="我的顯示名稱" htmlFor="member-display-name" hint="會顯示在旅伴清單、地點投票與在線狀態中。">
          <Input
            id="member-display-name"
            value={displayNameDraft}
            onChange={(event) => setDisplayNameDraft(event.target.value)}
            placeholder={currentUser?.email || '例如 Alex'}
          />
        </Field>

        <div className="grid gap-2 sm:grid-cols-4">
          <Button variant="secondary" onClick={handleSaveDisplayName} disabled={isWorking} className="justify-center">
            儲存名稱
          </Button>
          <Button onClick={handleCreateLink} disabled={!canManageSharing || isWorking} className="justify-center">
            <Link2 size={16} />
            建立連結
          </Button>
          <Button variant="ghost" onClick={handleDisableSharing} disabled={!canManageSharing || isWorking || !settings.enabled} className="justify-center">
            <XCircle size={16} />
            停用
          </Button>
          <Button variant={settings.votesEnabled ? 'secondary' : 'ghost'} onClick={handleVotesToggle} disabled={!canManageSharing || isWorking} className="justify-center">
            <Vote size={16} />
            {settings.votesEnabled ? '投票開啟' : '投票關閉'}
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/70">
          <p className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
            <UsersRound size={13} />
            旅伴
          </p>
          <p className="mt-0.5 truncate text-sm font-black text-slate-900 dark:text-white">
            {memberRows.length || 1} 位
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/70">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">我的參與方式</p>
          <p className="mt-0.5 text-sm font-black text-slate-900 dark:text-white">
            {getRoleLabel(accessRole)}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/70">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">地點投票</p>
          <p className="mt-0.5 inline-flex items-center gap-1 text-sm font-black text-slate-900 dark:text-white">
            {settings.votesEnabled && <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-300" />}
            {settings.votesEnabled ? '已開啟' : '已關閉'}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
          一起旅行的人
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {memberRows.length ? memberRows.map((member) => {
            const presence = presenceByUid?.[member.uid] || null;
            const online = Boolean(presence?.online);
            const editingText = formatEditingTarget(presence?.editingTarget);
            return (
              <div key={member.uid || member.id || member.email} className="flex min-w-0 items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="flex min-w-0 items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${online ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
                    <span className="truncate">{getMemberName(member)}</span>
                  </p>
                  <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {online
                      ? `${tabLabels[presence.activeTab] || '在線'}${editingText ? ` · ${editingText}` : ''}`
                      : member.email || '尚未提供 Email'}
                  </p>
                </div>
                <Badge variant={member.role === 'owner' ? 'success' : (member.role === 'editor' || member.role === 'edit') ? 'info' : 'muted'}>
                  {getRoleLabel(member.role)}
                </Badge>
              </div>
            );
          }) : (
            <p className="px-3 py-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
              正在更新旅伴清單。
            </p>
          )}
        </div>
      </div>

      {presenceError && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
          在線狀態暫時無法顯示，旅程內容仍可正常使用。
        </p>
      )}

      {message && (
        <p className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          {message}
        </p>
      )}
    </Card>
  );
};

export default ShareCollaborationCard;
