
import React, { useState, useMemo } from 'react';
import { PartnershipSession, AIAnalysis } from '../types';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, Legend, Tooltip 
} from 'recharts';
import { analyzePartnership, expandRecommendation } from '../services/geminiService';
import { DEFAULT_QUESTIONS } from '../constants';
import { Zap, Target, Activity, AlertCircle, CheckCircle2, FileText, ChevronDown } from 'lucide-react';

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
    const questions = (session.questions && session.questions.length > 0) 
      ? session.questions 
      : DEFAULT_QUESTIONS;
    
    // זיהוי שאלות Outcome לפי ID או תווית - מבטיח שלא נקבל 0 בגלל חוסר התאמה בשם
    const outcomeIds = ['q23', 'q24'];
    const outcomeQs = questions.filter(q => q.shortLabel === 'OUTCOME_SATISFACTION' || outcomeIds.includes(q.id));
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

    // חישוב ציון באחוזים: ממוצע חלקי 7 (הציון המקסימלי) כפול 100
    const satisfactionScore = sCount > 0 ? Math.round((sTotal / sCount) / 7 * 100) : null;

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
      alert("ניתוח הנתונים נכשל. אנא בדקו את חיבור ה-API.");
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

  const allRecs = session.analysis ? [
    ...session.analysis.recommendations.systemic,
    ...session.analysis.recommendations.relational
  ] : [];

  return (
    <div className="space-y-12 animate-fadeIn pb-32 max-w-7xl mx-auto px-4" dir="rtl">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-zinc-900 pb-12">
        <div className="space-y-3 text-right">
           <h2 className="text-5xl font-black text-white tracking-tighter leading-tight">{session.title}</h2>
           <div className="flex items-center gap-3 justify-end">
              <span className="text-zinc-500 font-bold text-xs uppercase tracking-[0.3em]">Partnership Analytics Dashboard</span>
              <div className="h-px w-12 bg-zinc-800"></div>
           </div>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
           <button onClick={onBack} className="flex-1 md:flex-none bg-zinc-900 text-zinc-400 px-8 py-4 rounded-2xl font-black border border-zinc-800 hover:text-white transition-all">חזרה</button>
           <button 
             onClick={handleAnalyze} 
             disabled={loading} 
             className={`flex-[2] md:flex-none px-12 py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-3 ${loading ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/30 active:scale-95'}`}
           >
             {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <Zap size={20} />}
             {loading ? 'מנתח נתונים...' : 'הפעל ניתוח אסטרטגי AI'}
           </button>
        </div>
      </div>

      {/* TOP DASHBOARD CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-[#09090b] rounded-[3rem] p-10 border border-white/5 shadow-3xl text-right relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[60px] rounded-full"></div>
             <Activity className="text-indigo-500 mb-6" size={32} />
             <h3 className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-1">מדד בריאות הממשק</h3>
             <div className="flex items-baseline gap-2 justify-end">
                <span className="text-7xl font-black text-white tabular-nums">
                  {analysisSummary.satisfactionScore !== null ? `${analysisSummary.satisfactionScore}%` : '---'}
                </span>
             </div>
             <p className="text-zinc-600 text-[11px] mt-4 font-bold">שביעות רצון ואפקטיביות (Outcome)</p>
          </div>

          <div className="bg-[#09090b] rounded-[3rem] p-10 border border-white/5 shadow-3xl text-right relative overflow-hidden">
             {analysisSummary.biggestGap ? (
               <>
                 <AlertCircle className="text-rose-500 mb-6" size={32} />
                 <h3 className="text-rose-500/70 text-xs font-black uppercase tracking-widest mb-1">פער תפיסה אסטרטגי</h3>
                 <div className="text-2xl font-black text-white leading-tight">{analysisSummary.biggestGap.label}</div>
                 <p className="text-zinc-600 text-[11px] mt-2 font-bold italic">פער של {analysisSummary.biggestGap.value} נקודות בין הממשקים</p>
               </>
             ) : (
               <>
                 <CheckCircle2 className="text-emerald-500 mb-6" size={32} />
                 <h3 className="text-emerald-500/70 text-xs font-black uppercase tracking-widest mb-1">סינכרון תפיסתי</h3>
                 <div className="text-2xl font-black text-white leading-tight">תיאום גבוה</div>
                 <p className="text-zinc-600 text-[11px] mt-2 font-bold italic">הצדדים רואים את המציאות באופן דומה</p>
               </>
             )}
          </div>

          <div className="bg-[#09090b] rounded-[3rem] p-10 border border-white/5 shadow-3xl text-right relative overflow-hidden">
             <Target className="text-amber-500 mb-6" size={32} />
             <h3 className="text-amber-500/70 text-xs font-black uppercase tracking-widest mb-1">כמות משתתפים</h3>
             <div className="text-7xl font-black text-white tabular-nums">{session.responses?.length || 0}</div>
             <p className="text-zinc-600 text-[11px] mt-4 font-bold">מענים שנאספו עד כה</p>
          </div>
      </div>

      {/* RADAR CHART (FULL WIDTH) */}
      <div className="bg-[#09090b] rounded-[3.5rem] p-12 border border-white/5 shadow-3xl flex flex-col min-h-[550px]">
         <div className="flex items-center gap-4 mb-10 justify-end">
            <h3 className="text-2xl font-black text-white">מיפוי דרייברים בשותפות</h3>
            <Target className="text-indigo-500" />
         </div>
         <div className="flex-grow w-full h-[400px]">
           <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={analysisSummary.driverData} margin={{ top: 10, right: 40, bottom: 10, left: 40 }}>
                <PolarGrid stroke="#1a1a1e" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 12, fontWeight: 900 }} />
                <PolarRadiusAxis domain={[0, 7]} tick={false} axisLine={false} />
                <Radar name="ממוצע" dataKey="Avg" stroke="#52525b" fill="#52525b" fillOpacity={0.05} strokeWidth={1} strokeDasharray="4 4" />
                {session.sides.map((side, idx) => (
                  <Radar key={side} name={side} dataKey={side} stroke={SIDE_COLORS[idx % SIDE_COLORS.length]} fill={SIDE_COLORS[idx % SIDE_COLORS.length]} fillOpacity={0.1} strokeWidth={3} />
                ))}
                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 700 }} />
                <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #1a1a1e', borderRadius: '16px', textAlign: 'right', fontSize: '13px' }} />
              </RadarChart>
           </ResponsiveContainer>
         </div>
      </div>

      {/* AI STRATEGIC REPORT SECTION (NEW PLACE - BELOW THE DATA) */}
      <div className="space-y-8 animate-fadeIn">
        <div className="flex items-center gap-4 flex-row-reverse border-b border-zinc-900 pb-6">
           <FileText className="text-indigo-500" size={28} />
           <h3 className="text-3xl font-black text-white">דוח אבחון וניתוח AI</h3>
        </div>

        {!session.analysis ? (
          <div className="bg-[#09090b] rounded-[3.5rem] p-20 border-dashed border-2 border-zinc-800/50 text-center flex flex-col items-center justify-center space-y-6 opacity-60">
             <div className="w-20 h-20 bg-zinc-900 rounded-[2rem] flex items-center justify-center text-4xl">🤖</div>
             <div className="space-y-2">
                <h3 className="text-xl font-black text-white">ממתין להרצת הניתוח</h3>
                <p className="text-zinc-500 text-sm max-w-sm mx-auto leading-relaxed">
                   לחץ על "הפעל ניתוח אסטרטגי" בראש הדף כדי לקבל תובנות עומק והמלצות אופרטיביות מבוססות בינה מלאכותית.
                </p>
             </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* LEFT SIDE: SUMMARY & ACTION STEPS */}
            <div className="lg:col-span-8 space-y-8">
              <div className="bg-indigo-600 rounded-[3rem] p-12 text-white shadow-4xl relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-48 h-48 bg-white/10 blur-[80px] rounded-full"></div>
                 <h4 className="text-[10px] font-black uppercase tracking-[0.5em] opacity-70 mb-4 text-right">סיכום אסטרטגי</h4>
                 <p className="text-3xl font-black leading-tight text-right">{session.analysis.summary}</p>
              </div>

              <div className="bg-[#09090b] rounded-[3.5rem] p-12 border border-white/5 space-y-10">
                 <div className="flex items-center gap-4 justify-end">
                    <h3 className="text-2xl font-black text-white">תוכנית עבודה מומלצת</h3>
                    <Zap size={24} className="text-indigo-500" />
                 </div>
                 
                 <div className="space-y-6">
                    {allRecs.map((rec, i) => (
                      <div key={i} className="group">
                         <div className="bg-zinc-900/40 p-8 rounded-[2.5rem] border border-zinc-800/50 flex flex-col md:flex-row-reverse justify-between items-center gap-6 transition-all hover:border-indigo-500/30">
                            <p className="text-xl font-bold text-zinc-100 text-right flex-grow leading-snug">{rec}</p>
                            <button 
                              onClick={() => handleExpandRec(rec)}
                              className={`shrink-0 px-8 py-4 rounded-2xl text-[11px] font-black transition-all ${expandedSteps[rec] ? 'bg-zinc-800 text-zinc-500 cursor-default' : 'bg-indigo-500 text-white hover:bg-indigo-400 shadow-xl shadow-indigo-500/10'}`}
                            >
                              {expandingRec === rec ? 'מפרק לצעדים...' : expandedSteps[rec] ? 'צעדים מוכנים' : 'פירוט צעדים'}
                            </button>
                         </div>
                         
                         {expandedSteps[rec] && (
                           <div className="mt-4 mr-8 ml-8 bg-zinc-900/20 border-r-2 border-indigo-500/30 p-8 space-y-5 animate-slideDown">
                              {expandedSteps[rec].map((step, idx) => (
                                <div key={idx} className="flex gap-4 items-start flex-row-reverse">
                                   <div className="w-6 h-6 bg-indigo-500/20 text-indigo-400 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0">{idx+1}</div>
                                   <p className="text-base text-zinc-400 text-right">{step}</p>
                                </div>
                              ))}
                           </div>
                         )}
                      </div>
                    ))}
                 </div>
              </div>
            </div>

            {/* RIGHT SIDE: STRENGTHS & WEAKNESSES GRID */}
            <div className="lg:col-span-4 space-y-8">
               <div className="bg-[#09090b] rounded-[3rem] p-10 border border-emerald-500/10 shadow-3xl text-right">
                  <h4 className="text-emerald-500 text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2 justify-end">
                     חוזקות לשימור
                     <CheckCircle2 size={14} />
                  </h4>
                  <ul className="space-y-4">
                     {[...session.analysis.strengths.systemic, ...session.analysis.strengths.relational].map((s, i) => (
                       <li key={i} className="text-zinc-300 font-bold text-sm bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/30">{s}</li>
                     ))}
                  </ul>
               </div>

               <div className="bg-[#09090b] rounded-[3rem] p-10 border border-rose-500/10 shadow-3xl text-right">
                  <h4 className="text-rose-500 text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2 justify-end">
                     נקודות לשיפור
                     <AlertCircle size={14} />
                  </h4>
                  <ul className="space-y-4">
                     {[...session.analysis.weaknesses.systemic, ...session.analysis.weaknesses.relational].map((w, i) => (
                       <li key={i} className="text-zinc-300 font-bold text-sm bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/30">{w}</li>
                     ))}
                  </ul>
               </div>
            </div> 
          </div>
        )}
      </div>
    </div>
  );
}; 

export default ResultsView;
