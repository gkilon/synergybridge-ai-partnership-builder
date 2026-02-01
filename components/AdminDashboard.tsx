
import React, { useState, useEffect } from 'react';
import { PartnershipSession, Question, Category, Language } from '../types';
import { DEFAULT_QUESTIONS } from '../constants';
import { dbService } from '../services/dbService';
import { Save, Plus, X, Trash2, LogOut, Settings2, LayoutDashboard, KeyRound, AlertCircle, CheckCircle2, Cloud, CloudOff } from 'lucide-react';

interface Props {
  sessions: PartnershipSession[];
  onAdd?: (title: string, sides: string[], questions: Question[], context: string, lang: Language) => Promise<void>;
  onUpdate?: (updated: PartnershipSession) => Promise<void>;
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
  const [gatePassed, setGatePassed] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cloudActive, setCloudActive] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [newTitle, setNewTitle] = useState('');
  const [newSides, setNewSides] = useState('');
  const [newContext, setNewContext] = useState('');
  const [newLang, setNewLang] = useState<Language>('he');
  const [editingQuestions, setEditingQuestions] = useState<Question[]>([]);

  useEffect(() => {
    setCloudActive(dbService.isCloudActive());
    const passed = sessionStorage.getItem('sb_security_gate') === 'true';
    if (passed) setGatePassed(true);
    
    if (initialEditingId) {
      const s = sessions.find(x => x.id === initialEditingId);
      if (s) {
        setNewTitle(s.title || '');
        setNewSides(Array.isArray(s.sides) ? s.sides.join(', ') : '');
        setNewContext(s.context || '');
        setNewLang(s.language || 'he');
        setEditingQuestions(Array.isArray(s.questions) && s.questions.length > 0 ? s.questions : [...DEFAULT_QUESTIONS]);
      }
    } else {
      resetForm();
    }
  }, [initialEditingId, sessions]);

  const resetForm = () => {
    setNewTitle('');
    setNewSides('');
    setNewContext('');
    setNewLang('he');
    setEditingQuestions([...DEFAULT_QUESTIONS]);
  };

  const handleGateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'giladk25') {
      setIsLoggingIn(true);
      try {
        // Essential: Trigger Firebase Auth to satisfy "allow create: if request.auth != null"
        await dbService.loginAdmin();
        setGatePassed(true);
        sessionStorage.setItem('sb_security_gate', 'true');
      } catch (err) {
        alert("תקלה בחיבור לענן. וודא אינטרנט תקין.");
      } finally {
        setIsLoggingIn(false);
      }
    } else {
      setError(true);
      setPasswordInput('');
    }
  };

  const handleSave = async () => {
    if (!newTitle.trim()) { alert("נא להזין כותרת"); return; }
    const sidesArr = newSides.split(',').map(s => s.trim()).filter(s => s);
    if (sidesArr.length < 2) { alert("נא להזין לפחות 2 צדדים"); return; }

    setIsSaving(true);
    try {
      if (initialEditingId) {
        const existing = sessions.find(s => s.id === initialEditingId);
        if (existing) {
          await onUpdate?.({ ...existing, title: newTitle, sides: sidesArr, context: newContext, questions: editingQuestions, language: newLang });
        }
      } else {
        await onAdd?.(newTitle, sidesArr, editingQuestions, newContext, newLang);
        resetForm();
      }
    } catch (err: any) {
      console.error("Save failed:", err);
      if (err?.code === 'permission-denied') {
        alert("שגיאת הרשאות: הענן חוסם את הכתיבה. וודא שהגדרת את ה-Security Rules נכון ושהתחברת כאדמין.");
      } else {
        alert("תקלה בשמירה לענן. נסה שוב.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!gatePassed) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 animate-fadeIn" dir="rtl">
        <div className="glass max-w-md w-full p-12 rounded-[3.5rem] text-center space-y-10 shadow-2xl border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>
          <div className="space-y-4">
            <div className="w-16 h-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center mx-auto text-indigo-500"><KeyRound size={32} /></div>
            <div className="space-y-1">
               <h2 className="text-3xl font-black text-white">כניסת מנהל</h2>
               <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Secure Admin Portal</p>
            </div>
          </div>
          <form onSubmit={handleGateSubmit} className="space-y-6">
            <input 
              type="password" 
              placeholder="קוד גישה..." 
              className={`w-full bg-zinc-950 border-2 rounded-2xl p-5 text-white font-black text-center text-2xl tracking-widest transition-all outline-none ${error ? 'border-rose-500 bg-rose-500/5' : 'border-zinc-800 focus:border-indigo-500'}`} 
              value={passwordInput} 
              onChange={(e) => { setPasswordInput(e.target.value); setError(false); }} 
              autoFocus 
            />
            <button 
              type="submit" 
              disabled={isLoggingIn}
              className="w-full bg-white text-black py-5 rounded-2xl font-black text-lg transition-all shadow-xl hover:bg-zinc-200 active:scale-95 flex items-center justify-center gap-3"
            >
              {isLoggingIn && <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>}
              {isLoggingIn ? 'מתחבר לענן...' : 'כניסה'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const showEditor = forceShowAdd || initialEditingId;

  return (
    <div className="space-y-12 animate-fadeIn" dir="rtl">
      {/* Cloud Status Badge */}
      <div className="fixed bottom-8 left-8 z-50">
        <div className={`px-4 py-2 rounded-full border flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-2xl ${cloudActive ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
          {cloudActive ? <Cloud size={14} /> : <CloudOff size={14} />}
          {cloudActive ? 'Cloud Online' : 'Cloud Offline'}
        </div>
      </div>

      {showEditor ? (
        <div className="glass rounded-[3rem] p-12 border-white/5 shadow-2xl space-y-12">
          <div className="flex justify-between items-center border-b border-zinc-900 pb-8">
            <div className="text-right">
              <h2 className="text-3xl font-black text-white">{initialEditingId ? 'עריכת ממשק' : 'הקמת ממשק חדש'}</h2>
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-1">Interface Configuration</p>
            </div>
            <button onClick={onCancel} className="p-4 bg-zinc-900 text-zinc-500 hover:text-white rounded-full transition-all"><X size={20} /></button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest block">כותרת</label>
                <input placeholder="מכירות - שירות" className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-5 text-white font-bold" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
              </div>
              <div className="space-y-4">
                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest block">צדדים (בפסיקים)</label>
                <input placeholder="מכירות, שירות" className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-5 text-white font-bold" value={newSides} onChange={e => setNewSides(e.target.value)} />
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-xs font-black text-zinc-500 uppercase tracking-widest block">הקשר ארגוני ל-AI</label>
              <textarea rows={6} placeholder="רקע לשותפות..." className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-[2rem] p-6 text-white font-bold resize-none" value={newContext} onChange={e => setNewContext(e.target.value)} />
            </div>
          </div>

          <button onClick={handleSave} disabled={isSaving} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-6 rounded-2xl font-black text-xl transition-all shadow-2xl shadow-indigo-600/20 flex items-center justify-center gap-3">
            {isSaving ? <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div> : <Save size={24} />}
            <span>שמור ממשק לענן</span>
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex justify-between items-center mb-12">
            <button onClick={() => { sessionStorage.removeItem('sb_security_gate'); dbService.logout(); window.location.reload(); }} className="flex items-center gap-2 text-zinc-500 hover:text-rose-500 font-black text-[10px] uppercase tracking-widest bg-zinc-900 px-6 py-3 rounded-xl transition-colors"><LogOut size={14} /> Log Out</button>
            <div className="text-right">
              <h2 className="text-4xl font-black text-white">ניהול ממשקים</h2>
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-1">Cloud Ecosystem</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sessions.map(session => (
              <div key={session.id} className="glass rounded-[2.5rem] p-8 border-white/5 hover:border-indigo-500/20 transition-all flex flex-col min-h-[380px]">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex gap-2">
                    <button onClick={() => onDelete?.(session.id)} className="p-2 text-zinc-700 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                    <button onClick={() => onOpenSettings?.(session.id)} className="p-2 text-zinc-700 hover:text-indigo-400 transition-colors"><Settings2 size={16} /></button>
                  </div>
                  <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center font-black text-indigo-500 text-xs">SB</div>
                </div>
                <div className="flex-grow space-y-2">
                  <h3 className="text-xl font-black text-white">{session.title}</h3>
                  <p className="text-zinc-500 text-[11px] font-bold line-clamp-2">{session.sides.join(' • ')}</p>
                </div>
                <div className="mt-8 grid grid-cols-2 gap-3">
                  <button onClick={() => onOpenResults?.(session.id)} className="bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-black text-[11px] transition-all flex items-center justify-center gap-2"><LayoutDashboard size={14} /> דאשבורד</button>
                  <button onClick={() => {
                      const url = new URL(window.location.origin + window.location.pathname);
                      url.searchParams.set('sid', session.id);
                      navigator.clipboard.writeText(url.toString());
                      alert('הלינק הועתק! המשתתפים יוכלו לגשת אליו מכל מקום.');
                    }} className="bg-zinc-900 text-zinc-400 hover:text-white py-3 rounded-xl font-black text-[11px] transition-all border border-zinc-800">העתק לינק</button>
                </div>
              </div>
            ))}
            <button onClick={() => onOpenSettings?.('')} className="rounded-[2.5rem] border-2 border-dashed border-zinc-800 p-8 flex flex-col items-center justify-center gap-6 hover:border-indigo-500/50 transition-all min-h-[380px]">
              <div className="w-14 h-14 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-600 hover:text-indigo-500"><Plus size={28} /></div>
              <p className="text-white font-black text-lg">חדש</p>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
