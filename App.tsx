
import React, { useState, useEffect, useCallback } from 'react';
import { PartnershipSession, ParticipantResponse, Question, Language } from './types';
import { dbService } from './services/dbService';
import AdminDashboard from './components/AdminDashboard';
import SurveyView from './components/SurveyView';
import ResultsView from './components/ResultsView';
import { ShieldCheck, Plus, LayoutDashboard } from 'lucide-react';

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

  // Sync state with URL sid parameter
  const syncFromUrl = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('sid');
    if (sid) {
      setView({ main: 'survey', adminTab: 'list', selectedId: sid });
    } else {
      // If no SID, ensure we are in admin mode, but preserve tab if already there
      setView(prev => ({ 
        main: 'admin', 
        adminTab: prev.main === 'survey' ? 'list' : prev.adminTab,
        selectedId: prev.main === 'survey' ? null : prev.selectedId
      }));
    }
  }, []);

  useEffect(() => {
    // Initial sync from URL
    syncFromUrl();

    // Listen for browser back/forward buttons
    const handlePopState = () => syncFromUrl();
    window.addEventListener('popstate', handlePopState);
    
    // Subscribe to DB updates
    const unsubscribe = dbService.subscribeToSessions((updated) => {
      setSessions(updated);
      setIsLoading(false);
    });

    return () => {
      window.removeEventListener('popstate', handlePopState);
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
    // Clean up URL parameters by navigating to the base path
    const url = new URL(window.location.origin + window.location.pathname);
    window.history.pushState({}, '', url.toString());
    
    // Reset View State to dashboard list
    setView({ 
      main: 'admin', 
      adminTab: 'list', 
      selectedId: null 
    });
  };

  if (isLoading) return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center space-y-6">
      <ShieldCheck className="text-indigo-500 animate-pulse" size={64} />
      <p className="text-zinc-500 font-black tracking-widest uppercase text-xs">Initializing SynergyBridge...</p>
    </div>
  );

  // If in survey mode, render SurveyView exclusively
  if (view.main === 'survey' && view.selectedId) {
    const session = sessions.find(s => s.id === view.selectedId);
    return <SurveyView session={session} onSubmit={(res) => submitResponse(view.selectedId!, res)} onGoAdmin={goToAdmin} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-assistant">
      <nav className="border-b border-zinc-900 bg-zinc-950/90 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          {/* Dashboard and New Interface Buttons - Left side in RTL */}
          <div className="flex gap-4">
            <button 
              onClick={() => setView({ main: 'admin', adminTab: 'settings', selectedId: null })} 
              className={`px-6 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${view.adminTab === 'settings' ? 'text-white bg-indigo-600' : 'text-indigo-400 bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white'}`}
            >
              <Plus size={14} /> 
              <span>New Interface</span>
            </button>
            <button 
              id="dashboard-nav-btn"
              onClick={goToAdmin} 
              className={`px-6 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${view.adminTab === 'list' ? 'text-white bg-zinc-800 border border-zinc-700' : 'text-zinc-500 hover:text-white bg-transparent hover:bg-zinc-900'}`}
            >
              <LayoutDashboard size={14} />
              <span>Dashboard</span>
            </button>
          </div>

          {/* Logo Area - Right side in RTL */}
          <div className="flex items-center gap-5 cursor-pointer group" onClick={goToAdmin}>
            <div className="text-right">
               <h1 className="text-2xl font-black tracking-tight leading-none">Synergy<span className="text-indigo-500">Bridge</span></h1>
               <span className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.4em]">Admin Core</span>
            </div>
            <div className="w-12 h-12 bg-indigo-600 rounded-[1.2rem] flex items-center justify-center font-black text-white shadow-2xl shadow-indigo-600/30 group-hover:scale-105 transition-transform">SB</div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 md:p-12">
        {/* Using keys to force re-mount and clean state when switching tabs */}
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
            onCancel={goToAdmin} 
            onDelete={handleDeleteSession} 
          />
        )}
        
        {view.adminTab === 'results' && view.selectedId && (
          <ResultsView 
            key={`dashboard-results-${view.selectedId}`}
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
