// 位置服務 - 獲取設備GPS定位 + 地理編碼支持

// 擴展的地點數據庫（台灣 + 日本主要城市）
const LOCATIONS_DATABASE = {
  taiwan: [
    { name: '台北', lat: 25.0330, lng: 121.5654 },
    { name: '台中', lat: 24.1372, lng: 120.6539 },
    { name: '高雄', lat: 22.6273, lng: 120.3014 },
    { name: '台南', lat: 22.9937, lng: 120.2153 },
    { name: '新竹', lat: 24.8026, lng: 120.9676 },
  ],
  tokyo: [
    { name: '新宿', lat: 35.6895, lng: 139.7004 },
    { name: '澀谷', lat: 35.6595, lng: 139.7004 },
    { name: '銀座', lat: 35.6761, lng: 139.7641 },
    { name: '淺草', lat: 35.7148, lng: 139.7967 },
    { name: '秋葉原', lat: 35.6981, lng: 139.7743 },
    { name: '原宿', lat: 35.6764, lng: 139.7011 },
    { name: '涩谷中心街', lat: 35.6625, lng: 139.7025 },
    { name: '六本木', lat: 35.6627, lng: 139.7311 },
    { name: '東京塔', lat: 35.6586, lng: 139.7454 },
    { name: '晴空塔', lat: 35.7101, lng: 139.8107 },
    { name: '台場', lat: 35.6327, lng: 139.7722 },
    { name: '築地市場', lat: 35.6654, lng: 139.7706 },
    { name: '新大久保', lat: 35.7022, lng: 139.7036 },
    { name: '新宿御苑', lat: 35.6784, lng: 139.7098 },
    { name: '目黑', lat: 35.6437, lng: 139.7256 },
    { name: '代代木公園', lat: 35.6691, lng: 139.6948 },
    { name: '歌舞伎町', lat: 35.6908, lng: 139.7031 },
    { name: '表參道', lat: 35.6653, lng: 139.7282 },
    { name: '恵比寿', lat: 35.6463, lng: 139.7139 },
    { name: '赤坂', lat: 35.6756, lng: 139.7349 },
    { name: '麻布十番', lat: 35.6484, lng: 139.7375 },
    { name: '青山', lat: 35.6689, lng: 139.7262 },
    { name: '國立劇場', lat: 35.6735, lng: 139.7439 },
    { name: '千鳥ヶ淵', lat: 35.6802, lng: 139.7453 },
    { name: '三越日本橋', lat: 35.6694, lng: 139.7735 },
    { name: '吉祥寺', lat: 35.7004, lng: 139.5788 },
    { name: '中野', lat: 35.7053, lng: 139.5655 },
    { name: '立川', lat: 35.6987, lng: 139.4131 },
    { name: '八王子', lat: 35.6656, lng: 139.3348 },
    { name: '成田機場', lat: 35.7653, lng: 140.3928 },
    { name: '東京', lat: 35.6762, lng: 139.6503 },
  ]
};
/**
 * 座標反向地理編碼 - 根據經緯度找出最近的地點名稱
 * @param {number} latitude - 緯度
 * @param {number} longitude - 經度
 * @returns {string} 地點名稱
 */
export const reverseGeocodeCoordinates = (latitude, longitude) => {
  // 合併所有位置
  const allLocations = [
    ...LOCATIONS_DATABASE.taiwan,
    ...LOCATIONS_DATABASE.tokyo
  ];

  // 計算與每個位置的距離
  const locationsWithDistance = allLocations.map(location => ({
    ...location,
    distance: calculateDistance(latitude, longitude, location.lat, location.lng)
  }));

  // 返回最近的位置
  const closest = locationsWithDistance.reduce((prev, current) =>
    prev.distance < current.distance ? prev : current
  );

  console.log('📍 反向地理編碼結果:', { latitude, longitude, closestLocation: closest.name, distance: closest.distance });

  return closest.name;
};

/**
 * 計算兩點間的距離（Haversine公式）
 * @param {number} lat1 - 第一點緯度
 * @param {number} lon1 - 第一點經度
 * @param {number} lat2 - 第二點緯度
 * @param {number} lon2 - 第二點經度
 * @returns {number} 距離（公里）
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // 地球半徑（公里）
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * 獲取設備的GPS位置
 * @returns {Promise<{latitude: number, longitude: number, locationName: string, accuracy: number} | null>}
 */
export const getDeviceLocation = () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('設備不支援GPS定位');
      resolve(null);
      return;
    }

    // 使用高精度定位
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const locationName = reverseGeocodeCoordinates(latitude, longitude);
        
        console.log('GPS定位成功:', { latitude, longitude, locationName, accuracy });
        
        resolve({
          latitude,
          longitude,
          locationName,
          accuracy // 精度（公尺）
        });
      },
      (error) => {
        console.warn('GPS定位失敗:', error.message);
        // 定位失敗時返回null，讓應用層決定是否使用備用位置
        resolve(null);
      },
      {
        enableHighAccuracy: true, // 請求高精度
        timeout: 10000, // 超時時間10秒
        maximumAge: 60000 // 快取位置資訊1分鐘
      }
    );
  });
};

/**
 * 監聽設備位置變化（持續更新）
 * @param {Function} callback - 位置更新時的回調函數
 * @returns {Function} 停止監聽的函數
 */
export const watchDeviceLocation = (callback) => {
  if (!navigator.geolocation) {
    console.warn('設備不支援GPS定位');
    return () => {};
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      const locationName = reverseGeocodeCoordinates(latitude, longitude);
      
      callback({
        latitude,
        longitude,
        locationName,
        accuracy
      });
    },
    (error) => {
      console.warn('GPS監聽失敗:', error.message);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000 // 快取位置資訊30秒
    }
  );

  // 返回停止監聽的函數
  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
};
