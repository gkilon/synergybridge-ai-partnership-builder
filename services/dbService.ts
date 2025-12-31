
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

const STORAGE_KEY = 'synergy_db_v3';

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

const isFirebaseEnabled = !!firebaseConfig.projectId && firebaseConfig.projectId !== "";

let db: any = null;
let auth: any = null;

if (isFirebaseEnabled) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (e) {
    console.warn("Firebase initialization failed. Using local storage.");
  }
}

const getLocalSessions = (): PartnershipSession[] => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
};

const saveLocalSessions = (sessions: PartnershipSession[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
};

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
        const sessions = querySnapshot.docs.map(doc => doc.data() as PartnershipSession);
        if (sessions.length > 0) return sessions;
      } catch (e) {
        console.error("Cloud fetch failed, trying local:", e);
      }
    }
    return getLocalSessions();
  },

  async saveSession(session: PartnershipSession): Promise<void> {
    // 1. Always Save Locally first to ensure safety
    const local = getLocalSessions();
    const idx = local.findIndex(s => s.id === session.id);
    if (idx >= 0) local[idx] = session;
    else local.push(session);
    saveLocalSessions(local);

    // 2. Try Cloud if enabled
    if (db) {
      try {
        await setDoc(doc(db, 'sessions', session.id), session);
      } catch (e) {
        console.error("Cloud save failed, data is safe locally:", e);
      }
    }
  },

  async addResponse(sessionId: string, response: ParticipantResponse): Promise<void> {
    // 1. Local Update
    const local = getLocalSessions();
    const session = local.find(s => s.id === sessionId);
    if (session) {
      if (!session.responses) session.responses = [];
      session.responses.push(response);
      saveLocalSessions(local);
    }

    // 2. Cloud Update
    if (db) {
      try {
        const docRef = doc(db, 'sessions', sessionId);
        await updateDoc(docRef, {
          responses: arrayUnion(response)
        });
      } catch (e) {
        console.error("Cloud response add failed:", e);
      }
    }
  }
};
