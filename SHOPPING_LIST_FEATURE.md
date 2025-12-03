# 購物清單功能文檔

## 功能概述

成功在 Trip Planner 應用中集成了完整的購物清單功能。用戶可以在行程期間記錄購物計劃，支持店家名稱、商品、圖片上傳、備註（含連結支持）。

## 新增文件

### `/src/components/ShoppingList.jsx`
主要購物清單組件，包含以下子組件：

#### 1. **ShoppingList** (主組件)
- **功能**: 管理多個購物清單，每個清單包含多個購物項目
- **狀態管理**:
  - `lists`: 購物清單數組
  - `newList`: 新清單名稱輸入
  - `expandedList`: 當前展開的清單
  - `showForm`: 控制新增項目表單顯示
- **localStorage 集成**: 自動保存和加載購物清單
- **功能**:
  - 創建新清單
  - 刪除清單
  - 展開/摺疊清單
  - 添加/編輯/刪除清單項目
  - 切換購買狀態

#### 2. **ShoppingItemCard** (購物項目卡片)
- **顯示內容**:
  - 店家名稱（藍色標籤）
  - 商品名稱（紫色標籤）
  - 商品圖片（如有）
  - 備註（支持連結檢測和呈現）
  - 購買狀態複選框
- **操作**:
  - 勾選標記為已購買（灰色化）
  - 編輯項目
  - 刪除項目
  - 自動檢測並渲染備註中的 URL 連結

#### 3. **ShoppingItemForm** (新增項目表單)
- **輸入欄位**:
  - 店家名稱
  - 商品名稱
  - 數量
  - 商品圖片上傳（支持 Base64 存儲）
  - 備註（支持任意文字和連結）
- **圖片處理**:
  - 使用 FileReader API 轉換為 Base64
  - 圖片預覽
  - 支持刪除已上傳圖片
- **驗證**: 店家和商品為必填項

## 集成更改

### `/src/pages/TripDetailPage.jsx`

#### 新增 Import
```jsx
import { ShoppingCart } from 'lucide-react';
import ShoppingList from '../components/ShoppingList';
```

#### 新增狀態
```jsx
const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
```

#### Header 導覽列新增購物按鈕
在導覽列（總覽、行程表、清單、機票/住宿）下方添加「購物」按鈕：
- 點擊打開購物清單模態窗口
- 顯示購物車圖標
- 使用 `ShoppingCart` 圖標

#### 頁面末尾新增組件
```jsx
<ShoppingList
  isOpen={isShoppingListOpen}
  onClose={() => setIsShoppingListOpen(false)}
/>
```

## 功能特性詳解

### 1. **多清單管理**
- 支持創建多個獨立清單（如：東京購物、紐約購物等）
- 每個清單獨立管理項目和進度
- 顯示已購買/總項目數

### 2. **完整的購物項目記錄**
```javascript
{
  id: timestamp,
  shop: "店家名稱",
  product: "商品名稱",
  quantity: 1,
  notes: "備註或連結",
  image: "Base64 圖片數據",
  purchased: false
}
```

### 3. **圖片上傳和存儲**
- 使用 FileReader API 將圖片轉換為 Base64
- 存儲在 localStorage（支持最大 ~10MB）
- 圖片預覽在卡片中顯示
- 支持刪除已上傳圖片

### 4. **備註和連結支持**
- 備註欄位支持任意文本和 URL
- 自動檢測 `https://` 開頭的連結
- 連結自動呈現為藍色可點擊按鈕，帶外部連結圖標
- 連結在新標籤頁打開

### 5. **購買狀態跟蹤**
- 複選框切換已購買狀態
- 已購買項目視覺上變灰色和加刪除線
- 清單標題顯示進度（已購買/總數）

### 6. **編輯功能**
- 點擊編輯按鈕進入編輯模式
- 可編輯所有項目信息（除 ID 外）
- 保存或取消編輯操作

### 7. **localStorage 持久化**
- 自動保存所有清單和項目
- 應用刷新後數據不丟失
- 錯誤處理：加載失敗時提示

## 使用步驟

### 1. 打開購物清單
點擊導覽列中的「購物」按鈕（🛒 圖標）

### 2. 創建新清單
1. 在輸入框中輸入清單名稱（如：東京購物清單）
2. 點擊「新增」按鈕或按 Enter

