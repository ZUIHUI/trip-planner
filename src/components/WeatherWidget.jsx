import React, { useState, useEffect } from 'react';
import { getWeatherForDate } from '../services/weatherService';

const WeatherWidget = ({ date, location, isLoading = false }) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!date) {
      setWeather(null);
      return;
    }

    setLoading(true);
    const fetchWeather = async () => {
      try {
        const result = await getWeatherForDate(date, location);
        console.log('天氣數據:', result);
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

  if (loading || isLoading) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100 mb-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl animate-pulse">⏳</div>
          <p className="text-sm text-gray-600">正在載入天氣...</p>
        </div>
      </div>
    );
  }

  if (!weather || !weather.success) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-5xl">{weather.icon}</div>
          <div>
            <p className="text-sm text-gray-600">{location}</p>
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
