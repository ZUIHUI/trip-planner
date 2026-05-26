# Trip Planner v2 資料模型

## Structured Places

- 住宿資料可保存 `name`、`address`、`placeId`、`lat`、`lng`。
- 行程事件在 app state 中保留 legacy `location` 字串，並新增 `locationPlace` metadata。
- 寫入 Firebase v2 時，`itineraryDays[].events[].location` 會轉成結構化地點物件。
- 舊資料仍可讀取；只有純文字地點時會以文字填入 `name` 與 `address`，`placeId` 與座標保持空值。
## 目標

- 保留既有 Firebase `trips/{tripId}` 文件，不需要一次搬資料。
- 新增 `schemaVersion: 2`，讓後續功能能依穩定結構開發。
- 寫入時同時保留舊欄位：`tripDetails`、`itinerary`、`checklists`、`expenses`。
- 讀取時可接受舊資料或 v2 資料，統一轉成目前 UI 可使用的 app state。

## Firebase 文件結構

```json
{
  "schemaVersion": 2,
  "id": "trip-...",
  "meta": {
    "title": "2026 東京賞櫻",
    "status": "planning",
    "dateRange": {
      "start": "2026-03-26",
      "end": "2026-03-31"
    },
    "coverImage": "",
    "createdAt": "2026-05-19T00:00:00.000Z",
    "updatedAt": "2026-05-19T00:00:00.000Z"
  },
  "logistics": {
    "accommodation": {},
    "flights": {},
    "travelers": []
  },
  "planning": {
    "checklists": {
      "preTrip": [],
      "packing": []
    },
    "shoppingList": null,
    "shoppingCategories": null
  },
  "finance": {
    "budget": {
      "total": "",
      "currency": "TWD"
    },
    "expenses": []
  },
  "itineraryDays": [
    {
      "id": "day-1",
      "dayNumber": 1,
      "date": "3/26",
      "weekday": "Thu",
      "title": "Day 1",
      "events": [
        {
          "id": "event-...",
          "startTime": "09:00",
          "endTime": "",
          "type": "sightseeing",
          "title": "淺草",
          "description": "",
          "location": {
            "name": "淺草",
            "address": "淺草",
            "placeId": "",
            "lat": null,
            "lng": null
          },
          "urgent": false,
          "transport": {},
          "cost": {
            "amount": 0,
            "currency": "JPY"
          },
          "url": "",
          "memos": []
        }
      ]
    }
  ]
}
```

## 遷移策略

- `src/domain/tripSchema.js` 負責資料正規化與 v2 文件組裝。
- `src/services/tripService.js` 讀取 Firebase 時會把舊文件轉成 UI app state。
- 儲存 Firebase 時會寫入 v2 區塊，並保留 legacy 欄位，降低一次重構的風險。
- localStorage 也會在後續保存時改存 v2 文件；舊 key 仍會被 `useTrip` 遷移。

## Google API

- 前端不再使用 `VITE_GOOGLE_MAPS_API_KEY`；Google Places / Geocoding 改由 Firebase Callable Functions 讀取 `GOOGLE_GEOCODING_API_KEY` secret。
- Google Maps URL 導航不需要 API key；Geocoding 才需要 key。
- Google 相關邏輯集中在 `src/services/googleMapsService.js`，不要直接散落在 UI 元件中。
