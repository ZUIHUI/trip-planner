# 旅行規劃應用 - 重構說明

## 新的目錄結構

```
src/
  ├── App.jsx              # 主應用組件，使用 hooks 和新的 components
  ├── main.jsx             # React 入口點
  ├── firebase.js          # 舊版本（已移動至 services/firebase.js）
  ├── index.css            # 舊版本（已移動至 styles/index.css）
  │
  ├── components/          # UI 組件庫
  │   ├── Header.jsx       # 旅程標題/日期/住宿展示
  │   ├── Modal.jsx        # 通用對話框組件
  │   ├── EditEventForm.jsx # 事件編輯表單
  │   ├── EventCard.jsx    # 單一事件卡片
  │   └── Checklist.jsx    # 待辦清單組件
  │
  ├── pages/               # 頁面組件（未來使用）
  │   ├── TripListPage.jsx     # 旅程列表
  │   ├── TripDetailPage.jsx   # 旅程詳情
  │   ├── DayPlannerPage.jsx   # 日程規劃
  │   └── SettingsPage.jsx     # 設定頁面
  │
  ├── services/            # 業務邏輯層
  │   ├── firebase.js      # Firebase 初始化 ✅
  │   └── tripService.js   # Firestore CRUD 操作 ✅
  │
  ├── hooks/               # 自定義 Hooks
  │   ├── useTrip.js       # 旅程狀態管理 + Firebase 同步 ✅
  │   └── useBudget.js     # 預算計算 ✅
  │
  └── styles/              # 樣式表
      └── index.css        # Tailwind + 自訂動畫 ✅
```

## 已完成的重構

### ✅ 組件提取
- `Header` → `components/Header.jsx`
- `Modal` → `components/Modal.jsx`
- `EditEventForm` → `components/EditEventForm.jsx`
- `EventCard` → `components/EventCard.jsx`
- `Checklist` → `components/Checklist.jsx`

### ✅ 服務層建立
- `services/firebase.js` - Firebase 初始化
- `services/tripService.js` - Firestore 操作函數
  - `loadTrip()` - 載入旅程
  - `saveTrip()` - 儲存/更新旅程
  - `createTrip()` - 新建旅程
  - `listTrips()` - 列出所有旅程
  - `deleteTrip()` - 刪除旅程

### ✅ Hooks 建立
- `hooks/useTrip.js` - 統一管理旅程狀態和 Firebase 同步
  - 返回：`{ isLoading, tripDetails, setTripDetails, itinerary, setItinerary, checklists, setChecklists }`
  - 自動防抖儲存（1 秒）
  - 故障恢復機制

- `hooks/useBudget.js` - 預算計算
  - 返回：`{ totalEvents, totalCost, dailyCosts, averageDailyCost }`

### ✅ App.jsx 簡化
新的 `App.jsx` 現在：
- 更加簡潔和可讀（~450 行 vs 原本 ~900 行）
- 使用 hooks 管理狀態
- 所有業務邏輯依賴注入
- 清晰的關注點分離

## 核心特性保留

✅ 所有原有功能都已保留：
- 4 個標籤（Summary、Itinerary、Checklist、Flights/Accommodation）
- 事件管理（新增、編輯、刪除）
- 備忘錄系統
- 預算追蹤
- 行李清單
- Firebase 自動同步
- 響應式設計

## 未來可擴展方向

1. **頁面路由** - 使用 React Router
   - `TripListPage.jsx` - 多旅程列表
   - `TripDetailPage.jsx` - 旅程詳情
   - `DayPlannerPage.jsx` - 日程詳細規劃
   - `SettingsPage.jsx` - 應用設定

2. **更多 Hooks**
   - `useAuth()` - 用戶認證
   - `useNotification()` - 通知系統
   - `useLocalStorage()` - 本地緩存

3. **狀態管理**
   - Context API 或 Redux
   - 全局狀態共享

4. **測試框架**
   - Jest 單元測試
   - React Testing Library 組件測試

## 使用指南

### 啟動應用
```bash
npm run start
```

### 導入組件
```jsx
import Header from './components/Header';
import { useTrip } from './hooks/useTrip';
import { loadTrip } from './services/tripService';
```

### 使用 useTrip Hook
```jsx
const { isLoading, tripDetails, itinerary, checklists } = useTrip(tripId, initialTripDetails, initialItinerary);
```

### Firebase 操作
```jsx
import { loadTrip, saveTrip, createTrip, deleteTrip } from './services/tripService';

const trip = await loadTrip('my-trip-id');
await saveTrip('my-trip-id', tripData);
```

## 注意事項

1. **舊檔案兼容性**
   - `src/firebase.js` 仍存在但已重複（可刪除）
   - `src/index.css` 仍存在但已重複（可刪除）
   - `src/App.backup.jsx` 是舊版本備份

2. **依賴注入**
   - 所有 service 函數都依賴 `src/services/firebase.js` 的 `db` 實例
   - 確保 Firebase 配置正確

3. **防抖保存**
   - `useTrip` 會自動防抖儲存（1 秒）
   - 組件卸載時自動清除計時器

祝開發愉快！🚀
