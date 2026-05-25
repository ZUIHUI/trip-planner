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

export const getEditingTargetLabel = (target = '') => {
  if (!target) return '';
  if (target === 'event:new') return '正在新增行程';
  if (target.startsWith('event:')) return '正在編輯行程';
  return '正在編輯';
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

  return {
    uid: presence.uid || '',
    name,
    initials: getPresenceInitials(name),
    photoURL: presence?.profile?.photoURL || member?.photoURL || '',
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
  const selfOnline = currentUid ? Boolean(presenceByUid?.[currentUid]?.online) : false;
  const normalizedOnlineMembers = onlineRows.map((presence) => normalizePresencePerson(presence, membersByUid, now));
  const otherOnlineMembers = normalizedOnlineMembers.filter((person) => person.uid !== currentUid);
  const onlineByTab = {};
  const editingByEventId = {};

  otherOnlineMembers.forEach((person) => {
    if (person.activeTab) {
      onlineByTab[person.activeTab] = (onlineByTab[person.activeTab] || 0) + 1;
    }
  });

  onlineRows.forEach((presence) => {
    if (!presence?.uid || presence.uid === currentUid) return;
    const person = normalizePresencePerson(presence, membersByUid, now);
    const connections = Array.isArray(presence.connections) ? presence.connections : [];

    connections.forEach((connection) => {
      const target = String(connection?.editingTarget || '');
      if (!target.startsWith('event:') || target === 'event:new') return;
      const eventId = target.slice('event:'.length);
      if (!eventId) return;
      if (!editingByEventId[eventId]) editingByEventId[eventId] = [];
      addUniquePerson(editingByEventId[eventId], person);
    });
  });

  return {
    selfOnline,
    onlineMembers: normalizedOnlineMembers,
    otherOnlineMembers,
    onlineByTab,
    editingByEventId,
    summaryText: otherOnlineMembers.length
      ? `${otherOnlineMembers.length} 位旅伴在線`
      : selfOnline ? '你在線' : '同步在線狀態中'
  };
};
