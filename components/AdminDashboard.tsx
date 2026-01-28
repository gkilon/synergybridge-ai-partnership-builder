
import React, { useState, useEffect } from 'react';
import { PartnershipSession, Question, Category, Language } from '../types';
import { DEFAULT_QUESTIONS } from '../constants';
import { dbService } from '../services/dbService';
import { User } from 'firebase/auth';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { Save, Plus, X, Trash2, LogOut, Copy, Settings2, HelpCircle, Languages } from 'lucide-react';

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
  const [user, setUser] = useState<User | null>(null);
  const [gatePassed, setGatePassed] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [newTitle, setNewTitle] = useState('');
  const [newSides, setNewSides] = useState('');
  const [newContext, setNewContext] = useState('');
  const [newLang, setNewLang] = useState<Language>('he');
  const [editingQuestions, setEditingQuestions] = useState<Question[]>([]);

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
        setNewLang(s.language || 'he');
        setEditingQuestions(s.questions || DEFAULT_QUESTIONS);
      }
    } else {
      setNewTitle('');
      setNewSides('');
      setNewContext('');
      setNewLang('he');
      setEditingQuestions([...DEFAULT_QUESTIONS]);
    }
    
    return () => unsubscribe();
  }, [initialEditingId, sessions]);

  const handleSave = async () => {
    if (!newTitle.trim() || !newSides.trim()) {
      alert("נא להזין כותרת ולפחות שני צדדים לשותפות");
      return;
    }
    
    const sidesArr = newSides.split(',').map(s => s.trim()).filter(s => s);
    if (sidesArr.length < 2) {
      alert("יש להזין לפחות שני צדדים (מופרדים בפסיק)");
      return;
    }

    setIsSaving(true);
    try {
      if (initialEditingId) {
        const existing = sessions.find(s => s.id === initialEditingId);
        if (existing) {
          await onUpdate?.({ 
            ...existing, 
            title: newTitle, 
            sides: sidesArr, 
            context: newContext, 
            questions: editingQuestions,
            language: newLang 
          });
        }
      } else {
        await onAdd?.(newTitle, sidesArr, editingQuestions, newContext, newLang);
      }
    } catch (err) {
      console.error("Save failed:", err);
      alert("השמירה נכשלה.");
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) return <div className="flex justify-center p-20 text-zinc-500 font-black animate-pulse">Loading Security...</div>;

  if (!gatePassed) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 animate-fadeIn">
        <div className="glass max-w-md w-full p-12 rounded-[3rem] text-center space-y-10 shadow-2xl border-white/5">
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-white">כניסת מנהל בלבד</h2>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Administrator Authorization</p>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (passwordInput === 'giladk25') {
              setGatePassed(true);
              sessionStorage.setItem('sb_security_gate', 'true');
            } else { setError(true); setPasswordInput(''); }
          }} className="space-y-6">
            <input 
              type="password" 
              placeholder="קוד סודי..." 
              autoFocus 
              className={`w-full bg-zinc-950 border-2 rounded-2xl p-6 text-center font-black text-2xl tracking-widest transition-all ${error ? 'border-rose-500 bg-rose-500/5' : 'border-zinc-800 focus:border-indigo-500'}`}
              value={passwordInput}
              onChange={e => { setPasswordInput(e.target.value); setError(false); }}
            />
            {error && <p className="text-rose-500 text-[10px] font-black uppercase">קוד שגוי</p>}
            <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-indigo-500 transition-all active:scale-95">כניסה למערכת</button>
          </form>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 animate-fadeIn">
        <div className="glass max-w-md w-full p-12 rounded-[3rem] text-center space-y-12">
          <h2 className="text-3xl font-black text-white leading-tight">אימות זהות מנהל</h2>
          <button onClick={() => dbService.loginWithGoogle()} className="w-full bg-white text-black py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-4 shadow-2xl hover:bg-zinc-100 transition-all active:scale-95">
            התחבר עם Google
          </button>
        </div>
      </div>
    );
  }

  if (forceShowAdd || initialEditingId) {
    return (
      <div className="max-w-5xl mx-auto space-y-10 animate-slideDown pb-20 text-right" dir="rtl">
        <div className="glass p-12 rounded-[3.5rem] space-y-12 shadow-2xl relative overflow-hidden">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-8">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center text-indigo-500">
                  <Settings2 size={24} />
               </div>
               <h3 className="text-4xl font-black text-white">הגדרות ממשק (אדמין)</h3>
            </div>
            <button onClick={onCancel} className="p-3 bg-zinc-900 text-zinc-500 rounded-2xl hover:text-white transition-all"><X size={24} /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase px-2 block">שם השותפות</label>
              <input className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-6 text-white font-black text-xl focus:border-indigo-500 outline-none" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase px-2 block">שפת השאלון</label>
              <div className="flex gap-2">
                 {(['he', 'en'] as Language[]).map(l => (
                   <button 
                     key={l}
                     onClick={() => setNewLang(l)}
                     className={`flex-grow py-5 rounded-2xl font-black text-sm border-2 transition-all ${newLang === l ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
                   >
                     {l === 'he' ? 'עברית' : 'English'}
                   </button>
                 ))}
              </div>
            </div>
            <div className="md:col-span-2 space-y-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase px-2 block">צדדים (מופרדים בפסיק)</label>
              <input className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-6 text-white font-bold" value={newSides} onChange={e => setNewSides(e.target.value)} />
            </div>
            
            <div className="md:col-span-2 space-y-6 bg-zinc-900/40 p-10 rounded-[2.5rem] border border-zinc-800">
               <div className="flex justify-between items-center mb-6">
                  <button onClick={() => setEditingQuestions([...editingQuestions, { id: 'q_'+Math.random(), category: Category.SYSTEMIC, text: '', shortLabel: 'חדש' }])} className="bg-indigo-600/20 text-indigo-400 px-6 py-3 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-indigo-600 hover:text-white transition-all">
                     <Plus size={14} /> הוסף שאלה
                  </button>
                  <h4 className="text-xl font-black text-white">עורך שאלות - בלעדי לאדמין</h4>
               </div>
               <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {editingQuestions.map((q, idx) => (
                    <div key={q.id} className="flex gap-4 items-center bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800 group">
                       <button onClick={() => setEditingQuestions(editingQuestions.filter(x => x.id !== q.id))} className="p-2 text-zinc-600 hover:text-rose-500"><Trash2 size={16} /></button>
                       <input 
                          value={q.text}
                          onChange={(e) => setEditingQuestions(editingQuestions.map(x => x.id === q.id ? {...x, text: e.target.value} : x))}
                          className="bg-transparent text-right flex-grow outline-none font-bold text-zinc-300"
                          placeholder="נוסח השאלה..."
                       />
                       <span className="text-[10px] font-black text-zinc-800 w-8">{idx + 1}</span>
                    </div>
                  ))}
               </div>
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <button disabled={isSaving} onClick={handleSave} className="flex-grow bg-indigo-600 px-16 py-6 rounded-3xl font-black text-xl text-white shadow-xl hover:bg-indigo-500 active:scale-95 transition-all">
              {isSaving ? 'שומר...' : 'שמור שינויים'}
            </button>
            <button onClick={onCancel} className="bg-zinc-900 text-zinc-400 px-10 py-6 rounded-3xl font-black text-lg">ביטול</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-16 animate-fadeIn pb-24 text-right" dir="rtl">
      <div className="flex justify-between items-end border-b border-zinc-900 pb-10">
        <h2 className="text-6xl font-black text-white tracking-tighter">ניהול הממשקים שלי</h2>
        <button onClick={() => { sessionStorage.removeItem('sb_security_gate'); dbService.logout(); }} className="text-xs font-black text-zinc-700 hover:text-rose-500 uppercase tracking-widest transition-colors">התנתק (Logout)</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {sessions.map(session => (
          <div key={session.id} className="glass rounded-[3.5rem] p-12 flex flex-col group relative overflow-hidden transition-all hover:scale-[1.03] shadow-xl">
             <div className="flex justify-between items-start mb-10">
                <button onClick={() => onDelete?.(session.id)} className="p-3 bg-rose-500/5 text-zinc-700 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all"><Trash2 size={20} /></button>
                <div className="text-right">
                   <span className="text-6xl font-black text-white tabular-nums tracking-tighter">{session.responses?.length || 0}</span>
                   <p className="text-[10px] font-black text-zinc-600 uppercase mt-1">מענים</p>
                </div>
             </div>
             <h3 className="text-2xl font-black text-white mb-8 flex-grow text-right leading-tight">{session.title}</h3>
             <div className="flex gap-2 mb-4">
                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${session.language === 'en' ? 'bg-blue-500/10 text-blue-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                   {session.language === 'en' ? 'English Survey' : 'שאלון בעברית'}
                </span>
             </div>
             <div className="space-y-4">
                <button onClick={() => onOpenResults?.(session.id)} className="w-full bg-white text-black py-5 rounded-[1.5rem] font-black text-lg hover:bg-zinc-200 transition-all active:scale-95">צפה בתוצאות AI</button>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => onOpenSettings?.(session.id)} className="bg-zinc-900 text-zinc-400 py-3 rounded-2xl text-[10px] font-black hover:text-white transition-all">הגדרות ושאלות</button>
                  <button onClick={() => { 
                    const url = `${window.location.origin}${window.location.pathname}?sid=${session.id}`;
                    navigator.clipboard.writeText(url); 
                    alert('Survey Link Copied!'); 
                  }} className="bg-indigo-600/10 text-indigo-400 py-3 rounded-2xl text-[10px] font-black hover:bg-indigo-600 hover:text-white transition-all">העתק לינק</button>
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
