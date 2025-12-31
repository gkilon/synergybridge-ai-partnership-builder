
import React, { useState, useEffect } from 'react';
import { PartnershipSession, ParticipantResponse, Question } from './types';
import { DEFAULT_QUESTIONS } from './constants';
import { dbService } from './services/dbService';
import AdminDashboard from './components/AdminDashboard';
import SurveyView from './components/SurveyView';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<PartnershipSession[]>([]);
  const [currentView, setCurrentView] = useState<'admin' | 'survey'>('admin');
  const [surveyId, setSurveyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initial Data Loading
  useEffect(() => {
    const init = async () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('sid');
      if (id) {
        setSurveyId(id);
        setCurrentView('survey');
      }
      
      const loadedSessions = await dbService.getSessions();
      if (loadedSessions.length > 0) {
        setSessions(loadedSessions);
      } else {
        // Create demo if none exists
        const demo: PartnershipSession = {
          id: 'demo-123',
          title: 'ממשק מכירות - שירות לקוחות',
          description: 'שיפור התיאום בתהליך העברת הלקוח',
          sides: ['מכירות', 'שירות'],
          questions: [...DEFAULT_QUESTIONS],
          responses: [],
          createdAt: new Date().toISOString()
        };
        setSessions([demo]);
        await dbService.saveSession(demo);
      }
      setIsLoading(false);
    };
    init();
  }, []);

  const handleAddSession = async (title: string, sides: string[], customQuestions: Question[]) => {
    const newSession: PartnershipSession = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      description: '',
      sides,
      questions: customQuestions,
      responses: [],
      createdAt: new Date().toISOString()
    };
    const updated = [newSession, ...sessions];
    setSessions(updated);
    await dbService.saveSession(newSession);
  };

  const handleUpdateSession = async (updated: PartnershipSession) => {
    setSessions(sessions.map(s => s.id === updated.id ? updated : s));
    await dbService.saveSession(updated);
  };

  const submitResponse = async (sid: string, response: ParticipantResponse) => {
    await dbService.addResponse(sid, response);
    // Refresh local state
    const loadedSessions = await dbService.getSessions();
    setSessions(loadedSessions);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (currentView === 'survey' && surveyId) {
    const session = sessions.find(s => s.id === surveyId);
    return <SurveyView session={session} onSubmit={(res) => submitResponse(surveyId, res)} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-indigo-500/30">
      <nav className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">S</div>
            <h1 className="text-xl font-bold tracking-tight">Synergy<span className="text-indigo-500 font-extrabold">Bridge</span> <span className="text-xs text-zinc-500 font-normal">ADMIN</span></h1>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => {
                window.history.pushState({}, '', window.location.pathname);
                setCurrentView('admin');
              }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${currentView === 'admin' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              לוח בקרה
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-8">
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
