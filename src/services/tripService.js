import { db } from './firebase';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import {
  buildTripDocumentFromAppState,
  buildTripListItem,
  normalizeTripDocumentForApp
} from '../domain/tripSchema';

/**
 * 載入單一旅程
 */
export const loadTrip = async (tripId) => {
  try {
    const ref = doc(db, 'trips', tripId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return normalizeTripDocumentForApp({
        id: snap.id,
        ...snap.data()
      });
    }
    return null;
  } catch (err) {
    console.error('❌ 載入旅程失敗:', err);
    throw err;
  }
};

/**
 * 儲存或更新旅程。
 * 讀取舊 Firebase 文件後會寫回 v2 schema，同時保留 legacy 欄位供舊 UI 相容。
 */
export const saveTrip = async (tripId, tripData) => {
  try {
    const ref = doc(db, 'trips', tripId);
    const snap = await getDoc(ref);

    const existingData = snap.exists() ? snap.data() : {};
    const nextDocument = buildTripDocumentFromAppState(tripId, tripData, existingData);
    await setDoc(ref, nextDocument, { merge: true });

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
    await setDoc(ref, buildTripDocumentFromAppState(tripId, tripData));
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
    const trips = snapshot.docs.map((snapshotDoc) => buildTripListItem(snapshotDoc.id, snapshotDoc.data()));
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
    await setDoc(
      ref,
      {
        planning: { shoppingList },
        shoppingList,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (err) {
    console.error('❌ 更新購物清單失敗:', err);
    throw err;
  }
};

/**
 * 更新購物清單分類
 */
export const updateShoppingCategories = async (tripId, shoppingCategories) => {
  try {
    const ref = doc(db, 'trips', tripId);
    await setDoc(
      ref,
      {
        planning: { shoppingCategories },
        shoppingCategories,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (err) {
    console.error('❌ 更新購物分類失敗:', err);
    throw err;
  }
};
