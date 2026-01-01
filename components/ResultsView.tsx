
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

  // 1. Prepare Aggregated Data for both Chart and AI
  const analysisSummary = useMemo(() => {
    if (!session.questions) return { driverData: [], satisfactionScore: 0, biggestGap: null };
    
    const driverQs = session.questions.filter(q => q.shortLabel !== 'OUTCOME_SATISFACTION');
    const outcomeQs = session.questions.filter(q => q.shortLabel === 'OUTCOME_SATISFACTION');
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
        if (r.scores[q.id]) { sTotal += r.scores[q.id]; sCount++; }
      });
    });
    const satisfactionScore = sCount > 0 ? Number(((sTotal / sCount) / 7 * 100).toFixed(0)) : 0;

    return { driverData, satisfactionScore, biggestGap: maxGapValue > 1 ? { label: gapLabel, value: maxGapValue } : null };
  }, [session]);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      // Pass the already calculated summary to AI for "higher level" thinking
      const result = await analyzePartnership(session, analysisSummary);
      onUpdate({ ...session, analysis: result });
    } catch (e: any) {
      alert(e.message || "חלה שגיאה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-32 max-w-[1650px] mx-auto px-4 text-right" dir="rtl">
      
      {/* HEADER: Minimalist & Clean */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-zinc-900 pb-6">
        <div className="flex gap-5 items-center">
           <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-3xl shadow-lg">🎯</div>
           <div>
              <h2 className="text-3xl md:text-4xl font-black text-white">{session.title}</h2>
              <p className="text-zinc-500 font-bold text-sm">ניתוח דאטה ואסטרטגיית ממשק</p>
           </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
           <button onClick={onBack} className="flex-1 md:flex-none bg-zinc-900 text-zinc-400 px-6 py-3 rounded-xl font-bold border border-zinc-800 hover:text-white transition-all">חזרה</button>
           <button 
             onClick={handleAnalyze}
             disabled={loading || session.responses.length < 1}
             className={`flex-1 md:flex-none px-8 py-3 rounded-xl font-black transition-all ${loading ? 'bg-zinc-800 text-zinc-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/20'}`}
           >
             {loading ? 'יוצר תובנות עומק...' : '✨ ניתוח פרגמטי (AI)'}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* RIGHT: DATA ANALYSIS (The Facts) */}
        <div className="lg:col-span-7 space-y-6 order-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="md:col-span-2 glass rounded-[2.5rem] p-8 border-white/5 shadow-xl min-h-[180px] flex flex-col justify-between">
                <div>
                   <h3 className="text-lg font-black text-white">מדד שביעות רצון (Outcome)</h3>
                   <p className="text-zinc-500 text-xs font-bold">המשתנה התלוי - בסיס הניתוח</p>
                </div>
                <div className="mt-6 flex items-end justify-between">
                   <span className="text-6xl font-black text-white tabular-nums">{analysisSummary.satisfactionScore}%</span>
                   <div className="w-2/3 h-3 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                      <div className={`h-full transition-all duration-1000 ${analysisSummary.satisfactionScore > 75 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${analysisSummary.satisfactionScore}%` }}></div>
                   </div>
                </div>
             </div>

             <div className="glass rounded-[2.5rem] p-8 text-center border-white/5 flex flex-col items-center justify-center">
                {analysisSummary.biggestGap ? (
                  <>
                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2">פער תפיסה קריטי</span>
                    <h4 className="text-xl font-black text-white">{analysisSummary.biggestGap.label}</h4>
                    <p className="text-2xl font-black text-rose-400">+{analysisSummary.biggestGap.value}</p>
                  </>
                ) : (
                  <div className="text-emerald-500 font-black">הלימה מלאה ✅</div>
                )}
             </div>
          </div>

          <div className="glass rounded-[3rem] p-8 md:p-10 border-white/5 shadow-2xl">
            <h3 className="text-xl font-black text-white mb-8 border-r-4 border-indigo-500 pr-3">מפת הדרייברים (Drivers Map)</h3>
            <div className="h-[450px]">
               <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={analysisSummary.driverData}>
                    <PolarGrid stroke="#27272a" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 13, fontWeight: 900 }} />
                    <PolarRadiusAxis domain={[0, 7]} tick={false} axisLine={false} />
                    <Radar name="ממוצע כולל" dataKey="כולל" stroke={INCLUSIVE_COLOR} fill={INCLUSIVE_COLOR} fillOpacity={0.05} strokeWidth={2} strokeDasharray="5 5" />
                    {session.sides.map((side, idx) => (
                      <Radar key={side} name={side} dataKey={side} stroke={SIDE_COLORS[idx % SIDE_COLORS.length]} fill={SIDE_COLORS[idx % SIDE_COLORS.length]} fillOpacity={0.15} strokeWidth={4} />
                    ))}
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '30px' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', textAlign: 'right' }} />
                  </RadarChart>
               </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* LEFT: PRAGMATIC AI INSIGHTS (The Wisdom) */}
        <div className="lg:col-span-5 space-y-6 order-2">
          {!session.analysis ? (
            <div className="glass rounded-[3rem] p-12 text-center border-dashed border-2 border-zinc-800 opacity-60">
               <div className="text-4xl mb-6">🧠</div>
               <h3 className="text-xl font-black text-white mb-4">ממתין לניתוח אסטרטגי</h3>
               <p className="text-zinc-500 text-sm leading-relaxed">ה-AI ינתח את הגרפים מימין ויזהה את מקדם ההשפעה המרכזי שחוסם את העלייה בשביעות הרצון.</p>
            </div>
          ) : (
            <div className="space-y-6 animate-slideDown">
              <div className="glass rounded-[2.5rem] p-8 border-indigo-500/30 bg-indigo-500/5 relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-24 h-24 bg-indigo-500/10 blur-3xl rounded-full"></div>
                 <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">השורה התחתונה (Summary)</h3>
                 <p className="text-lg font-bold text-white leading-relaxed relative z-10">{session.analysis.summary}</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                 <div className="glass rounded-[2rem] p-6 border-zinc-800 space-y-4">
                    <h4 className="text-sm font-black text-emerald-400 uppercase flex items-center gap-2">
                       <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                       חוזקות שיש למנף
                    </h4>
                    <div className="flex flex-wrap gap-2">
                       {[...session.analysis.strengths.systemic, ...session.analysis.strengths.relational].map((s, i) => (
                         <span key={i} className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-3 py-1.5 rounded-xl text-xs font-bold">{s}</span>
                       ))}
                    </div>
                 </div>

                 <div className="glass rounded-[2rem] p-6 border-zinc-800 space-y-4">
                    <h4 className="text-sm font-black text-rose-400 uppercase flex items-center gap-2">
                       <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                       חסמים מבניים (Weaknesses)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                       {[...session.analysis.weaknesses.systemic, ...session.analysis.weaknesses.relational].map((w, i) => (
                         <span key={i} className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-3 py-1.5 rounded-xl text-xs font-bold">{w}</span>
                       ))}
                    </div>
                 </div>
              </div>

              <div className="glass rounded-[2.5rem] p-8 border-indigo-500/20 space-y-6">
                 <h3 className="text-xl font-black text-white">תוכנית פעולה אופרטיבית</h3>
                 <div className="space-y-4">
                    {[...session.analysis.recommendations.systemic, ...session.analysis.recommendations.relational].map((rec, idx) => (
                      <div key={idx} className="bg-zinc-950 p-5 rounded-2xl border border-zinc-900 flex gap-4 items-start hover:border-indigo-500/40 transition-all group">
                        <span className="bg-indigo-600 text-white w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 mt-0.5 shadow-lg group-hover:scale-110 transition-transform">{idx+1}</span>
                        <p className="text-sm font-bold text-zinc-200 leading-relaxed">{rec}</p>
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
