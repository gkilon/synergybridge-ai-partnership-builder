
import React, { useState, useEffect } from 'react';
import { PartnershipSession, ParticipantResponse, Question, Language } from './types';
import { dbService } from './services/dbService';
import AdminDashboard from './components/AdminDashboard';
import SurveyView from './components/SurveyView';
import ResultsView from './components/ResultsView';
import { ShieldCheck, Plus } from 'lucide-react';

type ViewState = {
  main: 'admin' | 'survey';
  adminTab: 'list' | 'settings' | 'results';
  selectedId: string | null;
};

const App: React.FC = () => {
  const [sessions, setSessions] = useState<PartnershipSession[]>([]);
  const [view, setView] = useState<ViewState>({
    main: 'admin',
    adminTab: 'list',
    selectedId: null
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubscribe = () => {};
    const setupSync = async () => {
      const params = new URLSearchParams(window.location.search);
      const sid = params.get('sid');
      unsubscribe = dbService.subscribeToSessions((updated) => {
        setSessions(updated);
        setIsLoading(false);
      });
      if (sid) setView(prev => ({ ...prev, main: 'survey', selectedId: sid }));
    };
    setupSync();
    return () => unsubscribe();
  }, []);

  const handleAddSession = async (title: string, sides: string[], questions: Question[], context: string, lang: Language) => {
    const newSession: PartnershipSession = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      description: '',
      context,
      sides,
      questions,
      responses: [],
      createdAt: new Date().toISOString(),
      language: lang
    };
    await dbService.saveSession(newSession);
    setView({ main: 'admin', adminTab: 'list', selectedId: null });
  };

  const handleUpdateSession = async (updated: PartnershipSession) => {
    await dbService.saveSession(updated);
  };

  const handleDeleteSession = async (id: string) => {
    if (window.confirm('מחיקה לצמיתות של כל נתוני הממשק?')) {
      await dbService.deleteSession(id);
    }
  };

  const submitResponse = async (sid: string, response: ParticipantResponse) => {
    await dbService.addResponse(sid, response);
  };

  const goToAdmin = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('sid');
    window.history.pushState({}, '', url.toString());
    setView({ main: 'admin', adminTab: 'list', selectedId: null });
  };

  if (isLoading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><ShieldCheck className="text-indigo-500 animate-pulse" size={48} /></div>;

  if (view.main === 'survey' && view.selectedId) {
    const session = sessions.find(s => s.id === view.selectedId);
    return <SurveyView session={session} onSubmit={(res) => submitResponse(view.selectedId!, res)} onGoAdmin={goToAdmin} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-assistant">
      <nav className="border-b border-zinc-900 bg-zinc-950/90 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between flex-row-reverse">
          <div className="flex items-center gap-5 cursor-pointer group" onClick={goToAdmin}>
            <div className="text-right">
               <h1 className="text-2xl font-black tracking-tight leading-none">Synergy<span className="text-indigo-500">Bridge</span></h1>
               <span className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.4em]">Admin Core</span>
            </div>
            <div className="w-12 h-12 bg-indigo-600 rounded-[1.2rem] flex items-center justify-center font-black text-white shadow-2xl shadow-indigo-600/30">SB</div>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setView({ main: 'admin', adminTab: 'settings', selectedId: null })} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-xs font-black hover:bg-indigo-500 flex items-center gap-2"><Plus size={14} /> New Interface</button>
            <button onClick={goToAdmin} className={`px-6 py-3 rounded-2xl text-xs font-black transition-all ${view.adminTab === 'list' ? 'text-zinc-100 bg-zinc-800' : 'text-zinc-500 hover:text-white'}`}>Dashboard</button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 md:p-12">
        {view.adminTab === 'list' && <AdminDashboard sessions={sessions} onOpenSettings={id => setView({ main: 'admin', adminTab: 'settings', selectedId: id })} onOpenResults={id => setView({ main: 'admin', adminTab: 'results', selectedId: id })} onDelete={handleDeleteSession} />}
        {view.adminTab === 'settings' && <AdminDashboard sessions={sessions} onAdd={handleAddSession} onUpdate={handleUpdateSession} initialEditingId={view.selectedId} forceShowAdd={true} onCancel={goToAdmin} onDelete={handleDeleteSession} />}
        {view.adminTab === 'results' && view.selectedId && <ResultsView session={sessions.find(s => s.id === view.selectedId)} onUpdate={handleUpdateSession} onBack={goToAdmin} />}
      </main>
    </div>
  );
};

export default App;
