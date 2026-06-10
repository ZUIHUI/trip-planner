import { getCloudFunctions } from './firebase';
import { normalizeTripHandbookResponse } from '../utils/tripHandbook';

export const requestTripHandbook = async ({ tripId } = {}) => {
  const safeTripId = String(tripId || '').trim();

  if (!safeTripId) {
    throw new Error('缺少旅程資訊。');
  }

  const [{ httpsCallable }, functions] = await Promise.all([
    import('firebase/functions'),
    getCloudFunctions()
  ]);
  const callable = httpsCallable(functions, 'generateTripHandbook');
  const response = await callable({ tripId: safeTripId });

  return normalizeTripHandbookResponse(response.data || {});
};
