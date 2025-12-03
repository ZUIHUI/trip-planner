import React, { useState, useEffect } from 'react';
import { getWeatherForDate } from '../services/weatherService';
import CuteWeatherIcon from './CuteWeatherIcon';

const WeatherWidget = ({ 
  date, 
  currentLocation = null, 
  accommodation = '東京', 
  firstEventLocation = null 
}) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [displayedLocation, setDisplayedLocation] = useState(null);
  
  // 優先級邏輯：
  // 1. 第一個行程的地點（用戶明確指定）
  // 2. 當前GPS位置（實時位置）
  // 3. 住宿地點（預設位置）
  const displayLocation = firstEventLocation || currentLocation || accommodation;

  useEffect(() => {
    // 如果沒有日期或地點，清空天氣
    if (!date || !displayLocation) {
      setWeather(null);
      setDisplayedLocation(null);
      return;
    }

    // 如果地點變化，更新當前地點記錄
    if (displayedLocation !== displayLocation) {
      setDisplayedLocation(displayLocation);
      setLoading(true);
      setWeather(null);
    } else {
      // 如果只有日期變化，保持當前狀態
      setLoading(true);
    }
    
    const fetchWeather = async () => {
      try {
        const result = await getWeatherForDate(date, displayLocation);
        console.log('天氣數據更新:', { date, displayLocation, result });
        setWeather(result);
      } catch (error) {
        console.error('天氣獲取錯誤:', error);
        setWeather(null);
      } finally {
        setLoading(false);
      }
    };

    // 添加一個小延遲以確保地點完全變化
    const timer = setTimeout(() => {
      fetchWeather();
    }, 100);

    return () => clearTimeout(timer);
  }, [date, displayLocation]);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100 mb-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl animate-pulse">⏳</div>
          <p className="text-sm text-gray-600">正在載入 {displayLocation} 的天氣...</p>
        </div>
      </div>
    );
  }

  if (!weather || !weather.success) {
    return null;
  }

  // 判斷位置來源
  const getLocationLabel = () => {
    if (firstEventLocation) {
      return `${displayLocation} (行程地點)`;
    } else if (currentLocation) {
      return `${displayLocation} (當前位置)`;
    } else {
      return `${displayLocation} (預設位置)`;
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CuteWeatherIcon code={weather.weatherCode} size="text-5xl" />
          <div>
            <p className="text-sm text-gray-600">
              {getLocationLabel()}
            </p>
            <p className="text-2xl font-bold text-gray-900">{weather.temperature}°C</p>
            <p className="text-sm text-gray-600">{weather.description}</p>
          </div>
        </div>
        <div className="text-right text-sm text-gray-600">
          {weather.precipitation > 0 && (
            <p className="mb-1">💧 {weather.precipitation}mm</p>
          )}
          <p>💨 {weather.windSpeed}km/h</p>
        </div>
      </div>
    </div>
  );
};

export default WeatherWidget;
