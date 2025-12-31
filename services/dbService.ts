
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
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';

const STORAGE_KEY = 'synergy_db_v3';

// פונקציית עזר לקבלת משתני סביבה בצורה בטוחה
const getEnv = (key: string): string => {
  try {
    const env = (import.meta as any).env;
    return env?.[key] || (process as any).env?.[key] || "";
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

// בדיקה האם הוגדרו משתני סביבה ל-Firebase
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
  isCloudActive(): boolean {
    return !!db;
  },

  async loginAsAdmin(): Promise<User | null> {
    if (!auth) {
      alert("שגיאה: הגדרות הענן (Firebase) חסרות. המערכת עובדת במצב מקומי בלבד במכשיר זה.");
      return null;
    }
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  },

  async logout(): Promise<void> {
    if (auth) await signOut(auth);
  },

  onAuthChange(callback: (user: User | null) => void) {
    if (!auth) {
      callback(null);
      return;
    }
    onAuthStateChanged(auth, callback);
  },

  async getSessions(): Promise<PartnershipSession[]> {
    // אם יש ענן, נביא קודם ממנו
    if (db) {
      try {
        const q = query(collection(db, 'sessions'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const sessions = querySnapshot.docs.map(doc => doc.data() as PartnershipSession);
        if (sessions.length > 0) {
          // נסנכרן גם ל-local למקרה של ניתוק
          saveLocalSessions(sessions);
          return sessions;
        }
      } catch (e) {
        console.error("Cloud fetch failed:", e);
      }
    }
    // נפילה ל-local storage אם אין ענן או שיש שגיאה
    return getLocalSessions();
  },

  // האזנה לשינויים בזמן אמת (מעולה לסנכרון בין טלפון למחשב)
  subscribeToSessions(callback: (sessions: PartnershipSession[]) => void) {
    if (!db) return () => {};
    const q = query(collection(db, 'sessions'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(doc => doc.data() as PartnershipSession);
      saveLocalSessions(sessions);
      callback(sessions);
    });
  },

  async saveSession(session: PartnershipSession): Promise<void> {
    // שמירה מקומית תמיד לגיבוי
    const local = getLocalSessions();
    const idx = local.findIndex(s => s.id === session.id);
    if (idx >= 0) local[idx] = session;
    else local.push(session);
    saveLocalSessions(local);

    // שמירה בענן
    if (db) {
      try {
        await setDoc(doc(db, 'sessions', session.id), session);
      } catch (e) {
        console.error("Cloud save failed:", e);
        throw new Error("לא ניתן היה לשמור בענן. המידע נשמר זמנית על המכשיר בלבד.");
      }
    }
  },

  async addResponse(sessionId: string, response: ParticipantResponse): Promise<void> {
    // שמירה מקומית
    const local = getLocalSessions();
    const session = local.find(s => s.id === sessionId);
    if (session) {
      if (!session.responses) session.responses = [];
      session.responses.push(response);
      saveLocalSessions(local);
    }

    // שמירה בענן - קריטי כדי שהאדמין יראה את זה במכשיר אחר
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
