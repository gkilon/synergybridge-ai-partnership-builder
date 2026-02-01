
import React, { useState, useEffect, useCallback } from 'react';
import { PartnershipSession, ParticipantResponse, Question, Language } from './types';
import { dbService } from './services/dbService';
import AdminDashboard from './components/AdminDashboard';
import SurveyView from './components/SurveyView';
import ResultsView from './components/ResultsView';
import { ShieldCheck, Plus, LayoutDashboard, Settings, Home } from 'lucide-react';

type ViewState = {
  main: 'admin' | 'survey' | 'landing';
  adminTab: 'list' | 'settings' | 'results';
  selectedId: string | null;
};

const App: React.FC = () => {
  const [sessions, setSessions] = useState<PartnershipSession[]>([]);
  const [view, setView] = useState<ViewState>({
    main: 'landing',
    adminTab: 'list',
    selectedId: null
  });
  const [isLoading, setIsLoading] = useState(true);

  const syncFromUrl = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('sid');
    if (sid) {
      setView({ main: 'survey', adminTab: 'list', selectedId: sid });
    }
  }, []);

  useEffect(() => {
    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    
    // The subscription will fire even if the list is empty,
    // but we wait for it to mark the app as ready.
    const unsubscribe = dbService.subscribeToSessions((updated) => {
      setSessions(updated);
      setIsLoading(false);
    });

    return () => {
      window.removeEventListener('popstate', syncFromUrl);
      unsubscribe();
    };
  }, [syncFromUrl]);

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
    const url = new URL(window.location.origin + window.location.pathname);
    window.history.pushState({}, '', url.toString());
    setView({ main: 'admin', adminTab: 'list', selectedId: null });
  };

  const goToLanding = () => {
    const url = new URL(window.location.origin + window.location.pathname);
    window.history.pushState({}, '', url.toString());
    setView({ main: 'landing', adminTab: 'list', selectedId: null });
  };

  if (isLoading) return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center space-y-6">
      <ShieldCheck className="text-indigo-500 animate-pulse" size={64} />
      <p className="text-zinc-500 font-black tracking-widest uppercase text-xs">מטען נתונים מאובטח...</p>
    </div>
  );

  if (view.main === 'survey' && view.selectedId) {
    const session = sessions.find(s => s.id === view.selectedId);
    // If we're not loading but session is not found, it means the ID is invalid or sync failed.
    return <SurveyView session={session} onSubmit={(res) => submitResponse(view.selectedId!, res)} onGoAdmin={goToAdmin} />;
  }

  // Landing Page
  if (view.main === 'landing') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center" dir="rtl">
        <button 
          onClick={goToAdmin}
          className="fixed top-6 left-6 text-zinc-700 hover:text-indigo-500 transition-colors flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"
        >
          <Settings size={14} /> Admin Access
        </button>

        <div className="max-w-3xl space-y-12 animate-fadeIn">
          <div className="space-y-4">
            <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center font-black text-4xl mx-auto shadow-2xl shadow-indigo-600/30">SB</div>
            <h1 className="text-6xl font-black tracking-tighter">Synergy<span className="text-indigo-500">Bridge</span></h1>
            <p className="text-zinc-500 text-xl font-medium max-w-xl mx-auto">הכלי החכם לבנייה ואופטימיזציה של ממשקים ארגוניים ושיתופי פעולה אסטרטגיים.</p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-6 justify-center">
            <button 
              onClick={() => setView({ main: 'admin', adminTab: 'settings', selectedId: null })}
              className="bg-indigo-600 px-12 py-6 rounded-3xl font-black text-xl hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-600/20 flex items-center gap-3 justify-center"
            >
              הקם ממשק חדש <Plus size={20} />
            </button>
            <button 
              onClick={goToAdmin}
              className="bg-zinc-800 text-white px-12 py-6 rounded-3xl font-black text-xl hover:bg-zinc-700 transition-all flex items-center gap-3 justify-center border border-zinc-700 shadow-xl"
            >
              ניהול שותפויות <LayoutDashboard size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-assistant">
      <nav className="border-b border-zinc-900 bg-zinc-950/90 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex gap-4">
            <button 
              onClick={() => setView({ main: 'admin', adminTab: 'settings', selectedId: null })} 
              className={`px-6 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${view.adminTab === 'settings' ? 'text-white bg-indigo-600 shadow-lg shadow-indigo-600/30' : 'text-indigo-400 bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white'}`}
            >
              <Plus size={14} /> 
              <span>ממשק חדש</span>
            </button>
            <button 
              onClick={() => setView({ main: 'admin', adminTab: 'list', selectedId: null })} 
              className={`px-6 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${view.adminTab === 'list' ? 'text-white bg-zinc-800 border border-zinc-700' : 'text-zinc-500 hover:text-white bg-transparent hover:bg-zinc-900'}`}
            >
              <LayoutDashboard size={14} />
              <span>כל השותפויות</span>
            </button>
            <button 
              onClick={goToLanding} 
              className="px-6 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 text-zinc-500 hover:text-white bg-transparent hover:bg-zinc-900"
            >
              <Home size={14} />
              <span>בית</span>
            </button>
          </div>

          <div className="flex items-center gap-5 cursor-pointer group" onClick={goToLanding}>
            <div className="text-right">
               <h1 className="text-2xl font-black tracking-tight leading-none">Synergy<span className="text-indigo-500">Bridge</span></h1>
               <span className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.4em]">Admin Core</span>
            </div>
            <div className="w-12 h-12 bg-indigo-600 rounded-[1.2rem] flex items-center justify-center font-black text-white shadow-2xl shadow-indigo-600/30 group-hover:scale-105 transition-transform">SB</div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 md:p-12">
        {view.adminTab === 'list' && (
          <AdminDashboard 
            key="dashboard-list"
            sessions={sessions} 
            onOpenSettings={id => setView({ main: 'admin', adminTab: 'settings', selectedId: id })} 
            onOpenResults={id => setView({ main: 'admin', adminTab: 'results', selectedId: id })} 
            onDelete={handleDeleteSession} 
          />
        )}
        
        {view.adminTab === 'settings' && (
          <AdminDashboard 
            key="dashboard-settings"
            sessions={sessions} 
            onAdd={handleAddSession} 
            onUpdate={handleUpdateSession} 
            initialEditingId={view.selectedId} 
            forceShowAdd={true} 
            onCancel={() => setView({ main: 'admin', adminTab: 'list', selectedId: null })} 
            onDelete={handleDeleteSession} 
          />
        )}
        
        {view.adminTab === 'results' && view.selectedId && (
          <ResultsView 
            key={`dashboard-results-${view.selectedId}`}
            session={sessions.find(s => s.id === view.selectedId)} 
            onUpdate={handleUpdateSession} 
            onBack={() => setView({ main: 'admin', adminTab: 'list', selectedId: null })} 
          />
        )}
      </main>
    </div>
  );
};

export default App;
