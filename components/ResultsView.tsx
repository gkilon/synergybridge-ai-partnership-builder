
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

  // 1. Bulletproof Aggregation Logic
  const analysisSummary = useMemo(() => {
    const questions = (session.questions && session.questions.length > 0) ? session.questions : DEFAULT_QUESTIONS;
    
    const driverQs = questions.filter(q => q.shortLabel !== 'OUTCOME_SATISFACTION');
    // Flexible identification of Outcome questions
    const outcomeQs = questions.filter(q => 
      q.shortLabel === 'OUTCOME_SATISFACTION' || 
      q.id === 'q23' || 
      q.id === 'q24' || 
      q.text.includes('שביעות רצון') || 
      q.text.includes('אפקטיביות')
    );
    
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

    // Score Calculation: Ensuring we correctly find outcome questions and convert to Number
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
    
    // Scale is 1-7. (Sum / count / 7) * 100
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
    <div className="space-y-8 animate-fadeIn pb-32 max-w-[1750px] mx-auto px-4 text-right" dir="rtl">
      
      {/* HEADER: Modern & Strategic */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-zinc-900 pb-8">
        <div className="flex gap-5 items-center">
           <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-3xl shadow-2xl">🤝</div>
           <div>
              <h2 className="text-4xl font-black text-white tracking-tight">{session.title}</h2>
              <p className="text-zinc-500 font-bold text-xs uppercase tracking-[0.3em]">Intelligence Dashboard & Strategic AI</p>
           </div>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
           <button onClick={onBack} className="flex-1 md:flex-none bg-zinc-900 text-zinc-400 px-8 py-4 rounded-2xl font-black border border-zinc-800 hover:text-white transition-all">חזרה</button>
           <button 
             onClick={handleAnalyze}
             disabled={loading || session.responses.length < 1}
             className={`flex-1 md:flex-none px-10 py-4 rounded-2xl font-black transition-all ${loading ? 'bg-zinc-800 text-zinc-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl shadow-indigo-600/30 active:scale-95'}`}
           >
             {loading ? 'מייצר תובנות...' : '✨ ניתוח שורה תחתונה (AI)'}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        
        {/* RIGHT SIDE: THE FACTS (Existing Data) - 7 Columns */}
        <div className="lg:col-span-7 space-y-8 order-1 lg:order-2">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             {/* OUTCOME CARD - MATCHING YOUR IMAGE EXACTLY */}
             <div className="md:col-span-2 bg-[#0c0c0e] rounded-[2.5rem] p-12 border border-white/5 shadow-3xl min-h-[300px] flex flex-col justify-between relative overflow-hidden">
                <div className="flex justify-between items-start relative z-10">
                   <h3 className="text-3xl font-black text-white tracking-tight">סטטוס הממשק (Outcome)</h3>
                </div>
                
                <div className="mt-6 flex flex-col items-end relative z-10">
                   <div className="flex items-baseline gap-4">
                      <span className="text-sm font-bold text-zinc-600 mb-2">שביעות רצון ואפקטיביות</span>
                      <span className="text-9xl font-black text-white tabular-nums leading-none tracking-tighter">
                        {analysisSummary.satisfactionScore}%
                      </span>
                   </div>
                   
                   <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden mt-8 border border-zinc-800/50">
                      <div 
                        className={`h-full transition-all duration-1500 ease-out shadow-[0_0_15px_rgba(99,102,241,0.5)] ${analysisSummary.satisfactionScore > 75 ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                        style={{ width: `${analysisSummary.satisfactionScore}%` }}
                      ></div>
                   </div>
                </div>

                <div className="mt-10 border-t border-zinc-800/60 pt-8 relative z-10">
                   <p className="text-zinc-500 text-base font-medium leading-relaxed">
                      המדד משקלל את תחושת הערך, האפקטיביות והסיפוק של שני הצדדים. המטרה בניתוח ה-AI היא לזהות אילו מבין הדרייברים בגרף יניבו את הקפיצה הגדולה ביותר במדד זה.
                   </p>
                </div>
             </div>

             <div className="glass rounded-[2.5rem] p-10 text-center border-white/5 flex flex-col items-center justify-center shadow-2xl">
                {analysisSummary.biggestGap ? (
                  <>
                    <span className="text-[11px] font-black text-rose-500 uppercase tracking-widest mb-3">פער תפיסה מקסימלי</span>
                    <h4 className="text-2xl font-black text-white mb-2">{analysisSummary.biggestGap.label}</h4>
                    <p className="text-5xl font-black text-rose-400">+{analysisSummary.biggestGap.value.toFixed(1)}</p>
                  </>
                ) : (
                  <div className="text-emerald-500 font-black text-xl space-y-2">
                    <div className="text-4xl">✅</div>
                    <div>הלימה מלאה</div>
                  </div>
                )}
             </div>
          </div>

          <div className="glass rounded-[3.5rem] p-10 md:p-14 border-white/5 shadow-3xl">
            <div className="flex justify-between items-center mb-10">
               <h3 className="text-2xl font-black text-white border-r-4 border-indigo-500 pr-4">מפת הדרייברים (Drivers Map)</h3>
               <div className="flex gap-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                  <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full border border-zinc-500"></span> ממוצע כולל</span>
                  <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> צדדים</span>
               </div>
            </div>
            <div className="h-[500px]">
               <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={analysisSummary.driverData}>
                    <PolarGrid stroke="#1f1f23" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 14, fontWeight: 900 }} />
                    <PolarRadiusAxis domain={[0, 7]} tick={false} axisLine={false} />
                    <Radar name="ממוצע כולל" dataKey="כולל" stroke={INCLUSIVE_COLOR} fill={INCLUSIVE_COLOR} fillOpacity={0.05} strokeWidth={2} strokeDasharray="4 4" />
                    {session.sides.map((side, idx) => (
                      <Radar key={side} name={side} dataKey={side} stroke={SIDE_COLORS[idx % SIDE_COLORS.length]} fill={SIDE_COLORS[idx % SIDE_COLORS.length]} fillOpacity={0.12} strokeWidth={4} />
                    ))}
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '40px' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '16px', textAlign: 'right', fontWeight: 'bold' }} />
                  </RadarChart>
               </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* LEFT SIDE: STRATEGIC INSIGHTS (AI) - 5 Columns */}
        <div className="lg:col-span-5 space-y-8 order-2 lg:order-1 sticky top-28">
          
          <div className={`transition-all duration-700 transform ${!session.analysis ? 'opacity-40 scale-95' : 'opacity-100 scale-100'}`}>
            {!session.analysis ? (
              <div className="glass rounded-[3.5rem] p-16 text-center border-dashed border-2 border-zinc-800 flex flex-col items-center justify-center min-h-[600px] space-y-8">
                 <div className="w-24 h-24 bg-zinc-900 rounded-[2rem] flex items-center justify-center text-5xl grayscale opacity-30">🧠</div>
                 <div className="space-y-4">
                    <h3 className="text-2xl font-black text-white">ממתין לניתוח AI</h3>
                    <p className="text-zinc-500 text-base font-bold leading-relaxed max-w-xs mx-auto">לחץ על הכפתור למעלה כדי להפיק תובנות אסטרטגיות ופרקטיות על בסיס הנתונים.</p>
                 </div>
              </div>
            ) : (
              <div className="space-y-8 animate-slideDown">
                
                {/* AI SUMMARY - THE BOTTOM LINE */}
                <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-3xl group">
                   <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 blur-3xl rounded-full group-hover:bg-white/20 transition-all"></div>
                   <h3 className="text-[11px] font-black text-indigo-200 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
                      השורה התחתונה (The Bottom Line)
                   </h3>
                   <p className="text-2xl font-black leading-tight relative z-10">{session.analysis.summary}</p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                   <div className="glass rounded-[2.5rem] p-8 border-emerald-500/20 space-y-5 shadow-xl">
                      <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">חוזקות ליבה למנף</h4>
                      <div className="flex flex-wrap gap-2">
                         {[...session.analysis.strengths.systemic, ...session.analysis.strengths.relational].map((s, i) => (
                           <span key={i} className="bg-emerald-500/5 border border-emerald-500/20 text-emerald-300 px-4 py-2 rounded-2xl text-xs font-bold">{s}</span>
                         ))}
                      </div>
                   </div>

                   <div className="glass rounded-[2.5rem] p-8 border-rose-500/20 space-y-5 shadow-xl">
                      <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest">חסמים מבניים לטיפול</h4>
                      <div className="flex flex-wrap gap-2">
                         {[...session.analysis.weaknesses.systemic, ...session.analysis.weaknesses.relational].map((w, i) => (
                           <span key={i} className="bg-rose-500/5 border border-rose-500/20 text-rose-300 px-4 py-2 rounded-2xl text-xs font-bold">{w}</span>
                         ))}
                      </div>
                   </div>
                </div>

                {/* PRACTICAL RECOMMENDATIONS */}
                <div className="glass rounded-[3rem] p-10 border-indigo-500/10 space-y-8 shadow-3xl bg-zinc-950/30">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-indigo-500/20">💡</div>
                      <h3 className="text-2xl font-black text-white">תוכנית פעולה אופרטיבית</h3>
                   </div>
                   <div className="space-y-4">
                      {[...session.analysis.recommendations.systemic, ...session.analysis.recommendations.relational].map((rec, idx) => (
                        <div key={idx} className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800/50 flex gap-5 items-start hover:border-indigo-500/40 transition-all group cursor-default">
                          <span className="bg-indigo-600 text-white w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 mt-0.5 shadow-lg group-hover:scale-110 transition-transform">{idx+1}</span>
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
