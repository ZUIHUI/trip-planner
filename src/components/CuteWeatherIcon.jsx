/**
 * 簡約可愛風格的天氣圖示組件
 */

const CUTE_WEATHER_ICONS = {
  // 晴天系列
  0: { symbol: '☀️', name: '晴天', color: 'text-yellow-500 dark:text-yellow-300' },
  1: { symbol: '🌤️', name: '晴朗', color: 'text-yellow-400 dark:text-yellow-200' },
  2: { symbol: '⛅', name: '多雲', color: 'text-gray-500 dark:text-gray-300' },
  3: { symbol: '☁️', name: '陰天', color: 'text-gray-600 dark:text-gray-400' },
  
  // 霧系列
  45: { symbol: '🌫️', name: '霧', color: 'text-gray-500 dark:text-gray-400' },
  48: { symbol: '🌫️', name: '結冰霧', color: 'text-blue-400 dark:text-blue-300' },
  
  // 小雨系列
  51: { symbol: '🌧️', name: '毛毛雨', color: 'text-blue-400 dark:text-blue-300' },
  53: { symbol: '🌧️', name: '毛毛雨', color: 'text-blue-400 dark:text-blue-300' },
  55: { symbol: '🌧️', name: '毛毛雨', color: 'text-blue-400 dark:text-blue-300' },
  61: { symbol: '🌧️', name: '小雨', color: 'text-blue-500 dark:text-blue-400' },
  63: { symbol: '🌧️', name: '中雨', color: 'text-blue-600 dark:text-blue-500' },
  65: { symbol: '⛈️', name: '大雨', color: 'text-blue-700 dark:text-blue-600' },
  
  // 雪系列
  71: { symbol: '❄️', name: '小雪', color: 'text-cyan-400 dark:text-cyan-300' },
  73: { symbol: '❄️', name: '中雪', color: 'text-cyan-500 dark:text-cyan-400' },
  75: { symbol: '❄️', name: '大雪', color: 'text-cyan-600 dark:text-cyan-500' },
  77: { symbol: '❄️', name: '雪粒', color: 'text-cyan-400 dark:text-cyan-300' },
  
  // 陣雨/陣雪系列
  80: { symbol: '🌧️', name: '陣雨', color: 'text-blue-600 dark:text-blue-500' },
  81: { symbol: '⛈️', name: '雷陣雨', color: 'text-blue-700 dark:text-blue-600' },
  82: { symbol: '⛈️', name: '雷陣雨', color: 'text-blue-800 dark:text-blue-700' },
  85: { symbol: '❄️', name: '陣雪', color: 'text-cyan-500 dark:text-cyan-400' },
  86: { symbol: '❄️', name: '大陣雪', color: 'text-cyan-600 dark:text-cyan-500' },
  
  // 雷暴系列
  95: { symbol: '⛈️', name: '雷暴', color: 'text-slate-700 dark:text-slate-300' },
  96: { symbol: '⛈️', name: '雷暴', color: 'text-slate-700 dark:text-slate-300' },
  99: { symbol: '⛈️', name: '雷暴', color: 'text-slate-700 dark:text-slate-300' },
};

export const CuteWeatherIcon = ({ code, size = 'text-5xl' }) => {
  const icon = CUTE_WEATHER_ICONS[code] || CUTE_WEATHER_ICONS[0];
  return (
    <span className={`${size} ${icon.color} transition-colors`}>
      {icon.symbol}
    </span>
  );
};

export default CuteWeatherIcon;
