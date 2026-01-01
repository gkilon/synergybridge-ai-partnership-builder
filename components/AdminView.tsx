
import React, { useState } from 'react';
import { PartnershipSession, AIAnalysis } from '../types';
import { analyzePartnership } from '../services/geminiService';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
// Use DEFAULT_QUESTIONS as PARTNERSHIP_QUESTIONS is not exported in constants.ts
import { DEFAULT_QUESTIONS } from '../constants';

interface AdminViewProps {
  sessions: PartnershipSession[];
  onCreateSession: (title: string, sides: string[]) => void;
  onUpdateSession: (session: PartnershipSession) => void;
}

const AdminView: React.FC<AdminViewProps> = ({ sessions, onCreateSession, onUpdateSession }) => {
  const [newTitle, setNewTitle] = useState('');
  const [newSides, setNewSides] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newSides) return;
    onCreateSession(newTitle, newSides.split(',').map(s => s.trim()));
    setNewTitle('');
    setNewSides('');
  };

  // Senior Engineer Fix: Added missing aggregatedData calculation to fulfill analyzePartnership signature
  const handleRunAnalysis = async (session: PartnershipSession) => {
    if (session.responses.length < 2) {
      alert("יש צורך ב-2 מענים לפחות כדי להריץ ניתוח AI.");
      return;
    }

    // Prepare Aggregated Data for AI (Drivers & Outcomes)
    const driverQs = session.questions.filter(q => q.shortLabel !== 'OUTCOME_SATISFACTION');
    const outcomeQs = session.questions.filter(q => q.shortLabel === 'OUTCOME_SATISFACTION');
    const groups = Array.from(new Set(driverQs.map(q => q.shortLabel || 'כללי')));
    
    const driverData = groups.map(label => {
      const relatedQs = driverQs.filter(q => q.shortLabel === label);
      let total = 0, count = 0;
      session.responses.forEach(r => {
        relatedQs.forEach(q => {
          if (r.scores[q.id]) { total += r.scores[q.id]; count++; }
        });
      });
      return { label, value: count > 0 ? Number((total / count).toFixed(1)) : 0 };
    });

    let sTotal = 0, sCount = 0;
    session.responses.forEach(r => {
      outcomeQs.forEach(q => {
        if (r.scores[q.id]) { sTotal += r.scores[q.id]; sCount++; }
      });
    });
    const satisfactionScore = sCount > 0 ? Number(((sTotal / sCount) / 7 * 100).toFixed(0)) : 0;

    const aggregatedData = {
      driverData,
      satisfactionScore,
      biggestGap: null // Simplification for AdminView context
    };
    
    setIsAnalyzing(session.id);
    try {
      // Fix: Provided missing second argument 'aggregatedData' to fix line 36 error
      const result = await analyzePartnership(session, aggregatedData);
      onUpdateSession({ ...session, analysis: result });
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsAnalyzing(null);
    }
  };

  const calculateChartData = (session: PartnershipSession) => {
    // FIX: Use session-specific questions instead of the missing constant PARTNERSHIP_QUESTIONS
    return session.questions.map(q => {
      const scores = session.responses.map(r => r.scores[q.id] || 0);
      const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      return {
        subject: q.text.slice(0, 15) + '...',
        fullSubject: q.text,
        value: Number(avg.toFixed(1)),
        category: q.category
      };
    });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <section className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
        <h2 className="text-xl font-bold mb-4 border-b pb-2">הקמת שותפות חדשה</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input 
            type="text" 
            placeholder="שם השותפות (למשל: מכירות - שירות)"
            className="border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <input 
            type="text" 
            placeholder="הצדדים (מופרדים בפסיק)"
            className="border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
            value={newSides}
            onChange={(e) => setNewSides(e.target.value)}
          />
          <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 transition-colors">
            צור שותפות
          </button>
        </form>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-800">ניהול שותפויות קיימות</h2>
        {sessions.length === 0 && (
          <p className="text-slate-500 italic">לא נוצרו שותפויות עדיין.</p>
        )}
        
        {sessions.map(session => (
          <div key={session.id} className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 p-4 flex justify-between items-center border-b">
              <div>
                <h3 className="text-xl font-bold text-indigo-900">{session.title}</h3>
                <p className="text-sm text-slate-500">שותפים: {session.sides.join(' | ')}</p>
              </div>
              <div className="text-right">
                <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-1 rounded-full">
                  {session.responses.length} מענים
                </span>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Data Visualization */}
              <div className="h-64 bg-slate-50 rounded-lg p-4">
                <h4 className="text-sm font-bold mb-2 text-slate-600">ממוצע ציונים לפי קריטריון</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={calculateChartData(session)}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    {/* Fixed domain to [0, 7] to match the survey scale (1-7) */}
                    <PolarRadiusAxis angle={30} domain={[0, 7]} />
                    <Radar name="ממוצע" dataKey="value" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.6} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Analysis Trigger & Results */}
              <div className="flex flex-col justify-center">
                {!session.analysis ? (
                  <div className="text-center space-y-4">
                    <p className="text-slate-600">אסוף מענים נוספים או הרץ ניתוח AI לקבלת תובנות אופרטיביות.</p>
                    <button 
                      onClick={() => handleRunAnalysis(session)}
                      disabled={isAnalyzing === session.id}
                      className="inline-flex items-center bg-emerald-600 text-white px-8 py-3 rounded-full hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-md"
                    >
                      {isAnalyzing === session.id ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          מנתח נתונים בבינה מלאכותית...
                        </>
                      ) : (
                        'הרץ ניתוח AI וקבל המלצות'
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 overflow-y-auto max-h-64 pr-2">
                    <h4 className="font-bold text-indigo-800">סיכום AI:</h4>
                    <p className="text-sm text-slate-700 leading-relaxed bg-indigo-50 p-3 rounded">{session.analysis.summary}</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-xs font-bold uppercase text-emerald-600">חוזקות</h5>
                        <ul className="text-xs list-disc list-inside mt-1 space-y-1">
                          {session.analysis.strengths.systemic.concat(session.analysis.strengths.relational).slice(0, 3).map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-xs font-bold uppercase text-rose-600">חולשות</h5>
                        <ul className="text-xs list-disc list-inside mt-1 space-y-1">
                          {session.analysis.weaknesses.systemic.concat(session.analysis.weaknesses.relational).slice(0, 3).map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {session.analysis && (
              <div className="bg-indigo-900 text-white p-6">
                <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  המלצות אופרטיביות לפעולה
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Fixed systemic/relational structure mapping */}
                  {session.analysis.recommendations.systemic.concat(session.analysis.recommendations.relational).map((rec, idx) => (
                    <div key={idx} className="bg-white/10 p-3 rounded border border-white/20 flex gap-3">
                      <span className="font-bold text-indigo-300">{idx + 1}.</span>
                      <p className="text-sm">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
};

export default AdminView;
