
import { PartnershipSession, ParticipantResponse } from '../types';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getFirestore, collection, getDoc, setDoc, doc, updateDoc, deleteDoc,
  arrayUnion, query, orderBy, onSnapshot
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged, User, signOut } from 'firebase/auth';

const STORAGE_KEY = 'synergy_db_final_v1';

// Direct access to Vite env variables
const getEnv = (key: string): string => {
  return (import.meta as any).env?.[`VITE_${key}`] || '';
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

// Safe init
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
    isConnected = true;
    console.log("SynergyBridge: Firebase Cloud Initialized.");
  } catch (e) {
    console.error("SynergyBridge: Firebase Init Failed:", e);
  }
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
  isCloudActive(): boolean { return isConnected && !!db; },
  
  async logout(): Promise<void> { if (auth) await signOut(auth); },

  onAuthChange(callback: (user: User | null) => void) {
    if (!auth) { callback(null); return () => {}; }
    return onAuthStateChanged(auth, callback);
  },

  subscribeToSessions(callback: (sessions: PartnershipSession[]) => void) {
    callback(getLocalSessions());
    if (!db) return () => {};

    const q = query(collection(db, 'sessions'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(doc => doc.data() as PartnershipSession);
      if (sessions.length > 0) {
        saveLocalSessions(sessions);
        callback(sessions);
      }
    }, (err) => {
      console.warn("Snapshot sync issue:", err);
    });
  },

  // Direct fetch for deep-linked users
  async getSessionById(id: string): Promise<PartnershipSession | null> {
    // Check local first
    const local = getLocalSessions().find(s => s.id === id);
    if (local) return local;

    // Fetch from cloud
    if (db) {
      try {
        const docRef = doc(db, 'sessions', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as PartnershipSession;
          // Update local cache
          const sessions = getLocalSessions();
          if (!sessions.find(s => s.id === id)) {
            sessions.push(data);
            saveLocalSessions(sessions);
          }
          return data;
        }
      } catch (err) {
        console.error("Direct fetch failed:", err);
      }
    }
    return null;
  },

  async saveSession(session: PartnershipSession): Promise<void> {
    const local = getLocalSessions();
    const idx = local.findIndex(s => s.id === session.id);
    if (idx >= 0) local[idx] = session; else local.push(session);
    saveLocalSessions(local);

    if (db) {
      try {
        await setDoc(doc(db, 'sessions', session.id), session);
      } catch (err) {
        console.error("Cloud Save Error:", err);
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
        console.error("Cloud Delete Error:", err);
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
        console.error("Cloud Response Error:", err);
      }
    }
  }
};
