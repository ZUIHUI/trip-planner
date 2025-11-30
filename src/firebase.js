// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 支援使用 Vite 的環境變數 (VITE_FIREBASE_*)，若未設定則使用 fallback 值
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDWiG35YXHw6iILQknLp3obXDN--EMj2l4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "trip-planner-36455.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "trip-planner-36455",
  // 修正 storageBucket 為 appspot.com 預設格式
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "trip-planner-36455.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "160404293548",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:160404293548:web:9147eadd5665bbce691c09",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-H1NYSN3EYE"
};

const app = initializeApp(firebaseConfig);

// 匯出 app 與 Firestore 實例給應用程式使用
export const db = getFirestore(app);
export default app;