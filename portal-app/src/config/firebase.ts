import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDySLIP1DWieyUMaWj6gb8Be8ddsRMks5E",
  authDomain: "gritsa-portal-d9b35.firebaseapp.com",
  projectId: "gritsa-portal-d9b35",
  storageBucket: "gritsa-portal-d9b35.firebasestorage.app",
  messagingSenderId: "115612748070",
  appId: "1:115612748070:web:cf154ce5b4cab6e54b99e7",
  measurementId: "G-9T4F9YD6V9"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
