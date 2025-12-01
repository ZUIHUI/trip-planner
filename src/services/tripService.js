import { db } from './firebase';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';

/**
 * 載入單一旅程
 */
export const loadTrip = async (tripId) => {
  try {
    const ref = doc(db, 'trips', tripId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (err) {
    console.error('❌ 載入旅程失敗:', err);
    throw err;
  }
};

/**
 * 儲存或更新旅程
 */
export const saveTrip = async (tripId, tripData) => {
  try {
    const ref = doc(db, 'trips', tripId);
    await setDoc(ref, {
      ...tripData,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log('✅ 旅程已儲存');
    return true;
  } catch (err) {
    console.error('❌ 儲存旅程失敗:', err);
    throw err;
  }
};

/**
 * 建立新旅程
 */
export const createTrip = async (tripId, tripData) => {
  try {
    const ref = doc(db, 'trips', tripId);
    await setDoc(ref, {
      ...tripData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    console.log('✅ 新旅程已建立');
    return true;
  } catch (err) {
    console.error('❌ 建立旅程失敗:', err);
    throw err;
  }
};

/**
 * 列出所有旅程
 */
export const listTrips = async () => {
  try {
    const ref = collection(db, 'trips');
    const snapshot = await getDocs(ref);
    const trips = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return trips;
  } catch (err) {
    console.error('❌ 載入旅程列表失敗:', err);
    throw err;
  }
};

/**
 * 刪除旅程
 */
export const deleteTrip = async (tripId) => {
  try {
    const ref = doc(db, 'trips', tripId);
    await deleteDoc(ref);
    console.log('✅ 旅程已刪除');
    return true;
  } catch (err) {
    console.error('❌ 刪除旅程失敗:', err);
    throw err;
  }
};
