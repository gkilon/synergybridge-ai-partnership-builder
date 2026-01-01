
import React, { useState, useMemo } from 'react';
import { PartnershipSession, AIAnalysis, Category } from '../types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';
import { analyzePartnership } from '../services/geminiService';

interface Props {
  session: PartnershipSession | undefined;
  onUpdate: (updated: PartnershipSession) => void;
  onBack: () => void;
}

const SIDE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

const ResultsView: React.FC<Props> = ({ session, onUpdate, onBack }) => {
  const [loading, setLoading] = useState(false);

  if (!session) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-6 animate-fadeIn">
        <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-700">
           <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <p className="text-zinc-500 font-black text-xl">הממשק המבוקש לא נמצא</p>
        <button onClick={onBack} className="bg-indigo-600 px-8 py-3 rounded-2xl text-white font-bold shadow-xl">חזרה לרשימה</button>
      </div>
    );
  }

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const result = await analyzePartnership(session);
      onUpdate({ ...session, analysis: result });
    } catch (e: any) {
      if (e.message === "AUTH_ERROR") {
        alert("שגיאת הרשאה: וודא שהגדרת VITE_GEMINI_API_KEY תקין בסביבת העבודה.");
      } else {
        alert(e.message || "חלה שגיאה בחיבור למערכת הניתוח");
      }
    } finally {
      setLoading(false);
    }
  };

  // Merged Outcomes and Grouped Stats
  const { componentStats, criticalGaps } = useMemo(() => {
    if (!session.questions || session.questions.length === 0) return { componentStats: [], criticalGaps: [] };
    
    // Identify Outcome questions to merge them
    const outcomeLabels = ["אפקטיביות גלובלית", "שביעות רצון"];
    const groups = Array.from(new Set(session.questions.map(q => q.shortLabel || 'כללי')));
    
    // Create actual labels to iterate, merging outcomes
    const labelsToProcess = groups.filter(g => !outcomeLabels.includes(g));
    labelsToProcess.push("שביעות רצון ותוצאות");

    const calculatedData = labelsToProcess.map(label => {
      const dataPoint: any = { subject: label };
      const relatedQuestions = session.questions.filter(q => {
        if (label === "שביעות רצון ותוצאות") return outcomeLabels.includes(q.shortLabel || "");
        return (q.shortLabel || 'כללי') === label;
      });

      if (relatedQuestions.length === 0) return null;

      let totalGlobal = 0;
      let countGlobal = 0;
      const sideAverages: Record<string, number> = {};

      session.sides.forEach(side => {
        const sideResponses = session.responses.filter(r => r.side === side);
        let totalSide = 0;
        let countSide = 0;
        
        sideResponses.forEach(r => {
          relatedQuestions.forEach(q => {
            if (r.scores && r.scores[q.id] !== undefined) {
              totalSide += r.scores[q.id];
              countSide++;
              totalGlobal += r.scores[q.id];
              countGlobal++;
            }
          });
        });
        
        const avg = countSide > 0 ? Number((totalSide / countSide).toFixed(1)) : 0;
        dataPoint[side] = avg;
        sideAverages[side] = avg;
      });

      const totalAvg = countGlobal > 0 ? Number((totalGlobal / countGlobal).toFixed(1)) : 0;
      dataPoint.average = totalAvg;

      let gap = 0;
      if (session.sides.length >= 2) {
        const vals = session.sides.map(s => sideAverages[s]);
        gap = Number((Math.max(...vals) - Math.min(...vals)).toFixed(1));
      }

      return { ...dataPoint, totalAvg, gap };
    }).filter(Boolean) as any[];

    const sortedStats = [...calculatedData].sort((a, b) => b.totalAvg - a.totalAvg);
    const gaps = sortedStats.filter(s => s.gap >= 1.2).sort((a, b) => b.gap - a.gap);

    return { componentStats: sortedStats, criticalGaps: gaps };
  }, [session]);

  const healthIndicator = useMemo(() => {
    const outcome = componentStats.find(s => s.subject === "שביעות רצון ותוצאות");
    const score = outcome ? (outcome.totalAvg / 7) * 100 : 0;
    
    if (score >= 85) return { label: 'שותפות מופתית', color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: '💎' };
    if (score >= 65) return { label: 'ממשק יציב', color: 'text-indigo-400', bg: 'bg-indigo-400/10', icon: '✅' };
    if (score >= 40) return { label: 'ממשק בסיסי', color: 'text-amber-400', bg: 'bg-amber-400/10', icon: '⚠️' };
    return { label: 'שותפות בשבר', color: 'text-rose-400', bg: 'bg-rose-400/10', icon: '🚨' };
  }, [componentStats]);

  const analysis = session.analysis;

  return (
    <div className="space-y-10 animate-fadeIn pb-32 max-w-7xl mx-auto px-4 md:px-0 text-right" dir="rtl">
      {/* HEADER SECTION - Simplified */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-zinc-800 pb-8">
        <div className="flex items-center gap-6">
           <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${healthIndicator.bg} border border-white/5 shadow-xl`}>
              <span className="text-4xl">{healthIndicator.icon}</span>
           </div>
           <div>
              <h2 className="text-4xl font-black text-white tracking-tighter">{session.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                 <span className={`text-sm font-black ${healthIndicator.color}`}>{healthIndicator.label}</span>
                 <span className="text-zinc-600">•</span>
                 <span className="text-zinc-500 text-sm font-bold">{session.responses.length} משתתפים</span>
              </div>
           </div>
        </div>
        <div className="flex gap-4">
           <button onClick={onBack} className="bg-zinc-900 text-zinc-400 px-6 py-4 rounded-2xl font-bold hover:text-white transition-all border border-zinc-800">חזרה</button>
           <button 
             disabled={session.responses.length < 1 || loading}
             onClick={handleAnalyze}
             className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white px-10 py-4 rounded-2xl font-black transition-all shadow-xl flex items-center gap-3"
           >
             {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : '✨ ניתוח AI'}
           </button>
        </div>
      </div>

      {/* CORE HIGHLIGHTS: Strengths, Weaknesses, and Critical Gaps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* CRITICAL GAPS */}
        <div className="glass rounded-[2.5rem] p-8 border-rose-500/10 bg-rose-500/5">
           <h3 className="text-lg font-black text-rose-400 mb-6 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              פערים קריטיים בתפיסה
           </h3>
           {criticalGaps.length > 0 ? (
             <div className="space-y-4">
               {criticalGaps.slice(0, 3).map((gap, i) => (
                 <div key={i} className="bg-black/20 p-4 rounded-2xl border border-white/5">
                    <div className="flex justify-between items-center mb-1">
                       <span className="text-sm font-black text-white">{gap.subject}</span>
                       <span className="text-xs font-bold text-rose-400">{gap.gap} נק' פער</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 font-bold leading-tight">קיימת אי-הסכמה משמעותית לגבי תפקוד הממשק בציר זה.</p>
                 </div>
               ))}
             </div>
           ) : (
             <div className="h-40 flex items-center justify-center text-zinc-600 text-sm font-bold italic">לא נמצאו פערים קיצוניים</div>
           )}
        </div>

        {/* AI STRENGTHS */}
        <div className="glass rounded-[2.5rem] p-8 border-emerald-500/10 bg-emerald-500/5">
           <h3 className="text-lg font-black text-emerald-400 mb-6 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              חוזקות הממשק (AI)
           </h3>
           <div className="space-y-3">
              {analysis ? (
                [...(analysis.strengths?.systemic || []), ...(analysis.strengths?.relational || [])].slice(0, 4).map((s, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm font-bold text-zinc-300">
                     <span className="text-emerald-500 mt-1">✦</span>
                     <span>{s}</span>
                  </div>
                ))
              ) : (
                <div className="h-40 flex items-center justify-center text-zinc-700 text-sm font-bold italic">ממתין להרצת ניתוח</div>
              )}
           </div>
        </div>

        {/* AI WEAKNESSES */}
        <div className="glass rounded-[2.5rem] p-8 border-zinc-700 bg-zinc-900/40">
           <h3 className="text-lg font-black text-zinc-400 mb-6 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              חסמים מרכזיים (AI)
           </h3>
           <div className="space-y-3">
              {analysis ? (
                [...(analysis.weaknesses?.systemic || []), ...(analysis.weaknesses?.relational || [])].slice(0, 4).map((w, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm font-bold text-zinc-400">
                     <span className="text-rose-500/60 mt-1">◇</span>
                     <span>{w}</span>
                  </div>
                ))
              ) : (
                <div className="h-40 flex items-center justify-center text-zinc-700 text-sm font-bold italic">ממתין להרצת ניתוח</div>
              )}
           </div>
        </div>
      </div>

      {/* MAIN DATA - Sorted Components */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
           <h3 className="text-2xl font-black text-white whitespace-nowrap">ציוני המרכיבים (מהגבוה לנמוך)</h3>
           <div className="h-px bg-zinc-800 flex-grow"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {componentStats.map((stat, i) => (
            <div key={i} className={`glass p-6 rounded-3xl border-white/5 transition-all group ${stat.subject === 'שביעות רצון ותוצאות' ? 'bg-indigo-500/5 border-indigo-500/20' : ''}`}>
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-sm font-black text-white leading-tight max-w-[120px]">{stat.subject}</h4>
                <div className={`px-3 py-1 rounded-lg font-black text-xs ${stat.totalAvg >= 5.5 ? 'bg-emerald-500/10 text-emerald-400' : stat.totalAvg >= 4 ? 'bg-indigo-500/10 text-indigo-400' : 'bg-rose-500/10 text-rose-400'}`}>
                  {stat.totalAvg}
                </div>
              </div>
              
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden mb-4">
                 <div className={`h-full transition-all duration-1000 ${stat.gap > 1.2 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${(stat.totalAvg / 7) * 100}%` }}></div>
              </div>

              <div className="flex justify-between items-center">
                 <div className="flex gap-2">
                    {session.sides.map((side, idx) => (
                      <div key={side} className="text-[9px] font-bold text-zinc-500 flex flex-col">
                        <span className="opacity-60 truncate max-w-[40px]">{side}</span>
                        <span className="text-zinc-300">{stat[side]}</span>
                      </div>
                    ))}
                 </div>
                 {stat.gap > 1.2 && (
                   <span className="text-[9px] font-black text-rose-400 animate-pulse bg-rose-500/10 px-2 py-0.5 rounded-full">פער חריג!</span>
                 )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI STRATEGIC SUMMARY & RECOMMENDATIONS - Only if Analysis exists */}
      {analysis && (
        <div className="space-y-8 animate-slideUp pt-6">
          <div className="flex items-center gap-4">
             <h3 className="text-2xl font-black text-white whitespace-nowrap">המלצות ותובנת על (AI)</h3>
             <div className="h-px bg-zinc-800 flex-grow"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             <div className="lg:col-span-1 glass rounded-[2.5rem] p-8 border-indigo-500/20 bg-indigo-500/5">
                <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4">סיכום אבחוני</h4>
                <p className="text-lg font-bold text-zinc-200 leading-snug">{analysis.summary}</p>
             </div>

             <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                   <h5 className="text-sm font-black text-zinc-500 uppercase tracking-widest px-2">מהלך מערכתי (תשתית)</h5>
                   {analysis.recommendations?.systemic.slice(0, 3).map((rec, i) => (
                     <div key={i} className="bg-zinc-900/60 p-5 rounded-2xl border border-zinc-800 flex items-start gap-4 text-sm font-bold text-zinc-200">
                        <span className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-[10px] flex-shrink-0">{i+1}</span>
                        {rec}
                     </div>
                   ))}
                </div>
                <div className="space-y-4">
                   <h5 className="text-sm font-black text-zinc-500 uppercase tracking-widest px-2">שיפור ציר היחסים (תרבות)</h5>
                   {analysis.recommendations?.relational.slice(0, 3).map((rec, i) => (
                     <div key={i} className="bg-zinc-900/60 p-5 rounded-2xl border border-zinc-800 flex items-start gap-4 text-sm font-bold text-zinc-200">
                        <span className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center text-[10px] flex-shrink-0">{i+1}</span>
                        {rec}
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsView;
