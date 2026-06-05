import { getCloudFunctions } from './firebase';
import { normalizeAiRecommendationResponse } from '../utils/tripAiRecommendations';

const validModes = new Set(['placeIdeas', 'dayPlan']);

export const requestTripRecommendations = async ({
  tripId,
  selectedDay,
  mode = 'placeIdeas'
} = {}) => {
  const safeTripId = String(tripId || '').trim();
  const safeMode = validModes.has(mode) ? mode : 'placeIdeas';

  if (!safeTripId) {
    throw new Error('缺少旅程資訊。');
  }

  const [{ httpsCallable }, functions] = await Promise.all([
    import('firebase/functions'),
    getCloudFunctions()
  ]);
  const callable = httpsCallable(functions, 'generateTripRecommendations');
  const response = await callable({
    tripId: safeTripId,
    selectedDay: Number(selectedDay || 1),
    mode: safeMode
  });

  return normalizeAiRecommendationResponse(response.data || {});
};