### 3. 添加購物項目
1. 點擊清單標題展開清單
2. 點擊「新增項目」按鈕
3. 填入以下信息：
   - **店家**: 購物地點（必填）
   - **商品**: 商品名稱（必填）
   - **數量**: 默認為 1
   - **圖片**: 可選，點擊區域選擇圖片
   - **備註**: 可包含連結 (https://...)
4. 點擊「新增項目」保存

### 4. 管理購物項目
- **標記已購買**: 點擊項目左側複選框
- **編輯**: 點擊鉛筆圖標，修改後點擊「保存」
- **刪除**: 點擊垃圾桶圖標

### 5. 查看進度
清單標題下方顯示 "已購買/總數"，如 "2/5 已購買"

## 技術實現細節

### 組件結構
```
TripDetailPage
├── Header (已有)
├── 導覽列 (已修改，添加購物按鈕)
├── 各標籤內容 (已有)
├── SettingsPanel (已有)
└── ShoppingList (新增)
    ├── ShoppingList (主組件)
    ├── ShoppingItemCard (單個項目卡片)
    └── ShoppingItemForm (新增項目表單)
```

### 狀態管理
- **列表級**: React useState 管理各個狀態
- **持久化**: localStorage 自動保存
- **無需後端**: 完全客戶端實現

### 樣式設計
- **Tailwind CSS**: 響應式設計
- **Lucide React**: UI 圖標（Plus, Trash2, Edit2, Upload, ExternalLink 等）
- **配色**:
  - 藍色：店家標籤、主操作
  - 紫色：商品標籤
  - 黃色：備註背景
  - 綠色：已購買標籤

### 圖片處理
```javascript
const reader = new FileReader();
reader.onloadend = () => {
  setImagePreview(reader.result);
  setFormData({ ...formData, image: reader.result });
};
reader.readAsDataURL(file);
```

## 移動端適配

- 導覽列購物按鈕響應式設計
- 購物清單模態在小屏幕上正確顯示
- 項目卡片在小屏上堆疊排列
- 圖片預覽自動調整大小

## 未來擴展方向

1. **搜索和篩選**: 按店家、狀態篩選
2. **分類標籤**: 為購物項目添加分類（服裝、食品等）
3. **預算整合**: 添加價格跟蹤和預算管理
4. **共享功能**: 與他人共享購物清單
5. **雲端同步**: Firebase 集成持久化
6. **購物統計**: 可視化已購買項目統計
7. **優先級排序**: 按優先級排序項目

## 常見問題

### Q: 圖片數據會丟失嗎？
A: 圖片存儲在瀏覽器的 localStorage 中，除非清除瀏覽器緩存，否則數據持久保存。

### Q: 如何備份購物清單？
A: 數據自動保存在 localStorage。可以通過瀏覽器開發者工具 → Application → localStorage 查看。

### Q: 多個設備能共享清單嗎？
A: 目前不支持。未來可通過 Firebase 實現跨設備同步。

### Q: 圖片上傳有大小限制嗎？
A: localStorage 通常限制為 5-10MB（因瀏覽器而異）。建議使用中等大小的圖片。

## 檔案清單

### 新增
- `/src/components/ShoppingList.jsx` - 購物清單完整組件

### 修改
- `/src/pages/TripDetailPage.jsx`
  - 添加 ShoppingCart 圖標 import
  - 添加 ShoppingList 組件 import
  - 添加 `isShoppingListOpen` 狀態
  - 添加購物按鈕到導覽列
  - 添加 ShoppingList 組件實例

## 測試清單

- [x] ShoppingList 組件正確渲染
- [x] 創建新清單功能正常
- [x] 添加購物項目成功
- [x] 圖片上傳和預覽工作
- [x] 編輯項目功能正常
- [x] 刪除功能正常
- [x] 購買狀態切換正常
- [x] localStorage 持久化正常
- [x] 連結自動檢測和渲染
- [x] 導覽列購物按鈕整合
- [x] 模態窗口正確關閉

## 代碼質量

- **JSDoc 註釋**: 所有主要功能都有文檔
- **錯誤處理**: localStorage 加載失敗時有 try-catch
- **響應式設計**: 移動端和桌面端都適配
- **易用性**: 直觀的 UI 和清晰的說明文本
- **性能**: 高效的狀態管理，避免不必要的重新渲染

## 版本信息

- **創建日期**: 2024
- **React 版本**: 18.2.0
- **Tailwind CSS**: 3.4.18
- **Lucide React**: 最新版
- **瀏覽器支持**: 所有現代瀏覽器（支持 FileReader API 和 localStorage）
