// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDWiG35YXHw6iILQknLp3obXDN--EMj2l4",
  authDomain: "trip-planner-36455.firebaseapp.com",
  projectId: "trip-planner-36455",
  storageBucket: "trip-planner-36455.firebasestorage.app",
  messagingSenderId: "160404293548",
  appId: "1:160404293548:web:9147eadd5665bbce691c09",
  measurementId: "G-H1NYSN3EYE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firestore
export const db = getFirestore(app);

export { app, analytics };