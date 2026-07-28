import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// TODO: reemplaza esto con la configuración de TU proyecto de Firebase.
// La encuentras en: Firebase Console > Configuración del proyecto > Tus apps > SDK setup and configuration
const firebaseConfig = {
  apiKey: 'REEMPLAZA_CON_TU_API_KEY',
  authDomain: 'REEMPLAZA.firebaseapp.com',
  projectId: 'REEMPLAZA',
  storageBucket: 'REEMPLAZA.appspot.com',
  messagingSenderId: 'REEMPLAZA',
  appId: 'REEMPLAZA',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
