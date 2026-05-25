
import { logger } from '../utils/logger';

/**
 * 匯率服務
 * 使用免費的 ExchangeRate-API 獲取即時匯率
 * API 文件: https://www.exchangerate-api.com/docs/free
 */

const API_URL = 'https://api.exchangerate-api.com/v4/latest/JPY';

export const fetchJPYRate = async () => {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error('無法獲取匯率資料');
    }
    const data = await response.json();
    // data.rates.TWD 即為 JPY 對 TWD 的匯率
    return {
      rate: data.rates.TWD,
      date: data.date,
      success: true
    };
  } catch (error) {
    logger.error('匯率更新失敗:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
