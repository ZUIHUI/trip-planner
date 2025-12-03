// 位置服務 - 獲取設備GPS定位

/**
 * 座標反向地理編碼 - 根據經緯度找出最近的地點名稱
 * @param {number} latitude - 緯度
 * @param {number} longitude - 經度
 * @returns {string} 地點名稱
 */
export const reverseGeocodeCoordinates = (latitude, longitude) => {
  // 東京主要位置的座標資料庫
  const tokyoLocations = [
    { name: '新宿', lat: 35.6895, lng: 139.7004, distance: 0 },
    { name: '澀谷', lat: 35.6595, lng: 139.7004, distance: 0 },
    { name: '銀座', lat: 35.6761, lng: 139.7641, distance: 0 },
    { name: '淺草', lat: 35.7148, lng: 139.7967, distance: 0 },
    { name: '秋葉原', lat: 35.6981, lng: 139.7743, distance: 0 },
    { name: '原宿', lat: 35.6764, lng: 139.7011, distance: 0 },
    { name: '涩谷中心街', lat: 35.6625, lng: 139.7025, distance: 0 },
    { name: '六本木', lat: 35.6627, lng: 139.7311, distance: 0 },
    { name: '東京塔', lat: 35.6586, lng: 139.7454, distance: 0 },
    { name: '晴空塔', lat: 35.7101, lng: 139.8107, distance: 0 },
    { name: '台場', lat: 35.6327, lng: 139.7722, distance: 0 },
    { name: '築地市場', lat: 35.6654, lng: 139.7706, distance: 0 },
    { name: '新大久保', lat: 35.7022, lng: 139.7036, distance: 0 },
    { name: '新宿御苑', lat: 35.6784, lng: 139.7098, distance: 0 },
    { name: '目黑', lat: 35.6437, lng: 139.7256, distance: 0 },
    { name: '代代木公園', lat: 35.6691, lng: 139.6948, distance: 0 },
    { name: '歌舞伎町', lat: 35.6908, lng: 139.7031, distance: 0 },
    { name: '表參道', lat: 35.6653, lng: 139.7282, distance: 0 },
    { name: '恵比寿', lat: 35.6463, lng: 139.7139, distance: 0 },
    { name: '赤坂', lat: 35.6756, lng: 139.7349, distance: 0 },
    { name: '麻布十番', lat: 35.6484, lng: 139.7375, distance: 0 },
    { name: '青山', lat: 35.6689, lng: 139.7262, distance: 0 },
    { name: '國立劇場', lat: 35.6735, lng: 139.7439, distance: 0 },
    { name: '千鳥ヶ淵', lat: 35.6802, lng: 139.7453, distance: 0 },
    { name: '三越日本橋', lat: 35.6694, lng: 139.7735, distance: 0 },
    { name: '吉祥寺', lat: 35.7004, lng: 139.5788, distance: 0 },
    { name: '中野', lat: 35.7053, lng: 139.5655, distance: 0 },
    { name: '立川', lat: 35.6987, lng: 139.4131, distance: 0 },
    { name: '八王子', lat: 35.6656, lng: 139.3348, distance: 0 },
    { name: '成田機場', lat: 35.7653, lng: 140.3928, distance: 0 },
  ];

  // 計算與每個位置的距離
  const locationsWithDistance = tokyoLocations.map(location => ({
    ...location,
    distance: calculateDistance(latitude, longitude, location.lat, location.lng)
  }));

  // 返回最近的位置
  const closest = locationsWithDistance.reduce((prev, current) =>
    prev.distance < current.distance ? prev : current
  );

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
