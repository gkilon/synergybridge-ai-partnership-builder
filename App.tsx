
import React, { useState, useEffect } from 'react';
import { PartnershipSession, ParticipantResponse, Question } from './types';
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
      
      try {
        unsubscribe = dbService.subscribeToSessions((updated) => {
          setSessions(updated);
          setIsLoading(false);
        });

        if (sid) {
          setView(prev => ({ ...prev, main: 'survey', selectedId: sid }));
        }
      } catch (err) {
        console.error("Subscription error:", err);
        setIsLoading(false);
      }
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
    
    // Save locally first to be responsive, cloud happens in background via service
    await dbService.saveSession(newSession);
    
    // Update local state immediately to avoid waiting for sync
    setSessions(prev => [newSession, ...prev]);
    
    // Switch view
    setView({ main: 'admin', adminTab: 'list', selectedId: null });
  };

  const handleUpdateSession = async (updated: PartnershipSession) => {
    await dbService.saveSession(updated);
    // Local state will be updated by subscription, but we can do it manually too
    setSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  const handleDeleteSession = async (id: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את הממשק הזה? כל הנתונים והתובנות יימחקו לצמיתות.')) {
      await dbService.deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
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
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center space-y-8">
        <div className="relative">
          <div className="w-24 h-24 border-[6px] border-indigo-500/10 rounded-full"></div>
          <div className="w-24 h-24 border-[6px] border-indigo-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          <div className="absolute inset-0 flex items-center justify-center">
             <ShieldCheck className="text-indigo-500" size={32} />
          </div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-zinc-500 font-black animate-pulse tracking-[0.5em] text-[10px] uppercase pr-2">Initializing SynergyBridge</p>
          <p className="text-zinc-700 text-[8px] font-black uppercase tracking-widest">Connecting Secure Core...</p>
        </div>
      </div>
    );
  }

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
               <span className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.4em]">Partnership Intelligence</span>
            </div>
            <div className="w-12 h-12 bg-indigo-600 rounded-[1.2rem] flex items-center justify-center font-black text-white shadow-2xl shadow-indigo-600/30 group-hover:rotate-12 transition-transform">SB</div>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => openSettings()}
              className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-xs font-black hover:bg-indigo-500 transition-all uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              <Plus size={14} />
              New Interface
            </button>
            <button 
              onClick={goToAdmin}
              className={`px-6 py-3 rounded-2xl text-xs font-black transition-all uppercase tracking-widest ${view.adminTab === 'list' ? 'text-zinc-100 bg-zinc-800' : 'text-zinc-500 hover:text-white'}`}
            >
              Interfaces
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 md:p-12">
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
            session={sessions.find(s => s.id === view.selectedId)} 
            onUpdate={handleUpdateSession}
            onBack={goToAdmin}
          />
        )}
      </main>
    </div>
  );
};

export default App;
