/**
 * 天氣服務
 * 使用 Open-Meteo 免費天氣 API + GPS 定位
 */

// 地點坐標映射 (東京主要地點 + 台灣主要城市)
const LOCATION_COORDS = {
  // 台灣
  '台北': { lat: 25.0330, lon: 121.5654 },
  'Taipei': { lat: 25.0330, lon: 121.5654 },
  '台灣': { lat: 25.0330, lon: 121.5654 }, // 預設對應到台北
  'Taiwan': { lat: 25.0330, lon: 121.5654 }, // 預設對應到台北
  '台中': { lat: 24.1372, lon: 120.6539 },
  'Taichung': { lat: 24.1372, lon: 120.6539 },
  '高雄': { lat: 22.6273, lon: 120.3014 },
  'Kaohsiung': { lat: 22.6273, lon: 120.3014 },
  '新竹': { lat: 24.8026, lon: 120.9676 },
  'Hsinchu': { lat: 24.8026, lon: 120.9676 },
  '台南': { lat: 22.9937, lon: 120.2153 },
  'Tainan': { lat: 22.9937, lon: 120.2153 },
  
  // 機場
  '桃園機場': { lat: 25.0797, lon: 121.2342 },
  'Taoyuan Airport': { lat: 25.0797, lon: 121.2342 },
  'TPE': { lat: 25.0797, lon: 121.2342 },
  '松山機場': { lat: 25.0697, lon: 121.5525 },
  'TSA': { lat: 25.0697, lon: 121.5525 },
  '小港機場': { lat: 22.5771, lon: 120.3459 },
  'KHH': { lat: 22.5771, lon: 120.3459 },
  
  // 日本
  '日本': { lat: 35.6895, lon: 139.7037 }, // 預設對應到東京
  'Japan': { lat: 35.6895, lon: 139.7037 }, // 預設對應到東京
  
  // 東京地區
  '新宿': { lat: 35.6895, lon: 139.7037 },
  'Shinjuku': { lat: 35.6895, lon: 139.7037 },
  '新大久保': { lat: 35.6976, lon: 139.7015 },
  'Shin-Okubo': { lat: 35.6976, lon: 139.7015 },
  '新宿御苑': { lat: 35.6788, lon: 139.7097 },
  'Shinjuku Gyoen': { lat: 35.6788, lon: 139.7097 },
  '涩谷': { lat: 35.6595, lon: 139.7004 },
  'Shibuya': { lat: 35.6595, lon: 139.7004 },
  '銀座': { lat: 35.6728, lon: 139.7637 },
  'Ginza': { lat: 35.6728, lon: 139.7637 },
  '六本木': { lat: 35.6655, lon: 139.7298 },
  'Roppongi': { lat: 35.6655, lon: 139.7298 },
  '東京': { lat: 35.6762, lon: 139.6503 },
  'Tokyo': { lat: 35.6762, lon: 139.6503 },
  '上野': { lat: 35.7149, lon: 139.7726 },
  'Ueno': { lat: 35.7149, lon: 139.7726 },
  '淺草': { lat: 35.7148, lon: 139.7967 },
  'Asakusa': { lat: 35.7148, lon: 139.7967 },
  '秋葉原': { lat: 35.6981, lon: 139.7739 },
  'Akihabara': { lat: 35.6981, lon: 139.7739 },
  '池袋': { lat: 35.7295, lon: 139.7107 },
  'Ikebukuro': { lat: 35.7295, lon: 139.7107 },
  '原宿': { lat: 35.6654, lon: 139.7009 },
  'Harajuku': { lat: 35.6654, lon: 139.7009 },
  '表參道': { lat: 35.6655, lon: 139.7165 },
  'Omotesando': { lat: 35.6655, lon: 139.7165 },
  '青山': { lat: 35.6654, lon: 139.7297 },
  'Aoyama': { lat: 35.6654, lon: 139.7297 },
  '赤坂': { lat: 35.6754, lon: 139.7356 },
  'Akasaka': { lat: 35.6754, lon: 139.7356 },
  '丸之內': { lat: 35.6762, lon: 139.7669 },
  'Marunouchi': { lat: 35.6762, lon: 139.7669 },
  '東京站': { lat: 35.6809, lon: 139.7673 },
  'Tokyo Station': { lat: 35.6809, lon: 139.7673 },
  '品川': { lat: 35.6290, lon: 139.7401 },
  'Shinagawa': { lat: 35.6290, lon: 139.7401 },
  '羽田': { lat: 35.5494, lon: 139.7798 },
  'Haneda': { lat: 35.5494, lon: 139.7798 },
  '羽田機場': { lat: 35.5494, lon: 139.7798 },
  'Haneda Airport': { lat: 35.5494, lon: 139.7798 },
  '成田': { lat: 35.7653, lon: 140.3930 },
  'Narita': { lat: 35.7653, lon: 140.3930 },
  '成田機場': { lat: 35.7653, lon: 140.3930 },
  'Narita Airport': { lat: 35.7653, lon: 140.3930 },
  '關西機場': { lat: 34.4320, lon: 135.2304 },
  'Kansai Airport': { lat: 34.4320, lon: 135.2304 },
  'KIX': { lat: 34.4320, lon: 135.2304 },
  // 景點
  '淺草寺': { lat: 35.7148, lon: 139.7967 },
  'Senso-ji': { lat: 35.7148, lon: 139.7967 },
  '晴空塔': { lat: 35.7101, lon: 139.8107 },
  'Skytree': { lat: 35.7101, lon: 139.8107 },
  '東京迪士尼': { lat: 35.6329, lon: 139.8804 },
  'Disney': { lat: 35.6329, lon: 139.8804 },
  '富士山': { lat: 35.3606, lon: 138.7274 },
  'Mt. Fuji': { lat: 35.3606, lon: 138.7274 },
  'Fuji': { lat: 35.3606, lon: 138.7274 },
  '築地市場': { lat: 35.6654, lon: 139.7721 },
  'Tsukiji': { lat: 35.6654, lon: 139.7721 },
  '歌舞伎座': { lat: 35.6644, lon: 139.7674 },
  'Kabukiza': { lat: 35.6644, lon: 139.7674 },
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
 * 解析地點坐標 (支援靜態列表和 Geocoding API)
 */
const resolveCoordinates = async (locationName) => {
  if (!locationName) return LOCATION_COORDS['東京'];

  // 0. 清理地點名稱
  const cleanName = locationName.trim();

  // 1. 精確匹配靜態映射 (優先級最高，用於快速命中常用地點)
  if (LOCATION_COORDS[cleanName]) {
    return LOCATION_COORDS[cleanName];
  }
  
  // 2. 嘗試使用 Geocoding API 搜尋 (Open-Meteo)
  // 這能支援絕大多數的城市、鄉鎮和主要地標
  try {
    console.log(`🔍 搜尋地點坐標 (Open-Meteo): ${cleanName}`);
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanName)}&count=1&language=zh&format=json`);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      console.log(`✅ 找到地點坐標 (Open-Meteo): ${result.name}`, result);
      return { lat: result.latitude, lon: result.longitude };
    }
  } catch (error) {
    console.error('❌ Open-Meteo Geocoding 失敗:', error);
  }

  // 3. 嘗試使用 Nominatim API (OpenStreetMap)
  // 這對於具體的 POI (如景點、商店、車站) 支援度更好，更接近 Google Maps 的體驗
  try {
    console.log(`🔍 搜尋地點坐標 (Nominatim): ${cleanName}`);
    // Nominatim 需要 User-Agent
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanName)}&format=json&limit=1`, {
      headers: {
        'User-Agent': 'TripPlannerApp/1.0'
      }
    });
    const data = await response.json();
    
    if (data && data.length > 0) {
      const result = data[0];
      console.log(`✅ 找到地點坐標 (Nominatim): ${result.display_name}`, result);
      return { lat: parseFloat(result.lat), lon: parseFloat(result.lon) };
    }
  } catch (error) {
    console.error('❌ Nominatim Geocoding 失敗:', error);
  }

  // 4. 模糊匹配靜態映射 (作為最後的備選)
  // 例如輸入 "台北101"，如果上面都沒找到，至少匹配到 "台北"
  for (const [key, coords] of Object.entries(LOCATION_COORDS)) {
    if (cleanName.includes(key)) {
      console.log(`⚠️ 使用模糊匹配: ${cleanName} -> ${key}`);
      return coords;
    }
  }
  
  // 5. 真的找不到，預設東京
  console.warn(`⚠️ 找不到地點: ${cleanName}, 使用預設(東京)`);
  return LOCATION_COORDS['東京'];
};

