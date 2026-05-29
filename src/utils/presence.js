export const presenceTabLabels = {
  today: '旅途',
  summary: '總覽',
  itinerary: '行程',
  ideas: '想去',
  more: '更多',
  preTrip: '行前',
  packing: '行李',
  flights: '資訊',
  shopping: '購物',
  expenses: '記帳'
};

const getMemberByUid = (members = []) => (
  (Array.isArray(members) ? members : []).reduce((acc, member) => {
    const uid = member?.uid || member?.id || '';
    if (uid) acc[uid] = member;
    return acc;
  }, {})
);

const presenceStatusLabels = {
  online: '在線',
  editing: '正在編輯',
  offline: '離線',
  syncing: '同步中',
  error: '同步失敗'
};

export const getPresenceName = (presence = {}, member = {}) => (
  presence?.profile?.displayName ||
  member?.displayName ||
  presence?.profile?.email ||
  member?.email ||
  presence?.uid ||
  '旅伴'
);

export const getPresenceInitials = (name = '') => {
  const trimmed = String(name || '').trim();
  if (!trimmed) return '?';
  const base = trimmed.includes('@') ? trimmed.split('@')[0] : trimmed;
  return Array.from(base).slice(0, 2).join('').toUpperCase();
};

export const getPresenceTabLabel = (tab = '') => presenceTabLabels[tab] || '在線';

const editingTargetLabels = {
  'trip-details:meta': '正在編輯旅程資訊',
  'trip-details:accommodation': '正在編輯住宿資訊',
  'trip-details:budget': '正在編輯旅程預算',
  'trip-details:flights:outbound': '正在編輯去程航班',
  'trip-details:flights:inbound': '正在編輯回程航班'
};

export const getEditingTargetLabel = (target = '') => {
  if (!target) return '';
  if (editingTargetLabels[target]) return editingTargetLabels[target];
  if (target === 'event:new') return '正在新增行程';
  if (target.startsWith('event:')) return '正在編輯行程';
  return '正在編輯';
};

export const getEditingMembersForTarget = (editingByTarget = {}, target = '') => {
  if (!target) return [];
  const members = editingByTarget?.[target];
  return Array.isArray(members) ? members : [];
};

export const formatEditingMembersText = (members = []) => {
  const safeMembers = (Array.isArray(members) ? members : [])
    .filter((member) => member?.uid)
    .map((member) => member.name || member.email || member.uid || '旅伴');
  if (!safeMembers.length) return '';

  const visibleNames = safeMembers.slice(0, 2);
  const extraCount = safeMembers.length - visibleNames.length;
  return extraCount > 0
    ? `${visibleNames.join('、')} 等 ${extraCount} 人`
    : visibleNames.join('、');
};

