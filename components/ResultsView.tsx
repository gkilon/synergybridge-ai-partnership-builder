
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
      alert(e.message || "ניתוח ה-AI נכשל.");
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
    <div className="space-y-6 md:space-y-12 animate-fadeIn pb-32 max-w-[1700px] mx-auto px-2 md:px-4 text-right" dir="rtl">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-zinc-900 pb-6 md:pb-10">
        <div className="space-y-1">
           <h2 className="text-2xl md:text-5xl font-black text-white tracking-tighter leading-tight">{session.title}</h2>
           <p className="text-zinc-500 font-bold text-[9px] md:text-xs uppercase tracking-widest md:tracking-[0.4em]">דאשבורד ניהולי ומפת דרייברים</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
           <button onClick={onBack} className="flex-1 md:flex-none bg-zinc-900 text-zinc-500 px-6 py-3 rounded-xl font-black border border-zinc-800 text-sm md:text-base">חזרה</button>
           <button 
             onClick={handleAnalyze} 
             disabled={loading} 
             className={`flex-[2] md:flex-none px-6 py-3 rounded-xl font-black transition-all text-sm md:text-base ${loading ? 'bg-zinc-800 text-zinc-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/30'}`}
           >
             {loading ? 'מנתח...' : '✨ ניתוח AI'}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
        
        {/* RIGHT: DATA */}
        <div className="lg:col-span-7 space-y-6 md:order-2">
          
          {/* OUTCOME SCORE */}
          <div className="bg-[#09090b] rounded-[2rem] p-6 md:p-12 border border-white/5 shadow-3xl flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full"></div>
             <div className="relative z-10 text-right w-full md:w-auto">
                <h3 className="text-lg md:text-3xl font-black text-white mb-2">בריאות הממשק</h3>
                {analysisSummary.biggestGap && (
                   <div className="inline-flex bg-rose-500/10 text-rose-400 px-3 py-1 rounded-lg border border-rose-500/20 text-[10px] font-black">
                      🚨 פער בדרייבר: {analysisSummary.biggestGap.label}
                   </div>
                )}
             </div>
             <div className="relative z-10">
                <span className="text-6xl md:text-[9rem] font-black text-white leading-none tracking-tighter drop-shadow-2xl">
                  {analysisSummary.satisfactionScore}%
                </span>
             </div>
          </div>

          {/* RADAR CHART */}
          <div className="bg-[#09090b] rounded-[2rem] p-4 md:p-12 border border-white/5 shadow-3xl min-h-[350px] md:min-h-[600px] flex flex-col">
             <h3 className="text-lg md:text-2xl font-black text-white mb-4 md:mb-8 border-r-4 border-indigo-500 pr-4">דרייברים אסטרטגיים</h3>
             <div className="flex-grow w-full aspect-square md:aspect-auto">
               <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={analysisSummary.driverData}>
                    <PolarGrid stroke="#1a1a1e" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 10, fontWeight: 800 }} />
                    <PolarRadiusAxis domain={[0, 7]} tick={false} axisLine={false} />
                    <Radar name="ממוצע" dataKey="כולל" stroke="#52525b" fill="#52525b" fillOpacity={0.03} strokeWidth={1} strokeDasharray="3 3" />
                    {session.sides.map((side, idx) => (
                      <Radar key={side} name={side} dataKey={side} stroke={SIDE_COLORS[idx % SIDE_COLORS.length]} fill={SIDE_COLORS[idx % SIDE_COLORS.length]} fillOpacity={0.1} strokeWidth={3} />
                    ))}
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #1a1a1e', borderRadius: '12px', fontSize: '12px' }} />
                  </RadarChart>
               </ResponsiveContainer>
             </div>
          </div>
        </div>

        {/* LEFT: AI INSIGHTS */}
        <div className="lg:col-span-5 space-y-6 md:order-1 lg:sticky lg:top-28">
          {!session.analysis ? (
            <div className="bg-[#09090b] rounded-[2rem] p-12 border-dashed border-2 border-zinc-800/50 text-center opacity-40">
               <p className="text-sm font-bold text-zinc-500">הרץ ניתוח לקבלת תובנות אופרטיביות</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-indigo-600 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden">
                 <h3 className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-2">אבחון ניהולי</h3>
                 <p className="text-lg md:text-xl font-black leading-tight relative z-10">{session.analysis.summary}</p>
              </div>

              <div className="bg-[#0c0c0e] rounded-[2rem] p-6 md:p-10 border border-white/5 space-y-6">
                 <h3 className="text-xl font-black text-white flex items-center gap-3">
                    <span className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-base">🚀</span>
                    צעדים לביצוע
                 </h3>
                 <div className="space-y-4">
                    {allRecs.map((rec, i) => (
                      <div key={i} className="space-y-3">
                         <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4">
                            <p className="text-sm md:text-base font-bold text-zinc-100 flex-grow">{rec}</p>
                            <button 
                              onClick={() => handleExpandRec(rec)}
                              disabled={expandingRec === rec}
                              className={`w-full md:w-auto px-4 py-2 rounded-xl text-[10px] font-black transition-all ${expandedSteps[rec] ? 'bg-zinc-800 text-zinc-600' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}`}
                            >
                              {expandingRec === rec ? 'מעבד...' : expandedSteps[rec] ? 'צעדים מוכנים' : 'איך מבצעים?'}
                            </button>
                         </div>
                         {expandedSteps[rec] && (
                           <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-6 space-y-3 animate-slideDown">
                              {expandedSteps[rec].map((step, idx) => (
                                <div key={idx} className="flex gap-3 items-start">
                                   <span className="w-5 h-5 bg-indigo-500 text-white rounded-lg flex items-center justify-center text-[10px] font-black shrink-0">{idx+1}</span>
                                   <p className="text-xs md:text-sm font-bold text-zinc-300 leading-relaxed">{step}</p>
                                </div>
                              ))}
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
  );
}; 

export default ResultsView;
