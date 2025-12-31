
import React, { useState, useEffect } from 'react';
import { PartnershipSession, Question, Category } from '../types';
import { DEFAULT_QUESTIONS } from '../constants';
import { analyzePartnership } from '../services/geminiService';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { dbService } from '../services/dbService';

interface Props {
  sessions: PartnershipSession[];
  onAdd: (title: string, sides: string[], questions: Question[], context: string) => void;
  onUpdate: (updated: PartnershipSession) => void;
}

const AdminDashboard: React.FC<Props> = ({ sessions, onAdd, onUpdate }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  
  const [newTitle, setNewTitle] = useState('');
  const [newSides, setNewSides] = useState('');
  const [newContext, setNewContext] = useState('');
  const [editingQuestions, setEditingQuestions] = useState<Question[]>(DEFAULT_QUESTIONS);

  useEffect(() => {
    dbService.onAuthChange((user) => setIsAdmin(!!user));
  }, []);

  if (!isAdmin && dbService.isCloud()) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-8 animate-fadeIn">
        <div className="w-24 h-24 bg-indigo-500/10 rounded-3xl flex items-center justify-center border border-indigo-500/20 shadow-2xl">
          <svg className="w-12 h-12 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black">כניסת מנהל</h2>
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

  const handleCreate = () => {
    if (!newTitle || !newSides) return;
    onAdd(newTitle, newSides.split(',').map(s => s.trim()), editingQuestions, newContext);
    resetForm();
  };

  const resetForm = () => {
    setNewTitle(''); setNewSides(''); setNewContext(''); setEditingQuestions(DEFAULT_QUESTIONS); 
    setShowAdd(false); setEditingSessionId(null);
  };

  const handleStartEdit = (session: PartnershipSession) => {
    setEditingSessionId(session.id);
    setNewTitle(session.title);
    setNewSides(session.sides.join(', '));
    setNewContext(session.context || '');
    setEditingQuestions(session.questions);
    setShowAdd(true);
  };

  const handleSaveEdit = () => {
    const session = sessions.find(s => s.id === editingSessionId);
    if (session) {
      onUpdate({
        ...session,
        title: newTitle,
        context: newContext,
        sides: newSides.split(',').map(s => s.trim()),
        questions: editingQuestions
      });
    }
    resetForm();
  };

  const handleAnalyze = async (session: PartnershipSession) => {
    setLoadingId(session.id);
    try {
      const result = await analyzePartnership(session);
      onUpdate({ ...session, analysis: result });
    } catch (e) { alert(e); } finally { setLoadingId(null); }
  };

  return (
    <div className="space-y-12 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black">ניהול ממשקים</h2>
          <p className="text-zinc-500 mt-2 font-medium">כאן תוכל להגדיר את יחסי הגומלין ולשלוח שאלונים לצדדים.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowAdd(true); }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 rounded-2xl font-black transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-3"
        >
          <span className="text-2xl leading-none">+</span> שותפות חדשה
        </button>
      </div>

      {(showAdd) && (
        <div className="glass p-8 md:p-12 rounded-[2.5rem] animate-slideDown border-indigo-500/20 space-y-10 shadow-2xl">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-black text-indigo-400">
              {editingSessionId ? 'עריכת ממשק' : 'הגדרת ממשק חדש'}
            </h3>
            <button onClick={resetForm} className="text-zinc-500 hover:text-white font-bold transition-colors">ביטול X</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">שם הממשק</label>
              <input 
                placeholder="למשל: תפעול ומכירות"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 focus:border-indigo-500 outline-none transition-all"
                value={newTitle} onChange={e => setNewTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">צדדים מעורבים (מופרדים בפסיק)</label>
              <input 
                placeholder="צד א', צד ב'"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 focus:border-indigo-500 outline-none transition-all"
                value={newSides} onChange={e => setNewSides(e.target.value)}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">הקשר ארגוני ותלות (איך הממשק עובד? מי מעביר למי?)</label>
              <textarea 
                rows={3}
                placeholder="תאר כאן את תהליך העבודה בין הצדדים, מי הלקוח ומי הספק, או את יחסי התלות ביניהם..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 focus:border-indigo-500 outline-none transition-all"
                value={newContext} onChange={e => setNewContext(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
             <label className="text-xs font-black text-zinc-500 uppercase tracking-widest block mb-4">ניהול קריטריונים להערכה</label>
             <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {editingQuestions.map((q, idx) => (
                  <div key={q.id} className="flex gap-3 items-center bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
                    <input 
                      value={q.text}
                      onChange={e => {
                        const next = [...editingQuestions];
                        next[idx].text = e.target.value;
                        setEditingQuestions(next);
                      }}
                      className="flex-grow bg-transparent outline-none border-none text-sm"
                    />
                    <button 
                      onClick={() => {
                        const next = [...editingQuestions];
                        next[idx].category = next[idx].category === Category.SYSTEMIC ? Category.RELATIONAL : Category.SYSTEMIC;
                        setEditingQuestions(next);
                      }}
                      className={`text-[10px] font-bold px-2 py-1 rounded ${q.category === Category.SYSTEMIC ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}
                    >
                      {q.category === Category.SYSTEMIC ? 'מערכתי' : 'יחסים'}
                    </button>
                  </div>
                ))}
             </div>
             <button 
                onClick={() => setEditingQuestions([...editingQuestions, { id: Date.now().toString(), text: 'שאלה חדשה', category: Category.SYSTEMIC }])}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300"
              >
                + הוסף קריטריון מותאם
              </button>
          </div>

          <div className="flex justify-end gap-4 pt-6">
            <button 
              onClick={editingSessionId ? handleSaveEdit : handleCreate}
              className="bg-indigo-600 px-12 py-4 rounded-2xl font-black hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/10"
            >
              {editingSessionId ? 'שמור שינויים' : 'צור שותפות ושלח לשאלון'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8">
        {sessions.map(session => (
          <div key={session.id} className="glass rounded-[2rem] overflow-hidden group hover:border-indigo-500/30 transition-all duration-500">
            <div className="p-8 md:p-10 border-b border-zinc-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h3 className="text-2xl font-black">{session.title}</h3>
                <div className="flex flex-wrap gap-2 mt-3">
                  {session.sides.map(s => <span key={s} className="text-[10px] font-bold px-2 py-1 bg-zinc-900 rounded-md text-zinc-400 border border-zinc-800">{s}</span>)}
                </div>
                {session.context && (
                   <p className="text-xs text-zinc-500 mt-4 max-w-xl italic line-clamp-1">{session.context}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => handleStartEdit(session)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-5 py-2.5 rounded-xl text-xs font-bold transition-all">ערוך הגדרות</button>
                <button 
                   onClick={() => {
                     const url = `${window.location.origin}${window.location.pathname}?sid=${session.id}`;
                     navigator.clipboard.writeText(url);
                     alert('הקישור הועתק! ניתן לשלוח לצדדים.');
                   }}
                   className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 px-5 py-2.5 rounded-xl text-xs font-bold transition-all"
                >
                   🔗 העתק קישור לשאלון
                </button>
                <button 
                  disabled={session.responses.length < 2 || loadingId === session.id}
                  onClick={() => handleAnalyze(session)}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-white px-7 py-2.5 rounded-xl text-xs font-black transition-all shadow-lg shadow-emerald-900/20"
                >
                  {loadingId === session.id ? 'מנתח...' : '✨ ניתוח AI'}
                </button>
              </div>
            </div>

            <div className="p-10 grid grid-cols-1 lg:grid-cols-2 gap-12">
               <div>
                  <h4 className="text-sm font-black text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                     <span className="w-2 h-2 bg-indigo-500 rounded-full"></span> ממוצע הערכות
                  </h4>
                  <div className="h-64">
                    {session.responses.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={session.questions.map(q => ({
                          subject: q.text.slice(0, 10) + '..',
                          value: (session.responses.map(r => r.scores[q.id] || 0).reduce((a,b)=>a+b,0) / session.responses.length)
                        }))}>
                          <PolarGrid stroke="#3f3f46" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 10 }} />
                          <Radar name="AVG" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center border-2 border-dashed border-zinc-800 rounded-3xl text-zinc-600 text-sm italic">ממתין למענים ראשונים...</div>
                    )}
                  </div>
               </div>
               <div className="space-y-6">
                  {session.analysis ? (
                    <div className="space-y-6">
                       <div className="bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800 italic text-zinc-300 text-sm leading-relaxed">
                          "{session.analysis.summary}"
                       </div>
                       <div className="grid grid-cols-1 gap-4">
                          {session.analysis.operationalRecommendations.slice(0, 3).map((rec, i) => (
                            <div key={i} className="flex gap-4 items-center bg-indigo-500/10 p-4 rounded-xl border border-indigo-500/20">
                               <span className="text-indigo-500 font-black text-lg">0{i+1}</span>
                               <p className="text-xs font-bold text-indigo-100">{rec}</p>
                            </div>
                          ))}
                       </div>
                    </div>
                  ) : (
                    <div className="bg-zinc-900/50 rounded-3xl p-8 text-center space-y-4">
                       <p className="text-zinc-500 text-sm">התקבלו {session.responses.length} מענים עד כה.</p>
                       <p className="text-xs text-zinc-600">יש צורך במינימום 2 מענים (מומלץ אחד מכל צד) כדי שה-AI יוכל לנתח את הממשק בצורה אפקטיבית.</p>
                    </div>
                  )}
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
