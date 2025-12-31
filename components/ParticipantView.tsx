
import React, { useState } from 'react';
import { PartnershipSession, ParticipantResponse } from '../types';
// FIX: PARTNERSHIP_QUESTIONS is not exported, use DEFAULT_QUESTIONS instead
import { DEFAULT_QUESTIONS } from '../constants';

interface ParticipantViewProps {
  sessions: PartnershipSession[];
  onSubmitResponse: (sessionId: string, response: ParticipantResponse) => void;
}

const ParticipantView: React.FC<ParticipantViewProps> = ({ sessions, onSubmitResponse }) => {
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [role, setRole] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId || !participantName) return;

    const newResponse: ParticipantResponse = {
      id: Math.random().toString(36).substr(2, 9),
      participantName,
      role,
      scores,
      comments,
      submittedAt: new Date().toISOString()
    };

    onSubmitResponse(selectedSessionId, newResponse);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto mt-12 text-center p-8 bg-white rounded-xl shadow-lg animate-bounceIn">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">תודה על המענה!</h2>
        <p className="text-slate-600">התשובות שלך נשמרו וישמשו לניתוח השותפות.</p>
        <button 
          onClick={() => {setSubmitted(false); setScores({}); setComments(''); setParticipantName(''); setRole('');}}
          className="mt-6 text-indigo-600 font-semibold hover:underline"
        >
          מענה נוסף
        </button>
      </div>
    );
  }

  // FIX: Identify the selected session to access its questions array
  const selectedSession = sessions.find(s => s.id === selectedSessionId);
  const currentQuestions = selectedSession?.questions || DEFAULT_QUESTIONS;

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
      <div className="bg-indigo-600 p-6 text-white text-center">
        <h2 className="text-2xl font-bold">שאלון הערכת שותפות</h2>
        <p className="opacity-90 mt-2 text-sm">הקול שלך חשוב לשיפור הממשק והעבודה המשותפת</p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">בחר שותפות להערכה</label>
            <select 
              required
              className="border p-3 rounded-lg bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
            >
              <option value="">בחר...</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">שם מלא</label>
            <input 
              required
              type="text" 
              className="border p-3 rounded-lg bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="ישראל ישראלי"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-bold text-slate-700">תפקיד / צד בשותפות</label>
            <input 
              type="text" 
              className="border p-3 rounded-lg bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="למשל: מנהל שיווק"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-bold text-indigo-800 border-r-4 border-indigo-600 pr-3 py-1">דרג את ההיבטים הבאים (1-5)</h3>
          
          {/* FIX: Use the selected session's questions or fallback to DEFAULT_QUESTIONS */}
          {currentQuestions.map((q) => (
            <div key={q.id} className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100">
              <p className="text-slate-800 font-medium mb-3">{q.text}</p>
              <div className="flex justify-between items-center max-w-xs gap-2">
                {[1, 2, 3, 4, 5].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setScores(prev => ({ ...prev, [q.id]: num }))}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      scores[q.id] === num 
                        ? 'bg-indigo-600 text-white scale-110 shadow-md' 
                        : 'bg-white text-slate-400 hover:bg-indigo-50 hover:text-indigo-500 border border-slate-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-[10px] mt-2 text-slate-400 font-bold px-1">
                <span>חלש מאוד</span>
                <span>מצוין</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-slate-700">הערות נוספות (מה היית משנה? מה עובד טוב?)</label>
          <textarea 
            rows={4}
            className="border p-3 rounded-lg bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="כתוב כאן הערות חופשיות..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </div>

        <button 
          type="submit" 
          className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200"
        >
          שלח מענה
        </button>
      </form>
    </div>
  );
};

export default ParticipantView;
