# Trip Planner 重構路線圖

## 已完成

- 建立 v2 旅程資料模型：`src/domain/tripSchema.js`
- Firebase 讀寫集中到服務層：`src/services/tripService.js`
- Google Maps 連結與地理編碼工具：`src/services/googleMapsService.js`
- 建立 trip workspace context：`src/contexts/TripWorkspaceContext.jsx`
- 拆分 `TripDetailPage` 的主要頁籤：
  - `src/components/trip/SummaryTab.jsx`
  - `src/components/trip/ItineraryTab.jsx`
  - `src/components/trip/LogisticsTab.jsx`
  - `src/components/trip/PreTripTab.jsx`
  - `src/components/trip/PackingTab.jsx`
  - `src/components/trip/ShoppingTab.jsx`
  - `src/components/trip/ExpensesTab.jsx`
- Google Places 輸入基礎：
  - `src/components/GooglePlaceInput.jsx`
  - 住宿地址與行程地點可保存 `placeId`、`address`、`lat`、`lng`

## 下一階段

1. **Planning modules**
   - 將 pre-trip checklist、packing list、shopping list 的狀態逐步對齊 v2 `planning` 節點。
   - 繼續保留 legacy `checklists`、`shoppingList`、`shoppingCategories`，確保舊 Firebase 文件可讀寫。

2. **Google Places**
   - 補上地點欄位的鍵盤選取細節、API error UI 狀態與地區偏好設定。
   - 後續可將 Places Autocomplete 擴充到購物店家與每日第一站快速搜尋。

3. **Offline travel pack**
   - 產出可離線查看的每日行程、住宿、航班、購物與費用摘要。
   - 後續可再加入 PDF 匯出。

4. **Bundle split**
   - 將購物、費用、圖表或大型模組改為 dynamic import。
   - 目標是降低 Vite build 的 500 kB chunk warning。
