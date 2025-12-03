/**
 * 天氣服務
 * 使用 Open-Meteo 免費天氣 API + GPS 定位
 */

// 地點坐標映射 (東京主要地點 + 台灣主要城市)
const LOCATION_COORDS = {
  // 台灣
  '台北': { lat: 25.0330, lon: 121.5654 },
  '台中': { lat: 24.1372, lon: 120.6539 },
  '高雄': { lat: 22.6273, lon: 120.3014 },
  '新竹': { lat: 24.8026, lon: 120.9676 },
  '台南': { lat: 22.9937, lon: 120.2153 },
  
  // 東京地區
  '新宿': { lat: 35.6895, lon: 139.7037 },
  '新大久保': { lat: 35.6976, lon: 139.7015 },
  '新宿御苑': { lat: 35.6788, lon: 139.7097 },
  '涩谷': { lat: 35.6595, lon: 139.7004 },
  '銀座': { lat: 35.6728, lon: 139.7637 },
  '六本木': { lat: 35.6655, lon: 139.7298 },
  '東京': { lat: 35.6762, lon: 139.6503 },
  '上野': { lat: 35.7149, lon: 139.7726 },
  '淺草': { lat: 35.7148, lon: 139.7967 },
  '秋葉原': { lat: 35.6981, lon: 139.7739 },
  '池袋': { lat: 35.7295, lon: 139.7107 },
  '原宿': { lat: 35.6654, lon: 139.7009 },
  '表參道': { lat: 35.6655, lon: 139.7165 },
  '青山': { lat: 35.6654, lon: 139.7297 },
  '赤坂': { lat: 35.6754, lon: 139.7356 },
  '丸之內': { lat: 35.6762, lon: 139.7669 },
  '東京站': { lat: 35.6809, lon: 139.7673 },
  '品川': { lat: 35.6290, lon: 139.7401 },
  '羽田': { lat: 35.5494, lon: 139.7798 },
  '成田': { lat: 35.7653, lon: 140.3930 },
  // 景點
  '淺草寺': { lat: 35.7148, lon: 139.7967 },
  '晴空塔': { lat: 35.7101, lon: 139.8107 },
  '東京迪士尼': { lat: 35.6329, lon: 139.8804 },
  '富士山': { lat: 35.3606, lon: 138.7274 },
  '築地市場': { lat: 35.6654, lon: 139.7721 },
  '銀座': { lat: 35.6728, lon: 139.7637 },
  '歌舞伎座': { lat: 35.6644, lon: 139.7674 },
};

// 天氣代碼到圖示的映射（WMO 代碼 + 可愛簡約風格）
const WEATHER_ICON_MAP = {
  0: '☀️',    // Clear sky
  1: '🌤️',   // Mainly clear, partly cloudy, and overcast
  2: '⛅',    // Partly cloudy
  3: '☁️',    // Overcast
  45: '🌫️',  // Foggy
  48: '🌫️',  // Depositing rime fog
  51: '🌧️',  // Light drizzle
  53: '🌧️',  // Moderate drizzle
  55: '🌧️',  // Dense drizzle
  61: '🌧️',  // Slight rain
  63: '🌧️',  // Moderate rain
  65: '⛈️',  // Heavy rain
  71: '❄️',   // Slight snow
  73: '❄️',   // Moderate snow
  75: '❄️',   // Heavy snow
  77: '❄️',   // Snow grains
  80: '🌧️',  // Slight rain showers
  81: '⛈️',  // Moderate rain showers
  82: '⛈️',  // Violent rain showers
  85: '❄️',   // Slight snow showers
  86: '❄️',   // Heavy snow showers
  95: '⛈️',  // Thunderstorm
  96: '⛈️',  // Thunderstorm with slight hail
  99: '⛈️',  // Thunderstorm with heavy hail
};

/**
 * 從地址或地點名稱獲取坐標
 */
const getCoordinates = (locationName) => {
  if (!locationName) return LOCATION_COORDS['東京'];
  
  // 嘗試從映射中找到
  for (const [key, coords] of Object.entries(LOCATION_COORDS)) {
    if (locationName.includes(key)) {
      return coords;
    }
  }
  
  // 預設東京
  return LOCATION_COORDS['東京'];
};

/**
 * 從 Open-Meteo API 獲取天氣數據（真實數據）
 * @param {number} lat - 緯度
 * @param {number} lon - 經度
 * @param {string} dateStr - 日期字符串，格式 "MM/DD"
 * @returns {Promise<object>} 天氣數據
 */
