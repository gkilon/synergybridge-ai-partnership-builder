
import React, { useState, useEffect } from 'react';
import { PartnershipSession, Question, Category } from '../types';
import { DEFAULT_QUESTIONS } from '../constants';
import { dbService } from '../services/dbService';
import { User } from 'firebase/auth';

interface Props {
  sessions: PartnershipSession[];
  onAdd?: (title: string, sides: string[], questions: Question[], context: string) => void;
  onUpdate?: (updated: PartnershipSession) => void;
  onOpenSettings?: (id: string) => void;
  onOpenResults?: (id: string) => void;
  onDelete?: (id: string) => void;
  initialEditingId?: string | null;
  forceShowAdd?: boolean;
  onCancel?: () => void;
}

const AdminDashboard: React.FC<Props> = ({ 
  sessions, onAdd, onUpdate, onOpenSettings, onOpenResults, onDelete,
  initialEditingId, forceShowAdd, onCancel 
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [gatePassed, setGatePassed] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [newTitle, setNewTitle] = useState('');
  const [newSides, setNewSides] = useState('');
  const [newContext, setNewContext] = useState('');
  const [editingQuestions, setEditingQuestions] = useState<Question[]>(DEFAULT_QUESTIONS);

  const verifyToken = (input: string) => {
    const secret = process.env.VITE_ADMIN_PASSWORD || 'giladk25';
    return input === secret;
  };

  useEffect(() => {
    const passed = sessionStorage.getItem('sb_security_gate') === 'true';
    if (passed) setGatePassed(true);

    const unsubscribe = dbService.onAuthChange((u) => {
      setUser(u);
      setAuthLoading(false);
    });

    if (initialEditingId) {
      const s = sessions.find(x => x.id === initialEditingId);
      if (s) {
        setNewTitle(s.title);
        setNewSides(s.sides.join(', '));
        setNewContext(s.context || '');
        setEditingQuestions(s.questions || DEFAULT_QUESTIONS);
      }
    }
    
    return () => unsubscribe();
  }, [initialEditingId, sessions]);

  const handleGateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyToken(passwordInput)) {
      setGatePassed(true);
      sessionStorage.setItem('sb_security_gate', 'true');
      setError(false);
    } else {
      setError(true);
      setPasswordInput('');
      setTimeout(() => setError(false), 2000);
    }
  };

  const handleGoogleLogin = async () => {
    if (!dbService.isCloudActive()) {
      alert("שגיאה: Firebase לא הוגדר כראוי במערכת. המערכת עוברת למצב עבודה מקומי (Local Storage).");
      return;
    }
    try {
      await dbService.loginWithGoogle();
    } catch (e) {
      console.error("Login failed", e);
      alert("התחברות נכשלה. וודא שחלון קופץ מאושר בדפדפן.");
    }
  };

  const handleFullLogout = () => {
    sessionStorage.removeItem('sb_security_gate');
    setGatePassed(false);
    dbService.logout();
  };

  if (authLoading) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center space-y-4">
         <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
         <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Verifying Authentication...</p>
      </div>
    );
  }

  if (!gatePassed) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 animate-fadeIn">
        <div className="glass max-w-md w-full p-10 md:p-14 rounded-[4rem] border-zinc-800 shadow-3xl text-center space-y-12 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>
          
          <div className="space-y-4">
             <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center mx-auto border border-amber-500/20 shadow-lg shadow-amber-500/5">
                <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
             </div>
             <div className="space-y-2">
                <h2 className="text-3xl font-black text-white">כניסת אדמין</h2>
                <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest">Security Credentials Required</p>
             </div>
          </div>

          <form onSubmit={handleGateSubmit} className="space-y-6">
            <div className="relative">
              <input 
                type="password"
                placeholder="קוד סודי..."
                autoFocus
                className={`w-full bg-zinc-950 border-2 rounded-2xl p-6 outline-none transition-all text-center font-black text-2xl tracking-[0.5em] ${error ? 'border-rose-500 animate-shake text-rose-500' : 'border-zinc-800 focus:border-indigo-500 text-white shadow-inner'}`}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
              />
              {error && <p className="absolute -bottom-6 left-0 right-0 text-rose-500 text-[10px] font-black uppercase tracking-widest animate-fadeIn">קוד גישה שגוי</p>}
            </div>
            
            <button 
              type="submit"
              className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xl shadow-2xl shadow-indigo-600/30 hover:bg-indigo-500 transition-all active:scale-[0.98]"
            >
              המשך לאימות גוגל
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 animate-fadeIn">
        <div className="glass max-w-md w-full p-10 md:p-14 rounded-[4rem] border-indigo-500/20 shadow-3xl text-center space-y-12 relative overflow-hidden">
          <div className="space-y-6">
             <div className="w-24 h-24 bg-indigo-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto border border-indigo-500/20 shadow-inner">
               <svg className="w-12 h-12 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
               </svg>
             </div>
             <div className="space-y-2">
                <h2 className="text-3xl font-black text-white leading-tight">שלב 2: זיהוי משתמש</h2>
                <p className="text-zinc-500 font-bold text-sm">התחבר עם חשבון Google כדי לצפות בנתונים</p>
             </div>
          </div>

          <button 
            onClick={handleGoogleLogin}
            className="w-full bg-white text-black py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-4 hover:bg-zinc-100 transition-all shadow-xl active:scale-95 border border-zinc-200"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            התחברות עם גוגל
          </button>

          <button 
            onClick={() => { sessionStorage.removeItem('sb_security_gate'); setGatePassed(false); }}
            className="text-[10px] font-black text-zinc-600 hover:text-white transition-colors uppercase tracking-[0.2em] pt-4"
          >
            חזור לשלב הקודם
          </button>
        </div>
      </div>
    );
  }

  if (forceShowAdd || initialEditingId) {
    return (
      <div className="max-w-5xl mx-auto space-y-10 animate-slideDown pb-20">
        <div className="glass p-8 md:p-12 rounded-[3.5rem] border-zinc-800 space-y-12 shadow-3xl relative text-right">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl md:text-4xl font-black text-white">
              {initialEditingId ? 'עריכת הגדרות' : 'הקמת ממשק חדש'}
            </h3>
            <button onClick={onCancel} className="bg-zinc-900 text-zinc-400 px-6 md:px-8 py-3 rounded-xl md:rounded-2xl font-bold hover:text-white transition-colors border border-zinc-800 text-sm md:text-base">ביטול</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 text-right">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block px-1">שם הממשק האסטרטגי</label>
              <input 
                placeholder="שם השותפות..."
                className="w-full bg-zinc-900/50 border-2 border-zinc-800 rounded-2xl p-5 md:p-6 focus:border-indigo-500 outline-none transition-all text-white font-black text-xl md:text-2xl shadow-inner text-right"
                value={newTitle} onChange={e => setNewTitle(e.target.value)}
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block px-1">צדדים (פסיק מפריד)</label>
              <input 
                placeholder="צד א, צד ב..."
                className="w-full bg-zinc-900/50 border-2 border-zinc-800 rounded-2xl p-5 md:p-6 focus:border-indigo-500 outline-none transition-all text-white font-bold text-base md:text-lg shadow-inner text-right"
                value={newSides} onChange={e => setNewSides(e.target.value)}
              />
            </div>
            <div className="md:col-span-2 space-y-3 text-right">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block px-1">הקשר ארגוני ותלות הדדית</label>
              <textarea 
                rows={4}
                className="w-full bg-zinc-900/50 border-2 border-zinc-800 rounded-[2rem] p-5 md:p-6 focus:border-indigo-500 outline-none transition-all text-white font-medium resize-none shadow-inner text-right"
                value={newContext} onChange={e => setNewContext(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-center md:justify-end pt-6">
            <button 
              onClick={() => {
                const sidesArr = newSides.split(',').map(s=>s.trim()).filter(s=>s);
                if (initialEditingId && onUpdate) {
                  onUpdate({
                    ...sessions.find(s=>s.id === initialEditingId)!,
                    title: newTitle,
                    sides: sidesArr,
                    context: newContext,
                    questions: editingQuestions
                  });
                } else if (onAdd) {
                  onAdd(newTitle, sidesArr, editingQuestions, newContext);
                }
              }}
              className="w-full md:w-auto bg-indigo-600 px-12 md:px-20 py-5 md:py-6 rounded-2xl md:rounded-3xl font-black text-lg md:text-xl hover:bg-indigo-500 transition-all text-white shadow-2xl shadow-indigo-600/40 active:scale-95"
            >
              {initialEditingId ? 'שמור שינויים' : 'צור שותפות'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 md:space-y-16 animate-fadeIn pb-24 text-right">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 md:gap-8 border-b border-zinc-900 pb-8 md:pb-10">
        <div className="space-y-2">
          <h2 className="text-3xl md:text-6xl font-black text-white tracking-tighter">לוח ניהול</h2>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                {user.photoURL && <img src={user.photoURL} className="w-4 h-4 rounded-full" alt="" />}
                <span className="text-[9px] md:text-[10px] font-black text-indigo-400 uppercase tracking-widest">{user.displayName}</span>
             </div>
             <div className="w-1 h-1 bg-zinc-800 rounded-full"></div>
             <p className="text-zinc-600 font-bold text-[9px] md:text-xs uppercase tracking-widest">Administrator Active</p>
          </div>
        </div>
        <button 
          onClick={handleFullLogout}
          className="text-[9px] md:text-[10px] font-black text-zinc-700 hover:text-rose-500 uppercase tracking-widest transition-all border border-zinc-900 hover:border-rose-900/50 px-5 py-2.5 rounded-xl bg-zinc-950 shadow-lg"
        >
          ניתוק מאובטח
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
        {sessions.map(session => (
          <div key={session.id} className="glass rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-12 flex flex-col group hover:border-indigo-500/40 transition-all duration-700 relative overflow-hidden shadow-2xl">
             <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all"></div>
             
             <div className="flex justify-between items-center mb-8 md:mb-10 relative z-10">
                <div className="flex flex-col">
                   <span className="text-3xl md:text-5xl font-black text-white group-hover:text-indigo-400 transition-colors">{session.responses.length}</span>
                   <span className="text-[9px] md:text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mt-1">מענים</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onDelete?.(session.id)} className="w-10 h-10 md:w-12 md:h-12 bg-zinc-900 rounded-xl md:rounded-2xl flex items-center justify-center text-zinc-700 hover:text-rose-500 border border-zinc-800 transition-all">
                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                  <button onClick={() => onOpenSettings?.(session.id)} className="w-10 h-10 md:w-12 md:h-12 bg-zinc-900 rounded-xl md:rounded-2xl flex items-center justify-center text-zinc-500 hover:text-white border border-zinc-800 transition-all">
                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </button>
                </div>
             </div>
             
             <div className="flex-grow mb-8 md:mb-12 relative z-10">
                <h3 className="text-2xl md:text-3xl font-black text-white leading-tight mb-4 md:mb-6">{session.title}</h3>
                <div className="flex flex-wrap gap-2">
                  {session.sides.map(s => <span key={s} className="text-[9px] md:text-[10px] font-black px-3 py-1 bg-zinc-900 text-indigo-400 border border-indigo-500/20 rounded-lg md:rounded-xl uppercase tracking-wider">{s}</span>)}
                </div>
             </div>

             <div className="space-y-3 md:space-y-4 relative z-10">
                <button 
                  onClick={() => onOpenResults?.(session.id)}
                  className="w-full bg-white text-black py-4 md:py-5 rounded-2xl md:rounded-[2rem] font-black text-base md:text-lg transition-all shadow-2xl hover:scale-[1.02] active:scale-95"
                >
                  ניתוח אסטרטגי AI
                </button>
                <button 
                  onClick={() => {
                     const url = `${window.location.origin}${window.location.pathname}?sid=${session.id}`;
                     navigator.clipboard.writeText(url);
                     alert('קישור השאלון הועתק! ניתן להעביר למשתתפים.');
                  }}
                  className="w-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-500 py-3 md:py-4 rounded-2xl md:rounded-[2rem] font-bold border border-zinc-800 text-xs md:text-sm transition-all"
                >
                  העתק קישור להפצה
                </button>
             </div>
          </div>
        ))}
        {sessions.length === 0 && (
          <div className="col-span-full py-16 md:py-20 text-center glass rounded-[2.5rem] md:rounded-[3rem] border-dashed border-2 border-zinc-800">
             <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm md:text-base">אין שותפויות פעילות כרגע</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
