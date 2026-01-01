
import React, { useState, useMemo } from 'react';
import { PartnershipSession, AIAnalysis, Category } from '../types';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, Legend, Tooltip 
} from 'recharts';
import { analyzePartnership } from '../services/geminiService';
import { DEFAULT_QUESTIONS } from '../constants';

interface Props {
  session: PartnershipSession | undefined;
  onUpdate: (updated: PartnershipSession) => void;
  onBack: () => void;
}

const SIDE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
const INCLUSIVE_COLOR = '#71717a'; 

const ResultsView: React.FC<Props> = ({ session, onUpdate, onBack }) => {
  const [loading, setLoading] = useState(false);

  if (!session) return null;

  // 1. Triple-Fallback Aggregation Logic for Outcomes & Drivers
  const analysisSummary = useMemo(() => {
    const questions = (session.questions && session.questions.length > 0) ? session.questions : DEFAULT_QUESTIONS;
    
    // Identification logic for Outcome questions (The Satisfaction Score)
    const isOutcome = (q: any, index: number) => 
      q.shortLabel === 'OUTCOME_SATISFACTION' || 
      ['q23', 'q24'].includes(q.id) || 
      index >= questions.length - 2; // Fallback: last 2 questions

    const driverQs = questions.filter((q, i) => !isOutcome(q, i));
    const outcomeQs = questions.filter((q, i) => isOutcome(q, i));
    
    const groups = Array.from(new Set(driverQs.map(q => q.shortLabel || 'כללי')));
    let maxGapValue = -1;
    let gapLabel = '';

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
            if (val !== undefined && val !== null) { 
              sideTotal += Number(val); sideCount++; 
              allSidesTotal += Number(val); allSidesCount++;
            }
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

    // Score Calculation: Ensuring sCount > 0 and values are valid
    let sTotal = 0, sCount = 0;
    session.responses.forEach(r => {
      outcomeQs.forEach(q => {
        const score = r.scores[q.id];
        if (score !== undefined && score !== null && score !== 0) { 
          sTotal += Number(score); 
          sCount++; 
        }
      });
    });
    
    // Scale 1-7. If sCount is 0, score is 0.
    const satisfactionScore = sCount > 0 ? Math.round((sTotal / sCount) / 7 * 100) : 0;

    return { driverData, satisfactionScore, biggestGap: maxGapValue > 0.3 ? { label: gapLabel, value: maxGapValue } : null };
  }, [session]);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const result = await analyzePartnership(session, analysisSummary);
      onUpdate({ ...session, analysis: result });
    } catch (e: any) {
      alert(e.message || "חלה שגיאה בחיבור ל-AI");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 animate-fadeIn pb-32 max-w-[1800px] mx-auto px-4 text-right" dir="rtl">
      
      {/* HEADER: Ultra Minimalist */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-zinc-900 pb-10">
        <div className="space-y-2">
           <h2 className="text-5xl font-black text-white tracking-tighter">{session.title}</h2>
           <p className="text-zinc-500 font-bold text-xs uppercase tracking-[0.4em]">Strategic Intelligence Dashboard</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
           <button onClick={onBack} className="bg-zinc-900 text-zinc-400 px-10 py-4 rounded-2xl font-black border border-zinc-800 hover:text-white transition-all">חזרה</button>
           <button 
             onClick={handleAnalyze}
             disabled={loading || session.responses.length < 1}
             className={`px-12 py-4 rounded-2xl font-black transition-all ${loading ? 'bg-zinc-800 text-zinc-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl shadow-indigo-600/30 active:scale-95'}`}
           >
             {loading ? 'מבצע אבחון אסטרטגי...' : '✨ ניתוח "אקסטרה מייל" (AI)'}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* RIGHT SIDE: THE HARD DATA (Unaltered Facts) */}
        <div className="lg:col-span-7 space-y-10 order-1 lg:order-2">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             {/* OUTCOME CARD - BLACK THEME AS REQUESTED */}
             <div className="md:col-span-2 bg-[#09090b] rounded-[3rem] p-12 border border-white/5 shadow-3xl min-h-[350px] flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full"></div>
                
                <h3 className="text-3xl font-black text-white tracking-tight relative z-10">סטטוס הממשק (Outcome)</h3>
                
                <div className="flex flex-col items-end relative z-10">
                   <div className="flex items-baseline gap-4">
                      <span className="text-sm font-bold text-zinc-600 mb-2">שביעות רצון ואפקטיביות</span>
                      <span className="text-[10rem] font-black text-white tabular-nums leading-none tracking-tighter drop-shadow-2xl">
                        {analysisSummary.satisfactionScore}%
                      </span>
                   </div>
                   
                   <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden mt-4 border border-zinc-800/30">
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-1500 ease-out shadow-[0_0_20px_rgba(99,102,241,0.4)]" 
                        style={{ width: `${analysisSummary.satisfactionScore}%` }}
                      ></div>
                   </div>
                </div>

                <div className="mt-12 border-t border-zinc-800/40 pt-8 relative z-10">
                   <p className="text-zinc-500 text-base font-medium leading-relaxed max-w-2xl">
                      המדד משקלל את תחושת הערך, האפקטיביות והסיפוק של שני הצדדים. המטרה בניתוח ה-AI היא לזהות אילו מבין הדרייברים בגרף יניבו את הקפיצה הגדולה ביותר במדד זה.
                   </p>
                </div>
             </div>

             {/* GAP CARD */}
             <div className="bg-[#09090b] rounded-[3rem] p-10 text-center border border-white/5 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden">
                <div className="absolute bottom-0 left-0 w-full h-1 bg-rose-500/20"></div>
                {analysisSummary.biggestGap ? (
                  <>
                    <span className="text-[11px] font-black text-rose-500 uppercase tracking-widest mb-4">פער תפיסה מקסימלי</span>
                    <h4 className="text-2xl font-black text-white mb-2">{analysisSummary.biggestGap.label}</h4>
                    <p className="text-6xl font-black text-rose-400 tabular-nums">+{analysisSummary.biggestGap.value.toFixed(1)}</p>
                  </>
                ) : (
                  <div className="text-emerald-500 font-black text-xl space-y-4">
                    <div className="text-6xl">✅</div>
                    <div className="tracking-widest uppercase text-xs">Full Alignment</div>
                  </div>
                )}
             </div>
          </div>

          {/* RADAR CHART CARD */}
          <div className="bg-[#09090b] rounded-[4rem] p-12 md:p-16 border border-white/5 shadow-3xl">
            <div className="flex justify-between items-center mb-12">
               <h3 className="text-2xl font-black text-white border-r-4 border-indigo-500 pr-5">מפת הדרייברים (Drivers Map)</h3>
               <div className="flex gap-6 text-[11px] font-black text-zinc-600 uppercase tracking-widest">
                  <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full border border-zinc-700"></span> ממוצע כולל</span>
                  <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> צדדים</span>
               </div>
            </div>
            <div className="h-[550px]">
               <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={analysisSummary.driverData}>
                    <PolarGrid stroke="#1a1a1e" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 15, fontWeight: 900 }} />
                    <PolarRadiusAxis domain={[0, 7]} tick={false} axisLine={false} />
                    <Radar name="ממוצע כולל" dataKey="כולל" stroke={INCLUSIVE_COLOR} fill={INCLUSIVE_COLOR} fillOpacity={0.03} strokeWidth={2} strokeDasharray="6 6" />
                    {session.sides.map((side, idx) => (
                      <Radar key={side} name={side} dataKey={side} stroke={SIDE_COLORS[idx % SIDE_COLORS.length]} fill={SIDE_COLORS[idx % SIDE_COLORS.length]} fillOpacity={0.1} strokeWidth={5} />
                    ))}
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '50px' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #1a1a1e', borderRadius: '20px', textAlign: 'right', fontWeight: 'bold' }} />
                  </RadarChart>
               </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* LEFT SIDE: STRATEGIC SIDEBAR (AI Insights - The Extra Mile) */}
        <div className="lg:col-span-5 space-y-10 order-2 lg:order-1 sticky top-28">
          
          <div className="min-h-[700px] flex flex-col">
            {!session.analysis ? (
              <div className="bg-[#09090b] rounded-[4rem] p-16 text-center border-dashed border-2 border-zinc-800/50 flex flex-col items-center justify-center flex-grow space-y-10 group hover:border-indigo-500/30 transition-all">
                 <div className="w-28 h-28 bg-zinc-900 rounded-[2.5rem] flex items-center justify-center text-6xl grayscale opacity-20 group-hover:opacity-40 transition-all">📓</div>
                 <div className="space-y-4">
                    <h3 className="text-2xl font-black text-white">הסליפ האסטרטגי</h3>
                    <p className="text-zinc-600 text-base font-bold leading-relaxed max-w-xs mx-auto">כאן יתווסף ניתוח ה-AI שיעמיק מעבר למספרים, יזהה חסמים סמויים ויציע את ה"אקסטרה מייל" לשיפור הממשק.</p>
                 </div>
              </div>
            ) : (
              <div className="space-y-10 animate-slideDown">
                
                {/* STRATEGIC DIAGNOSIS - PRIMARY INSIGHT */}
                <div className="bg-indigo-600 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-4xl border border-white/10 group">
                   <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 blur-[60px] rounded-full"></div>
                   <h3 className="text-[11px] font-black text-indigo-100 uppercase tracking-[0.4em] mb-6 flex items-center gap-3">
                      <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></span>
                      האבחון המבני (Diagnosis)
                   </h3>
                   <p className="text-2xl font-black leading-snug relative z-10">{session.analysis.summary}</p>
                </div>

                {/* DYNAMICS: STRENGTHS & WEAKNESSES */}
                <div className="grid grid-cols-1 gap-6">
                   <div className="bg-[#09090b] rounded-[2.5rem] p-10 border border-emerald-500/10 space-y-6 shadow-xl">
                      <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-3">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                        חוזקות מבניות (Leverage Points)
                      </h4>
                      <div className="flex flex-wrap gap-2.5">
                         {[...session.analysis.strengths.systemic, ...session.analysis.strengths.relational].map((s, i) => (
                           <span key={i} className="bg-emerald-500/5 border border-emerald-500/10 text-emerald-400/80 px-4 py-2 rounded-2xl text-xs font-black">{s}</span>
                         ))}
                      </div>
                   </div>

                   <div className="bg-[#09090b] rounded-[2.5rem] p-10 border border-rose-500/10 space-y-6 shadow-xl">
                      <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-3">
                        <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                        חסמים מעכבים (Friction Points)
                      </h4>
                      <div className="flex flex-wrap gap-2.5">
                         {[...session.analysis.weaknesses.systemic, ...session.analysis.weaknesses.relational].map((w, i) => (
                           <span key={i} className="bg-rose-500/5 border border-rose-500/10 text-rose-400/80 px-4 py-2 rounded-2xl text-xs font-black">{w}</span>
                         ))}
                      </div>
                   </div>
                </div>

                {/* PRAGMATIC ACTIONS */}
                <div className="bg-[#0c0c0e] rounded-[3.5rem] p-12 border border-indigo-500/10 space-y-10 shadow-3xl">
                   <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-2xl shadow-xl shadow-indigo-500/30">⚡</div>
                      <h3 className="text-2xl font-black text-white">פעולות ה"אקסטרה מייל"</h3>
                   </div>
                   <div className="space-y-5">
                      {[...session.analysis.recommendations.systemic, ...session.analysis.recommendations.relational].map((rec, idx) => (
                        <div key={idx} className="bg-zinc-950/80 p-7 rounded-[2rem] border border-zinc-900 flex gap-6 items-start hover:border-indigo-500/30 transition-all group">
                          <span className="bg-indigo-600 text-white w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-black shrink-0 mt-0.5 shadow-lg group-hover:scale-110 transition-transform">{idx+1}</span>
                          <p className="text-base font-bold text-zinc-300 leading-relaxed">{rec}</p>
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
