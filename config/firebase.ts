import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA0xk32VIw6J2yoqgHrn6icc5qDaEwX0Fw",
  authDomain: "green-guardian-e8725.firebaseapp.com",
  projectId: "green-guardian-e8725",
  storageBucket: "green-guardian-e8725.firebasestorage.app",
  messagingSenderId: "913845808023",
  appId: "1:913845808023:web:e62287dde00d108f5e32d2",
  measurementId: "G-SBD9WFLK64"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);