# Trip Planner

一個以 React + Vite 開發的旅遊行程管理應用，聚焦旅遊情境，支援每日行程安排、事件管理、天氣資訊與預算追蹤，方便在出發前與旅途中集中管理旅遊資訊。

## 功能特色

- 行程列表與行程詳情頁（Trip List / Trip Detail）
- iPhone 旅途中首頁：預設顯示下一站、今日行程、導航、天氣與重要提醒
- 依日期管理活動事件與備註
- 天氣相關元件（旅程天氣、事件天氣）
- 預算與支出追蹤（Budget / Expense）
- 打包清單與購物清單
- 設定面板與底部導覽等行動裝置友善介面

## 行動版體驗

旅程詳情頁在手機上預設進入「旅途」分頁，讓旅途中打開 app 時優先看到下一步，而不是完整管理工作台：

- 下一站卡片：顯示時間、地點、天氣、備註、單一導航入口
- 今日行程：用精簡時間線呈現當天安排，保留查看詳情與導航操作
- 今日路線：可快速開啟 Google Maps 路線，細節與地圖預覽預設收合
- 重要提醒：最多顯示 3 件需要立即注意的事項，例如缺住宿、缺地點或預算超支
- 更多功能：完整總覽、行前、行李與資訊頁收在「更多」選單，降低 iPhone 首屏負擔

## 技術

- React 18
- React Router
- Vite 5
- Tailwind CSS
- Firebase Authentication / Firestore / Realtime Database / Cloud Functions
- Vercel serverless API（航班查詢）

## 專案結構

```text
src/
  components/      UI 元件
  hooks/           業務邏輯 Hooks
  pages/           頁面元件
  services/        天氣、地點、匯率、行程等服務
  styles/          全域樣式

api/               Vercel serverless API（例如航班查詢）
functions/         Firebase Cloud Functions
docs/              Firebase 部署、資料模型與重構說明
database/          Legacy / reference SQL schema
public/            靜態資源
```

## 快速開始

### 1) 安裝相依套件

```bash
npm install
```

### 2) 啟動開發環境

```bash
npm run dev
```

預設情況下，Vite 會輸出本機存取網址（通常為 `http://localhost:5173`）。

### 3) 建置正式版本

```bash
npm run build
```

### 4) 預覽建置結果

```bash
npm run preview
```

## 環境變數

請以 `.env.example` 作為完整範本。常用設定分成三類：

- 前端 Vite 變數：Firebase web app 設定、Realtime Database URL、主要 owner email、Google Maps key，皆使用 `VITE_` 前綴。
- Server-side 變數：航班查詢使用 FlightAPI.io，API key 必須放在 server-side environment，不要加上 `VITE_` 前綴。
- Firebase Functions secrets：Email 驗證碼、邀請碼與寄信服務使用 `RESEND_API_KEY`、`EMAIL_CODE_PEPPER`、`INVITE_CODE_PEPPER` 等 secrets。

航班查詢範例：

```env
FLIGHTAPI_IO_KEY=your_flightapi_io_key_here
```

本機若要測試 `/api/flight-lookup`，請使用 Vercel dev server 或部署到 Vercel 後測試；一般 `npm run dev` 只會啟動 Vite 前端。

## 資料與後端

- Cloud Firestore 是目前旅程資料的主要來源。
- Realtime Database 只用於旅伴 presence / 線上狀態。
- Firebase Authentication 支援 Google 登入與 Email 驗證碼登入。
- Cloud Functions 負責 Email 驗證碼、邀請碼、owner claim 與 presence ACL 同步。
- `database/schema.sql` 是 legacy / reference schema，不是目前 app 的主要資料來源。

## 部署

Firebase Hosting 使用 `dist` 目錄，SPA fallback 設定在 `firebase.json`。

```bash
npm run deploy:hosting
```

完整 Firebase deploy 會同時部署 Firestore rules、Realtime Database rules、Functions 與 Hosting，只有在後端、rules 或 functions 有變更時才需要：

```bash
npm run deploy
```

Vercel 部署使用 `vercel.json`，包含 Firebase Auth helper rewrites 與 `/trip/*`、`/login` 的 SPA rewrites。更完整的 Firebase 設定與 portable Node 流程請見 `docs/firebase-deployment.md`。

## 其他文件

專案另附多份功能說明文件（如天氣定位、購物清單、打包清單）：

- `WEATHER_GPS_INTEGRATION.md`
- `SHOPPING_LIST_QUICK_START.md`
- `PACKING_LIST_NEW_FEATURES.md`

## 授權

目前此儲存庫尚未明確宣告開源授權條款；如需商業使用或二次散布，請先與維護者確認。
