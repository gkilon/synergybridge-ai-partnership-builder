
import React, { useState, useEffect, useCallback } from 'react';
import { PartnershipSession, ParticipantResponse, Question } from './types';
import { dbService } from './services/dbService';
import AdminDashboard from './components/AdminDashboard';
import SurveyView from './components/SurveyView';
import ResultsView from './components/ResultsView';

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

  // סנכרון נתונים בזמן אמת מהענן
  useEffect(() => {
    let unsubscribe = () => {};
    
    const setupSync = async () => {
      setIsLoading(true);
      const params = new URLSearchParams(window.location.search);
      const sid = params.get('sid');
      
      // האזנה לשינויים ב-Firebase
      unsubscribe = dbService.subscribeToSessions((updatedSessions) => {
        setSessions(updatedSessions);
        setIsLoading(false);
      });

      // טעינה ראשונית
      const initial = await dbService.getSessions();
      setSessions(initial);

      if (sid) {
        setView({ main: 'survey', adminTab: 'list', selectedId: sid });
      }
      setIsLoading(false);
    };

    setupSync();
    return () => unsubscribe();
  }, []);

  const handleAddSession = async (title: string, sides: string[], questions: Question[], context: string) => {
    const newSession: PartnershipSession = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      description: '',
      context,
      sides,
      questions,
      responses: [],
      createdAt: new Date().toISOString()
    };
    await dbService.saveSession(newSession);
    setView({ main: 'admin', adminTab: 'list', selectedId: null });
  };

  const handleUpdateSession = async (updated: PartnershipSession) => {
    await dbService.saveSession(updated);
  };

  const handleDeleteSession = async (id: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק ממשק זה? כל הנתונים והמענים ימחקו לצמיתות.')) {
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

  const openSettings = (id: string | null = null) => {
    setView({ main: 'admin', adminTab: 'settings', selectedId: id });
  };

  const openResults = (id: string) => {
    setView({ main: 'admin', adminTab: 'results', selectedId: id });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center space-y-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-500/20 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
        <p className="text-zinc-500 font-bold animate-pulse tracking-widest text-sm uppercase">SynergyBridge Syncing...</p>
      </div>
    );
  }

  if (view.main === 'survey' && view.selectedId) {
    const session = sessions.find(s => s.id === view.selectedId);
    return <SurveyView session={session} onSubmit={(res) => submitResponse(view.selectedId!, res)} onGoAdmin={goToAdmin} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-indigo-500/30 font-assistant">
      <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer group" onClick={goToAdmin}>
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center font-black text-white shadow-xl shadow-indigo-500/20 group-hover:scale-110 transition-transform">SB</div>
            <div>
               <h1 className="text-xl font-black tracking-tight leading-none">Synergy<span className="text-indigo-500">Bridge</span></h1>
               <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Partnership Intelligence</span>
            </div>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={goToAdmin}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${view.adminTab === 'list' ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-500 hover:text-white'}`}
            >
              ממשקים פעילים
            </button>
            <button 
              onClick={() => openSettings()}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${view.adminTab === 'settings' && !view.selectedId ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-500 hover:text-white'}`}
            >
              + ממשק חדש
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-10">
        {view.adminTab === 'list' && (
          <AdminDashboard 
            sessions={sessions} 
            onOpenSettings={openSettings}
            onOpenResults={openResults}
            onDelete={handleDeleteSession}
          />
        )}
        
        {view.adminTab === 'settings' && (
          <AdminDashboard 
            sessions={sessions} 
            onAdd={handleAddSession} 
            onUpdate={handleUpdateSession}
            initialEditingId={view.selectedId}
            forceShowAdd={true}
            onCancel={goToAdmin}
            onDelete={handleDeleteSession}
          />
        )}

        {view.adminTab === 'results' && view.selectedId && (
          <ResultsView 
            session={sessions.find(s => s.id === view.selectedId)!} 
            onUpdate={handleUpdateSession}
            onBack={goToAdmin}
          />
        )}
      </main>
    </div>
  );
};

export default App;
