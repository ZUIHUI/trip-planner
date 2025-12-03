/**
 * 天氣服務
 * 使用免費天氣數據 + 模擬預報
 */

// 地點坐標映射 (東京主要地點)
const LOCATION_COORDS = {
  // 地區
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

// 天氣代碼到圖示的映射（可愛簡約風格）
const WEATHER_ICON_MAP = {
  0: '☀️',    // 晴天
  1: '🌤️',   // 大部分晴朗
  2: '⛅',    // 部分多雲
  3: '☁️',    // 陰天
  45: '🌫️',  // 霧
  48: '🌫️',  // 結冰霧
  51: '🌧️',  // 毛毛雨
  53: '🌧️',  // 中毛毛雨
  55: '🌧️',  // 大毛毛雨
  61: '🌧️',  // 小雨
  63: '🌧️',  // 中雨
  65: '⛈️',  // 大雨
  71: '❄️',   // 小雪
  73: '❄️',   // 中雪
  75: '❄️',   // 大雪
  77: '❄️',   // 雪粒
  80: '🌧️',  // 陣雨
  81: '⛈️',  // 中陣雨
  82: '⛈️',  // 大陣雨
  85: '❄️',   // 陣雪
  86: '❄️',   // 大陣雪
  95: '⛈️',  // 雷暴
  96: '⛈️',  // 有冰雹的雷暴
  99: '⛈️',  // 有冰雹的雷暴
};

// 根據日期和位置生成逼真的模擬天氣數據
const generateWeatherData = (dateStr, locationName) => {
  // 解析日期
  const [month, day] = dateStr.split('/').map(Number);
  const dayOfYear = new Date(2026, month - 1, day).getTime();
  
  // 使用日期作為種子生成虛擬天氣（確保同一天總是相同的天氣）
  const seed = dayOfYear % 100;
  
  // 東京 2 月中下旬天氣特性：多是晴朗或多雲，偶有雨
  const baseTemp = 8 + (seed % 8); // 8-15°C
  
  // 根據種子決定天氣類型
  let weatherCode;
  if (seed < 40) {
    weatherCode = 0; // 晴天
  } else if (seed < 65) {
    weatherCode = 2; // 多雲
  } else if (seed < 80) {
    weatherCode = 3; // 陰天
  } else if (seed < 95) {
    weatherCode = 61; // 小雨
  } else {
    weatherCode = 63; // 中雨
  }
  
  const precipitation = seed > 80 ? Math.floor(seed / 20) : 0;
  const windSpeed = 5 + (seed % 10);
  
  return {
    success: true,
    date: dateStr,
    location: locationName,
    temperature: Math.round(baseTemp),
    weatherCode,
    icon: WEATHER_ICON_MAP[weatherCode] || '🌤️',
    precipitation,
    windSpeed,
    description: getWeatherDescription(weatherCode),
  };
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
 * 獲取指定日期的天氣資訊
 * @param {string} dateStr - 日期字符串，格式 "MM/DD"
 * @param {string} locationName - 位置名稱
 * @returns {Promise<object>} 天氣數據
 */
export const getWeatherForDate = async (dateStr, locationName = '東京') => {
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

    // 模擬 API 延遲
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 使用模擬數據
    return generateWeatherData(dateStr, locationName);
  } catch (error) {
    console.error('獲取天氣失敗:', error);
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
    1: '晴天',
    2: '多雲',
    3: '陰天',
    45: '霧',
    48: '霧',
    51: '毛毛雨',
    53: '毛毛雨',
    55: '毛毛雨',
    61: '雨',
    63: '雨',
    65: '大雨',
    71: '雪',
    73: '雪',
    75: '雪',
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
