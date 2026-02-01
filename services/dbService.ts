
import { PartnershipSession, ParticipantResponse } from '../types';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, getDocs, setDoc, doc, updateDoc, deleteDoc,
  arrayUnion, query, orderBy, onSnapshot
} from 'firebase/firestore';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';

const STORAGE_KEY = 'synergy_db_final_v1';

// Direct access to Vite environment variables is safer and more reliable
const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
};

let db: any = null;
let auth: any = null;

// Initialize Firebase only if mandatory config is present
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log("SynergyBridge: Cloud Sync Enabled");
  } catch (e) {
    console.error("Firebase Initialization Error:", e);
  }
} else {
  console.warn("SynergyBridge: Running in Local-Only mode. Cloud variables missing.");
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
      } catch (err) {
        console.error("Failed to fetch sessions from Cloud:", err);
      }
    }
    return getLocalSessions();
  },
  subscribeToSessions(callback: (sessions: PartnershipSession[]) => void) {
    if (!db) { 
      callback(getLocalSessions()); 
      return () => {}; 
    }
    const q = query(collection(db, 'sessions'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(doc => doc.data() as PartnershipSession);
      saveLocalSessions(sessions);
      callback(sessions);
    }, (err) => {
      console.warn("Cloud Sync interrupted, falling back to local data.", err);
      callback(getLocalSessions());
    });
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
