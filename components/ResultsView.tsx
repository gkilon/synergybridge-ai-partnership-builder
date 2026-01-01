
import React, { useState, useMemo } from 'react';
import { PartnershipSession, AIAnalysis, Category } from '../types';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, Legend, Tooltip 
} from 'recharts';
import { analyzePartnership } from '../services/geminiService';

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

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const result = await analyzePartnership(session);
      onUpdate({ ...session, analysis: result });
    } catch (e: any) {
      alert(e.message || "חלה שגיאה בחיבור ל-AI");
    } finally {
      setLoading(false);
    }
  };

  const { driverData, satisfactionScore, biggestGap } = useMemo(() => {
    if (!session.questions) return { driverData: [], satisfactionScore: 0, biggestGap: null };
    
    const driverQs = session.questions.filter(q => q.shortLabel !== 'OUTCOME_SATISFACTION');
    const outcomeQs = session.questions.filter(q => q.shortLabel === 'OUTCOME_SATISFACTION');
    const groups = Array.from(new Set(driverQs.map(q => q.shortLabel || 'כללי')));
    
    let maxGapValue = -1;
    let gapLabel = '';

    const chartData = groups.map(label => {
      const dataPoint: any = { subject: label };
      const relatedQs = driverQs.filter(q => q.shortLabel === label);
      let allSidesTotal = 0;
      let allSidesCount = 0;
      const sideAverages: number[] = [];

      session.sides.forEach(side => {
        const sideResponses = session.responses.filter(r => r.side === side);
        let sideTotal = 0, sideCount = 0;
        
        sideResponses.forEach(r => {
          relatedQs.forEach(q => {
            if (r.scores[q.id]) { 
              sideTotal += r.scores[q.id]; sideCount++; 
              allSidesTotal += r.scores[q.id]; allSidesCount++;
            }
          });
        });
        
        const avg = sideCount > 0 ? Number((sideTotal / sideCount).toFixed(1)) : 0;
        dataPoint[side] = avg;
        sideAverages.push(avg);
      });

      // Calculate Gap for this label
      if (sideAverages.length >= 2) {
        const gap = Math.abs(Math.max(...sideAverages) - Math.min(...sideAverages));
        if (gap > maxGapValue) {
          maxGapValue = gap;
          gapLabel = label;
        }
      }

      dataPoint['כולל'] = allSidesCount > 0 ? Number((allSidesTotal / allSidesCount).toFixed(1)) : 0;
      return dataPoint;
    });

    let sTotal = 0, sCount = 0;
    session.responses.forEach(r => {
      outcomeQs.forEach(q => {
        if (r.scores[q.id]) { sTotal += r.scores[q.id]; sCount++; }
      });
    });
    const finalSatisfaction = sCount > 0 ? Number(((sTotal / sCount) / 7 * 100).toFixed(0)) : 0;

    return { 
      driverData: chartData, 
      satisfactionScore: finalSatisfaction,
      biggestGap: maxGapValue > 1 ? { label: gapLabel, value: maxGapValue } : null
    };
  }, [session]);

  return (
    <div className="space-y-8 animate-fadeIn pb-32 max-w-[1600px] mx-auto px-4 text-right" dir="rtl">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6 border-b border-zinc-900 pb-8">
        <div className="flex gap-6 items-center">
           <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col items-center justify-center shadow-xl">
              <span className="text-3xl">🤝</span>
              <span className="text-lg font-black text-indigo-400">{session.responses.length}</span>
           </div>
           <div>
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter">{session.title}</h2>
              <p className="text-zinc-500 font-bold">ניתוח דאטה ותובנות בינה מלאכותית</p>
           </div>
        </div>
        <div className="flex gap-3 w-full lg:w-auto">
           <button onClick={onBack} className="flex-1 lg:flex-none bg-zinc-900 text-zinc-500 px-6 py-4 rounded-xl font-bold border border-zinc-800 hover:text-white transition-all">חזרה</button>
           <button 
             onClick={handleAnalyze}
             disabled={loading || session.responses.length < 1}
             className={`flex-1 lg:flex-none px-8 py-4 rounded-xl font-black shadow-2xl transition-all active:scale-95 ${loading ? 'bg-zinc-800 text-zinc-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'}`}
           >
             {loading ? 'מנתח...' : '✨ הפק דו"ח AI אסטרטגי'}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: AI INSIGHTS (1/3 or 5/12) */}
        <div className="lg:col-span-5 space-y-6 order-2 lg:order-1">
          {!session.analysis ? (
            <div className="glass rounded-[2.5rem] p-10 text-center border-dashed border-2 border-zinc-800">
               <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">🧠</div>
               <h3 className="text-xl font-black text-white mb-2">ממתין לניתוח אסטרטגי</h3>
               <p className="text-zinc-500 text-sm font-medium">הקלק על כפתור "הפק דו"ח AI" למעלה כדי לקבל תובנות עמוקות, חוזקות, חולשות והמלצות אופרטיביות.</p>
            </div>
          ) : (
            <div className="space-y-6 animate-slideDown">
              {/* Summary Card */}
              <div className="glass rounded-[2.5rem] p-8 border-indigo-500/30 bg-indigo-500/5 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full"></div>
                 <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4">תמונת מצב אסטרטגית</h3>
                 <p className="text-xl font-bold text-white leading-relaxed relative z-10">{session.analysis.summary}</p>
              </div>

              {/* Strengths & Weaknesses Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="glass rounded-[2rem] p-6 border-emerald-500/20 space-y-4">
                    <h4 className="text-sm font-black text-emerald-400 uppercase flex items-center gap-2">
                       <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                       חוזקות מרכזיות
                    </h4>
                    <ul className="space-y-3">
                       {[...session.analysis.strengths.systemic, ...session.analysis.strengths.relational].slice(0, 4).map((s, i) => (
                         <li key={i} className="text-xs font-bold text-zinc-300 flex gap-2">
                            <span className="text-emerald-500">✓</span> {s}
                         </li>
                       ))}
                    </ul>
                 </div>
                 <div className="glass rounded-[2rem] p-6 border-rose-500/20 space-y-4">
                    <h4 className="text-sm font-black text-rose-400 uppercase flex items-center gap-2">
                       <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                       נקודות תורפה
                    </h4>
                    <ul className="space-y-3">
                       {[...session.analysis.weaknesses.systemic, ...session.analysis.weaknesses.relational].slice(0, 4).map((w, i) => (
                         <li key={i} className="text-xs font-bold text-zinc-300 flex gap-2">
                            <span className="text-rose-500">!</span> {w}
                         </li>
                       ))}
                    </ul>
                 </div>
              </div>

              {/* Recommendations */}
              <div className="glass rounded-[2.5rem] p-8 border-zinc-800 space-y-6">
                 <h3 className="text-lg font-black text-white border-r-4 border-indigo-500 pr-3">המלצות לפעולה מידית</h3>
                 <div className="space-y-4">
                    {[...session.analysis.recommendations.systemic, ...session.analysis.recommendations.relational].map((rec, idx) => (
                      <div key={idx} className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 flex gap-4 items-start group hover:border-indigo-500/40 transition-all">
                        <span className="bg-indigo-500 text-white w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 mt-1">{idx+1}</span>
                        <p className="text-sm font-bold text-zinc-200">{rec}</p>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: VISUALIZATIONS (2/3 or 7/12) */}
        <div className="lg:col-span-7 space-y-6 order-1 lg:order-2">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {/* Outcome Score Card */}
             <div className="md:col-span-2 glass rounded-[2.5rem] p-8 flex flex-col justify-between border-white/5 h-full min-h-[220px]">
                <div className="flex justify-between items-start">
                   <div>
                      <h3 className="text-xl font-black text-white">מדד המטרה (Outcome)</h3>
                      <p className="text-zinc-500 text-xs font-bold">שביעות רצון ואפקטיביות מצטברת</p>
                   </div>
                   <span className={`px-4 py-1 rounded-lg text-[10px] font-black uppercase ${satisfactionScore > 70 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                      {satisfactionScore > 70 ? 'בריאות טובה' : 'צורך בשיפור'}
                   </span>
                </div>
                <div className="mt-8">
                   <div className="flex justify-between items-end mb-2">
                      <span className="text-6xl font-black text-white tabular-nums">{satisfactionScore}%</span>
                   </div>
                   <div className="h-4 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 p-0.5">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${satisfactionScore > 75 ? 'bg-emerald-500' : satisfactionScore > 50 ? 'bg-indigo-500' : 'bg-rose-500'}`} 
                        style={{ width: `${satisfactionScore}%` }}
                      ></div>
                   </div>
                </div>
             </div>

             {/* Gap Highlight Card */}
             <div className="glass rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center border-white/5 h-full">
                {biggestGap ? (
                  <>
                    <span className="text-xs font-black text-rose-500 uppercase tracking-widest mb-2">פער תפיסה מקסימלי</span>
                    <h4 className="text-2xl font-black text-white mb-1">{biggestGap.label}</h4>
                    <p className="text-3xl font-black text-rose-400">{biggestGap.value} <span className="text-sm">נק'</span></p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-4">✓</div>
                    <p className="text-sm font-bold text-zinc-400">הלימה גבוהה בין הצדדים</p>
                  </>
                )}
             </div>
          </div>

          {/* Spider Diagram Container */}
          <div className="glass rounded-[3rem] p-8 md:p-12 border-white/5 shadow-2xl relative">
            <div className="flex justify-between items-center mb-10">
               <div>
                  <h3 className="text-2xl font-black text-white">מפת התנאים (Drivers)</h3>
                  <p className="text-zinc-500 font-bold text-sm">השוואת עמודי התווך של השותפות</p>
               </div>
            </div>
            
            <div className="h-[450px] md:h-[550px]">
               <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={driverData}>
                    <PolarGrid stroke="#27272a" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 13, fontWeight: 900 }} />
                    <PolarRadiusAxis domain={[0, 7]} tick={false} axisLine={false} />
                    
                    <Radar name="ממוצע כולל" dataKey="כולל" stroke={INCLUSIVE_COLOR} fill={INCLUSIVE_COLOR} fillOpacity={0.05} strokeWidth={2} strokeDasharray="5 5" />
                    
                    {session.sides.map((side, idx) => (
                      <Radar key={side} name={side} dataKey={side} stroke={SIDE_COLORS[idx % SIDE_COLORS.length]} fill={SIDE_COLORS[idx % SIDE_COLORS.length]} fillOpacity={0.15} strokeWidth={4} />
                    ))}
                    
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '16px', fontWeight: 'bold', textAlign: 'right' }} 
                      itemStyle={{ color: '#fff' }}
                    />
                  </RadarChart>
               </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}; 

export default ResultsView;
