
import { PartnershipSession, ParticipantResponse } from '../types';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, getDocs, setDoc, doc, updateDoc, deleteDoc,
  arrayUnion, query, orderBy, onSnapshot
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged, User, signOut } from 'firebase/auth';

const STORAGE_KEY = 'synergy_db_final_v1';

// Robust environment variable detection for Vite/Netlify
const getEnv = (key: string) => {
  const v = (import.meta as any).env?.[`VITE_${key}`] || 
            (window as any).process?.env?.[`VITE_${key}`] ||
            (window as any).process?.env?.[key];
  return v;
};

const firebaseConfig = {
  apiKey: getEnv('FIREBASE_API_KEY'),
  authDomain: getEnv('FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('FIREBASE_APP_ID')
};

let db: any = null;
let auth: any = null;
let isConnected = false;

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    isConnected = true;
    console.log("SynergyBridge: Cloud connected successfully.");
  } catch (e) {
    console.error("SynergyBridge: Firebase failed to init:", e);
  }
} else {
  console.warn("SynergyBridge: Missing Firebase config. Running in LOCAL MODE.");
}

const getLocalSessions = (): PartnershipSession[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
};

const saveLocalSessions = (sessions: PartnershipSession[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
};

export const dbService = {
  isCloudActive(): boolean { return isConnected; },
  async logout(): Promise<void> { if (auth) await signOut(auth); },
  onAuthChange(callback: (user: User | null) => void) {
    if (!auth) { callback(null); return () => {}; }
    return onAuthStateChanged(auth, callback);
  },
  subscribeToSessions(callback: (sessions: PartnershipSession[]) => void) {
    // Immediate local load
    const local = getLocalSessions();
    callback(local);

    if (!db) return () => {};

    const q = query(collection(db, 'sessions'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(doc => doc.data() as PartnershipSession);
      // We update local cache with cloud data
      saveLocalSessions(sessions);
      callback(sessions);
    }, (err) => {
      console.error("Cloud Sync Error:", err);
    });
  },
  async saveSession(session: PartnershipSession): Promise<void> {
    // 1. Local Save (Instant UI update)
    const local = getLocalSessions();
    const idx = local.findIndex(s => s.id === session.id);
    if (idx >= 0) local[idx] = session; else local.push(session);
    saveLocalSessions(local);

    // 2. Cloud Save (Sync)
    if (db) {
      try {
        await setDoc(doc(db, 'sessions', session.id), session);
        console.log("Session synced to cloud:", session.id);
      } catch (err) {
        console.error("Cloud Sync Failed:", err);
      }
    }
  },
  async deleteSession(sessionId: string): Promise<void> {
    const local = getLocalSessions().filter(s => s.id !== sessionId);
    saveLocalSessions(local);
    if (db) {
      try {
        await deleteDoc(doc(db, 'sessions', sessionId));
      } catch (err) {
        console.error("Cloud Delete Failed:", err);
      }
    }
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
      try {
        await updateDoc(doc(db, 'sessions', sessionId), {
          responses: arrayUnion(response)
        });
      } catch (err) {
        console.error("Cloud Response Failed:", err);
      }
    }
  }
};
