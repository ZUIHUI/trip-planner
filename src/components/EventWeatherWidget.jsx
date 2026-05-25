import React, { useState, useEffect } from 'react';
import { getWeatherForDate } from '../services/weatherService';
import { Cloud, Sun, CloudRain, Wind, Droplets } from 'lucide-react';
import { logger } from '../utils/logger';

const EventWeatherWidget = ({ date, location, gpsCoords = null }) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!date || !location) {
      setWeather(null);
      return;
    }

    setLoading(true);
    const fetchWeather = async () => {
      try {
        // 如果有 GPS 坐標，傳遞給 API
        const result = await getWeatherForDate(date, location, gpsCoords);
        setWeather(result);
      } catch (error) {
        logger.error('天氣獲取錯誤:', error);
        setWeather(null);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [date, location, gpsCoords]);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-brand-50 to-brand-100 dark:from-brand-900/20 dark:to-brand-800/20 rounded-lg p-3 border border-brand-200 dark:border-brand-800 mb-3">
        <div className="flex items-center gap-2">
          <div className="text-xl animate-pulse">⏳</div>
          <span className="text-xs text-gray-600 dark:text-gray-400">載入天氣中...</span>
        </div>
      </div>
    );
  }

  if (!weather) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-brand-50 to-brand-100 dark:from-brand-900/20 dark:to-brand-800/20 rounded-lg p-3 border border-brand-200 dark:border-brand-800 mb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-3xl">{weather.icon}</div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400">{location}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{weather.temperature}°C</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">{weather.description}</p>
          </div>
        </div>
        {weather.precipitation !== undefined && weather.windSpeed !== undefined && (
          <div className="text-right flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <Droplets size={14} className="text-brand-500 dark:text-brand-400" />
              <span>{weather.precipitation}mm</span>
            </div>
            <div className="flex items-center gap-1">
              <Wind size={14} className="text-gray-500 dark:text-gray-400" />
              <span>{weather.windSpeed}km/h</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventWeatherWidget;
