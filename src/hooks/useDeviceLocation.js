import { useState, useEffect } from 'react';
import { getDeviceLocation } from '../services/locationService';

/**
 * 自訂Hook - 用於獲取和管理設備GPS位置
 * @param {boolean} enableGPS - 是否啟用GPS定位
 * @returns {Object} { currentLocation, isLocating, locationError }
 */
export const useDeviceLocation = (enableGPS = false) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);

  useEffect(() => {
    // 根據用戶設定決定是否啟用 GPS 定位
    if (!enableGPS) {
      console.log('GPS 定位未啟用');
      setCurrentLocation(null);
      setIsLocating(false);
      return;
    }

    // 頁面載入時自動請求GPS定位
    const requestLocation = async () => {
      setIsLocating(true);
      setLocationError(null);
      
      try {
        const location = await getDeviceLocation();
        
        if (location) {
          console.log('GPS 定位成功:', location);
          setCurrentLocation(location);
          console.log('位置已更新:', location.locationName);
        } else {
          console.warn('GPS 定位返回 null');
          setLocationError('無法獲取設備位置');
          setCurrentLocation(null);
        }
      } catch (error) {
        console.error('定位過程出錯:', error);
        setLocationError(error.message);
        setCurrentLocation(null);
      } finally {
        setIsLocating(false);
      }
    };

    // 延遲請求，給用戶權限提示的時間
    const timer = setTimeout(() => {
      requestLocation();
    }, 500);

    return () => clearTimeout(timer);
  }, [enableGPS]);

  return {
    currentLocation,
    isLocating,
    locationError
  };
};

export default useDeviceLocation;


