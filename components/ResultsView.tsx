
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
    const questions = (session.questions?.length > 0) ? session.questions : DEFAULT_QUESTIONS;
    
    const isOutcome = (q: any) => 
      q.shortLabel === 'OUTCOME_SATISFACTION' || 
      ['q23', 'q24'].includes(q.id) || 
      q.text.includes('שביעות רצון') || 
      q.text.includes('אפקטיביות');

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
    setLoading(true);
    try {
      const result = await analyzePartnership(session, analysisSummary);
      onUpdate({ ...session, analysis: result });
    } catch (e: any) {
      alert(e.message);
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
    <div className="space-y-12 animate-fadeIn pb-32 max-w-[1700px] mx-auto px-4 text-right" dir="rtl">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-zinc-900 pb-10">
        <div className="space-y-2">
           <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter">{session.title}</h2>
           <p className="text-zinc-500 font-bold text-xs uppercase tracking-[0.4em]">דאשבורד ניהולי ומפת דרייברים</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
           <button onClick={onBack} className="flex-grow md:flex-none bg-zinc-900 text-zinc-500 px-8 py-4 rounded-2xl font-black border border-zinc-800 hover:text-white transition-all">חזרה</button>
           <button onClick={handleAnalyze} disabled={loading} className={`flex-grow md:flex-none px-10 py-4 rounded-2xl font-black transition-all ${loading ? 'bg-zinc-800 text-zinc-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl shadow-indigo-600/30 active:scale-95'}`}>
             {loading ? 'מנתח...' : '✨ ניתוח שורה תחתונה (AI)'}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        
        {/* RIGHT: DATA & RADAR (FACTS) */}
        <div className="lg:col-span-7 space-y-10 order-1 lg:order-2">
          
          {/* OUTCOME SCORE - RESPONSIVE SIZE */}
          <div className="bg-[#09090b] rounded-[3rem] p-8 md:p-12 border border-white/5 shadow-3xl flex flex-col md:flex-row justify-between items-center gap-6 overflow-hidden relative group">
             <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full"></div>
             
             <div className="space-y-4 relative z-10 text-right w-full md:w-auto">
                <h3 className="text-2xl md:text-3xl font-black text-white">בריאות הממשק (Outcome)</h3>
                <p className="text-zinc-500 text-sm md:text-base max-w-sm leading-relaxed">
                   מדד משוקלל המבטא אפקטיביות ושביעות רצון.
                </p>
                {analysisSummary.biggestGap && (
                   <div className="inline-flex items-center gap-2 bg-rose-500/10 text-rose-400 px-4 py-2 rounded-xl border border-rose-500/20 text-xs font-black animate-pulse">
                      <span>🚨 פער תפיסה משמעותי: {analysisSummary.biggestGap.label}</span>
                   </div>
                )}
             </div>

             <div className="relative z-10 flex flex-col items-center justify-center">
                <span className="text-8xl md:text-[10rem] font-black text-white leading-none tracking-tighter tabular-nums drop-shadow-2xl">
                  {analysisSummary.satisfactionScore}%
                </span>
             </div>
          </div>

          {/* RADAR CHART */}
          <div className="bg-[#09090b] rounded-[3.5rem] p-8 md:p-12 border border-white/5 shadow-3xl min-h-[500px] md:h-[600px]">
             <h3 className="text-xl md:text-2xl font-black text-white mb-8 border-r-4 border-indigo-500 pr-5">מיפוי דרייברים אסטרטגיים</h3>
             <ResponsiveContainer width="100%" height="85%">
                <RadarChart data={analysisSummary.driverData}>
                  <PolarGrid stroke="#1a1a1e" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 13, fontWeight: 900 }} />
                  <PolarRadiusAxis domain={[0, 7]} tick={false} axisLine={false} />
                  <Radar name="ממוצע" dataKey="כולל" stroke="#52525b" fill="#52525b" fillOpacity={0.03} strokeWidth={2} strokeDasharray="5 5" />
                  {session.sides.map((side, idx) => (
                    <Radar key={side} name={side} dataKey={side} stroke={SIDE_COLORS[idx % SIDE_COLORS.length]} fill={SIDE_COLORS[idx % SIDE_COLORS.length]} fillOpacity={0.1} strokeWidth={4} />
                  ))}
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '30px' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #1a1a1e', borderRadius: '15px', color: '#fff', textAlign: 'right' }} />
                </RadarChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* LEFT: STRATEGIC SIDEBAR (AI Insights) */}
        <div className="lg:col-span-5 space-y-8 order-2 lg:order-1 sticky top-28">
          
          <div className="min-h-[600px] flex flex-col">
            {!session.analysis ? (
              <div className="bg-[#09090b] rounded-[3.5rem] p-16 border-dashed border-2 border-zinc-800/50 text-center flex flex-col items-center justify-center flex-grow space-y-8 opacity-50 group hover:border-indigo-500/30 transition-all">
                 <div className="w-24 h-24 bg-zinc-900 rounded-[2rem] flex items-center justify-center text-5xl grayscale group-hover:grayscale-0 transition-all">🧠</div>
                 <div className="space-y-4">
                    <h3 className="text-xl font-black text-white">ממתין לניתוח שורה תחתונה</h3>
                    <p className="text-zinc-500 text-sm max-w-xs mx-auto leading-relaxed">
                       לחץ על הכפתור למעלה כדי לתרגם את הנתונים לתובנות ניהוליות וצעדי עבודה קונקרטיים.
                    </p>
                 </div>
              </div>
            ) : (
              <div className="space-y-8 animate-slideDown">
                
                {/* AI SUMMARY BOX */}
                <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white shadow-4xl relative overflow-hidden group">
                   <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 blur-3xl rounded-full"></div>
                   <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                      אבחון ניהולי מהיר
                   </h3>
                   <p className="text-xl md:text-2xl font-black leading-tight relative z-10">{session.analysis.summary}</p>
                </div>

                {/* PRACTICAL RECOMMENDATIONS SECTION */}
                <div className="bg-[#0c0c0e] rounded-[3rem] p-8 md:p-10 border border-white/5 space-y-8">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-2xl shadow-xl shadow-indigo-500/20">🚀</div>
                      <h3 className="text-2xl font-black text-white">תכנית פעולה אופרטיבית</h3>
                   </div>

                   <div className="space-y-6">
                      {allRecs.map((rec, i) => (
                        <div key={i} className="space-y-4">
                           <div className="bg-zinc-900/40 p-6 rounded-3xl border border-zinc-800/50 flex flex-col md:flex-row justify-between items-center gap-6 group hover:border-indigo-500/40 transition-all">
                              <p className="text-base md:text-lg font-bold text-zinc-100 flex-grow leading-snug">{rec}</p>
                              <button 
                                onClick={() => handleExpandRec(rec)}
                                disabled={expandingRec === rec}
                                className={`shrink-0 w-full md:w-auto px-6 py-3 rounded-2xl text-[11px] font-black transition-all ${expandedSteps[rec] ? 'bg-zinc-800 text-zinc-600' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white'}`}
                              >
                                {expandingRec === rec ? 'מעבד...' : expandedSteps[rec] ? 'צעדים מוכנים' : 'איך מבצעים?'}
                              </button>
                           </div>
                           
                           {/* DRILL-DOWN ACTION STEPS */}
                           {expandedSteps[rec] && (
                             <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-[2rem] p-8 space-y-5 animate-slideDown shadow-inner">
                                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest border-b border-indigo-500/10 pb-2 inline-block">צעדים קונקרטיים בשטח:</h4>
                                <div className="space-y-4">
                                   {expandedSteps[rec].map((step, idx) => (
                                     <div key={idx} className="flex gap-4 items-start">
                                        <span className="w-7 h-7 bg-indigo-500 text-white rounded-xl flex items-center justify-center text-xs font-black shrink-0 shadow-lg">{idx+1}</span>
                                        <p className="text-sm md:text-base font-bold text-zinc-300 leading-relaxed">{step}</p>
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
