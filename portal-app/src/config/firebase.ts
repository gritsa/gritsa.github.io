import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDIRnmhrFvkjGCMpUTPh2v1-QsZMJye3Ng",
  authDomain: "gritsa-portal.firebaseapp.com",
  projectId: "gritsa-portal",
  storageBucket: "gritsa-portal.firebasestorage.app",
  messagingSenderId: "437832689618",
  appId: "1:437832689618:web:b56404dc5dde0a385b0a0b",
  measurementId: "G-MVD7JM203Y"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
