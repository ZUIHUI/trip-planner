# 購物清單功能 - 快速開始指南

## 功能預覽 🛒

**新增購物清單功能**，可以在行程計劃中記錄購物清單，支持：
- ✅ 多個獨立清單管理
- ✅ 記錄店家、商品名稱
- ✅ 商品圖片上傳（Base64 存儲）
- ✅ 備註欄位（支持 URL 連結）
- ✅ 購買狀態追蹤
- ✅ 完整的編輯/刪除功能
- ✅ localStorage 自動保存

## 整合位置

### 導覽列
```
[總覽] [行程表] [清單] [機票/住宿] [🛒 購物] ← 新增購物按鈕
```

點擊「購物」按鈕即可打開購物清單模態窗口

## 使用示例

### 1. 打開購物清單
點擊導覽列中的 🛒 購物按鈕

### 2. 創建清單
```
輸入框: "東京購物清單"
點擊: 新增 ← 清單建立完成
```

### 3. 添加購物項目
```
點擊: 新增項目
填入:
  店家: 池袋 Don Quijote
  商品: 尼龍外套
  數量: 2
  圖片: [選擇商品圖片]
  備註: 參考連結 https://www.donquijote.co.jp
點擊: 新增項目 ← 項目添加完成
```

### 4. 管理項目
- ☑️ 勾選 = 標記為已購買（變灰色）
- ✏️ 編輯 = 修改項目信息
- 🗑️ 刪除 = 移除項目

## 核心數據結構

```javascript
// 購物清單
{
  id: 1234567890,
  name: "東京購物清單",
  items: [
    {
      id: 9876543210,
      shop: "池袋 Don Quijote",      // 店家名稱
      product: "尼龍外套",            // 商品名稱
      quantity: 2,                   // 數量
      image: "data:image/png;...",   // Base64 圖片
      notes: "參考 https://...",     // 備註（支持 URL）
      purchased: false               // 購買狀態
    }
  ],
  createdAt: "2024-01-15T10:30:00Z"
}
```

## localStorage 鑰值

- **鑰**: `shoppingLists`
- **值**: JSON 字符串，包含所有清單
- **自動**: 每次修改自動保存
- **容量**: 通常 5-10MB（視瀏覽器而定）

## 特殊功能

### 連結自動檢測 🔗
備註欄中以 `https://` 開頭的文本自動呈現為可點擊連結：
```
備註: "詳見 https://www.example.com 查看更多"
     → 詳見 [https://www.example.com] (可點擊) 查看更多
```

### 圖片 Base64 存儲
- 點擊虛線框上傳圖片
- 自動轉換為 Base64 格式
- 存儲在 localStorage
- 支持刪除已選圖片

### 購買進度追蹤
清單標題下方顯示進度：
```
東京購物清單
2/5 已購買  ← 5 個項目中已購買 2 個
```

## 文件位置

### 新增
```
src/components/ShoppingList.jsx (519 行)
  ├── ShoppingList (主組件)
  ├── ShoppingItemCard (項目卡片)
  └── ShoppingItemForm (新增表單)
```

### 修改
```
src/pages/TripDetailPage.jsx
  ├── 添加 ShoppingCart 圖標 import
  ├── 添加 ShoppingList 組件 import
  ├── 添加 isShoppingListOpen 狀態
  ├── 導覽列新增購物按鈕
  └── 頁面末尾添加 ShoppingList 組件實例
```

## 代碼示例

### 在 TripDetailPage 中的集成
```jsx
// 1. Import
import ShoppingList from '../components/ShoppingList';
import { ShoppingCart } from 'lucide-react';

// 2. 狀態
const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);

// 3. 導覽列按鈕
<button
  onClick={() => setIsShoppingListOpen(true)}
  className="flex-1 py-2 rounded-lg text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors flex items-center justify-center gap-1"
>
  <ShoppingCart size={18} />
  購物
</button>

// 4. 組件實例
<ShoppingList
  isOpen={isShoppingListOpen}
  onClose={() => setIsShoppingListOpen(false)}
/>
```

### ShoppingList 組件用法
```jsx
<ShoppingList 
  isOpen={boolean}      // 控制模態顯示/隱藏
  onClose={function}    // 點擊關閉時回調
/>
```

## 故障排除

### 數據不保存？
1. 檢查瀏覽器是否允許 localStorage
2. 檢查開發者工具 → Application → localStorage
3. 確認 `shoppingLists` 鑰值存在

### 圖片不顯示？
1. 確認選擇的是有效圖片文件
2. 檢查浏览器支持 FileReader API（所有現代瀏覽器支持）
3. 刪除圖片後重新上傳

### 連結不可點擊？
1. 確認備註中的 URL 以 `https://` 或 `http://` 開頭
2. 檢查 URL 格式是否正確
3. 連結會自動檢測，無需特殊格式

## 性能考慮

- **localStorage 大小**: 建議圖片不超過 1-2MB
- **清單數量**: 可支持數十個清單無性能問題
- **項目數量**: 每個清單建議不超過 100 項

## 瀏覽器兼容性

✅ Chrome 90+
✅ Firefox 88+
✅ Safari 14+
✅ Edge 90+
❌ Internet Explorer (不支持)

## 下一步

1. **測試功能**: 創建測試清單和項目
2. **上傳圖片**: 測試圖片上傳和預覽
3. **添加連結**: 在備註中添加 URL 連結
4. **刷新頁面**: 驗證 localStorage 持久化
5. **編輯/刪除**: 測試所有編輯功能

## 提示和技巧 💡

- **快速添加**: 填完表單後按 Enter 可直接新增
- **批量操作**: 逐個勾選已購買項目追蹤進度
- **組織清單**: 為不同目的創建不同清單（購物、美食、景點等）
- **備註整理**: 在備註欄放入相關連結和店家信息

## 常見使用場景

### 場景 1: 東京購物之旅
```
清單: 東京購物清單
  ├─ 池袋 Don Quijote / 尼龍外套 / 2件 / ☑ 已購買
  ├─ 新宿 Uniqlo / T恤 / 1件 / ☐ 未購買
  └─ 澀谷 109 / 限定商品 / 1件 / ☐ 未購買

進度: 1/3 已購買
```

### 場景 2: 旅遊用品採購
```
清單: 行前準備清單
  ├─ 便利店 / 感冒藥 / 1盒 / ☑ 已購買
  ├─ 登山用品店 / 防曬乳 / 1瓶 / ☑ 已購買
  └─ 藥局 / 外傷藥 / 1盒 / ☐ 未購買

進度: 2/3 已購買
```

## 技術支持

如有任何問題或建議，請參考以下文件：
- 詳細文檔: `SHOPPING_LIST_FEATURE.md`
- 功能實現: `src/components/ShoppingList.jsx`
- 整合代碼: `src/pages/TripDetailPage.jsx`
