import React, { useState, useEffect } from 'react';
import { getWeatherForDate } from '../services/weatherService';
import CuteWeatherIcon from './CuteWeatherIcon';

const WeatherWidget = ({ 
  date, 
  currentLocation = null, 
  accommodation = '東京', 
  firstEventLocation = null,
  selectedEventLocation = null
}) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // 優先級邏輯：
  // 1. 用戶選中的行程地點（最高優先級，但如果為空則跳過）
  // 2. 第一個行程的地點（次優先級，但如果為空則跳過）
  // 3. 當前GPS位置（第三優先級）
  // 4. 住宿地點（預設備用位置）
  const displayLocation = (selectedEventLocation?.trim() || firstEventLocation?.trim() || currentLocation || accommodation || '東京');

  console.log('WeatherWidget Props:', { 
    date, 
    selectedEventLocation,
    firstEventLocation,
    currentLocation,
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
        console.log('開始獲取天氣:', { date, displayLocation });
        const result = await getWeatherForDate(date, displayLocation);
        console.log('天氣數據已取得:', { date, displayLocation, result });
        setWeather(result);
      } catch (error) {
        console.error('天氣獲取錯誤:', error);
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
    if (selectedEventLocation) {
      return `${displayLocation} (選中行程)`;
    } else if (firstEventLocation) {
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
