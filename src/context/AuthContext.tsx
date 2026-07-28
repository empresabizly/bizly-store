import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { Business } from '../types';

interface AuthContextType {
  user: User | null;
  business: Business | null;
  loading: boolean;
  register: (email: string, password: string, name: string) => Promise<User>;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshBusiness: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadBusiness(uid: string) {
    const q = query(collection(db, 'businesses'), where('ownerId', '==', uid));
    const snap = await getDocs(q);
    if (!snap.empty) {
      setBusiness(snap.docs[0].data() as Business);
    } else {
      setBusiness(null);
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await loadBusiness(u.uid);
      } else {
        setBusiness(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function register(email: string, password: string, name: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    return cred.user;
  }

  async function login(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  }

  async function logout() {
    await signOut(auth);
  }

  async function refreshBusiness() {
    if (user) await loadBusiness(user.uid);
  }

  return (
    <AuthContext.Provider value={{ user, business, loading, register, login, logout, refreshBusiness }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

// Utilidad para verificar un negocio por slug (usada en la tienda pública)
export async function getBusinessBySlug(slug: string): Promise<Business | null> {
  const ref = doc(db, 'businesses', slug);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as Business) : null;
}
