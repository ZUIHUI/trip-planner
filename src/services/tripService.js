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
 * 深層合併旅程資料（避免覆蓋其他人編輯的內容）
 */
const deepMerge = (target, source) => {
  const result = { ...target };
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }
  return result;
};

/**
 * 儲存或更新旅程（使用深層合併避免覆蓋）
 */
export const saveTrip = async (tripId, tripData) => {
  try {
    const ref = doc(db, 'trips', tripId);
    const snap = await getDoc(ref);
    
    if (snap.exists()) {
      // 已存在的旅程：深層合併，避免覆蓋其他人編輯的內容
      const existingData = snap.data();
      const mergedData = deepMerge(existingData, {
        ...tripData,
        updatedAt: new Date().toISOString(),
        lastEditor: 'local-user' // 可選：記錄最後編輯者
      });
      await setDoc(ref, mergedData, { merge: true });
    } else {
      // 新旅程：直接建立
      await setDoc(ref, {
        ...tripData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
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

/**
 * 更新購物清單
 */
export const updateShoppingList = async (tripId, shoppingList) => {
  try {
    const ref = doc(db, 'trips', tripId);
    await setDoc(ref, { shoppingList }, { merge: true });
  } catch (err) {
    console.error('❌ 更新購物清單失敗:', err);
    throw err;
  }
};
