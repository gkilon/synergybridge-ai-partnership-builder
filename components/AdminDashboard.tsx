
import React, { useState, useEffect } from 'react';
import { PartnershipSession, Question, Category } from '../types';
import { DEFAULT_QUESTIONS } from '../constants';
import { analyzePartnership } from '../services/geminiService';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { dbService } from '../services/dbService';

interface Props {
  sessions: PartnershipSession[];
  onAdd: (title: string, sides: string[], questions: Question[]) => void;
  onUpdate: (updated: PartnershipSession) => void;
}

const AdminDashboard: React.FC<Props> = ({ sessions, onAdd, onUpdate }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  
  const [newTitle, setNewTitle] = useState('');
  const [newSides, setNewSides] = useState('');
  const [editingQuestions, setEditingQuestions] = useState<Question[]>(DEFAULT_QUESTIONS);

  useEffect(() => {
    dbService.onAuthChange((user) => {
      setIsAdmin(!!user);
    });
  }, []);

  if (!isAdmin && dbService.isCloud()) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6 animate-fadeIn">
        <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20">
          <svg className="w-10 h-10 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-black">אזור מנהל מוגן</h2>
          <p className="text-zinc-500 mt-2">עליך להתחבר כדי לנהל את השותפויות ולראות את התוצאות.</p>
        </div>
        <button 
          onClick={() => dbService.loginAsAdmin()}
          className="bg-white text-black px-8 py-3 rounded-2xl font-black hover:bg-zinc-200 transition-all flex items-center gap-3"
        >
          <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="google" />
          התחבר עם Google
        </button>
      </div>
    );
  }

  // Rest of the component remains same...
  const handleCreate = () => {
    if (!newTitle) return;
    onAdd(newTitle, newSides.split(',').map(s => s.trim()), editingQuestions);
    setNewTitle(''); setNewSides(''); setEditingQuestions(DEFAULT_QUESTIONS); setShowAdd(false);
  };

  const handleStartEdit = (session: PartnershipSession) => {
    setEditingSessionId(session.id);
    setNewTitle(session.title);
    setNewSides(session.sides.join(', '));
    setEditingQuestions(session.questions);
  };

  const handleSaveEdit = () => {
    const session = sessions.find(s => s.id === editingSessionId);
    if (session) {
      onUpdate({
        ...session,
        title: newTitle,
        sides: newSides.split(',').map(s => s.trim()),
        questions: editingQuestions
      });
    }
    setEditingSessionId(null);
  };

  const handleAnalyze = async (session: PartnershipSession) => {
    setLoadingId(session.id);
    try {
      const result = await analyzePartnership(session);
      onUpdate({ ...session, analysis: result });
    } catch (e) { alert(e); } finally { setLoadingId(null); }
  };

  const getChartData = (session: PartnershipSession) => {
    return session.questions.map(q => {
      const scores = session.responses.map(r => r.scores[q.id] || 0);
      const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      return { subject: q.text.slice(0, 12) + '...', value: avg };
    });
  };

  return (
    <div className="space-y-10 animate-fadeIn">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-extrabold">ניהול שותפויות</h2>
          <p className="text-zinc-500">מחובר כאדמין • {sessions.length} שותפויות פעילות</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all"
        >
          + שותפות חדשה
        </button>
      </div>

      {(showAdd || editingSessionId) && (
        <div className="glass p-8 rounded-3xl animate-slideDown space-y-6">
          <input 
            placeholder="שם השותפות"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl p-4"
            value={newTitle} onChange={e => setNewTitle(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <button onClick={() => {setShowAdd(false); setEditingSessionId(null);}} className="px-4 text-zinc-400">ביטול</button>
            <button 
              onClick={editingSessionId ? handleSaveEdit : handleCreate}
              className="bg-indigo-600 px-8 py-2 rounded-xl font-bold"
            >
              {editingSessionId ? 'שמור' : 'צור'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {sessions.map(session => (
          <div key={session.id} className="glass p-6 rounded-3xl border border-zinc-800">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold">{session.title}</h3>
                <p className="text-zinc-500 text-sm">{session.sides.join(' • ')}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleStartEdit(session)} className="text-xs bg-zinc-800 px-3 py-1 rounded-lg">ערוך</button>
                <button 
                   onClick={() => {
                     const url = `${window.location.origin}${window.location.pathname}?sid=${session.id}`;
                     navigator.clipboard.writeText(url);
                     alert('הקישור הועתק');
                   }}
                   className="text-xs bg-indigo-600/20 text-indigo-400 px-3 py-1 rounded-lg"
                >
                   🔗 קישור
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="h-48 bg-zinc-900/50 rounded-2xl p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={getChartData(session)}>
                      <PolarGrid stroke="#3f3f46" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 10 }} />
                      <Radar name="AVG" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} />
                    </RadarChart>
                  </ResponsiveContainer>
               </div>
               <div className="space-y-4">
                  <button 
                    disabled={session.responses.length < 2 || loadingId === session.id}
                    onClick={() => handleAnalyze(session)}
                    className="w-full bg-emerald-600 py-3 rounded-xl font-bold disabled:opacity-30"
                  >
                    {loadingId === session.id ? 'מנתח...' : 'ניתוח AI'}
                  </button>
                  {session.analysis && (
                    <div className="text-sm bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                      <p className="italic text-zinc-400">"{session.analysis.summary}"</p>
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
