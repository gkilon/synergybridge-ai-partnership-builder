
import React, { useState, useMemo } from 'react';
import { PartnershipSession, AIAnalysis } from '../types';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, Legend, Tooltip 
} from 'recharts';
import { analyzePartnership, expandRecommendation } from '../services/geminiService';
import { DEFAULT_QUESTIONS } from '../constants';

interface Props {
  session: PartnershipSession | undefined;
  onUpdate: (updated: PartnershipSession) => void;
  onBack: () => void;
}

const SIDE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

const ResultsView: React.FC<Props> = ({ session, onUpdate, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [expandingRec, setExpandingRec] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, string[]>>({});

  if (!session) return null;

  const analysisSummary = useMemo(() => {
    const questions = (session.questions && session.questions.length > 0) ? session.questions : DEFAULT_QUESTIONS;
    
    const isOutcome = (q: any) => 
      q.shortLabel === 'OUTCOME_SATISFACTION' || 
      ['q23', 'q24'].includes(q.id) || 
      (q.text && (q.text.includes('שביעות רצון') || q.text.includes('אפקטיביות')));

    const driverQs = questions.filter(q => !isOutcome(q));
    const outcomeQs = questions.filter(q => isOutcome(q));
    
    const groups = Array.from(new Set(driverQs.map(q => q.shortLabel || 'כללי')));
    let maxGapValue = -1, gapLabel = '';

    const driverData = groups.map(label => {
      const dataPoint: any = { subject: label };
      const relatedQs = driverQs.filter(q => q.shortLabel === label);
      let allSidesTotal = 0, allSidesCount = 0;
      const sideAverages: number[] = [];

      session.sides.forEach(side => {
        const sideResponses = session.responses.filter(r => r.side === side);
        let sideTotal = 0, sideCount = 0;
        sideResponses.forEach(r => {
          relatedQs.forEach(q => {
            const val = r.scores[q.id];
            if (val) { sideTotal += Number(val); sideCount++; allSidesTotal += Number(val); allSidesCount++; }
          });
        });
        const avg = sideCount > 0 ? Number((sideTotal / sideCount).toFixed(1)) : 0;
        dataPoint[side] = avg;
        sideAverages.push(avg);
      });

      if (sideAverages.length >= 2) {
        const gap = Math.abs(Math.max(...sideAverages) - Math.min(...sideAverages));
        if (gap > maxGapValue) { maxGapValue = gap; gapLabel = label; }
      }
      dataPoint['כולל'] = allSidesCount > 0 ? Number((allSidesTotal / allSidesCount).toFixed(1)) : 0;
      return dataPoint;
    });

    let sTotal = 0, sCount = 0;
    session.responses.forEach(r => {
      outcomeQs.forEach(q => {
        const score = r.scores[q.id];
        if (score) { sTotal += Number(score); sCount++; }
      });
    });
    const satisfactionScore = sCount > 0 ? Math.round((sTotal / sCount) / 7 * 100) : 0;

    return { driverData, satisfactionScore, biggestGap: maxGapValue > 0.4 ? { label: gapLabel, value: maxGapValue } : null };
  }, [session]);

  const handleAnalyze = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await analyzePartnership(session, analysisSummary);
      onUpdate({ ...session, analysis: result });
    } catch (e: any) {
      console.error("AI Analysis failed:", e);
      alert("ניתוח ה-AI נכשל. וודא שחיבור האינטרנט תקין ונסה שוב.");
    } finally {
      setLoading(false);
    }
  };

  const handleExpandRec = async (rec: string) => {
    if (expandedSteps[rec]) return;
    setExpandingRec(rec);
    try {
      const steps = await expandRecommendation(rec, session.context || session.title);
      setExpandedSteps(prev => ({ ...prev, [rec]: steps }));
    } catch {
      alert("נכשלנו בפירוט הצעדים.");
    } finally {
      setExpandingRec(null);
    }
  };

  const allRecs = session.analysis ? [
    ...session.analysis.recommendations.systemic,
    ...session.analysis.recommendations.relational
  ] : [];

  return (
    <div className="space-y-8 md:space-y-12 animate-fadeIn pb-32 max-w-[1700px] mx-auto px-2 md:px-4 text-right" dir="rtl">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-zinc-900 pb-8">
        <div className="space-y-2">
           <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-tight">{session.title}</h2>
           <p className="text-zinc-500 font-bold text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.4em]">דאשבורד ניהולי ומפת דרייברים</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
           <button onClick={onBack} className="flex-1 md:flex-none bg-zinc-900 text-zinc-500 px-6 py-3 md:px-8 md:py-4 rounded-xl md:rounded-2xl font-black border border-zinc-800 hover:text-white transition-all text-sm md:text-base">חזרה</button>
           <button 
             onClick={handleAnalyze} 
             disabled={loading} 
             className={`flex-[2] md:flex-none px-6 py-3 md:px-10 md:py-4 rounded-xl md:rounded-2xl font-black transition-all text-sm md:text-base ${loading ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/30 active:scale-95'}`}
           >
             {loading ? 'מנתח נתונים...' : '✨ ניתוח AI'}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10 items-start">
        
        {/* RIGHT: DATA & RADAR (FACTS) */}
        <div className="lg:col-span-7 space-y-6 md:order-2">
          
          {/* OUTCOME SCORE */}
          <div className="bg-[#09090b] rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 border border-white/5 shadow-3xl flex flex-col md:flex-row justify-between items-center gap-6 overflow-hidden relative group">
             <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full"></div>
             
             <div className="space-y-3 md:space-y-4 relative z-10 text-right w-full md:w-auto">
                <h3 className="text-xl md:text-3xl font-black text-white">בריאות הממשק (Outcome)</h3>
                <p className="text-zinc-500 text-xs md:text-base max-w-sm leading-relaxed">
                   מדד משוקלל המבטא אפקטיביות ושביעות רצון.
                </p>
                {analysisSummary.biggestGap && (
                   <div className="inline-flex items-center gap-2 bg-rose-500/10 text-rose-400 px-3 py-1.5 rounded-lg border border-rose-500/20 text-[10px] md:text-xs font-black animate-pulse">
                      <span>🚨 פער תפיסה: {analysisSummary.biggestGap.label}</span>
                   </div>
                )}
             </div>

             <div className="relative z-10 flex flex-col items-center justify-center">
                <span className="text-7xl md:text-[10rem] font-black text-white leading-none tracking-tighter tabular-nums drop-shadow-2xl">
                  {analysisSummary.satisfactionScore}%
                </span>
             </div>
          </div>

          {/* RADAR CHART - ENSURING VISIBILITY ON MOBILE */}
          <div className="bg-[#09090b] rounded-[2rem] md:rounded-[3.5rem] p-4 md:p-12 border border-white/5 shadow-3xl min-h-[400px] md:min-h-[600px] flex flex-col">
             <h3 className="text-lg md:text-2xl font-black text-white mb-6 md:mb-8 border-r-4 border-indigo-500 pr-4 md:pr-5">מיפוי דרייברים אסטרטגיים</h3>
             <div className="flex-grow w-full h-[350px] md:h-full overflow-visible">
               <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                  <RadarChart data={analysisSummary.driverData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                    <PolarGrid stroke="#1a1a1e" />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      tick={{ fill: '#71717a', fontSize: 11, fontWeight: 900 }}
                    />
                    <PolarRadiusAxis domain={[0, 7]} tick={false} axisLine={false} />
                    <Radar 
                      name="ממוצע" 
                      dataKey="כולל" 
                      stroke="#52525b" 
                      fill="#52525b" 
                      fillOpacity={0.03} 
                      strokeWidth={1} 
                      strokeDasharray="4 4" 
                    />
                    {session.sides.map((side, idx) => (
                      <Radar 
                        key={side} 
                        name={side} 
                        dataKey={side} 
                        stroke={SIDE_COLORS[idx % SIDE_COLORS.length]} 
                        fill={SIDE_COLORS[idx % SIDE_COLORS.length]} 
                        fillOpacity={0.1} 
                        strokeWidth={3} 
                      />
                    ))}
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#000', border: '1px solid #1a1a1e', borderRadius: '12px', color: '#fff', textAlign: 'right', fontSize: '12px' }} 
                    />
                  </RadarChart>
               </ResponsiveContainer>
             </div>
          </div>
        </div>

        {/* LEFT: STRATEGIC SIDEBAR (AI Insights) */}
        <div className="lg:col-span-5 space-y-6 md:space-y-8 md:order-1 lg:sticky lg:top-28">
          
          <div className="min-h-[300px] md:min-h-[600px] flex flex-col">
            {!session.analysis ? (
              <div className="bg-[#09090b] rounded-[2rem] md:rounded-[3.5rem] p-10 md:p-16 border-dashed border-2 border-zinc-800/50 text-center flex flex-col items-center justify-center flex-grow space-y-6 opacity-50 group hover:border-indigo-500/30 transition-all">
                 <div className="w-16 h-16 md:w-24 md:h-24 bg-zinc-900 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center text-3xl md:text-5xl grayscale group-hover:grayscale-0 transition-all">🧠</div>
                 <div className="space-y-3">
                    <h3 className="text-lg md:text-xl font-black text-white">ממתין לניתוח AI</h3>
                    <p className="text-zinc-500 text-xs md:text-sm max-w-xs mx-auto leading-relaxed">
                       לחץ על הכפתור למעלה כדי לקבל תובנות אופרטיביות וצעדי עבודה.
                    </p>
                 </div>
              </div>
            ) : (
              <div className="space-y-6 md:space-y-8 animate-slideDown">
                
                {/* AI SUMMARY BOX */}
                <div className="bg-indigo-600 rounded-[2rem] p-8 md:p-10 text-white shadow-4xl relative overflow-hidden group">
                   <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 blur-3xl rounded-full"></div>
                   <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                      אבחון ניהולי (AI)
                   </h3>
                   <p className="text-lg md:text-2xl font-black leading-tight relative z-10">{session.analysis.summary}</p>
                </div>

                {/* PRACTICAL RECOMMENDATIONS SECTION */}
                <div className="bg-[#0c0c0e] rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-white/5 space-y-6 md:space-y-8">
                   <div className="flex items-center gap-3 md:gap-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-500 rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-2xl shadow-xl shadow-indigo-500/20">🚀</div>
                      <h3 className="text-xl md:text-2xl font-black text-white">צעדים לביצוע</h3>
                   </div>

                   <div className="space-y-5 md:space-y-6">
                      {allRecs.map((rec, i) => (
                        <div key={i} className="space-y-3">
                           <div className="bg-zinc-900/40 p-5 md:p-6 rounded-2xl md:rounded-3xl border border-zinc-800/50 flex flex-col md:flex-row justify-between items-center gap-4 group hover:border-indigo-500/40 transition-all">
                              <p className="text-sm md:text-lg font-bold text-zinc-100 flex-grow leading-snug">{rec}</p>
                              <button 
                                onClick={() => handleExpandRec(rec)}
                                disabled={expandingRec === rec}
                                className={`shrink-0 w-full md:w-auto px-5 py-2.5 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black transition-all ${expandedSteps[rec] ? 'bg-zinc-800 text-zinc-600 cursor-default' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white'}`}
                              >
                                {expandingRec === rec ? 'מעבד...' : expandedSteps[rec] ? 'צעדים מוכנים' : 'איך מבצעים?'}
                              </button>
                           </div>
                           
                           {/* DRILL-DOWN ACTION STEPS */}
                           {expandedSteps[rec] && (
                             <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-[1.5rem] p-6 md:p-8 space-y-4 animate-slideDown shadow-inner">
                                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest border-b border-indigo-500/10 pb-2 inline-block">צעדים קונקרטיים:</h4>
                                <div className="space-y-3">
                                   {expandedSteps[rec].map((step, idx) => (
                                     <div key={idx} className="flex gap-3 md:gap-4 items-start">
                                        <span className="w-6 h-6 md:w-7 md:h-7 bg-indigo-500 text-white rounded-lg md:rounded-xl flex items-center justify-center text-[10px] md:text-xs font-black shrink-0 shadow-lg">{idx+1}</span>
                                        <p className="text-xs md:text-base font-bold text-zinc-300 leading-relaxed">{step}</p>
                                     </div>
                                   ))}
                                </div>
                             </div>
                           )}
                        </div>
                      ))}
                   </div>
                </div>

              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}; 

export default ResultsView;
