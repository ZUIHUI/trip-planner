import { useState, useEffect } from 'react';
import { getDeviceLocation } from '../services/locationService';

/**
 * 自訂Hook - 用於獲取和管理設備GPS位置
 * @returns {Object} { currentLocation, isLocating, locationError }
 */
export const useDeviceLocation = () => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);

  useEffect(() => {
    // 頁面載入時自動請求GPS定位
    const requestLocation = async () => {
      setIsLocating(true);
      setLocationError(null);
      
      try {
        const location = await getDeviceLocation();
        
        if (location) {
          setCurrentLocation(location);
          console.log('位置已更新:', location.locationName);
        } else {
          setLocationError('無法獲取設備位置');
        }
      } catch (error) {
        console.error('定位過程出錯:', error);
        setLocationError(error.message);
      } finally {
        setIsLocating(false);
      }
    };

    requestLocation();
  }, []);

  return {
    currentLocation,
    isLocating,
    locationError
  };
};

export default useDeviceLocation;