const fetchWeatherFromAPI = async (lat, lon, dateStr) => {
  try {
    // 轉換日期格式為 YYYY-MM-DD
    const today = new Date();
    const [month, day] = dateStr.split('/').map(Number);
    const year = today.getFullYear();
    
    // 處理年份邊界（如果月份/日期是過去的，可能是明年）
    const date = new Date(year, month - 1, day);
    if (date < today) {
      date.setFullYear(year + 1);
    }
    
    const formattedDate = date.toISOString().split('T')[0];
    
    console.log('📍 Open-Meteo API 請求:', {
      lat,
      lon,
      dateStr,
      formattedDate,
      url: `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${formattedDate}&end_date=${formattedDate}&hourly=temperature_2m,weather_code&temperature_unit=celsius`
    });
    
    const response = await fetch(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${formattedDate}&end_date=${formattedDate}&hourly=temperature_2m,weather_code&temperature_unit=celsius`
    );
    
    if (!response.ok) {
      throw new Error(`API 錯誤: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.hourly || !data.hourly.temperature_2m || data.hourly.temperature_2m.length === 0) {
      throw new Error('無效的 API 回應');
    }
    
    // 取得該天的平均溫度和天氣
    const temperatures = data.hourly.temperature_2m;
    const weatherCodes = data.hourly.weather_code;
    
    // 計算平均溫度（12 小時數據）
    const avgTemp = Math.round(
      temperatures.slice(0, 12).reduce((a, b) => a + b, 0) / Math.min(12, temperatures.length)
    );
    
    // 取得中午 12 點的天氣代碼
    const weatherCode = weatherCodes[12] || weatherCodes[0] || 0;
    
    console.log('✅ API 數據成功:', { avgTemp, weatherCode, temperatures: temperatures.slice(0, 12) });
    
    return {
      success: true,
      temperature: avgTemp,
      weatherCode,
      icon: WEATHER_ICON_MAP[weatherCode] || '🌤️',
      description: getWeatherDescription(weatherCode),
      source: 'open-meteo'
    };
  } catch (error) {
    console.error('❌ Open-Meteo API 錯誤:', error);
    return null;
  }
};

/**
 * 獲取指定日期的天氣資訊
 * @param {string} dateStr - 日期字符串，格式 "MM/DD"
 * @param {string} locationName - 位置名稱
 * @param {object} gpsCoords - GPS 坐標 (可選，優先使用)
 * @returns {Promise<object>} 天氣數據
 */
export const getWeatherForDate = async (dateStr, locationName = '東京', gpsCoords = null) => {
  try {
    if (!dateStr) {
      return {
        success: false,
        error: '無效的日期',
        icon: '❓',
        temperature: '?',
        description: '無法獲取天氣',
      };
    }

    // 優先使用 GPS 坐標，否則從地點名稱獲取
    const coords = gpsCoords || getCoordinates(locationName);
    
    console.log('🌍 開始獲取天氣:', { dateStr, locationName, coords });
    
    // 從 Open-Meteo API 獲取真實天氣數據
    const result = await fetchWeatherFromAPI(coords.lat, coords.lon, dateStr);
    
    if (result) {
      return {
        ...result,
        date: dateStr,
        location: locationName,
      };
    }
    
    // API 失敗時的備用方案
    return {
      success: false,
      error: 'API 無法連接',
      icon: '❓',
      temperature: '?',
      description: '無法獲取天氣',
    };
  } catch (error) {
    console.error('❌ 獲取天氣失敗:', error);
    return {
      success: false,
      error: error.message,
      icon: '❓',
      temperature: '?',
      description: '無法獲取天氣',
    };
  }
};

/**
 * 獲取天氣代碼的文字描述
 */
const getWeatherDescription = (code) => {
  const descriptions = {
    0: '晴天',
    1: '大部分晴朗',
    2: '多雲',
    3: '陰天',
    45: '霧',
    48: '霧',
    51: '毛毛雨',
    53: '毛毛雨',
    55: '毛毛雨',
    61: '小雨',
    63: '中雨',
    65: '大雨',
    71: '小雪',
    73: '中雪',
    75: '大雪',
    77: '雪粒',
    80: '陣雨',
    81: '雷陣雨',
    82: '雷陣雨',
    85: '陣雪',
    86: '陣雪',
    95: '雷暴',
    96: '雷暴',
    99: '雷暴',
  };
  return descriptions[code] || '未知';
};
