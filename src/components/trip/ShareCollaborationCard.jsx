import React, { useEffect, useState } from 'react';
import { CheckCircle2, Copy, KeyRound, RefreshCw, Send, Share2, UsersRound, Vote, XCircle } from 'lucide-react';
import {
  createTripInviteCode,
  disableTripInviteCode,
  getTripInviteCode,
  updateTripMemberProfile
} from '../../services/tripService';
import { Badge, Button, Card, Field, Input, Select } from '../ui';
import { inviteCodeInputProps, plainTextInputProps } from '../../utils/mobileInputProps';

const defaultCollaboration = {
  enabled: false,
  permission: 'view',
  votesEnabled: true,
  createdAt: '',
  updatedAt: ''
};

const defaultInvite = {
  inviteId: '',
  code: '',
  permission: 'view',
  enabled: false
};

const tabLabels = {
  today: '旅途中',
  summary: '控制台',
  itinerary: '每日行程',
  ideas: '想去',
  more: '更多',
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
  if (role === 'owner') return '主辦人';
  if (role === 'editor' || role === 'edit') return '可以一起編輯';
  return '只能查看';
};

const getPermissionLabel = (permission) => (
  permission === 'edit' ? '可以一起編輯' : '只能查看'
);

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

const getAppShareUrl = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return 'https://trip-planner-36455.web.app';
};

const buildInviteText = (code) => (
  [
    '一起來規劃這趟旅行吧',
    '',
    `邀請碼：${code}`,
    '打開 Trip Planner 輸入邀請碼，就能加入行程。',
    '',
    '加入後可以到「大家想去的地方」',
    '按「我想去」一起選。'
  ].join('\n')
);

const buildInviteClipboardText = (code) => (
  `${buildInviteText(code)}\n${getAppShareUrl()}`
);

const buildNativeShareData = (code) => ({
  title: 'Trip Planner 旅行邀請',
  text: buildInviteText(code),
  url: getAppShareUrl()
});

