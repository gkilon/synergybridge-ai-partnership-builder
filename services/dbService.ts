
import { PartnershipSession, ParticipantResponse } from '../types';
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, collection, getDoc, setDoc, doc, updateDoc, deleteDoc,
  arrayUnion, query, orderBy, onSnapshot, Firestore, enableIndexedDbPersistence
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged, User, signOut, Auth, signInAnonymously } from 'firebase/auth';

const STORAGE_KEY = 'synergy_db_final_v2';

// Robust environment variable detection
const getEnv = (key: string): string => {
  const value = (import.meta as any).env?.[`VITE_${key}`] || 
                (window as any).process?.env?.[`VITE_${key}`] ||
                (window as any).process?.env?.[key] || 
                '';
  return value.trim();
};

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

const initFirebase = () => {
  if (dbInstance) return { db: dbInstance, auth: authInstance };

  const config = {
    apiKey: getEnv('FIREBASE_API_KEY'),
    authDomain: getEnv('FIREBASE_AUTH_DOMAIN'),
    projectId: getEnv('FIREBASE_PROJECT_ID'),
    storageBucket: getEnv('FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnv('FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnv('FIREBASE_APP_ID')
  };

  if (!config.apiKey || !config.projectId) {
    console.warn("SynergyBridge: Missing Firebase credentials.");
    return { db: null, auth: null };
  }

  try {
    appInstance = !getApps().length ? initializeApp(config) : getApp();
    dbInstance = getFirestore(appInstance);
    authInstance = getAuth(appInstance);
    
    try {
      enableIndexedDbPersistence(dbInstance).catch(() => {});
    } catch (e) {}

    console.log("SynergyBridge: Firebase Core Initialized.");
    return { db: dbInstance, auth: authInstance };
  } catch (e) {
    console.error("SynergyBridge: Firebase Init Error:", e);
    return { db: null, auth: null };
  }
};

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
  isCloudActive(): boolean {
    const { db } = initFirebase();
    return !!db;
  },
  
  async loginAdmin(): Promise<User | null> {
    const { auth } = initFirebase();
    if (!auth) return null;
    try {
      const cred = await signInAnonymously(auth);
      console.log("SynergyBridge: Logged in anonymously for Admin access.");
      return cred.user;
    } catch (err) {
      console.error("Auth failed:", err);
      return null;
    }
  },

  async logout(): Promise<void> {
    const { auth } = initFirebase();
    if (auth) await signOut(auth);
  },

  onAuthChange(callback: (user: User | null) => void) {
    const { auth } = initFirebase();
    if (!auth) { callback(null); return () => {}; }
    return onAuthStateChanged(auth, callback);
  },

  subscribeToSessions(callback: (sessions: PartnershipSession[]) => void) {
    callback(getLocalSessions());
    const { db } = initFirebase();
    if (!db) return () => {};

    const q = query(collection(db, 'sessions'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(doc => doc.data() as PartnershipSession);
      if (sessions.length > 0) {
        saveLocalSessions(sessions);
        callback(sessions);
      }
    }, (err) => {
      console.warn("Snapshot error:", err);
    });
  },

  async getSessionById(id: string): Promise<PartnershipSession | null> {
    const local = getLocalSessions().find(s => s.id === id);
    if (local) return local;

    const { db } = initFirebase();
    if (!db) return null;

    try {
      const docRef = doc(db, 'sessions', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as PartnershipSession;
        const sessions = getLocalSessions();
        if (!sessions.find(s => s.id === id)) {
          sessions.push(data);
          saveLocalSessions(sessions);
        }
        return data;
      }
    } catch (err) {
      console.error("Cloud fetch failed:", err);
    }
    return null;
  },

  async saveSession(session: PartnershipSession): Promise<void> {
    const { db, auth } = initFirebase();
    
    // Check if we need to authenticate as admin first based on rules
    if (db && !auth?.currentUser) {
      await this.loginAdmin();
    }

    if (db) {
      try {
        await setDoc(doc(db, 'sessions', session.id), session);
        console.log("SynergyBridge: Cloud sync success.");
        
        // Update local only after cloud success to be sure
        const local = getLocalSessions();
        const idx = local.findIndex(s => s.id === session.id);
        if (idx >= 0) local[idx] = session; else local.push(session);
        saveLocalSessions(local);
      } catch (err) {
        console.error("SynergyBridge: Cloud write denied. Check Rules & Auth.", err);
        throw err;
      }
    } else {
      // Local fallback
      const local = getLocalSessions();
      const idx = local.findIndex(s => s.id === session.id);
      if (idx >= 0) local[idx] = session; else local.push(session);
      saveLocalSessions(local);
    }
  },

  async deleteSession(sessionId: string): Promise<void> {
    const { db } = initFirebase();
    if (db) {
      try {
        await deleteDoc(doc(db, 'sessions', sessionId));
      } catch (err) { console.error("Delete failed:", err); }
    }
    const local = getLocalSessions().filter(s => s.id !== sessionId);
    saveLocalSessions(local);
  },

  async addResponse(sessionId: string, response: ParticipantResponse): Promise<void> {
    const { db } = initFirebase();
    if (db) {
      try {
        // Participants use 'updateDoc' which works without full auth in your rules
        await updateDoc(doc(db, 'sessions', sessionId), {
          responses: arrayUnion(response)
        });
      } catch (err) {
        console.error("Response sync failed:", err);
        throw err;
      }
    }
    
    const local = getLocalSessions();
    const session = local.find(s => s.id === sessionId);
    if (session) {
      if (!session.responses) session.responses = [];
      session.responses.push(response);
      saveLocalSessions(local);
    }
  }
};
