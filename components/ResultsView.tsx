
import React, { useState, useMemo } from 'react';
import { PartnershipSession, AIAnalysis } from '../types';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, Legend, Tooltip 
} from 'recharts';
import { analyzePartnership, expandRecommendation } from '../services/geminiService';
import { DEFAULT_QUESTIONS } from '../constants';
import { Zap, Target, Activity, AlertCircle, CheckCircle2, FileText, LayoutDashboard, Sparkles, Users } from 'lucide-react';

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

  const stats = useMemo(() => {
    const questions = (session.questions && session.questions.length > 0) ? session.questions : DEFAULT_QUESTIONS;
    
    // זיהוי שאלות תוצאה (Outcome) - ציון הבריאות הכללי
    const outcomeIds = ['q23', 'q24'];
    const outcomeQs = questions.filter(q => outcomeIds.includes(q.id) || q.shortLabel === 'OUTCOME_SATISFACTION');
    const driverQs = questions.filter(q => !outcomeQs.find(oq => oq.id === q.id));
    
    // Senior Engineer Fix: Explicitly type groups as string[] to avoid 'unknown' type inference issues.
    const groups: string[] = Array.from(new Set(driverQs.map(q => q.shortLabel || 'כללי')));
    let maxGapValue = -1, gapLabel = '';

    const driverData = groups.map(label => {
      const dataPoint: any = { subject: label };
      const relatedQs = driverQs.filter(q => q.shortLabel === label);
      let allSidesTotal = 0, allSidesCount = 0;
      const sideAverages: number[] = [];

      session.sides.forEach(side => {
        const sideResponses = (session.responses || []).filter(r => r.side === side);
        let sideTotal = 0, sideCount = 0;
        
        sideResponses.forEach(r => {
          relatedQs.forEach(q => {
            const val = r.scores?.[q.id];
            if (val !== undefined && val !== null && !isNaN(Number(val)) && Number(val) > 0) { 
              sideTotal += Number(val); 
              sideCount++; 
              allSidesTotal += Number(val); 
              allSidesCount++; 
            }
          });
        });
        
        const avg = sideCount > 0 ? Number((sideTotal / sideCount).toFixed(1)) : 0;
        dataPoint[side] = avg;
        sideAverages.push(avg);
      });

      if (sideAverages.length >= 2) {
        const validAverages = sideAverages.filter(v => v > 0);
        if (validAverages.length >= 2) {
          const gap = Math.abs(Math.max(...validAverages) - Math.min(...validAverages));
          if (gap > maxGapValue) { maxGapValue = gap; gapLabel = label; }
        }
      }
      dataPoint['Avg'] = allSidesCount > 0 ? Number((allSidesTotal / allSidesCount).toFixed(1)) : 0;
      return dataPoint;
    });

    // חישוב ציון בריאות (Outcome Score)
    // נוסחה מדויקת: (ממוצע - 1) חלקי 6. כך ש-1 הופך ל-0% ו-7 הופך ל-100%.
    let sTotal = 0, sCount = 0;
    (session.responses || []).forEach(r => {
      outcomeQs.forEach(q => {
        const score = r.scores?.[q.id];
        if (score !== undefined && score !== null && !isNaN(Number(score)) && Number(score) > 0) { 
          sTotal += Number(score); 
          sCount++; 
        }
      });
    });

    const averageOutcome = sCount > 0 ? sTotal / sCount : 0;
    const satisfactionScore = sCount > 0 ? Math.round(((averageOutcome - 1) / 6) * 100) : null;

    return { 
      driverData, 
      satisfactionScore, 
      biggestGap: maxGapValue > 0.4 ? { label: gapLabel, value: maxGapValue.toFixed(1) } : null 
    };
  }, [session]);

  const handleAnalyze = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await analyzePartnership(session, stats);
      onUpdate({ ...session, analysis: result });
    } catch (e: any) {
      alert("הניתוח נכשל. בדוק את מפתח ה-API.");
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
      alert("נכשל בפירוט השלבים.");
    } finally {
      setExpandingRec(null);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-24 max-w-[1650px] mx-auto px-6" dir="rtl">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6 border-b border-zinc-900 pb-10">
        <div className="flex items-center gap-6 flex-row-reverse">
           <div className="text-right">
              <h2 className="text-4xl font-black text-white tracking-tighter leading-none">{session.title}</h2>
              <div className="flex items-center gap-2 justify-end mt-2">
                 <span className="text-indigo-500 font-bold text-[10px] uppercase tracking-[0.2em]">Dashboard Intelligence</span>
                 <div className="w-8 h-px bg-zinc-800"></div>
              </div>
           </div>
           <div className="w-16 h-16 bg-indigo-600 rounded-[1.8rem] flex items-center justify-center shadow-3xl shadow-indigo-600/40">
              <LayoutDashboard className="text-white" size={32} />
           </div>
        </div>

        <div className="flex gap-4">
           <button onClick={onBack} className="bg-zinc-900 text-zinc-400 px-10 py-4 rounded-2xl font-black border border-zinc-800 hover:text-white hover:bg-zinc-800 transition-all">חזרה</button>
           <button 
             onClick={handleAnalyze} 
             disabled={loading} 
             className={`px-12 py-4 rounded-2xl font-black transition-all flex items-center gap-3 ${loading ? 'bg-zinc-800 text-zinc-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl shadow-indigo-600/30 active:scale-95'}`}
           >
             {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <Sparkles size={20} />}
             {loading ? 'מנתח נתונים...' : 'הפעל ניתוח AI'}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start">
        
        {/* CENTER COLUMN (8 COLS) - CORE DATA VISUALIZATION */}
        <div className="xl:col-span-8 space-y-10">
          
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#0b0b0d] rounded-[2.5rem] p-10 border border-white/5 relative overflow-hidden text-right group shadow-xl">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[50px] rounded-full transition-all group-hover:bg-indigo-500/10"></div>
               <Activity className="text-indigo-500 mb-6" size={28} />
               <h3 className="text-zinc-500 text-[11px] font-black uppercase tracking-[0.2em] mb-1">מדד בריאות הממשק</h3>
               <div className="flex items-baseline gap-2 justify-end">
                  <span className="text-7xl font-black text-white tabular-nums tracking-tighter">
                    {stats.satisfactionScore !== null ? `${stats.satisfactionScore}%` : '---'}
                  </span>
               </div>
               <div className="mt-4 h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-1000 ease-out" 
                    style={{ width: stats.satisfactionScore !== null ? `${stats.satisfactionScore}%` : '0%' }}
                  ></div>
               </div>
            </div>

            <div className="bg-[#0b0b0d] rounded-[2.5rem] p-10 border border-white/5 text-right shadow-xl relative overflow-hidden group">
               <AlertCircle className="text-rose-500 mb-6" size={28} />
               <h3 className="text-zinc-500 text-[11px] font-black uppercase tracking-[0.2em] mb-1">פער תפיסה מקסימלי</h3>
               <div className="text-3xl font-black text-white leading-tight min-h-[3rem] flex items-center justify-end">
                  {stats.biggestGap ? stats.biggestGap.label : 'סנכרון מלא'}
               </div>
               <div className="mt-4 flex items-center justify-end gap-2">
                  <span className="text-[10px] font-black text-rose-500/80 uppercase">Impact Level:</span>
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${stats.biggestGap ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {stats.biggestGap ? 'Critical' : 'Healthy'}
                  </span>
               </div>
            </div>

            <div className="bg-[#0b0b0d] rounded-[2.5rem] p-10 border border-white/5 text-right shadow-xl group">
               <Users className="text-emerald-500 mb-6" size={28} />
               <h3 className="text-zinc-500 text-[11px] font-black uppercase tracking-[0.2em] mb-1">כמות מענים</h3>
               <div className="text-7xl font-black text-white tabular-nums tracking-tighter">{session.responses?.length || 0}</div>
               <p className="text-zinc-600 text-[10px] font-bold mt-4">מנהלים ועובדים שהשתתפו</p>
            </div>
          </div>

          {/* MAIN RADAR CHART CARD */}
          <div className="bg-[#0b0b0d] rounded-[3.5rem] p-12 border border-white/5 shadow-2xl min-h-[700px] flex flex-col relative overflow-hidden">
             <div className="flex items-center gap-4 justify-end mb-12 border-b border-zinc-900 pb-8">
                <div className="text-right">
                   <h3 className="text-3xl font-black text-white">מיפוי דרייברים אסטרטגיים</h3>
                   <p className="text-zinc-500 text-xs font-bold mt-1">ניתוח מעמיק של מנגנוני העבודה והיחסים</p>
                </div>
                <Target className="text-indigo-500" size={32} />
             </div>
             
             <div className="flex-grow w-full h-[500px]">
               <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={stats.driverData} margin={{ top: 20, right: 80, bottom: 20, left: 80 }}>
                    <PolarGrid stroke="#1a1a1e" strokeWidth={1} />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      tick={{ fill: '#71717a', fontSize: 13, fontWeight: 900 }}
                    />
                    <PolarRadiusAxis domain={[0, 7]} tick={false} axisLine={false} />
                    
                    {/* Background Average Shadow */}
                    <Radar 
                      name="ממוצע משולב" 
                      dataKey="Avg" 
                      stroke="#52525b" 
                      fill="#52525b" 
                      fillOpacity={0.03} 
                      strokeWidth={1} 
                      strokeDasharray="5 5" 
                    />

                    {session.sides.map((side, idx) => (
                      <Radar 
                        key={side} 
                        name={side} 
                        dataKey={side} 
                        stroke={SIDE_COLORS[idx % SIDE_COLORS.length]} 
                        fill={SIDE_COLORS[idx % SIDE_COLORS.length]} 
                        fillOpacity={0.15} 
                        strokeWidth={4} 
                      />
                    ))}
                    
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      wrapperStyle={{ paddingTop: '50px', fontSize: '12px', fontWeight: 800, color: '#a1a1aa' }} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#000', border: '1px solid #27272a', borderRadius: '16px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold' }} 
                      itemStyle={{ padding: '2px 0' }}
                    />
                  </RadarChart>
               </ResponsiveContainer>
             </div>
          </div>
        </div>

        {/* SIDEBAR (4 COLS) - AI ANALYTICS COLUMN */}
        <div className="xl:col-span-4 space-y-8 sticky top-32">
          <div className="bg-[#111114] rounded-[3rem] p-10 border border-indigo-500/10 shadow-3xl min-h-[850px] flex flex-col relative overflow-hidden">
             {/* Gradient Shine */}
             <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full"></div>
             
             <div className="flex items-center gap-4 justify-end mb-10 border-b border-zinc-800 pb-8">
                <div className="text-right">
                   <h3 className="text-2xl font-black text-white">אבחון וייעוץ AI</h3>
                   <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-1">Executive Insights</p>
                </div>
                <Sparkles className="text-indigo-500" size={24} />
             </div>

             {!session.analysis ? (
               <div className="flex-grow flex flex-col items-center justify-center text-center space-y-8 opacity-50 px-6">
                  <div className="w-24 h-24 bg-zinc-900 rounded-[2.5rem] flex items-center justify-center text-5xl shadow-inner">🧠</div>
                  <div className="space-y-4">
                     <p className="text-white text-xl font-black">ממתין להרצת הניתוח</p>
                     <p className="text-zinc-500 text-sm leading-relaxed font-medium">
                        לחץ על כפתור הניתוח בראש הדף כדי לחלץ תובנות אסטרטגיות וצעדי פעולה מבוססי AI.
                     </p>
                  </div>
               </div>
             ) : (
               <div className="space-y-12 animate-slideDown overflow-y-auto max-h-[1100px] custom-scrollbar pr-4 ml-[-1rem]">
                  
                  {/* AI SUMMARY BOX */}
                  <div className="bg-indigo-600 rounded-[2.2rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-indigo-600/30">
                     <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 blur-[50px] rounded-full"></div>
                     <h4 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-80 mb-6 text-right">אבחון ניהולי (AI)</h4>
                     <p className="text-xl font-black leading-tight text-right italic">"{session.analysis.summary}"</p>
                  </div>

                  {/* ACTIONABLE RECOMMENDATIONS */}
                  <div className="space-y-8">
                     <div className="flex items-center gap-3 justify-end px-2">
                        <h4 className="text-sm font-black text-zinc-400 uppercase tracking-[0.3em]">תוכנית עבודה מומלצת</h4>
                        <div className="w-8 h-8 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                           <Zap size={16} className="text-indigo-500" />
                        </div>
                     </div>
                     <div className="space-y-6">
                        {[...session.analysis.recommendations.systemic, ...session.analysis.recommendations.relational].map((rec, i) => (
                          <div key={i} className="group">
                             <div className="bg-zinc-900/40 p-6 rounded-[1.8rem] border border-zinc-800 flex flex-col gap-4 transition-all hover:border-indigo-500/40 hover:bg-zinc-900/60">
                                <p className="text-base font-bold text-zinc-100 text-right leading-relaxed">{rec}</p>
                                <button 
                                  onClick={() => handleExpandRec(rec)}
                                  className="self-end text-[10px] font-black text-indigo-400 hover:text-white transition-colors bg-indigo-500/5 px-4 py-2 rounded-lg border border-indigo-500/10"
                                >
                                  {expandingRec === rec ? 'מפרק לצעדים...' : expandedSteps[rec] ? '✓ צעדים מוכנים' : 'כיצד לבצע? ←'}
                                </button>
                             </div>
                             {expandedSteps[rec] && (
                               <div className="mr-6 border-r-2 border-indigo-500/30 pr-6 mt-4 space-y-4 animate-slideDown">
                                  {expandedSteps[rec].map((step, idx) => (
                                    <div key={idx} className="flex gap-4 items-start flex-row-reverse">
                                       <span className="w-5 h-5 bg-indigo-500/20 text-indigo-400 rounded flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">{idx+1}</span>
                                       <p className="text-[12px] text-zinc-400 text-right font-bold leading-relaxed">{step}</p>
                                    </div>
                                  ))}
                               </div>
                             )}
                          </div>
                        ))}
                     </div>
                  </div>

                  {/* SWOT STYLE GRID */}
                  <div className="grid grid-cols-1 gap-6">
                     <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[2rem] p-8">
                        <div className="flex items-center gap-3 justify-end mb-6">
                           <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">חוזקות לשימור</span>
                           <CheckCircle2 size={16} className="text-emerald-500" />
                        </div>
                        <ul className="space-y-4">
                           {[...session.analysis.strengths.systemic, ...session.analysis.strengths.relational].slice(0, 3).map((s, i) => (
                             <li key={i} className="text-[12px] text-zinc-300 text-right font-bold leading-tight">• {s}</li>
                           ))}
                        </ul>
                     </div>
                     <div className="bg-rose-500/5 border border-rose-500/10 rounded-[2rem] p-8">
                        <div className="flex items-center gap-3 justify-end mb-6">
                           <span className="text-rose-500 text-[10px] font-black uppercase tracking-widest">מוקדי חולשה</span>
                           <AlertCircle size={16} className="text-rose-500" />
                        </div>
                        <ul className="space-y-4">
                           {[...session.analysis.weaknesses.systemic, ...session.analysis.weaknesses.relational].slice(0, 3).map((w, i) => (
                             <li key={i} className="text-[12px] text-zinc-300 text-right font-bold leading-tight">• {w}</li>
                           ))}
                        </ul>
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
