
import React, { useState, useMemo } from 'react';
import { PartnershipSession, AIAnalysis } from '../types';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, Legend, Tooltip 
} from 'recharts';
import { analyzePartnership, expandRecommendation } from '../services/geminiService';
import { DEFAULT_QUESTIONS } from '../constants';
import { Zap, Target, Activity, AlertCircle, CheckCircle2, FileText, LayoutDashboard, Sparkles } from 'lucide-react';

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
    
    // זיהוי שאלות Outcome (ציון בריאות) - זיהוי קשיח למניעת 0%
    const outcomeIds = ['q23', 'q24'];
    const outcomeQs = questions.filter(q => outcomeIds.includes(q.id) || q.shortLabel === 'OUTCOME_SATISFACTION');
    const driverQs = questions.filter(q => !outcomeQs.find(oq => oq.id === q.id));
    
    const groups = Array.from(new Set(driverQs.map(q => q.shortLabel || 'כללי')));
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
            if (val !== undefined && val !== null && !isNaN(Number(val))) { 
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

    // חישוב מדד בריאות הממשק (Outcome)
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

    const satisfactionScore = sCount > 0 ? Math.round(((sTotal / sCount) / 7) * 100) : null;

    return { 
      driverData, 
      satisfactionScore, 
      biggestGap: maxGapValue > 0.5 ? { label: gapLabel, value: maxGapValue.toFixed(1) } : null 
    };
  }, [session]);

  const handleAnalyze = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await analyzePartnership(session, analysisSummary);
      onUpdate({ ...session, analysis: result });
    } catch (e: any) {
      alert("ניתוח הנתונים נכשל.");
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
      alert("נכשל בפירוט ההמלצה.");
    } finally {
      setExpandingRec(null);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20 max-w-[1600px] mx-auto px-6" dir="rtl">
      
      {/* TOP HEADER - COMPACT */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-zinc-900 pb-8">
        <div className="flex items-center gap-6 flex-row-reverse">
           <div className="text-right">
              <h2 className="text-4xl font-black text-white tracking-tighter">{session.title}</h2>
              <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest mt-1">Partnership Data Intelligence</p>
           </div>
           <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-600/30">
              <LayoutDashboard className="text-white" size={28} />
           </div>
        </div>
        <div className="flex gap-3">
           <button onClick={onBack} className="bg-zinc-900 text-zinc-400 px-8 py-3 rounded-2xl font-black border border-zinc-800 hover:text-white transition-all">חזרה</button>
           <button 
             onClick={handleAnalyze} 
             disabled={loading} 
             className={`px-10 py-3 rounded-2xl font-black transition-all flex items-center gap-3 ${loading ? 'bg-zinc-800 text-zinc-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/20'}`}
           >
             {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <Sparkles size={18} />}
             {loading ? 'מנתח...' : 'נתח לעומק עם AI'}
           </button>
        </div>
      </div>

      {/* MAIN DASHBOARD GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* LEFT/CENTER AREA (8 COLUMNS) - PRIMARY DATA */}
        <div className="xl:col-span-8 space-y-8">
          
          {/* TOP STATS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#0c0c0e] rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden text-right">
               <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 blur-[40px] rounded-full"></div>
               <Activity className="text-indigo-500 mb-4" size={24} />
               <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest block mb-1">מדד בריאות הממשק</span>
               <div className="text-6xl font-black text-white tabular-nums">
                  {analysisSummary.satisfactionScore !== null ? `${analysisSummary.satisfactionScore}%` : '---'}
               </div>
            </div>

            <div className="bg-[#0c0c0e] rounded-[2.5rem] p-8 border border-white/5 text-right">
               <AlertCircle className="text-rose-500 mb-4" size={24} />
               <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest block mb-1">פער תפיסה מקסימלי</span>
               <div className="text-4xl font-black text-white leading-tight">
                  {analysisSummary.biggestGap ? analysisSummary.biggestGap.label : 'תיאום גבוה'}
               </div>
               {analysisSummary.biggestGap && <p className="text-rose-500/70 text-[11px] font-bold mt-2">פער של {analysisSummary.biggestGap.value} נק'</p>}
            </div>

            <div className="bg-[#0c0c0e] rounded-[2.5rem] p-8 border border-white/5 text-right">
               <Target className="text-emerald-500 mb-4" size={24} />
               <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest block mb-1">סה"כ מענים</span>
               <div className="text-6xl font-black text-white tabular-nums">{session.responses?.length || 0}</div>
            </div>
          </div>

          {/* LARGE RADAR CHART */}
          <div className="bg-[#0c0c0e] rounded-[3.5rem] p-10 border border-white/5 shadow-2xl min-h-[650px] flex flex-col">
             <div className="flex items-center gap-3 justify-end mb-10 border-b border-zinc-900 pb-6">
                <h3 className="text-2xl font-black text-white">מיפוי דרייברים אסטרטגיים</h3>
                <Target className="text-indigo-500" size={20} />
             </div>
             <div className="flex-grow w-full h-[500px]">
               <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={analysisSummary.driverData} margin={{ top: 10, right: 60, bottom: 10, left: 60 }}>
                    <PolarGrid stroke="#1a1a1e" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 12, fontWeight: 900 }} />
                    <PolarRadiusAxis domain={[0, 7]} tick={false} axisLine={false} />
                    <Radar name="ממוצע" dataKey="Avg" stroke="#52525b" fill="#52525b" fillOpacity={0.05} strokeWidth={1} strokeDasharray="4 4" />
                    {session.sides.map((side, idx) => (
                      <Radar key={side} name={side} dataKey={side} stroke={SIDE_COLORS[idx % SIDE_COLORS.length]} fill={SIDE_COLORS[idx % SIDE_COLORS.length]} fillOpacity={0.1} strokeWidth={3} />
                    ))}
                    <Legend wrapperStyle={{ paddingTop: '30px', fontSize: '12px', fontWeight: 800 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #1a1a1e', borderRadius: '16px', textAlign: 'right' }} />
                  </RadarChart>
               </ResponsiveContainer>
             </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR (4 COLUMNS) - AI INSIGHTS */}
        <div className="xl:col-span-4 space-y-8 sticky top-32">
          
          <div className="bg-[#111114] rounded-[3rem] p-8 border border-indigo-500/10 shadow-3xl flex flex-col min-h-[800px]">
             <div className="flex items-center gap-3 justify-end mb-8 border-b border-zinc-800 pb-6">
                <h3 className="text-xl font-black text-white">ניתוח וייעוץ AI</h3>
                <Sparkles className="text-indigo-500" size={20} />
             </div>

             {!session.analysis ? (
               <div className="flex-grow flex flex-col items-center justify-center text-center space-y-6 opacity-40">
                  <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center text-3xl">🤖</div>
                  <div className="space-y-2">
                     <p className="text-white font-black">ממתין להרצת הניתוח</p>
                     <p className="text-zinc-500 text-xs px-10 leading-relaxed">לחץ על הכפתור למעלה כדי לחלץ תובנות עומק מהנתונים</p>
                  </div>
               </div>
             ) : (
               <div className="space-y-10 animate-slideDown overflow-y-auto max-h-[1000px] custom-scrollbar pr-2">
                  
                  {/* AI SUMMARY CARD */}
                  <div className="bg-indigo-600 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-600/20">
                     <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 blur-3xl rounded-full"></div>
                     <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70 block mb-3 text-right">סיכום ניהולי</span>
                     <p className="text-lg font-black leading-tight text-right italic">"{session.analysis.summary}"</p>
                  </div>

                  {/* RECOMMENDATIONS */}
                  <div className="space-y-6">
                     <div className="flex items-center gap-3 justify-end">
                        <h4 className="text-sm font-black text-zinc-400 uppercase tracking-widest">המלצות לפעולה</h4>
                        <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
                           <Zap size={14} className="text-indigo-500" />
                        </div>
                     </div>
                     <div className="space-y-4">
                        {[...session.analysis.recommendations.systemic, ...session.analysis.recommendations.relational].map((rec, i) => (
                          <div key={i} className="space-y-3">
                             <div className="bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800 flex flex-col gap-3 group transition-all hover:border-indigo-500/40">
                                <p className="text-sm font-bold text-zinc-200 text-right leading-relaxed">{rec}</p>
                                <button 
                                  onClick={() => handleExpandRec(rec)}
                                  className="self-end text-[10px] font-black text-indigo-400 hover:text-white transition-colors"
                                >
                                  {expandingRec === rec ? 'מעבד...' : expandedSteps[rec] ? '✓ צעדים מוכנים' : 'כיצד לבצע? ←'}
                                </button>
                             </div>
                             {expandedSteps[rec] && (
                               <div className="mr-4 border-r-2 border-indigo-500/30 pr-4 space-y-3 animate-slideDown">
                                  {expandedSteps[rec].map((step, idx) => (
                                    <div key={idx} className="flex gap-3 items-start flex-row-reverse">
                                       <span className="text-[10px] font-black text-indigo-500 pt-1">{idx+1}.</span>
                                       <p className="text-[11px] text-zinc-400 text-right font-medium">{step}</p>
                                    </div>
                                  ))}
                               </div>
                             )}
                          </div>
                        ))}
                     </div>
                  </div>

                  {/* STRENGTHS & WEAKNESSES GRID */}
                  <div className="grid grid-cols-1 gap-4">
                     <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6">
                        <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest block mb-4 text-right">נקודות חוזקה</span>
                        <ul className="space-y-2">
                           {[...session.analysis.strengths.systemic, ...session.analysis.strengths.relational].slice(0, 3).map((s, i) => (
                             <li key={i} className="text-[11px] text-zinc-300 text-right font-bold">• {s}</li>
                           ))}
                        </ul>
                     </div>
                     <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-6">
                        <span className="text-rose-500 text-[10px] font-black uppercase tracking-widest block mb-4 text-right">מוקדי שיפור</span>
                        <ul className="space-y-2">
                           {[...session.analysis.weaknesses.systemic, ...session.analysis.weaknesses.relational].slice(0, 3).map((w, i) => (
                             <li key={i} className="text-[11px] text-zinc-300 text-right font-bold">• {w}</li>
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
