import {
  CheckSquare,
  CircleDollarSign,
  Compass,
  LayoutDashboard,
  Lightbulb,
  Luggage,
  Map,
  Menu,
  Plane,
  ShoppingBag,
  UsersRound
} from 'lucide-react';

export const TRIP_NAV_ITEMS = [
  { id: 'today', label: '旅程總覽', mobileLabel: '總覽', icon: Compass, group: 'primary', mobile: true },
  { id: 'itinerary', label: '行程安排', mobileLabel: '行程', icon: Map, group: 'primary', mobile: true },
  { id: 'ideas', label: '靈感與地點', mobileLabel: '靈感', icon: Lightbulb, group: 'primary', mobile: true },
  { id: 'summary', label: '旅程控制台', mobileLabel: '控制台', icon: LayoutDashboard, group: 'planning' },
  { id: 'flights', label: '航班與住宿', mobileLabel: '航宿', icon: Plane, group: 'planning' },
  { id: 'preTrip', label: '行前準備', mobileLabel: '行前', icon: CheckSquare, group: 'planning' },
  { id: 'packing', label: '行李清單', mobileLabel: '行李', icon: Luggage, group: 'planning' },
  { id: 'expenses', label: '支出與預算', mobileLabel: '預算', icon: CircleDollarSign, group: 'planning' },
  { id: 'shopping', label: '購物清單', mobileLabel: '購物', icon: ShoppingBag, group: 'planning' },
  { id: 'companions', label: '旅伴與分享', mobileLabel: '旅伴', icon: UsersRound, group: 'planning' },
  { id: 'more', label: '更多', mobileLabel: '更多', icon: Menu, group: 'mobile', mobile: true }
];

export const PRIMARY_TRIP_NAV_ITEMS = TRIP_NAV_ITEMS.filter((item) => item.group === 'primary');
export const PLANNING_TRIP_NAV_ITEMS = TRIP_NAV_ITEMS.filter((item) => item.group === 'planning');
export const MOBILE_TRIP_NAV_ITEMS = TRIP_NAV_ITEMS.filter((item) => item.mobile);
export const MORE_CHILD_TAB_IDS = new Set([
  'summary',
  'flights',
  'preTrip',
  'packing',
  'expenses',
  'shopping',
  'companions',
  'more'
]);

export const isMobileTripNavActive = (tabId, activeTab) => (
  tabId === 'more' ? MORE_CHILD_TAB_IDS.has(activeTab) : tabId === activeTab
);

export const getTripNavLabel = (activeTab) => (
  TRIP_NAV_ITEMS.find((item) => item.id === activeTab)?.label || '旅程內容'
);
