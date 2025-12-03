# 天氣與 GPS 整合指南

## 概述
已成功整合真實天氣 API 和 GPS 定位功能，替換了之前的模擬天氣系統。

## 新增功能

### 1. 真實天氣 API - Open-Meteo
- **服務文件**: `src/services/weatherService.js`
- **API 終點**: `https://archive-api.open-meteo.com/v1/archive`
- **特性**:
  - 免費無需 API Key
  - 支援歷史和預測天氣數據
  - 高精度（網格間距 11 公里）
  - 完全開源

#### 獲取天氣數據

```javascript
import { getWeatherForDate } from '@/services/weatherService';

// 基本用法（使用地點名稱）
const weather = await getWeatherForDate('12/03', '東京');

// 使用 GPS 坐標（更精準）
const weather = await getWeatherForDate('12/03', '東京', {
  lat: 35.6895,
  lon: 139.7037
});

// 返回結果
{
  success: true,
  date: '12/03',
  location: '東京',
  temperature: 15,          // 攝氏度
  weatherCode: 0,           // WMO 天氣代碼
  icon: '☀️',               // 天氣圖示
  description: '晴天',      // 天氣描述
  source: 'open-meteo'
}
```

### 2. GPS 定位功能
- **服務文件**: `src/services/locationService.js`
- **特性**:
  - 高精度定位（enableHighAccuracy: true）
  - 位置反向編碼（經度緯度 → 地點名稱）
  - 支援位置監視（持續更新）
  - 台灣 + 日本主要城市數據庫

#### 獲取當前位置

```javascript
import { getDeviceLocation, watchDeviceLocation } from '@/services/locationService';

// 一次性獲取位置
const location = await getDeviceLocation();
// 返回:
{
  latitude: 35.6895,
  longitude: 139.7037,
  locationName: '新宿',
  accuracy: 65  // 精度（公尺）
}

// 持續監視位置變化
const stopWatch = watchDeviceLocation((location) => {
  console.log('位置已更新:', location);
});

// 停止監視
stopWatch();
```

#### 反向地理編碼（經度緯度轉地點名稱）

```javascript
import { reverseGeocodeCoordinates } from '@/services/locationService';

const locationName = reverseGeocodeCoordinates(35.6895, 139.7037);
// 返回: '新宿'
```

### 3. 支援的位置

#### 台灣
- 台北、台中、高雄、台南、新竹

#### 日本（東京地區）
- 地區: 新宿、澀谷、銀座、淺草、秋葉原、原宿、六本木 等
- 景點: 晴空塔、東京迪士尼、富士山、築地市場 等
- 機場: 羽田、成田

## 整合到 React 組件

### WeatherWidget 組件

```jsx
import WeatherWidget from '@/components/WeatherWidget';

<WeatherWidget 
  date="12/03"
  currentLocation={{           // GPS 對象（可選）
    latitude: 35.6895,
    longitude: 139.7037,
    locationName: '新宿'
  }}
  accommodation="東京"         // 預設位置
  firstEventLocation="淺草"    // 行程地點
  selectedEventLocation="銀座" // 選中的行程
/>
```

**優先級邏輯**（由高到低）:
1. 用戶選中的行程地點
2. 第一個行程的地點
3. GPS 當前位置
4. 住宿地點（預設）

### EventWeatherWidget 組件

```jsx
import EventWeatherWidget from '@/components/EventWeatherWidget';

<EventWeatherWidget 
  date="12/03"
  location="東京"
  gpsCoords={{  // 可選，提高精確度
    lat: 35.6895,
    lon: 139.7037
  }}
/>
```

## 使用 GPS Hook

```jsx
import { useDeviceLocation } from '@/hooks/useDeviceLocation';

function MyComponent() {
  // enableGPS: true 啟用 GPS，false 禁用
  const { currentLocation, isLocating, locationError } = useDeviceLocation(true);
  
  if (isLocating) return <div>正在定位...</div>;
  if (locationError) return <div>錯誤: {locationError}</div>;
  
  if (currentLocation) {
    return (
      <div>
        <p>當前位置: {currentLocation.locationName}</p>
        <p>精度: {currentLocation.accuracy}m</p>
      </div>
    );
  }
}
```

## WMO 天氣代碼對應

| 代碼 | 含義 | 圖示 |
|------|------|------|
| 0 | 晴天 | ☀️ |
| 1-2 | 多雲 | 🌤️⛅ |
| 3 | 陰天 | ☁️ |
| 45-48 | 霧 | 🌫️ |
| 51-55 | 毛毛雨 | 🌧️ |
| 61-63 | 小中雨 | 🌧️ |
| 65 | 大雨 | ⛈️ |
| 71-77 | 雪 | ❄️ |
| 80-82 | 雷陣雨 | ⛈️ |
| 85-86 | 陣雪 | ❄️ |
| 95-99 | 雷暴 | ⛈️ |

## 瀏覽器權限要求

使用 GPS 功能需要以下權限:
- **HTTPS 連接**（本地開發使用 localhost 除外）
- **地理位置權限**（用戶會看到權限提示）

## 日期格式

所有日期輸入都使用 `MM/DD` 格式:
- 例: `"12/03"` 表示 12 月 3 日
- API 會根據當前年份自動計算完整日期

## 錯誤處理

```javascript
const weather = await getWeatherForDate('12/03', '東京');

if (!weather.success) {
  console.error('天氣獲取失敗:', weather.error);
  // 應用程式應提供備用 UI
}
```

## 效能提示

1. **快取位置**: GPS 位置快取 60 秒，減少 API 呼叫
2. **延遲加載**: 組件添加 100ms 延遲以確保 DOM 更新
3. **並行請求**: 天氣和位置服務獨立運作，可並行執行

## 測試建議

1. 測試不同地點的天氣取得
2. 測試 GPS 定位（使用 Chrome DevTools 模擬位置）
3. 測試無 GPS 情況下的備用位置
4. 測試不同日期的天氣變化

## 常見問題

### Q: 沒有取得 GPS 數據時會發生什麼？
A: 系統會自動使用地點名稱或預設位置（東京）。

### Q: 可以自訂支援的位置清單嗎？
A: 可以編輯 `LOCATION_COORDS` 在 `weatherService.js` 或 `LOCATIONS_DATABASE` 在 `locationService.js`。

### Q: API 有使用限制嗎？
A: Open-Meteo 無請求限制，但建議不要連續發送大量請求。

### Q: 可以離線使用嗎？
A: 不行，需要網路連接才能取得天氣數據。
