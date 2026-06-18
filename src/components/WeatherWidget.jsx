import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getWeatherForDate } from '../services/weatherService';
import CuteWeatherIcon from './CuteWeatherIcon';
import { logger } from '../utils/logger';

const WeatherWidget = ({ 
  date, 
  currentLocation = null,  // 現在可能是 GPS 對象 { latitude, longitude, locationName }
  accommodation = '東京', 
  firstEventLocation = null,
  selectedEventLocation = null,
  variant = 'full'
}) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const lastRequestKeyRef = useRef(null);
  const inFlightRequestKeyRef = useRef(null);
  
  // 提取 GPS primitive 座標，避免 object 依賴造成重複請求
  const lat = currentLocation?.latitude ?? null;
  const lon = currentLocation?.longitude ?? null;
  const gpsCoords = useMemo(() => {
    if (lat === null || lon === null) return null;
    return { lat, lon };
  }, [lat, lon]);
  const gpsLocationName = currentLocation?.locationName || null;
  
  // 優先級邏輯：
  // 1. 用戶選中的行程地點（最高優先級，但如果為空則跳過）
  // 2. 第一個行程的地點（次優先級，但如果為空則跳過）
  // 3. 當前GPS位置（第三優先級）
  // 4. 住宿地點（預設備用位置）
  const displayLocation = useMemo(
    () => (selectedEventLocation?.trim() || firstEventLocation?.trim() || gpsLocationName || accommodation || '東京'),
    [selectedEventLocation, firstEventLocation, gpsLocationName, accommodation]
  );
  const requestKey = useMemo(
    () => `${date || ''}_${displayLocation || ''}_${lat ?? 'no-lat'}_${lon ?? 'no-lon'}`,
    [date, displayLocation, lat, lon]
  );

  useEffect(() => {
    // 如果沒有日期或地點，清空天氣
    if (!date || !displayLocation) {
      setWeather(null);
      setLoading(false);
      return;
    }

    if (requestKey === lastRequestKeyRef.current || requestKey === inFlightRequestKeyRef.current) {
      return;
    }

    inFlightRequestKeyRef.current = requestKey;
    setLoading(true);
    setWeather(null); // 立即清空舊天氣資料
    let isActive = true;
    
    const fetchWeather = async () => {
      try {
        // 如果有 GPS 坐標，傳遞給 API；否則使用地點名稱
        const result = await getWeatherForDate(date, displayLocation, gpsCoords);
        if (!isActive) return;
        setWeather(result);
        lastRequestKeyRef.current = requestKey;
      } catch (error) {
        if (!isActive) return;
        logger.error('天氣獲取錯誤:', error);
        setWeather(null);
      } finally {
        if (isActive) {
          setLoading(false);
        }
        if (inFlightRequestKeyRef.current === requestKey) {
          inFlightRequestKeyRef.current = null;
        }
      }
    };

    // 添加延遲以確保DOM完全更新
    const timer = setTimeout(() => {
      fetchWeather();
    }, 100);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [date, displayLocation, lat, lon, requestKey]);

  if (loading) {
    if (variant === 'compact') {
      return (
        <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white/90">
          <div className="flex items-center gap-2">
            <span className="tp-gentle-float inline-block text-lg">☁️</span>
            <span>天氣載入中</span>
          </div>
        </div>
      );
    }

    return (
      <div className="mb-4 rounded-lg border border-brand-100 bg-gradient-to-r from-brand-50 to-cyan-50 p-4 dark:border-brand-800 dark:from-brand-900/20 dark:to-cyan-900/20">
        <div className="flex items-center gap-3">
          <div className="tp-gentle-float text-3xl">⏳</div>
          <p className="text-sm text-gray-600 dark:text-gray-400">正在載入 {displayLocation} 的天氣...</p>
        </div>
      </div>
    );
  }

  if (!weather) {
    if (variant === 'compact') {
      return (
        <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white/80">
          天氣暫不可用
        </div>
      );
    }

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

  if (variant === 'compact') {
    return (
      <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <CuteWeatherIcon code={weather.weatherCode} size="text-2xl" />
          <div className="min-w-0">
            <p className="text-[11px] text-white/70 truncate">
              {displayLocation} {getSourceBadge()}
            </p>
            <p className="text-sm font-semibold text-white">
              {weather.temperature}°C · {weather.description}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-lg border border-brand-100 bg-gradient-to-r from-brand-50 to-cyan-50 p-4 dark:border-slate-800 dark:from-slate-900/50 dark:to-cyan-900/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CuteWeatherIcon code={weather.weatherCode} size="text-5xl" />
          <div>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              {getLocationLabel()} {getSourceBadge()}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{weather.temperature}°C</p>
            <p className="text-sm text-gray-600 dark:text-slate-400">{weather.description}</p>
          </div>
        </div>
        {weather.precipitation !== undefined && weather.windSpeed !== undefined && (
          <div className="text-right text-sm text-gray-600 dark:text-slate-400">
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
