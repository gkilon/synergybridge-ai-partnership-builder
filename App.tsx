
import React, { useState, useEffect, useCallback } from 'react';
import { PartnershipSession, ParticipantResponse, Question } from './types';
import { dbService } from './services/dbService';
import AdminDashboard from './components/AdminDashboard';
import SurveyView from './components/SurveyView';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<PartnershipSession[]>([]);
  const [currentView, setCurrentView] = useState<'admin' | 'survey'>('admin');
  const [surveyId, setSurveyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshData = useCallback(async () => {
    const loadedSessions = await dbService.getSessions();
    setSessions(loadedSessions);
    return loadedSessions;
  }, []);

  const init = async () => {
    setIsLoading(true);
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('sid');
    
    const loaded = await refreshData();

    if (sid) {
      setSurveyId(sid);
      setCurrentView('survey');
    } else {
      setCurrentView('admin');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    init();
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
    await refreshData();
  };

  const handleUpdateSession = async (updated: PartnershipSession) => {
    await dbService.saveSession(updated);
    await refreshData();
  };

  const submitResponse = async (sid: string, response: ParticipantResponse) => {
    await dbService.addResponse(sid, response);
    await refreshData();
  };

  const goToAdmin = () => {
    // Clear URL and refresh app state
    const url = new URL(window.location.href);
    url.searchParams.delete('sid');
    window.history.pushState({}, '', url.toString());
    
    setSurveyId(null);
    setCurrentView('admin');
    refreshData();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center space-y-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-500/20 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
        <p className="text-zinc-500 font-bold animate-pulse tracking-widest text-sm uppercase">SynergyBridge Loading...</p>
      </div>
    );
  }

  if (currentView === 'survey' && surveyId) {
    const session = sessions.find(s => s.id === surveyId);
    return <SurveyView session={session} onSubmit={(res) => submitResponse(surveyId, res)} onGoAdmin={goToAdmin} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-indigo-500/30">
      <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer group" onClick={goToAdmin}>
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center font-black text-white shadow-xl shadow-indigo-500/20 group-hover:scale-110 transition-transform">SB</div>
            <div>
               <h1 className="text-xl font-black tracking-tight leading-none">Synergy<span className="text-indigo-500">Bridge</span></h1>
               <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Partnership Intelligence</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={goToAdmin}
              className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${currentView === 'admin' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
            >
              לוח בקרה
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-10">
        <AdminDashboard 
          sessions={sessions} 
          onAdd={handleAddSession} 
          onUpdate={handleUpdateSession} 
        />
      </main>
    </div>
  );
};

export default App;
