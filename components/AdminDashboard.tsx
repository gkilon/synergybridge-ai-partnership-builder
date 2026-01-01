
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
  const [isBypassed, setIsBypassed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newSides, setNewSides] = useState('');
  const [newContext, setNewContext] = useState('');
  const [editingQuestions, setEditingQuestions] = useState<Question[]>(DEFAULT_QUESTIONS);

  useEffect(() => {
    dbService.onAuthChange((u) => {
      setUser(u);
      setLoading(false);
    });
    
    if (initialEditingId) {
      const s = sessions.find(x => x.id === initialEditingId);
      if (s) {
        setNewTitle(s.title);
        setNewSides(s.sides.join(', '));
        setNewContext(s.context || '');
        setEditingQuestions(s.questions || DEFAULT_QUESTIONS);
      }
    } else {
      setNewTitle('');
      setNewSides('');
      setNewContext('');
      setEditingQuestions(DEFAULT_QUESTIONS);
    }
  }, [initialEditingId, sessions]);

  if (loading) return null;

  if (!user && !isBypassed) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-10 animate-fadeIn text-center">
        <div className="w-28 h-28 bg-indigo-500/10 rounded-[2.5rem] flex items-center justify-center border border-indigo-500/20 shadow-2xl relative">
          <svg className="w-14 h-14 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <div className="space-y-4 max-w-md">
          <h2 className="text-4xl font-black text-white">כניסת מנהל</h2>
          <p className="text-zinc-400 font-medium leading-relaxed">נהל ממשקים, ערוך שאלונים וצפה בדו"חות אסטרטגיים.</p>
        </div>
        <div className="space-y-4 w-full max-w-sm">
          <button 
            onClick={() => dbService.loginAsAdmin()}
            className="w-full bg-white text-black px-10 py-5 rounded-2xl font-black hover:bg-zinc-200 transition-all flex items-center justify-center gap-4 shadow-2xl active:scale-95"
          >
            <img src="https://www.google.com/favicon.ico" className="w-6 h-6" alt="google" />
            כניסה עם Google
          </button>
          <button 
            onClick={() => setIsBypassed(true)}
            className="text-zinc-500 text-xs font-bold hover:text-zinc-300 transition-colors uppercase tracking-widest block w-full"
          >
            או המשך ללא התחברות (מצב הדגמה)
          </button>
        </div>
      </div>
    );
  }

  if (forceShowAdd || initialEditingId) {
    return (
      <div className="max-w-5xl mx-auto space-y-10 animate-slideDown pb-20">
        <div className="glass p-8 md:p-12 rounded-[3rem] border-zinc-800 space-y-10 shadow-3xl">
          <div className="flex justify-between items-center">
            <h3 className="text-4xl font-black text-white">
              {initialEditingId ? 'הגדרות ממשק' : 'ממשק חדש'}
            </h3>
            <button onClick={onCancel} className="bg-zinc-900 text-zinc-400 px-6 py-2 rounded-xl font-bold hover:text-white transition-colors">ביטול</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">שם הממשק האסטרטגי</label>
              <input 
                placeholder="למשל: יחידת תפעול - מחוז מרכז"
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 focus:border-indigo-500 outline-none transition-all text-white font-black text-xl"
                value={newTitle} onChange={e => setNewTitle(e.target.value)}
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">שמות הצדדים (פסיק מפריד)</label>
              <input 
                placeholder="צד א', צד ב'"
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 focus:border-indigo-500 outline-none transition-all text-white font-bold"
                value={newSides} onChange={e => setNewSides(e.target.value)}
              />
            </div>
            <div className="md:col-span-2 space-y-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">הקשר ארגוני ותלות הדדית</label>
              <textarea 
                rows={3}
                placeholder="תאר את הצורך בשיתוף הפעולה, נקודות הממשק הקריטיות ומידת התלות..."
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 focus:border-indigo-500 outline-none transition-all text-white font-medium resize-none"
                value={newContext} onChange={e => setNewContext(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-6 pt-6 border-t border-zinc-800">
             <div className="flex justify-between items-center">
                <label className="text-xl font-black text-white">מבנה השאלון</label>
                <button 
                  onClick={() => setEditingQuestions([...editingQuestions, { id: Date.now().toString(), text: 'שאלה חדשה', shortLabel: 'פרמטר', category: Category.SYSTEMIC }])}
                  className="text-xs font-black bg-indigo-500/10 text-indigo-400 px-4 py-2 rounded-xl border border-indigo-500/20 hover:bg-indigo-500 hover:text-white transition-all"
                >
                  + הוסף היבט לבדיקה
                </button>
             </div>
             
             <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {editingQuestions.map((q, idx) => (
                  <div key={q.id} className="bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800 flex flex-col gap-4 group hover:border-indigo-500/30 transition-all">
                    <div className="flex gap-4 items-center">
                      <span className="text-zinc-700 font-black text-lg">{idx + 1}</span>
                      <input 
                        value={q.text}
                        onChange={e => {
                          const next = [...editingQuestions];
                          next[idx].text = e.target.value;
                          setEditingQuestions(next);
                        }}
                        className="flex-grow bg-transparent border-none text-white font-bold outline-none text-lg"
                      />
                      <button 
                        onClick={() => {
                          const next = [...editingQuestions];
                          next[idx].category = next[idx].category === Category.SYSTEMIC ? Category.RELATIONAL : Category.SYSTEMIC;
                          setEditingQuestions(next);
                        }}
                        className={`text-[9px] font-black px-4 py-2 rounded-lg uppercase tracking-widest border transition-all ${q.category === Category.SYSTEMIC ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}
                      >
                        {q.category === Category.SYSTEMIC ? 'מערכתי' : 'יחסים'}
                      </button>
                    </div>
                    <div className="flex items-center gap-6 px-9">
                       <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-zinc-600 uppercase">תגית גרף:</span>
                          <input 
                            value={q.shortLabel || ''}
                            onChange={e => {
                              const next = [...editingQuestions];
                              next[idx].shortLabel = e.target.value;
                              setEditingQuestions(next);
                            }}
                            className="bg-zinc-800/50 rounded-lg px-3 py-1 text-xs text-indigo-400 font-black border border-zinc-700 outline-none w-24"
                          />
                       </div>
                       <button onClick={() => setEditingQuestions(editingQuestions.filter((_, i) => i !== idx))} className="text-zinc-700 hover:text-rose-500 transition-colors mr-auto">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                       </button>
                    </div>
                  </div>
                ))}
             </div>
          </div>

          <div className="flex justify-end gap-6 pt-10">
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
              className="bg-indigo-600 px-16 py-5 rounded-[2rem] font-black text-lg hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-600/30 active:scale-95 text-white"
            >
              {initialEditingId ? 'עדכן הגדרות ממשק' : 'צור ממשק חדש'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-5xl font-black text-white mb-2 tracking-tight">השותפויות שלי</h2>
          <p className="text-zinc-500 font-medium text-lg">מעקב בזמן אמת אחר הבריאות הארגונית של הממשקים הפעילים.</p>
        </div>
        <button 
          onClick={() => { dbService.logout(); setIsBypassed(false); }}
          className="text-xs font-black text-zinc-600 hover:text-zinc-400 uppercase tracking-widest"
        >
          התנתק מהמערכת
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {sessions.map(session => (
          <div key={session.id} className="glass rounded-[3rem] p-10 flex flex-col group hover:border-indigo-500/50 transition-all duration-700 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-2xl group-hover:bg-indigo-500/10 transition-colors"></div>
             
             <div className="flex justify-between items-center mb-10 relative z-10">
                <div className="flex flex-col">
                   <span className="text-4xl font-black text-white">{session.responses.length}</span>
                   <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">מענים שנאספו</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onDelete?.(session.id)} className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center text-zinc-700 hover:text-rose-500 hover:bg-zinc-800 transition-all border border-zinc-800">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                  <button onClick={() => onOpenSettings?.(session.id)} className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all border border-zinc-800">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                  </button>
                </div>
             </div>
             
             <div className="flex-grow mb-10 relative z-10">
                <h3 className="text-3xl font-black text-white leading-tight mb-4">{session.title}</h3>
                <div className="flex flex-wrap gap-2">
                  {session.sides.map(s => <span key={s} className="text-[10px] font-black px-3 py-1 bg-zinc-900/50 rounded-lg text-indigo-400 border border-indigo-500/10 uppercase">{s}</span>)}
                </div>
             </div>

             <div className="space-y-4 relative z-10">
                <button 
                  onClick={() => onOpenResults?.(session.id)}
                  className="w-full bg-white text-black py-5 rounded-2xl font-black text-lg transition-all shadow-xl hover:scale-[1.02] active:scale-95"
                >
                  ניתוח אסטרטגי
                </button>
                <button 
                  onClick={() => {
                     const url = `${window.location.origin}${window.location.pathname}?sid=${session.id}`;
                     navigator.clipboard.writeText(url);
                     alert('קישור השאלון הועתק! ניתן להעביר למשתתפים.');
                  }}
                  className="w-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 py-4 rounded-2xl font-bold transition-all border border-zinc-800 text-sm"
                >
                  העתק קישור להפצה
                </button>
             </div>
          </div>
        ))}

        {sessions.length === 0 && (
          <div className="col-span-full py-32 text-center glass rounded-[4rem] border-dashed border-2 border-zinc-800 group hover:border-indigo-500/30 transition-colors">
            <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto mb-8 text-zinc-700 group-hover:scale-110 transition-transform">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            </div>
            <p className="text-zinc-500 font-black text-2xl">טרם הוקמו שותפויות</p>
            <p className="text-zinc-600 font-bold mt-2">לחץ על "+ ממשק חדש" בתפריט העליון כדי להתחיל.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
