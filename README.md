# Trip Planner

一個以 React + Vite 開發的旅遊行程管理應用，聚焦旅遊情境，支援每日行程安排、事件管理、天氣資訊與預算追蹤，方便在出發前與旅途中集中管理旅遊資訊。

## 功能特色

- 行程列表與行程詳情頁（Trip List / Trip Detail）
- 依日期管理活動事件與備註
- 天氣相關元件（旅程天氣、事件天氣）
- 預算與支出追蹤（Budget / Expense）
- 打包清單與購物清單
- 設定面板與底部導覽等行動裝置友善介面

## 技術

- React 18
- React Router
- Vite 5
- Tailwind CSS
- Firebase（相依套件已整合）

## 專案結構

```text
src/
  components/      UI 元件
  hooks/           業務邏輯 Hooks
  pages/           頁面元件
  services/        天氣、地點、匯率、行程等服務
  styles/          全域樣式

database/          SQL 結構定義
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

## 資料庫說明

資料表結構定義位於：

- `database/schema.sql`

可依此檔案在本地資料庫初始化所需表結構。

## 其他文件

專案另附多份功能說明文件（如天氣定位、購物清單、打包清單）：

- `WEATHER_GPS_INTEGRATION.md`
- `SHOPPING_LIST_QUICK_START.md`
- `PACKING_LIST_NEW_FEATURES.md`

## 授權

目前此儲存庫尚未明確宣告開源授權條款；如需商業使用或二次散布，請先與維護者確認。
