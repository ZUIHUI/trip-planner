// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDWiG35YXHw6iILQknLp3obXDN--EMj2l4",
  authDomain: "trip-planner-36455.firebaseapp.com",
  projectId: "trip-planner-36455",
  storageBucket: "trip-planner-36455.firebasestorage.app",
  messagingSenderId: "160404293548",
  appId: "1:160404293548:web:9147eadd5665bbce691c09",
  measurementId: "G-H1NYSN3EYE"
};

const app = initializeApp(firebaseConfig);

// 🔥 這個是你之後在 App.js 要用的
export const db = getFirestore(app);