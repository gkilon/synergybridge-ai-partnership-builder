
import React, { useState, useEffect, useCallback } from 'react';
import { PartnershipSession, ParticipantResponse, Question, Language } from './types';
import { dbService } from './services/dbService';
import AdminDashboard from './components/AdminDashboard';
import SurveyView from './components/SurveyView';
import ResultsView from './components/ResultsView';
import { ShieldCheck, Plus, LayoutDashboard, Settings, Search, AlertTriangle, RefreshCw, Globe } from 'lucide-react';

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
  const [isSearchingSession, setIsSearchingSession] = useState(false);
  const [searchError, setSearchError] = useState(false);

  const resolveSession = useCallback(async (sid: string) => {
    setIsSearchingSession(true);
    setSearchError(false);
    
    // Initial wait to ensure Firebase has time to breathe
    await new Promise(r => setTimeout(r, 1000));

    // Attempt 1
    let session = await dbService.getSessionById(sid);
    if (session) {
      setSessions(prev => prev.find(s => s.id === sid) ? prev : [...prev, session!]);
      setIsSearchingSession(false);
      return;
    }

    // Attempt 2 (Retry after delay)
    console.log("SynergyBridge: Retrying cloud fetch...");
    await new Promise(r => setTimeout(r, 2500));
    session = await dbService.getSessionById(sid);
    
    if (session) {
      setSessions(prev => prev.find(s => s.id === sid) ? prev : [...prev, session!]);
      setIsSearchingSession(false);
    } else {
      setSearchError(true);
      setIsSearchingSession(false);
    }
  }, []);

  const syncFromUrl = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('sid');
    if (sid) {
      setView({ main: 'survey', adminTab: 'list', selectedId: sid });
      resolveSession(sid);
    } else if (window.location.pathname.includes('/admin')) {
      setView({ main: 'admin', adminTab: 'list', selectedId: null });
    }
  }, [resolveSession]);

  useEffect(() => {
    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    
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
    try {
      await dbService.saveSession(newSession);
      setView({ main: 'admin', adminTab: 'list', selectedId: null });
    } catch (e) {
      alert("שגיאה בסנכרון לענן. השאלון נשמר מקומית בלבד. וודא הגדרות Firebase.");
      setView({ main: 'admin', adminTab: 'list', selectedId: null });
    }
  };

  const handleUpdateSession = async (updated: PartnershipSession) => {
    await dbService.saveSession(updated);
  };

  const handleDeleteSession = async (id: string) => {
    if (window.confirm('מחיקה לצמיתות?')) {
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
      <p className="text-zinc-500 font-black tracking-widest uppercase text-xs">SynergyBridge Security Layer...</p>
    </div>
  );

  if (view.main === 'survey' && view.selectedId && isSearchingSession) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center space-y-8 p-6 text-center">
        <div className="relative">
           <div className="w-24 h-24 border-4 border-indigo-600/10 border-t-indigo-500 rounded-full animate-spin"></div>
           <Globe className="absolute inset-0 m-auto text-indigo-500/50 animate-pulse" size={32} />
        </div>
        <div className="space-y-3">
           <h2 className="text-3xl font-black text-white">מחפש שותפות בענן...</h2>
           <p className="text-zinc-500 text-sm font-bold max-w-xs mx-auto">אנחנו יוצרים קשר עם שרת SynergyBridge כדי למשוך את נתוני הממשק.</p>
        </div>
      </div>
    );
  }

  if (view.main === 'survey' && view.selectedId && searchError) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center space-y-12 p-10 text-center" dir="rtl">
        <div className="w-28 h-28 bg-rose-500/10 rounded-[2.5rem] flex items-center justify-center text-rose-500 mx-auto shadow-2xl">
           <AlertTriangle size={56} />
        </div>
        <div className="space-y-4 max-w-md">
           <h2 className="text-5xl font-black text-white tracking-tighter">הממשק לא נמצא</h2>
           <p className="text-zinc-400 font-medium text-lg leading-relaxed">הקישור אינו קיים במסד הנתונים הענני. ייתכן שהממשק נוצר במצב 'לא מחובר' או נמחק.</p>
        </div>
        <div className="flex flex-col gap-6 w-full max-w-sm">
           <button onClick={() => window.location.reload()} className="w-full bg-white text-black py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-3 shadow-2xl hover:bg-zinc-200 transition-all active:scale-95">
              <RefreshCw size={24} /> נסה שוב
           </button>
           <button onClick={goToLanding} className="text-zinc-600 hover:text-white transition-colors font-black text-xs uppercase tracking-[0.3em]">Return Home</button>
        </div>
      </div>
    );
  }

  if (view.main === 'survey' && view.selectedId) {
    const session = sessions.find(s => s.id === view.selectedId);
    return <SurveyView session={session} onSubmit={(res) => submitResponse(view.selectedId!, res)} onGoAdmin={goToAdmin} />;
  }

  if (view.main === 'landing') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center" dir="rtl">
        <button onClick={goToAdmin} className="fixed top-6 left-6 text-zinc-700 hover:text-indigo-500 transition-colors flex items-center gap-2 font-black text-[10px] uppercase tracking-widest">
          <Settings size={14} /> Admin Access
        </button>
        <div className="max-w-3xl space-y-12 animate-fadeIn">
          <div className="space-y-4">
            <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center font-black text-4xl mx-auto shadow-2xl shadow-indigo-600/30">SB</div>
            <h1 className="text-7xl font-black tracking-tighter">Synergy<span className="text-indigo-500">Bridge</span></h1>
            <p className="text-zinc-500 text-xl font-medium max-w-xl mx-auto">הכלי החכם לבנייה ואופטימיזציה של ממשקים ארגוניים.</p>
          </div>
          <div className="flex flex-col md:flex-row gap-6 justify-center">
            <button onClick={() => setView({ main: 'admin', adminTab: 'settings', selectedId: null })} className="bg-indigo-600 px-12 py-6 rounded-3xl font-black text-xl hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-600/20">הקם ממשק חדש</button>
            <button onClick={goToAdmin} className="bg-zinc-800 text-white px-12 py-6 rounded-3xl font-black text-xl hover:bg-zinc-700 transition-all border border-zinc-700">ניהול שותפויות</button>
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
            <button onClick={() => setView({ main: 'admin', adminTab: 'settings', selectedId: null })} className={`px-6 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${view.adminTab === 'settings' ? 'text-white bg-indigo-600' : 'text-indigo-400 bg-indigo-600/10 hover:bg-indigo-600 hover:text-white'}`}>
              <Plus size={14} /> <span>ממשק חדש</span>
            </button>
            <button onClick={() => setView({ main: 'admin', adminTab: 'list', selectedId: null })} className={`px-6 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${view.adminTab === 'list' ? 'text-white bg-zinc-800' : 'text-zinc-500 hover:text-white bg-transparent'}`}>
              <LayoutDashboard size={14} /> <span>כל השותפויות</span>
            </button>
          </div>
          <div className="flex items-center gap-5 cursor-pointer group" onClick={goToLanding}>
            <div className="text-right">
               <h1 className="text-2xl font-black tracking-tight leading-none">Synergy<span className="text-indigo-500">Bridge</span></h1>
               <span className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.4em]">Admin Core</span>
            </div>
            <div className="w-12 h-12 bg-indigo-600 rounded-[1.2rem] flex items-center justify-center font-black text-white shadow-2xl group-hover:scale-105 transition-transform">SB</div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 md:p-12">
        {view.adminTab === 'list' && <AdminDashboard sessions={sessions} onOpenSettings={id => setView({ main: 'admin', adminTab: 'settings', selectedId: id })} onOpenResults={id => setView({ main: 'admin', adminTab: 'results', selectedId: id })} onDelete={handleDeleteSession} />}
        {view.adminTab === 'settings' && <AdminDashboard sessions={sessions} onAdd={handleAddSession} onUpdate={handleUpdateSession} initialEditingId={view.selectedId} forceShowAdd={true} onCancel={() => setView({ main: 'admin', adminTab: 'list', selectedId: null })} onDelete={handleDeleteSession} />}
        {view.adminTab === 'results' && view.selectedId && <ResultsView session={sessions.find(s => s.id === view.selectedId)} onUpdate={handleUpdateSession} onBack={() => setView({ main: 'admin', adminTab: 'list', selectedId: null })} />}
      </main>
    </div>
  );
};

export default App;
