import React, { useState, useEffect } from 'react';
import { getWeatherForDate } from '../services/weatherService';
import { Cloud, Sun, CloudRain, Wind, Droplets } from 'lucide-react';

const EventWeatherWidget = ({ date, location }) => {
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
        const result = await getWeatherForDate(date, location);
        setWeather(result);
      } catch (error) {
        console.error('天氣獲取錯誤:', error);
        setWeather(null);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [date, location]);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-sky-50 to-blue-50 rounded-lg p-3 border border-sky-200 mb-3">
        <div className="flex items-center gap-2">
          <div className="text-xl animate-pulse">⏳</div>
          <span className="text-xs text-gray-600">載入天氣中...</span>
        </div>
      </div>
    );
  }

  if (!weather || !weather.success) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-sky-50 to-blue-50 rounded-lg p-3 border border-sky-200 mb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-3xl">{weather.icon}</div>
          <div>
            <p className="text-xs text-gray-600">{location}</p>
            <p className="text-lg font-bold text-gray-900">{weather.temperature}°C</p>
            <p className="text-xs text-gray-600">{weather.description}</p>
          </div>
        </div>
        <div className="text-right flex items-center gap-2 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <Droplets size={14} className="text-blue-500" />
            <span>{weather.precipitation}mm</span>
          </div>
          <div className="flex items-center gap-1">
            <Wind size={14} className="text-gray-500" />
            <span>{weather.windSpeed}km/h</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventWeatherWidget;
