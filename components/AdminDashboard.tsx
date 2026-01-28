
import React, { useState, useEffect } from 'react';
import { PartnershipSession, Question, Category } from '../types';
import { DEFAULT_QUESTIONS } from '../constants';
import { dbService } from '../services/dbService';
import { User } from 'firebase/auth';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { Save, Plus, X, Trash2, LogOut, Copy, CheckCircle2 } from 'lucide-react';

interface Props {
  sessions: PartnershipSession[];
  onAdd?: (title: string, sides: string[], questions: Question[], context: string) => Promise<void>;
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
      }
    } else {
      setNewTitle('');
      setNewSides('');
      setNewContext('');
    }
    
    return () => unsubscribe();
  }, [initialEditingId, sessions]);

  const calculateMiniChartData = (session: PartnershipSession) => {
    const driverQs = (session.questions || DEFAULT_QUESTIONS).filter(q => q.shortLabel !== 'OUTCOME_SATISFACTION');
    const groups = Array.from(new Set(driverQs.map(q => q.shortLabel || 'General')));
    return groups.map(label => {
      const relatedQs = driverQs.filter(q => q.shortLabel === label);
      let total = 0, count = 0;
      session.responses.forEach(r => {
        relatedQs.forEach(q => {
          if (r.scores[q.id]) { total += r.scores[q.id]; count++; }
        });
      });
      return { subject: label, value: count > 0 ? (total / count) : 0 };
    }).slice(0, 5);
  };

  const handleGoogleLogin = async () => {
    try { await dbService.loginWithGoogle(); } catch (e) { console.error(e); }
  };

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
          await onUpdate?.({ ...existing, title: newTitle, sides: sidesArr, context: newContext });
        }
      } else {
        await onAdd?.(newTitle, sidesArr, DEFAULT_QUESTIONS, newContext);
      }
      // Fields will be cleared by unmounting or useEffect on navigate
    } catch (err) {
      console.error("Save failed:", err);
      alert("השמירה נכשלה. נסה שוב.");
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) return <div className="flex justify-center p-20 text-zinc-500 font-black animate-pulse uppercase tracking-[0.3em]">Loading Security...</div>;

  if (!gatePassed) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 animate-fadeIn">
        <div className="glass max-w-md w-full p-12 rounded-[3rem] text-center space-y-10 shadow-2xl">
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-white">כניסת מנהל</h2>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Admin Authorization Required</p>
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
            {error && <p className="text-rose-500 text-[10px] font-black uppercase">קוד שגוי, נסה שוב</p>}
            <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 active:scale-95">המשך</button>
          </form>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 animate-fadeIn">
        <div className="glass max-w-md w-full p-12 rounded-[3rem] text-center space-y-12">
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-white leading-tight">אימות זהות</h2>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Verify your Google Identity</p>
          </div>
          <button onClick={handleGoogleLogin} className="w-full bg-white text-black py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-4 shadow-2xl hover:bg-zinc-100 transition-all active:scale-95">
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            התחבר עם Google
          </button>
        </div>
      </div>
    );
  }

  if (forceShowAdd || initialEditingId) {
    return (
      <div className="max-w-4xl mx-auto space-y-10 animate-slideDown pb-20 text-right" dir="rtl">
        <div className="glass p-12 rounded-[3.5rem] space-y-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 blur-[100px] rounded-full"></div>
          
          <div className="flex justify-between items-center border-b border-zinc-800 pb-8">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center text-indigo-500">
                  {initialEditingId ? <Save size={24} /> : <Plus size={24} />}
               </div>
               <h3 className="text-4xl font-black text-white tracking-tighter">
                 {initialEditingId ? 'עריכת ממשק' : 'הקמת שותפות חדשה'}
               </h3>
            </div>
            <button onClick={onCancel} className="p-3 bg-zinc-900 text-zinc-500 rounded-2xl hover:text-white transition-all">
              <X size={24} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] px-2 block">שם השותפות / הממשק</label>
              <input 
                placeholder="למשל: מכירות - שירות לקוחות" 
                className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-6 text-white font-black text-xl focus:border-indigo-500 outline-none transition-all" 
                value={newTitle} 
                onChange={e => setNewTitle(e.target.value)} 
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] px-2 block">צדדים משתתפים (מופרדים בפסיק)</label>
              <input 
                placeholder="צד א', צד ב'" 
                className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-6 text-white font-bold text-lg focus:border-indigo-500 outline-none transition-all" 
                value={newSides} 
                onChange={e => setNewSides(e.target.value)} 
              />
            </div>
            <div className="md:col-span-2 space-y-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] px-2 block">הקשר ארגוני ותלויות הדדיות</label>
              <textarea 
                rows={4} 
                className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-[2rem] p-8 text-white font-medium focus:border-indigo-500 outline-none transition-all resize-none" 
                value={newContext} 
                onChange={e => setNewContext(e.target.value)} 
                placeholder="תאר את התלויות העסקיות, התהליך המשותף והצורך בחיבור..." 
              />
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <button 
              disabled={isSaving || !newTitle.trim() || !newSides.trim()}
              onClick={handleSave} 
              className={`flex-grow bg-indigo-600 px-16 py-6 rounded-3xl font-black text-xl text-white shadow-xl transition-all flex items-center justify-center gap-3 ${isSaving || !newTitle.trim() || !newSides.trim() ? 'opacity-40 cursor-not-allowed grayscale' : 'hover:bg-indigo-500 hover:shadow-indigo-600/30 active:scale-95'}`}
            >
              {isSaving ? (
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : <Save size={20} />}
              {isSaving ? 'שומר שינויים...' : 'שמור שותפות'}
            </button>
            <button onClick={onCancel} className="bg-zinc-900 text-zinc-400 px-10 py-6 rounded-3xl font-black text-lg hover:text-white transition-all">ביטול</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-16 animate-fadeIn pb-24 text-right" dir="rtl">
      <div className="flex justify-between items-end border-b border-zinc-900 pb-10">
        <div className="space-y-2">
           <h2 className="text-6xl font-black text-white tracking-tighter">ניהול ממשקים</h2>
           <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.3em]">Operational Dashboard</p>
        </div>
        <button onClick={() => { sessionStorage.removeItem('sb_security_gate'); dbService.logout(); }} className="flex items-center gap-2 text-xs font-black text-zinc-700 hover:text-rose-500 uppercase tracking-widest transition-colors group">
           התנתק
           <LogOut size={14} className="group-hover:translate-x-[-2px] transition-transform" />
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="p-32 text-center glass rounded-[4rem] space-y-8 shadow-2xl border-white/5 relative overflow-hidden">
           <div className="absolute inset-0 bg-indigo-600/5 blur-[120px] rounded-full"></div>
           <div className="w-24 h-24 bg-zinc-900 rounded-[2rem] flex items-center justify-center text-5xl mx-auto shadow-inner">🤝</div>
           <div className="space-y-4">
              <h3 className="text-3xl font-black text-white">טרם הוגדרו ממשקי עבודה</h3>
              <p className="text-zinc-500 max-w-md mx-auto leading-relaxed font-medium">כדי להתחיל לאסוף נתונים ולנתח את בריאות השותפות, עליך ליצור את הממשק הראשון שלך.</p>
           </div>
           <button onClick={() => onOpenSettings?.('')} className="bg-indigo-600 px-12 py-5 rounded-[1.8rem] font-black text-xl text-white shadow-2xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all active:scale-95">צור ממשק ראשון</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {sessions.map(session => (
            <div key={session.id} className="glass rounded-[3.5rem] p-12 flex flex-col group relative overflow-hidden transition-all hover:scale-[1.03] hover:border-indigo-500/30 shadow-xl">
               <div className="flex justify-between items-start mb-10">
                  <button onClick={() => onDelete?.(session.id)} className="p-3 bg-rose-500/5 text-zinc-700 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all">
                    <Trash2 size={20} />
                  </button>
                  <div className="text-right">
                     <span className="text-6xl font-black text-white tabular-nums tracking-tighter">{session.responses?.length || 0}</span>
                     <p className="text-[10px] font-black text-zinc-600 uppercase mt-1 tracking-widest">Responses Collected</p>
                  </div>
               </div>
               
               <div className="h-48 w-full mb-10 relative bg-zinc-950/30 rounded-[2rem] p-4">
                  <ResponsiveContainer width="100%" height="100%">
                     <RadarChart data={calculateMiniChartData(session)}>
                        <PolarGrid stroke="#1a1a1e" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#52525b', fontSize: 10, fontWeight: 800 }} />
                        <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
                     </RadarChart>
                  </ResponsiveContainer>
               </div>

               <h3 className="text-2xl font-black text-white mb-8 flex-grow leading-tight text-right min-h-[4rem] group-hover:text-indigo-400 transition-colors">{session.title}</h3>
               
               <div className="space-y-4">
                  <button onClick={() => onOpenResults?.(session.id)} className="w-full bg-white text-black py-5 rounded-[1.5rem] font-black text-lg hover:bg-zinc-200 transition-all shadow-lg active:scale-95">צפה בתובנות AI</button>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => onOpenSettings?.(session.id)}
                      className="bg-zinc-900 text-zinc-400 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-zinc-800 hover:text-white transition-all"
                    >
                      Edit Settings
                    </button>
                    <button onClick={() => { 
                      const url = `${window.location.origin}${window.location.pathname}?sid=${session.id}`;
                      navigator.clipboard.writeText(url); 
                      alert('Survey Link Copied!'); 
                    }} className="bg-indigo-600/10 text-indigo-400 py-3 rounded-2xl text-[10px] font-black border border-indigo-500/10 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2">
                       <Copy size={12} />
                       COPY LINK
                    </button>
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
