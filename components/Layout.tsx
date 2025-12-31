
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'admin' | 'participant';
  setActiveTab: (tab: 'admin' | 'participant') => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-indigo-700 text-white shadow-lg p-4 sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h1 className="text-2xl font-bold">SynergyBridge</h1>
          </div>
          <nav className="flex gap-4">
            <button 
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'admin' ? 'bg-white text-indigo-700 font-semibold' : 'hover:bg-indigo-600'}`}
            >
              ניהול שותפות
            </button>
            <button 
              onClick={() => setActiveTab('participant')}
              className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'participant' ? 'bg-white text-indigo-700 font-semibold' : 'hover:bg-indigo-600'}`}
            >
              מענה לשאלון
            </button>
          </nav>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4 md:p-8">
        {children}
      </main>
      <footer className="bg-slate-100 p-4 border-t text-center text-slate-500 text-sm">
        &copy; {new Date().getFullYear()} SynergyBridge - בניית שותפויות מבוססת AI
      </footer>
    </div>
  );
};

export default Layout;