const ShareCollaborationCard = ({
  tripId,
  collaboration,
  setCollaboration,
  currentUser,
  userProfile,
  updateDisplayName,
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
  const [invite, setInvite] = useState(defaultInvite);
  const [selectedPermission, setSelectedPermission] = useState(settings.permission);
  const canManageInvite = accessRole === 'owner';
  const memberRows = Array.isArray(members) ? members : [];
  const currentUid = currentUser?.uid || '';
  const onlineRows = Array.isArray(onlineMembers) ? onlineMembers : [];
  const selfOnline = currentUid ? Boolean(presenceByUid?.[currentUid]?.online) : false;
  const otherOnlineCount = onlineRows.filter((member) => member.uid && member.uid !== currentUid).length;
  const onlineBadgeText = otherOnlineCount
    ? `${otherOnlineCount} 位旅伴在線`
    : selfOnline ? '自己在線' : '目前離線';
  const inviteText = invite.code ? buildInviteClipboardText(invite.code) : '';

  useEffect(() => {
    setDisplayNameDraft(userProfile?.displayName || currentUser?.displayName || '');
  }, [userProfile?.displayName, currentUser?.displayName]);

  useEffect(() => {
    if (!canManageInvite || !tripId || !currentUser?.uid) return undefined;

    let cancelled = false;
    setIsWorking(true);
    getTripInviteCode({ tripId, user: currentUser })
      .then((result) => {
        if (cancelled) return;
        const nextInvite = {
          ...defaultInvite,
          ...result,
          permission: result.permission === 'edit' ? 'edit' : 'view'
        };
        setInvite(nextInvite);
        setSelectedPermission(nextInvite.permission);
      })
      .catch((error) => {
        if (!cancelled) {
          setMessage(error?.message || '讀取邀請碼失敗，請稍後再試。');
        }
      })
      .finally(() => {
        if (!cancelled) setIsWorking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canManageInvite, tripId, currentUser]);

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
    if (!canManageInvite) {
      setMessage('這項設定只能由主辦人調整。');
      return null;
    }

    setIsWorking(true);
    try {
      return await action();
    } catch (error) {
      setMessage(error?.message || '邀請碼設定更新失敗，請稍後再試。');
      return null;
    } finally {
      setIsWorking(false);
    }
  };

  const handleCreateInvite = async () => {
    const result = await runOwnerAction(() => createTripInviteCode({
      tripId,
      permission: selectedPermission,
      user: currentUser
    }));
    if (!result?.code) return;
    setInvite({
      ...defaultInvite,
      ...result,
      permission: result.permission === 'edit' ? 'edit' : 'view'
    });
    setSelectedPermission(result.permission === 'edit' ? 'edit' : 'view');
    setMessage(invite.code ? '新邀請碼已建立。' : '邀請碼已建立。');
  };

  const handleDisableInvite = async () => {
    if (!invite.enabled) return;
    const result = await runOwnerAction(() => disableTripInviteCode({
      tripId,
      user: currentUser
    }));
    if (!result) return;
    setInvite((prev) => ({
      ...prev,
      enabled: false
    }));
    setMessage('已停止接受新旅伴加入，已加入的旅伴不受影響。');
  };

  const handlePermissionChange = async (event) => {
    const permission = event.target.value === 'edit' ? 'edit' : 'view';
    setSelectedPermission(permission);

    if (!invite.enabled) {
      setMessage(`建立邀請碼後，新旅伴會是「${getPermissionLabel(permission)}」。`);
      return;
    }

    const result = await runOwnerAction(() => createTripInviteCode({
      tripId,
      permission,
      user: currentUser
    }));
    if (!result?.code) return;
    setInvite({
      ...defaultInvite,
      ...result,
      permission
    });
    setMessage(`加入方式已改成「${getPermissionLabel(permission)}」，並已重新產生邀請碼。`);
  };

  const handleVotesToggle = () => {
    if (!canManageInvite) {
      setMessage('這項設定只能由主辦人調整。');
      return;
    }
    const nextSettings = persistSettings({ votesEnabled: !settings.votesEnabled, enabled: settings.enabled });
    setMessage(nextSettings.votesEnabled ? '已開放旅伴按「我想去」。' : '已停止旅伴按「我想去」。');
  };

  const handleCopyInviteText = async () => {
    if (!inviteText) {
      setMessage('請先建立邀請碼。');
      return;
    }

    try {
      const copied = await writeClipboardText(inviteText);
      setMessage(copied ? '邀請文字已複製。' : '無法自動複製，請手動選取邀請文字。');
    } catch {
      setMessage('無法自動複製，請手動選取邀請文字。');
    }
  };

  const handleCopyInviteCode = async () => {
    if (!invite.code) {
      setMessage('請先建立邀請碼。');
      return;
    }

    try {
      const copied = await writeClipboardText(invite.code);
      setMessage(copied ? '邀請碼已複製。' : '無法自動複製，請手動選取邀請碼。');
    } catch {
      setMessage('無法自動複製，請手動選取邀請碼。');
    }
  };

  const handleNativeShare = async () => {
    if (!invite.code || !inviteText) {
      setMessage('請先建立邀請碼。');
      return;
    }

    const copyInviteAsFallback = async (successMessage) => {
      try {
        const copied = await writeClipboardText(inviteText);
        setMessage(copied ? successMessage : '無法開啟分享面板，也無法自動複製。請手動複製邀請文字。');
      } catch {
        setMessage('無法開啟分享面板，也無法自動複製。請手動複製邀請文字。');
      }
    };

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      const shareData = buildNativeShareData(invite.code);
      const canShareData = typeof navigator.canShare !== 'function' || navigator.canShare(shareData);
      const payload = canShareData ? shareData : { title: shareData.title, text: inviteText };

      try {
        await navigator.share(payload);
        setMessage('邀請文字已送到分享面板。');
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }

    await copyInviteAsFallback('這個瀏覽器無法開啟原生分享，已改為複製邀請文字。');
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
            <h3 className="tp-section-title">旅伴</h3>
            <p className="tp-section-subtitle mt-1">
              {canManageInvite
                ? '邀請旅伴加入。'
                : '旅伴與顯示名稱。'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={canManageInvite ? 'success' : 'muted'}>{getRoleLabel(accessRole)}</Badge>
          {canManageInvite && (
            <Badge variant={invite.enabled ? 'success' : 'muted'}>{invite.enabled ? '可邀請' : '未開放邀請'}</Badge>
          )}
          <Badge variant={selfOnline || otherOnlineCount ? 'success' : 'muted'}>{onlineBadgeText}</Badge>
        </div>
      </div>

      {canManageInvite && (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <Field label="邀請碼" htmlFor="trip-invite-code" hint="在首頁輸入邀請碼加入。">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
              <Input
                id="trip-invite-code"
                {...inviteCodeInputProps}
                value={invite.enabled && invite.code ? invite.code : '尚未建立邀請碼'}
                readOnly
                className="font-mono text-lg font-black uppercase tracking-widest"
                onFocus={(event) => event.target.select()}
              />
              <Button variant="secondary" onClick={handleCopyInviteCode} disabled={isWorking || !invite.code} className="justify-center">
                <Copy size={16} />
                複製碼
              </Button>
              <Button onClick={handleNativeShare} disabled={isWorking || !invite.code || !invite.enabled} className="justify-center">
                <Send size={16} />
                分享
              </Button>
            </div>
          </Field>

          <Field label="新旅伴加入後" htmlFor="trip-invite-permission">
            <Select
              id="trip-invite-permission"
              value={selectedPermission}
              onChange={handlePermissionChange}
              disabled={isWorking}
            >
              <option value="view">只能查看</option>
              <option value="edit">可以一起編輯</option>
            </Select>
          </Field>
        </div>
      )}

      {canManageInvite && inviteText && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">分享文字</p>
          <p className="mt-1 whitespace-pre-line break-words text-sm font-semibold text-slate-700 dark:text-slate-200">{inviteText}</p>
        </div>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <Field label="我的顯示名稱" htmlFor="member-display-name" hint="旅伴看得到。">
          <Input
            id="member-display-name"
            {...plainTextInputProps}
            value={displayNameDraft}
            onChange={(event) => setDisplayNameDraft(event.target.value)}
            placeholder={currentUser?.email || '例如 Alex'}
            enterKeyHint="done"
          />
        </Field>

        <div className={`grid gap-2 ${canManageInvite ? 'sm:grid-cols-4' : ''}`}>
          <Button variant="secondary" onClick={handleSaveDisplayName} disabled={isWorking} className="justify-center">
            儲存名稱
          </Button>
          {canManageInvite && (
            <>
              <Button onClick={handleCreateInvite} disabled={isWorking} className="justify-center">
                <KeyRound size={16} />
                {invite.code ? '重新產生' : '建立邀請碼'}
              </Button>
              <Button variant="secondary" onClick={handleCopyInviteText} disabled={isWorking || !inviteText} className="justify-center">
                <RefreshCw size={16} />
                複製文字
              </Button>
              <Button variant="ghost" onClick={handleDisableInvite} disabled={isWorking || !invite.enabled} className="justify-center">
                <XCircle size={16} />
                停用
              </Button>
            </>
          )}
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
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">我想去回應</p>
          <p className="mt-0.5 inline-flex items-center gap-1 text-sm font-black text-slate-900 dark:text-white">
            {settings.votesEnabled && <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-300" />}
            {settings.votesEnabled ? '已開啟' : '已關閉'}
          </p>
        </div>
      </div>

      {canManageInvite && (
        <div className="mt-3">
          <Button variant={settings.votesEnabled ? 'secondary' : 'ghost'} onClick={handleVotesToggle} disabled={isWorking} className="justify-center">
            <Vote size={16} />
            {settings.votesEnabled ? '停止我想去回應' : '開放我想去回應'}
          </Button>
        </div>
      )}

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
