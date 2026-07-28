import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCM2z5slUjr8vyEPwASzT7pArS0unQyYvE',
  authDomain: 'bizly-store.firebaseapp.com',
  projectId: 'bizly-store',
  storageBucket: 'bizly-store.firebasestorage.app',
  messagingSenderId: '717745007360',
  appId: '1:717745007360:web:eb81dfcae6b08397f761e5',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
