import React, { useState, useEffect } from 'react';
import { getWeatherForDate } from '../services/weatherService';
import CuteWeatherIcon from './CuteWeatherIcon';

const WeatherWidget = ({ 
  date, 
  currentLocation = null,  // 現在可能是 GPS 對象 { latitude, longitude, locationName }
  accommodation = '東京', 
  firstEventLocation = null,
  selectedEventLocation = null
}) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // 提取 GPS 坐標和位置名稱
  const gpsCoords = (currentLocation?.latitude && currentLocation?.longitude) ? 
    { lat: currentLocation.latitude, lon: currentLocation.longitude } : null;
  const gpsLocationName = currentLocation?.locationName || null;
  
  // 優先級邏輯：
  // 1. 用戶選中的行程地點（最高優先級，但如果為空則跳過）
  // 2. 第一個行程的地點（次優先級，但如果為空則跳過）
  // 3. 當前GPS位置（第三優先級）
  // 4. 住宿地點（預設備用位置）
  const displayLocation = (selectedEventLocation?.trim() || firstEventLocation?.trim() || gpsLocationName || accommodation || '東京');

  console.log('🌤️ WeatherWidget Props:', { 
    date, 
    selectedEventLocation,
    firstEventLocation,
    gpsLocationName,
    gpsCoords,
    accommodation,
    displayLocation,
    timestamp: new Date().toLocaleTimeString()
  });

  useEffect(() => {
    // 如果沒有日期或地點，清空天氣
    if (!date || !displayLocation) {
      setWeather(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setWeather(null); // 立即清空舊天氣資料
    
    const fetchWeather = async () => {
      try {
        console.log('📡 開始獲取天氣:', { date, displayLocation, hasGPS: !!gpsCoords });
        // 如果有 GPS 坐標，傳遞給 API；否則使用地點名稱
        const result = await getWeatherForDate(date, displayLocation, gpsCoords);
        console.log('✅ 天氣數據已取得:', { date, displayLocation, result });
        setWeather(result);
      } catch (error) {
        console.error('❌ 天氣獲取錯誤:', error);
        setWeather(null);
      } finally {
        setLoading(false);
      }
    };

    // 添加延遲以確保DOM完全更新
    const timer = setTimeout(() => {
      fetchWeather();
    }, 100);

    return () => clearTimeout(timer);
  }, [date, displayLocation, gpsCoords]);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-brand-50 to-cyan-50 dark:from-brand-900/20 dark:to-cyan-900/20 rounded-xl p-4 border border-brand-100 dark:border-brand-800 mb-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl animate-pulse">⏳</div>
          <p className="text-sm text-gray-600 dark:text-gray-400">正在載入 {displayLocation} 的天氣...</p>
        </div>
      </div>
    );
  }

  if (!weather) {
    return null;
  }

  // 判斷位置來源
  const getLocationLabel = () => {
    if (selectedEventLocation?.trim()) {
      return `${displayLocation} (選中行程)`;
    } else if (firstEventLocation?.trim()) {
      return `${displayLocation} (行程地點)`;
    } else if (gpsCoords) {
      return `${displayLocation} (GPS位置)`;
    } else {
      return `${displayLocation} (預設位置)`;
    }
  };

  // 判斷數據來源
  const getSourceBadge = () => {
    if (weather.source === 'fallback') {
      return '(模擬)';
    } else if (weather.source === 'open-meteo-archive') {
      return '(歷史)';
    } else if (weather.source === 'open-meteo-forecast') {
      return '(預報)';
    }
    return '';
  };

  return (
    <div className="bg-gradient-to-r from-brand-50 to-cyan-50 dark:from-brand-900/20 dark:to-cyan-900/20 rounded-xl p-4 border border-brand-100 dark:border-brand-800 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CuteWeatherIcon code={weather.weatherCode} size="text-5xl" />
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {getLocationLabel()} {getSourceBadge()}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{weather.temperature}°C</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{weather.description}</p>
          </div>
        </div>
        {weather.precipitation !== undefined && weather.windSpeed !== undefined && (
          <div className="text-right text-sm text-gray-600 dark:text-gray-400">
            {weather.precipitation > 0 && (
              <p className="mb-1">💧 {weather.precipitation}mm</p>
            )}
            <p>💨 {weather.windSpeed}km/h</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherWidget;

