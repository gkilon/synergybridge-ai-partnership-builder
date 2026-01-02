
import { PartnershipSession, ParticipantResponse } from '../types';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  updateDoc, 
  deleteDoc,
  arrayUnion, 
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';

const STORAGE_KEY = 'synergy_db_v3';

// Reverting to import.meta.env for Firebase as it is standard for Vite/Netlify environments
const getEnv = (key: string): string => {
  try {
    // @ts-ignore
    return import.meta.env[key] || process.env[key] || '';
  } catch {
    return "";
  }
};

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID')
};

const isFirebaseConfigValid = !!firebaseConfig.projectId && firebaseConfig.projectId.length > 5;

let db: any = null;
let auth: any = null;

if (isFirebaseConfigValid) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (e) {
    console.warn("Firebase initialization failed:", e);
  }
}

const getLocalSessions = (): PartnershipSession[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveLocalSessions = (sessions: PartnershipSession[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error("Local storage save failed:", e);
  }
};

export const dbService = {
  isCloudActive(): boolean { return !!db; },
  async loginWithGoogle(): Promise<User | null> {
    if (!auth) return null;
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  },
  async logout(): Promise<void> { if (auth) await signOut(auth); },
  onAuthChange(callback: (user: User | null) => void) {
    if (!auth) { callback(null); return () => {}; }
    return onAuthStateChanged(auth, callback);
  },
  async getSessions(): Promise<PartnershipSession[]> {
    if (db) {
      try {
        const q = query(collection(db, 'sessions'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const sessions = querySnapshot.docs.map(doc => doc.data() as PartnershipSession);
        if (sessions.length > 0) { saveLocalSessions(sessions); return sessions; }
      } catch (e) {
        console.error("Firestore fetch failed, falling back to local storage", e);
      }
    }
    return getLocalSessions();
  },
  subscribeToSessions(callback: (sessions: PartnershipSession[]) => void) {
    if (!db) { callback(getLocalSessions()); return () => {}; }
    const q = query(collection(db, 'sessions'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(doc => doc.data() as PartnershipSession);
      saveLocalSessions(sessions);
      callback(sessions);
    }, (err) => {
      console.error("Snapshot failed, using local", err);
      callback(getLocalSessions());
    });
  },
  async saveSession(session: PartnershipSession): Promise<void> {
    const local = getLocalSessions();
    const idx = local.findIndex(s => s.id === session.id);
    if (idx >= 0) local[idx] = session; else local.push(session);
    saveLocalSessions(local);
    if (db) await setDoc(doc(db, 'sessions', session.id), session);
  },
  async deleteSession(sessionId: string): Promise<void> {
    const local = getLocalSessions().filter(s => s.id !== sessionId);
    saveLocalSessions(local);
    if (db) await deleteDoc(doc(db, 'sessions', sessionId));
  },
  async addResponse(sessionId: string, response: ParticipantResponse): Promise<void> {
    const local = getLocalSessions();
    const session = local.find(s => s.id === sessionId);
    if (session) {
      if (!session.responses) session.responses = [];
      session.responses.push(response);
      saveLocalSessions(local);
    }
    if (db) {
      await updateDoc(doc(db, 'sessions', sessionId), {
        responses: arrayUnion(response)
      });
    }
  }
};
