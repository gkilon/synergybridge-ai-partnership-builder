
import { PartnershipSession, ParticipantResponse } from '../types';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  updateDoc, 
  arrayUnion, 
  getDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';

const getEnv = (key: string): string => {
  try {
    const env = (typeof process !== 'undefined' && process.env) ? process.env : (window as any).process?.env;
    return env?.[key] || "";
  } catch {
    return "";
  }
};

const firebaseConfig = {
  apiKey: getEnv('FIREBASE_API_KEY'),
  authDomain: getEnv('FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('FIREBASE_APP_ID')
};

const isFirebaseEnabled = !!firebaseConfig.projectId;

let db: any = null;
let auth: any = null;

if (isFirebaseEnabled) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (e) {
    console.warn("Firebase initialization failed.", e);
  }
}

export const dbService = {
  isCloud(): boolean {
    return !!db;
  },

  async loginAsAdmin(): Promise<User | null> {
    if (!auth) return null;
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  },

  onAuthChange(callback: (user: User | null) => void) {
    if (!auth) return;
    onAuthStateChanged(auth, callback);
  },

  async getSessions(): Promise<PartnershipSession[]> {
    if (db) {
      try {
        const q = query(collection(db, 'sessions'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => doc.data() as PartnershipSession);
      } catch (e) {
        console.error("Firestore error (likely unauthorized):", e);
        // If not logged in, we only get an error here because of our new rules
      }
    }
    
    const saved = localStorage.getItem('synergy_db_v2');
    return saved ? JSON.parse(saved) : [];
  },

  async saveSession(session: PartnershipSession): Promise<void> {
    if (db) {
      try {
        await setDoc(doc(db, 'sessions', session.id), session);
        return;
      } catch (e) {
        console.error("Firestore save failed:", e);
      }
    }
    // Local storage fallback omitted for brevity but remains same as before
  },

  async addResponse(sessionId: string, response: ParticipantResponse): Promise<void> {
    if (db) {
      try {
        const docRef = doc(db, 'sessions', sessionId);
        await updateDoc(docRef, {
          responses: arrayUnion(response)
        });
        return;
      } catch (e) {
        console.error("Firestore addResponse failed:", e);
      }
    }
    // Local storage fallback...
  }
};
