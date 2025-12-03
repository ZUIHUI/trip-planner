/**
 * 天氣服務
 * 使用 Open-Meteo API (免費，無需 API Key)
 */

// 地點坐標映射 (東京主要地點)
const LOCATION_COORDS = {
  '新宿': { lat: 35.6895, lon: 139.7037 },
  '新大久保': { lat: 35.6976, lon: 139.7015 },
  '新宿御苑': { lat: 35.6788, lon: 139.7097 },
  '涩谷': { lat: 35.6595, lon: 139.7004 },
  '銀座': { lat: 35.6728, lon: 139.7637 },
  '六本木': { lat: 35.6655, lon: 139.7298 },
  '東京': { lat: 35.6762, lon: 139.6503 },
};

// 天氣代碼到圖示的映射
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
 * @param {string} dateStr - 日期字符串，格式 "MM/DD" 或 "2026/02/23"
 * @param {string} locationName - 位置名稱
 * @returns {Promise<object>} 天氣數據
 */
export const getWeatherForDate = async (dateStr, locationName = '東京') => {
  try {
    const coords = getCoordinates(locationName);
    
    // 構建 Open-Meteo API URL
    // 使用 2026 年作為基準年
    const fullDate = dateStr.includes('/') && !dateStr.startsWith('20')
      ? `2026/${dateStr}`
      : dateStr;
    
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${coords.lat}&longitude=${coords.lon}&start_date=${fullDate}&end_date=${fullDate}&hourly=weather_code,temperature_2m,precipitation,wind_speed_10m&temperature_unit=celsius&timezone=Asia/Tokyo`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('天氣 API 錯誤');
    
    const data = await response.json();
    
    // 提取當天的數據
    if (data.hourly && data.hourly.time.length > 0) {
      // 取中午 12:00 的數據作為代表
      const noonIndex = 12;
      const weatherCode = data.hourly.weather_code[noonIndex] || 0;
      const temp = data.hourly.temperature_2m[noonIndex] || '?';
      const precipitation = data.hourly.precipitation[noonIndex] || 0;
      const windSpeed = data.hourly.wind_speed_10m[noonIndex] || 0;
      
      return {
        success: true,
        date: fullDate,
        location: locationName,
        temperature: Math.round(temp),
        weatherCode,
        icon: WEATHER_ICON_MAP[weatherCode] || '🌤️',
        precipitation: Math.round(precipitation * 10) / 10,
        windSpeed: Math.round(windSpeed),
        description: getWeatherDescription(weatherCode),
      };
    }
    
    throw new Error('無法解析天氣數據');
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

/**
 * 批量獲取多天的天氣資訊
 */
export const getWeatherForecast = async (startDate, days, locationName = '東京') => {
  const forecasts = [];
  
  for (let i = 0; i < days; i++) {
    const [month, day] = startDate.split('/').map(Number);
    const date = new Date(2026, month - 1, day + i);
    const dateStr = `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    
    const weather = await getWeatherForDate(dateStr, locationName);
    forecasts.push(weather);
    
    // 避免 API 限流，延遲 100ms
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return forecasts;
};