const parseDateWithOptionalYear = (input) => {
  if (!input) return null;
  const normalized = String(input).trim();
  const fullMatch = normalized.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (!fullMatch) return null;

  const year = Number(fullMatch[1]);
  const month = Number(fullMatch[2]);
  const day = Number(fullMatch[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;

  return { year, month, day };
};

const parseMonthDay = (dateStr) => {
  if (!dateStr) return null;
  const match = String(dateStr).trim().match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { month, day };
};

const parseTripDateRange = (tripDatesText) => {
  if (!tripDatesText) return null;
  const matches = String(tripDatesText).match(/\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}/g);
  if (!matches || matches.length === 0) return null;
  const parsed = matches.map(parseDateWithOptionalYear).filter(Boolean);
  if (parsed.length === 0) return null;
  return {
    start: parsed[0],
    end: parsed[parsed.length - 1]
  };
};

const resolveYearFromTripDetails = (month, day, tripDetails) => {
  const dateRange = parseTripDateRange(tripDetails?.dates);
  if (!dateRange?.start) return null;

  const { start, end } = dateRange;
  if (!end || start.year === end.year) return start.year;

  // 跨年行程：優先挑選落在行程範圍內的年份
  const startCandidate = new Date(start.year, month - 1, day);
  const endCandidate = new Date(end.year, month - 1, day);
  const tripStart = new Date(start.year, start.month - 1, start.day);
  const tripEnd = new Date(end.year, end.month - 1, end.day);

  if (startCandidate >= tripStart && startCandidate <= tripEnd) return start.year;
  if (endCandidate >= tripStart && endCandidate <= tripEnd) return end.year;

  // 若無法精準匹配，跨年時以月份分界
  return month >= start.month ? start.year : end.year;
};

/**
 * 從 Open-Meteo API 獲取天氣數據（真實數據 - 支援歷史和預報）
 * @param {number} lat - 緯度
 * @param {number} lon - 經度
 * @param {string} dateStr - 日期字符串，格式 "MM/DD"
 * @param {object|null} tripDetails - 旅程資訊（可選，用於推導年份）
 * @returns {Promise<object>} 天氣數據
 */
const fetchWeatherFromAPI = async (lat, lon, dateStr, tripDetails = null) => {
  try {
    // 轉換日期格式為 YYYY-MM-DD
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 設置為今天的開始

    const explicitDate = parseDateWithOptionalYear(dateStr);
    const monthDay = explicitDate ? { month: explicitDate.month, day: explicitDate.day } : parseMonthDay(dateStr);
    if (!monthDay) {
      throw new Error(`無效日期格式: ${dateStr}`);
    }

    const inferredYear = explicitDate?.year || resolveYearFromTripDetails(monthDay.month, monthDay.day, tripDetails);
    const targetYear = inferredYear || today.getFullYear();

    // 建立目標日期（若無年份則允許今年過去日期，供 archive API 使用）
    const date = new Date(targetYear, monthDay.month - 1, monthDay.day);
    
    const formattedDate = date.toISOString().split('T')[0];
    const daysFromToday = Math.floor((date - today) / (1000 * 60 * 60 * 24));
    
    console.log('📍 天氣查詢參數:', {
      lat,
      lon,
      dateStr,
      formattedDate,
      daysFromToday,
      isHistorical: daysFromToday < 0,
      isFuture: daysFromToday > 0,
      targetYear,
      hasTripYear: Boolean(inferredYear)
    });

    if (daysFromToday > 15) {
      return {
        success: false,
        status: 'out_of_range',
        date: dateStr,
        requestedDate: formattedDate,
        source: 'open-meteo-forecast',
        message: '超出 Open-Meteo Forecast 可查詢範圍（16 天）'
      };
    }

    let apiUrl;
    
    // 根據日期選擇適當的 API
    if (daysFromToday < 0) {
      // 過去日期 - 使用 Archive API
      apiUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${formattedDate}&end_date=${formattedDate}&hourly=temperature_2m,weather_code&temperature_unit=celsius`;
    } else {
      // 當前或未來日期 - 使用 Forecast API（最多 16 天）
      // 使用 timezone=GMT 確保小時對齊
      apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&start_date=${formattedDate}&end_date=${formattedDate}&hourly=temperature_2m,weather_code&temperature_unit=celsius&forecast_days=16&timezone=GMT`;
    }
    
    console.log('🌐 API 終點:', apiUrl.substring(0, 80) + '...');
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`API 錯誤 (${response.status}): ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.hourly || !data.hourly.temperature_2m || data.hourly.temperature_2m.length === 0) {
      console.error('❌ API 回應無效:', data);
      throw new Error('API 返回無效數據');
    }
    
    // 取得該天的溫度和天氣
    const temperatures = data.hourly.temperature_2m;
    const weatherCodes = data.hourly.weather_code;
    
    // 獲取當前 UTC 小時 (因為我們請求了 timezone=GMT)
    const currentHour = new Date().getUTCHours();
    
    // 取得當前時間的溫度 (如果數據不足，則回退到中午或第一個可用數據)
    // 注意：如果查看的是未來/過去的某一天，這裡取的是「該日期」在「當前時刻」的天氣
    // 例如：現在是 15:00，查看明天天氣，會顯示明天 15:00 的預報
    const currentTemp = temperatures[currentHour] !== undefined && temperatures[currentHour] !== null
      ? temperatures[currentHour] 
      : (temperatures[12] !== undefined && temperatures[12] !== null ? temperatures[12] : temperatures.find(t => t !== null));

    const avgTemp = currentTemp !== null && currentTemp !== undefined ? Math.round(currentTemp) : null;
    
    // 取得當前時間的天氣代碼
    const weatherCode = weatherCodes[currentHour] !== undefined && weatherCodes[currentHour] !== null
      ? weatherCodes[currentHour]
      : (weatherCodes[12] !== undefined && weatherCodes[12] !== null ? weatherCodes[12] : (weatherCodes.find(c => c !== null) || 0));
    
    console.log('✅ API 數據成功:', { 
      avgTemp, 
      weatherCode, 
      currentHour,
      tempAtHour: temperatures[currentHour],
      codeAtHour: weatherCodes[currentHour]
    });
    
    return {
      success: true,
      status: 'ok',
      temperature: avgTemp,
      weatherCode,
      icon: WEATHER_ICON_MAP[weatherCode] || '🌤️',
      description: getWeatherDescription(weatherCode),
      source: daysFromToday < 0 ? 'open-meteo-archive' : 'open-meteo-forecast'
    };
  } catch (error) {
    console.error('❌ Open-Meteo API 錯誤:', error);
    return null;
  }
};

/**
 * 生成備用天氣數據（當 API 失敗時）
 */
const generateFallbackWeather = (dateStr, locationName) => {
  // 使用日期 + 位置 + 當前小時作為種子生成虛擬天氣
  const [month, day] = dateStr.split('/').map(Number);
  const dateNum = month * 31 + day;
  const locationHash = locationName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const currentHour = new Date().getHours();
  const seed = (dateNum + locationHash + currentHour) % 100;
  
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
  
  const baseTemp = 8 + (seed % 13);
  
  console.log('⚠️ 使用備用天氣數據:', { dateStr, locationName, weatherCode, temperature: baseTemp });
  
  return {
    success: true,
    temperature: baseTemp,
    weatherCode,
    icon: WEATHER_ICON_MAP[weatherCode] || '🌤️',
    description: getWeatherDescription(weatherCode),
    source: 'fallback'
  };
};

/**
 * 獲取當前實時天氣 (使用 Current Weather API)
 */
const fetchCurrentWeather = async (lat, lon) => {
  try {
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=celsius`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error('Weather API error');
    
    const data = await response.json();
    if (!data.current) throw new Error('No current data');
    
    const weatherCode = data.current.weather_code;
    
    return {
      success: true,
      temperature: Math.round(data.current.temperature_2m),
      weatherCode,
      icon: WEATHER_ICON_MAP[weatherCode] || '🌤️',
      description: `(目前) ${getWeatherDescription(weatherCode)}`,
      source: 'open-meteo-current'
    };
  } catch (error) {
    console.error('❌ Current weather fetch failed:', error);
    return null;
  }
};

/**
 * 獲取指定日期的天氣資訊
 * @param {string} dateStr - 日期字符串，格式 "MM/DD"
 * @param {string} locationName - 位置名稱
 * @param {object} gpsCoords - GPS 坐標 (可選，優先使用)
 * @param {object|null} tripDetails - 旅程資訊（可選，用於推導年份）
 * @returns {Promise<object>} 天氣數據
 */
export const getWeatherForDate = async (dateStr, locationName = '東京', gpsCoords = null, tripDetails = null) => {
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

    // 優先使用 GPS 坐標，否則解析地點名稱
    const coords = gpsCoords || await resolveCoordinates(locationName);
    
    console.log('🌍 開始獲取天氣:', { dateStr, locationName, hasGPS: !!gpsCoords, coords });
    
    // 嘗試從 Open-Meteo API 獲取真實天氣數據
    let result = await fetchWeatherFromAPI(coords.lat, coords.lon, dateStr, tripDetails);

    // 超出預報能力範圍時，明確回傳 out_of_range，避免誤導成 current weather
    if (result?.status === 'out_of_range') {
      return {
        ...result,
        icon: '📅',
        temperature: '?',
        weatherCode: null,
        description: '超出可預報日期範圍',
        date: dateStr,
        location: locationName,
      };
    }
    
    // 一般 API 失敗時，改為獲取當前實時天氣作為參考
    if (!result) {
      console.log('⚠️ 無法獲取目標日期天氣（API 失敗），改為獲取當前實時天氣...');
      result = await fetchCurrentWeather(coords.lat, coords.lon);
    }
    
    if (result) {
      return {
        ...result,
        date: dateStr,
        location: locationName,
      };
    }
    
    // API 失敗時的備用方案 - 使用模擬天氣
    console.warn('⚠️ API 無法連接，使用備用天氣數據');
    const fallback = generateFallbackWeather(dateStr, locationName);
    
    return {
      ...fallback,
      date: dateStr,
      location: locationName,
    };
  } catch (error) {
    console.error('❌ 獲取天氣失敗:', error);
    
    // 即使發生異常也返回備用天氣
    const fallback = generateFallbackWeather(dateStr, locationName);
    return {
      ...fallback,
      date: dateStr,
      location: locationName,
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