export const formatLastActiveAt = (timestamp = 0, now = Date.now()) => {
  const value = Number(timestamp || 0);
  if (!value) return '';
  const diffSeconds = Math.max(0, Math.round((now - value) / 1000));
  if (diffSeconds < 20) return '剛剛';
  if (diffSeconds < 60) return `${diffSeconds} 秒前`;
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} 分鐘前`;
  return `${Math.round(diffMinutes / 60)} 小時前`;
};

const normalizePresencePerson = (presence = {}, membersByUid = {}, now = Date.now()) => {
  const member = membersByUid[presence.uid] || {};
  const name = getPresenceName(presence, member);
  const editingLabel = getEditingTargetLabel(presence.editingTarget);
  const tabLabel = getPresenceTabLabel(presence.activeTab);
  const lastActiveLabel = formatLastActiveAt(presence.lastActiveAt, now);
  const online = presence.online !== false;
  const status = editingLabel ? 'editing' : online ? 'online' : 'offline';
  const connections = Array.isArray(presence.connections) ? presence.connections : [];

  return {
    uid: presence.uid || '',
    name,
    initials: getPresenceInitials(name),
    photoURL: presence?.profile?.photoURL || member?.photoURL || '',
    email: presence?.profile?.email || member?.email || '',
    role: member?.role || member?.permission || '',
    online,
    editing: Boolean(editingLabel),
    status,
    statusLabel: presenceStatusLabels[status] || presenceStatusLabels.offline,
    connectionCount: Number(presence.connectionCount || connections.length || 0),
    activeTab: presence.activeTab || '',
    tabLabel,
    editingTarget: presence.editingTarget || '',
    editingLabel,
    lastActiveAt: Number(presence.lastActiveAt || 0),
    lastActiveLabel,
    detailText: [tabLabel, editingLabel, lastActiveLabel].filter(Boolean).join(' · ')
  };
};

const addUniquePerson = (collection, person) => {
  if (!person?.uid || collection.some((item) => item.uid === person.uid)) return;
  collection.push(person);
};

const normalizeOfflineMember = (member = {}, currentUser = null) => {
  const uid = member?.uid || member?.id || currentUser?.uid || '';
  const name = (
    member?.displayName ||
    currentUser?.displayName ||
    member?.email ||
    currentUser?.email ||
    uid ||
    '旅伴'
  );

  return {
    uid,
    name,
    initials: getPresenceInitials(name),
    photoURL: member?.photoURL || currentUser?.photoURL || '',
    email: member?.email || currentUser?.email || '',
    role: member?.role || member?.permission || '',
    online: false,
    editing: false,
    status: 'offline',
    statusLabel: presenceStatusLabels.offline,
    connectionCount: 0,
    activeTab: '',
    tabLabel: '',
    editingTarget: '',
    editingLabel: '',
    lastActiveAt: 0,
    lastActiveLabel: '',
    detailText: member?.email || currentUser?.email || presenceStatusLabels.offline
  };
};

const buildPresenceRoster = ({
  normalizedOnlineMembers = [],
  presenceByUid = {},
  membersByUid = {},
  currentUser = null,
  now = Date.now()
} = {}) => {
  const roster = [];
  const onlineByUid = normalizedOnlineMembers.reduce((acc, person) => {
    if (person?.uid) acc[person.uid] = person;
    return acc;
  }, {});

  Object.values(membersByUid).forEach((member) => {
    const uid = member?.uid || member?.id || '';
    if (!uid) return;
    addUniquePerson(roster, onlineByUid[uid] || normalizeOfflineMember(member));
  });

  if (currentUser?.uid && !roster.some((person) => person.uid === currentUser.uid)) {
    addUniquePerson(
      roster,
      onlineByUid[currentUser.uid] || normalizeOfflineMember({
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        email: currentUser.email,
        photoURL: currentUser.photoURL,
        role: 'owner'
      }, currentUser)
    );
  }

  Object.values(presenceByUid || {}).forEach((presence) => {
    if (!presence?.uid || roster.some((person) => person.uid === presence.uid)) return;
    addUniquePerson(roster, normalizePresencePerson(presence, membersByUid, now));
  });

  return roster.sort((a, b) => {
    const rank = { editing: 0, online: 1, syncing: 2, error: 3, offline: 4 };
    const statusDiff = (rank[a.status] ?? 5) - (rank[b.status] ?? 5);
    if (statusDiff !== 0) return statusDiff;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
};

export const buildPresenceUiState = ({
  onlineMembers = [],
  presenceByUid = {},
  members = [],
  currentUser = null
} = {}) => {
  const currentUid = currentUser?.uid || '';
  const now = Date.now();
  const membersByUid = getMemberByUid(members);
  const onlineRows = Array.isArray(onlineMembers) ? onlineMembers : [];
  const selfOnline = currentUid
    ? Boolean(presenceByUid?.[currentUid]?.online || onlineRows.some((presence) => presence?.uid === currentUid && presence.online !== false))
    : false;
  const normalizedOnlineMembers = onlineRows.map((presence) => normalizePresencePerson(presence, membersByUid, now));
  const otherOnlineMembers = normalizedOnlineMembers.filter((person) => person.uid !== currentUid);
  const roster = buildPresenceRoster({
    normalizedOnlineMembers,
    presenceByUid,
    membersByUid,
    currentUser,
    now
  });
  const selfStatus = roster.find((person) => person.uid === currentUid) || null;
  const statusCounts = roster.reduce((acc, person) => {
    const status = person.status || 'offline';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  const onlineByTab = {};
  const editingByEventId = {};
  const editingByTarget = {};

  otherOnlineMembers.forEach((person) => {
    if (person.activeTab) {
      onlineByTab[person.activeTab] = (onlineByTab[person.activeTab] || 0) + 1;
    }
  });

  onlineRows.forEach((presence) => {
    if (!presence?.uid || presence.uid === currentUid) return;
    const person = normalizePresencePerson(presence, membersByUid, now);
    const connections = Array.isArray(presence.connections) ? presence.connections : [];
    const targets = [
      String(presence.editingTarget || ''),
      ...connections.map((connection) => String(connection?.editingTarget || ''))
    ].filter(Boolean);

    Array.from(new Set(targets)).forEach((target) => {
      const targetPerson = {
        ...person,
        editingTarget: target,
        editingLabel: getEditingTargetLabel(target)
      };

      if (!editingByTarget[target]) editingByTarget[target] = [];
      addUniquePerson(editingByTarget[target], targetPerson);

      if (target.startsWith('event:') && target !== 'event:new') {
        const eventId = target.slice('event:'.length);
        if (!eventId) return;
        if (!editingByEventId[eventId]) editingByEventId[eventId] = [];
        addUniquePerson(editingByEventId[eventId], targetPerson);
      }
    });
  });

  return {
    selfOnline,
    onlineMembers: normalizedOnlineMembers,
    otherOnlineMembers,
    roster,
    selfStatus,
    statusCounts,
    onlineByTab,
    editingByEventId,
    editingByTarget,
    summaryText: otherOnlineMembers.length
      ? `${otherOnlineMembers.length} 位旅伴在線`
      : selfOnline ? '你在線' : '同步在線狀態中'
  };
};
