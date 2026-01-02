
import React, { useState, useEffect } from 'react';
import { PartnershipSession, Question, Category } from '../types';
import { DEFAULT_QUESTIONS } from '../constants';
import { dbService } from '../services/dbService';
import { User } from 'firebase/auth';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

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

  if (authLoading) return <div className="flex justify-center p-20 text-zinc-500 font-bold">Loading Security...</div>;

  if (!gatePassed) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 animate-fadeIn">
        <div className="glass max-w-md w-full p-12 rounded-[3rem] text-center space-y-10">
          <h2 className="text-3xl font-black text-white">Admin Access</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (passwordInput === 'giladk25') {
              setGatePassed(true);
              sessionStorage.setItem('sb_security_gate', 'true');
            } else { setError(true); setPasswordInput(''); }
          }} className="space-y-6">
            <input 
              type="password" 
              placeholder="Secret Code..." 
              autoFocus 
              className={`w-full bg-zinc-950 border-2 rounded-2xl p-6 text-center font-black text-2xl tracking-widest ${error ? 'border-red-500 animate-shake' : 'border-zinc-800'}`}
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
            />
            <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-indigo-500 transition-colors">Continue</button>
          </form>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 animate-fadeIn">
        <div className="glass max-w-md w-full p-12 rounded-[3rem] text-center space-y-12">
          <h2 className="text-3xl font-black text-white leading-tight">Identity Verification</h2>
          <button onClick={handleGoogleLogin} className="w-full bg-white text-black py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-4 shadow-2xl hover:bg-zinc-100 transition-all">
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google Identity
          </button>
        </div>
      </div>
    );
  }

  if (forceShowAdd || initialEditingId) {
    return (
      <div className="max-w-4xl mx-auto space-y-10 animate-slideDown pb-20 text-right">
        <div className="glass p-12 rounded-[3.5rem] space-y-12">
          <div className="flex justify-between items-center flex-row-reverse">
            <h3 className="text-4xl font-black text-white">{initialEditingId ? 'Edit Interface' : 'New Partnership'}</h3>
            <button onClick={onCancel} className="bg-zinc-900 text-zinc-500 px-8 py-3 rounded-2xl font-bold hover:text-white transition-colors">Cancel</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-black text-zinc-500 uppercase px-4">Partnership Title</label>
              <input placeholder="e.g., Sales - Product Interface" className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-6 text-white font-black text-xl" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-zinc-500 uppercase px-4">Participating Sides (comma separated)</label>
              <input placeholder="Side A, Side B" className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-6 text-white font-bold text-lg" value={newSides} onChange={e => setNewSides(e.target.value)} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-black text-zinc-500 uppercase px-4">Organizational Context & Dependencies</label>
              <textarea rows={4} className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-[2rem] p-6 text-white font-medium" value={newContext} onChange={e => setNewContext(e.target.value)} placeholder="Explain the mutual dependencies and business process..." />
            </div>
          </div>
          <button onClick={() => {
            const sidesArr = newSides.split(',').map(s=>s.trim()).filter(s=>s);
            if (initialEditingId) onUpdate?.({ ...sessions.find(s=>s.id === initialEditingId)!, title: newTitle, sides: sidesArr, context: newContext });
            else onAdd?.(newTitle, sidesArr, DEFAULT_QUESTIONS, newContext);
          }} className="bg-indigo-600 px-16 py-6 rounded-3xl font-black text-xl text-white shadow-xl shadow-indigo-600/30 hover:bg-indigo-500 transition-all">Save Partnership</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-16 animate-fadeIn pb-24 text-right">
      <div className="flex justify-between items-end border-b border-zinc-900 pb-10 flex-row-reverse">
        <h2 className="text-6xl font-black text-white tracking-tighter">Manager Dashboard</h2>
        <button onClick={() => { sessionStorage.removeItem('sb_security_gate'); dbService.logout(); }} className="text-xs font-black text-zinc-700 hover:text-red-500 uppercase tracking-widest transition-colors">Sign Out</button>
      </div>

      {sessions.length === 0 ? (
        <div className="p-20 text-center glass rounded-[3rem] space-y-6">
           <div className="text-6xl">🤝</div>
           <h3 className="text-2xl font-black text-white">No interfaces configured yet.</h3>
           <button onClick={() => onOpenSettings?.('')} className="bg-indigo-600 px-10 py-4 rounded-2xl font-black text-white">Start Building</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {sessions.map(session => (
            <div key={session.id} className="glass rounded-[3rem] p-10 flex flex-col group relative overflow-hidden transition-all hover:scale-[1.02] hover:border-indigo-500/40">
               <div className="flex justify-between items-start mb-8 flex-row-reverse">
                  <div className="text-right">
                     <span className="text-5xl font-black text-white">{session.responses?.length || 0}</span>
                     <p className="text-[10px] font-black text-zinc-600 uppercase mt-1">Responses</p>
                  </div>
                  <button onClick={() => onDelete?.(session.id)} className="p-3 bg-zinc-900 rounded-xl text-zinc-700 hover:text-red-500 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
               </div>
               
               <div className="h-48 w-full mb-8 relative">
                  <ResponsiveContainer width="100%" height="100%">
                     <RadarChart data={calculateMiniChartData(session)}>
                        <PolarGrid stroke="#27272a" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#52525b', fontSize: 10, fontWeight: 800 }} />
                        <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                     </RadarChart>
                  </ResponsiveContainer>
               </div>

               <h3 className="text-2xl font-black text-white mb-6 flex-grow leading-tight text-right">{session.title}</h3>
               
               <div className="grid grid-cols-1 gap-3">
                  <button onClick={() => onOpenResults?.(session.id)} className="w-full bg-white text-black py-4 rounded-2xl font-black hover:bg-zinc-200 transition-colors">View Intelligence</button>
                  <button onClick={() => { 
                    const url = `${window.location.origin}${window.location.pathname}?sid=${session.id}`;
                    navigator.clipboard.writeText(url); 
                    alert('Survey Link Copied!'); 
                  }} className="w-full bg-zinc-900 text-zinc-500 py-3 rounded-2xl text-xs font-black border border-zinc-800 hover:text-white transition-colors uppercase tracking-widest">Copy Survey Link</button>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
