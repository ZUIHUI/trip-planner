import { getCloudFunctions } from './firebase';
import { normalizeAiRecommendationResponse } from '../utils/tripAiRecommendations';

const validModes = new Set(['dayPlan']);
const MAX_USER_IDEA_LENGTH = 600;

export const requestTripRecommendations = async ({
  tripId,
  selectedDay,
  mode = 'dayPlan',
  userIdea = ''
} = {}) => {
  const safeTripId = String(tripId || '').trim();
  const safeMode = validModes.has(mode) ? mode : 'dayPlan';
  const safeUserIdea = String(userIdea || '').replace(/\s+/g, ' ').trim().slice(0, MAX_USER_IDEA_LENGTH);

  if (!safeTripId) {
    throw new Error('缺少旅程資訊。');
  }

  const [{ httpsCallable }, functions] = await Promise.all([
    import('firebase/functions'),
    getCloudFunctions()
  ]);
  const callable = httpsCallable(functions, 'generateTripRecommendations');
  const payload = {
    tripId: safeTripId,
    selectedDay: Number(selectedDay || 1),
    mode: safeMode
  };

  if (safeUserIdea) {
    payload.userIdea = safeUserIdea;
  }

  const response = await callable(payload);

  return normalizeAiRecommendationResponse(response.data || {});
};
