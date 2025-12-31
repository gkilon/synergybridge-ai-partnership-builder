
import React, { useState, useEffect } from 'react';
import { PartnershipSession, Question, Category } from '../types';
import { DEFAULT_QUESTIONS } from '../constants';
import { dbService } from '../services/dbService';

interface Props {
  sessions: PartnershipSession[];
  onAdd?: (title: string, sides: string[], questions: Question[], context: string) => void;
  onUpdate?: (updated: PartnershipSession) => void;
  onOpenSettings?: (id: string) => void;
  onOpenResults?: (id: string) => void;
  initialEditingId?: string | null;
  forceShowAdd?: boolean;
  onCancel?: () => void;
}

const AdminDashboard: React.FC<Props> = ({ 
  sessions, onAdd, onUpdate, onOpenSettings, onOpenResults, 
  initialEditingId, forceShowAdd, onCancel 
}) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSides, setNewSides] = useState('');
  const [newContext, setNewContext] = useState('');
  const [editingQuestions, setEditingQuestions] = useState<Question[]>(DEFAULT_QUESTIONS);

  useEffect(() => {
    dbService.onAuthChange((user) => setIsAdmin(!!user));
    if (initialEditingId) {
      const s = sessions.find(x => x.id === initialEditingId);
      if (s) {
        setNewTitle(s.title);
        setNewSides(s.sides.join(', '));
        setNewContext(s.context || '');
        setEditingQuestions(s.questions);
      }
    } else {
       setNewTitle('');
       setNewSides('');
       setNewContext('');
       setEditingQuestions(DEFAULT_QUESTIONS);
    }
  }, [initialEditingId, sessions]);

  if (!isAdmin && dbService.isCloud()) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-8 animate-fadeIn">
        <div className="w-24 h-24 bg-indigo-500/10 rounded-3xl flex items-center justify-center border border-indigo-500/20 shadow-2xl">
          <svg className="w-12 h-12 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-white">כניסת מנהל</h2>
          <p className="text-zinc-500 max-w-sm mx-auto">התחבר כדי לנהל ממשקים, להפיק שאלונים ולנתח נתונים בבינה מלאכותית.</p>
        </div>
        <button 
          onClick={() => dbService.loginAsAdmin()}
          className="bg-white text-black px-10 py-4 rounded-2xl font-black hover:bg-zinc-200 transition-all flex items-center gap-4 shadow-xl shadow-white/5"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="google" />
          התחבר עם Google
        </button>
      </div>
    );
  }

  if (forceShowAdd) {
    return (
      <div className="max-w-4xl mx-auto space-y-10 animate-slideDown">
        <div className="glass p-8 md:p-12 rounded-[2.5rem] border-indigo-500/20 space-y-10 shadow-2xl">
          <div className="flex justify-between items-center">
            <h3 className="text-3xl font-black text-indigo-400">
              {initialEditingId ? 'עריכת ממשק' : 'הגדרת ממשק חדש'}
            </h3>
            <button onClick={onCancel} className="text-zinc-500 hover:text-white font-bold transition-colors">ביטול וחזרה</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">שם הממשק</label>
              <input 
                placeholder="למשל: תפעול ומכירות"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 focus:border-indigo-500 outline-none transition-all text-white font-bold"
                value={newTitle} onChange={e => setNewTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">צדדים מעורבים (מופרדים בפסיק)</label>
              <input 
                placeholder="צד א', צד ב'"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 focus:border-indigo-500 outline-none transition-all text-white font-bold"
                value={newSides} onChange={e => setNewSides(e.target.value)}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">הקשר ארגוני ותלות (איך הממשק עובד? מי מעביר למי?)</label>
              <textarea 
                rows={4}
                placeholder="תאר כאן את תהליך העבודה בין הצדדים, מי הלקוח ומי הספק..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 focus:border-indigo-500 outline-none transition-all text-white font-medium resize-none"
                value={newContext} onChange={e => setNewContext(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
             <label className="text-xs font-black text-zinc-500 uppercase tracking-widest block mb-4">ניהול קריטריונים להערכה</label>
             <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {editingQuestions.map((q, idx) => (
                  <div key={q.id} className="flex gap-3 items-center bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 group hover:border-zinc-700 transition-colors">
                    <input 
                      value={q.text}
                      onChange={e => {
                        const next = [...editingQuestions];
                        next[idx].text = e.target.value;
                        setEditingQuestions(next);
                      }}
                      className="flex-grow bg-transparent outline-none border-none text-sm text-zinc-200 font-bold"
                    />
                    <button 
                      onClick={() => {
                        const next = [...editingQuestions];
                        next[idx].category = next[idx].category === Category.SYSTEMIC ? Category.RELATIONAL : Category.SYSTEMIC;
                        setEditingQuestions(next);
                      }}
                      className={`text-[10px] font-black px-4 py-2 rounded-xl whitespace-nowrap transition-all border ${q.category === Category.SYSTEMIC ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}
                    >
                      {q.category === Category.SYSTEMIC ? 'מערכתי' : 'יחסים'}
                    </button>
                    <button 
                      onClick={() => setEditingQuestions(editingQuestions.filter((_, i) => i !== idx))}
                      className="text-zinc-600 hover:text-rose-500 transition-colors px-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
             </div>
             <button 
                onClick={() => setEditingQuestions([...editingQuestions, { id: Date.now().toString(), text: 'קריטריון חדש', category: Category.SYSTEMIC }])}
                className="text-xs font-black text-indigo-400 hover:text-indigo-300 flex items-center gap-2"
              >
                + הוסף קריטריון מותאם
              </button>
          </div>

          <div className="flex justify-end gap-4 pt-6">
            <button 
              onClick={() => {
                if (initialEditingId && onUpdate) {
                  onUpdate({
                    ...sessions.find(s=>s.id === initialEditingId)!,
                    title: newTitle,
                    sides: newSides.split(',').map(s=>s.trim()),
                    context: newContext,
                    questions: editingQuestions
                  });
                } else if (onAdd) {
                  onAdd(newTitle, newSides.split(',').map(s=>s.trim()), editingQuestions, newContext);
                }
              }}
              className="bg-indigo-600 px-12 py-4 rounded-2xl font-black hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 active:scale-95 text-white"
            >
              {initialEditingId ? 'שמור שינויים' : 'צור שותפות ושלח לשאלון'}
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
          <h2 className="text-4xl font-black text-white">ממשקים פעילים</h2>
          <p className="text-zinc-500 mt-2 font-medium">ניהול ותצוגת תמונת המצב של כלל השותפויות בארגון.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {sessions.map(session => (
          <div key={session.id} className="glass rounded-[2.5rem] p-8 space-y-8 flex flex-col group hover:border-indigo-500/40 transition-all duration-500 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/[0.02] rounded-full translate-x-1/2 -translate-y-1/2"></div>
             
             <div className="flex justify-between items-start relative z-10">
                <div className="px-4 py-2 bg-zinc-900 rounded-2xl flex items-center gap-2 border border-zinc-800">
                  <span className="text-indigo-500 font-black text-xl">{session.responses.length}</span>
                  <span className="text-[10px] font-black text-zinc-600 uppercase tracking-tighter">מענים</span>
                </div>
                <div className="flex gap-2">
                   <button 
                    onClick={() => onOpenSettings?.(session.id)}
                    className="w-10 h-10 bg-zinc-900/50 rounded-xl flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all"
                   >
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                   </button>
                </div>
             </div>
             
             <div className="flex-grow relative z-10">
                <h3 className="text-2xl font-black text-white leading-tight">{session.title}</h3>
                <div className="flex flex-wrap gap-2 mt-4">
                  {session.sides.map(s => <span key={s} className="text-[10px] font-black px-3 py-1 bg-zinc-900 rounded-lg text-zinc-500 border border-zinc-800 uppercase tracking-tighter">{s}</span>)}
                </div>
             </div>

             <div className="space-y-3 pt-6 border-t border-zinc-800 relative z-10">
                <button 
                  onClick={() => onOpenResults?.(session.id)}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-black transition-all shadow-lg shadow-indigo-600/10 active:scale-95"
                >
                  צפה בתוצאות וניתוח AI
                </button>
                <button 
                  onClick={() => {
                     const url = `${window.location.origin}${window.location.pathname}?sid=${session.id}`;
                     navigator.clipboard.writeText(url);
                     alert('קישור השאלון הועתק ללוח!');
                  }}
                  className="w-full bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 py-4 rounded-2xl font-black transition-all border border-zinc-800"
                >
                  העתק קישור לשאלון
                </button>
             </div>
          </div>
        ))}

        {sessions.length === 0 && (
          <div className="col-span-full py-24 text-center glass rounded-[3rem] border-dashed border-2 border-zinc-800">
            <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-6 text-zinc-700">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            </div>
            <p className="text-zinc-500 font-bold text-lg">אין ממשקים פעילים כרגע.</p>
            <p className="text-zinc-600 text-sm mt-2">לחץ על "ממשק חדש" למעלה כדי להתחיל את התהליך.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
