
import React, { useState, useMemo } from 'react';
import { PartnershipSession, AIAnalysis } from '../types';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, Legend, Tooltip 
} from 'recharts';
import { analyzePartnership, expandRecommendation } from '../services/geminiService';
import { DEFAULT_QUESTIONS } from '../constants';
import { Zap, Target, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';

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
    // השתמש בשאלות מהסשן, ואם אין - בשאלות ברירת המחדל
    const questions = (session.questions && session.questions.length > 0) 
      ? session.questions 
      : DEFAULT_QUESTIONS;
    
    // זיהוי שאלות דרייברים לעומת שאלות תוצאה (Outcome)
    // הוספת מנגנון זיהוי לפי ID כגיבוי למקרה שה-shortLabel חסר
    const driverQs = questions.filter(q => q.shortLabel !== 'OUTCOME_SATISFACTION' && q.id !== 'q23' && q.id !== 'q24');
    const outcomeQs = questions.filter(q => q.shortLabel === 'OUTCOME_SATISFACTION' || q.id === 'q23' || q.id === 'q24');
    
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

    // חישוב מדד בריאות הממשק (Outcome Satisfaction)
    let sTotal = 0, sCount = 0;
    (session.responses || []).forEach(r => {
      outcomeQs.forEach(q => {
        const score = r.scores?.[q.id];
        if (score !== undefined && score !== null && !isNaN(Number(score))) { 
          sTotal += Number(score); 
          sCount++; 
        }
      });
    });

    // סולם הציונים הוא 1-7. אנחנו מחשבים אחוזים.
    // אם אין שאלות תוצאה או שאין מענים, נחזיר null כדי לציין חוסר במידע
    const satisfactionScore = sCount > 0 ? Math.round(((sTotal / sCount) - 1) / 6 * 100) : null;

    return { 
      driverData, 
      satisfactionScore, 
      biggestGap: maxGapValue > 1 ? { label: gapLabel, value: maxGapValue } : null 
    };
  }, [session]);

  const handleAnalyze = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await analyzePartnership(session, analysisSummary);
      onUpdate({ ...session, analysis: result });
    } catch (e: any) {
      alert("ניתוח ה-AI נכשל. אנא וודא שמפתח ה-API תקין.");
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
      alert("נכשל בפירוק ההמלצה.");
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
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-zinc-900 pb-12">
        <div className="space-y-3 text-right">
           <h2 className="text-5xl font-black text-white tracking-tighter leading-tight">{session.title}</h2>
           <div className="flex items-center gap-3 justify-end">
              <span className="text-zinc-500 font-bold text-xs uppercase tracking-[0.3em]">AI Intelligence Dashboard</span>
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
             {loading ? 'מנתח נתונים...' : 'הפעל ניתוח AI'}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* DATA & CHARTS (RIGHT) */}
        <div className="lg:col-span-7 space-y-8 md:order-2">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-[#09090b] rounded-[3rem] p-10 border border-white/5 shadow-3xl text-right relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[60px] rounded-full"></div>
               <Activity className="text-indigo-500 mb-6" size={32} />
               <h3 className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-1">מדד בריאות הממשק</h3>
               <div className="flex items-baseline gap-2 justify-end">
                  <span className="text-7xl font-black text-white tabular-nums">
                    {analysisSummary.satisfactionScore !== null ? `${analysisSummary.satisfactionScore}%` : '---'}
                  </span>
               </div>
               <p className="text-zinc-600 text-[11px] mt-4 font-bold">שקלול של אפקטיביות ושביעות רצון (Outcome)</p>
            </div>

            <div className="bg-[#09090b] rounded-[3rem] p-10 border border-white/5 shadow-3xl text-right relative overflow-hidden">
               {analysisSummary.biggestGap ? (
                 <>
                   <AlertCircle className="text-rose-500 mb-6" size={32} />
                   <h3 className="text-rose-500/70 text-xs font-black uppercase tracking-widest mb-1">פער תפיסה קריטי</h3>
                   <div className="text-2xl font-black text-white leading-tight">{analysisSummary.biggestGap.label}</div>
                   <p className="text-zinc-600 text-[11px] mt-2 font-bold italic">פער של {analysisSummary.biggestGap.value} נקודות בין הצדדים</p>
                 </>
               ) : (
                 <>
                   <CheckCircle2 className="text-emerald-500 mb-6" size={32} />
                   <h3 className="text-emerald-500/70 text-xs font-black uppercase tracking-widest mb-1">סינכרון תפיסתי</h3>
                   <div className="text-2xl font-black text-white leading-tight">תיאום גבוה</div>
                   <p className="text-zinc-600 text-[11px] mt-2 font-bold italic">אין פערים משמעותיים בין הצדדים</p>
                 </>
               )}
            </div>
          </div>

          <div className="bg-[#09090b] rounded-[3.5rem] p-12 border border-white/5 shadow-3xl flex flex-col min-h-[600px]">
             <div className="flex items-center gap-4 mb-10 justify-end">
                <h3 className="text-2xl font-black text-white">מיפוי דרייברים אסטרטגיים</h3>
                <Target className="text-indigo-500" />
             </div>
             <div className="flex-grow w-full h-[450px]">
               <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={analysisSummary.driverData} margin={{ top: 10, right: 40, bottom: 10, left: 40 }}>
                    <PolarGrid stroke="#1a1a1e" />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      tick={{ fill: '#71717a', fontSize: 12, fontWeight: 900 }}
                    />
                    <PolarRadiusAxis domain={[0, 7]} tick={false} axisLine={false} />
                    <Radar 
                      name="ממוצע" 
                      dataKey="Avg" 
                      stroke="#52525b" 
                      fill="#52525b" 
                      fillOpacity={0.05} 
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
                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 700 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#000', border: '1px solid #1a1a1e', borderRadius: '16px', textAlign: 'right', fontSize: '13px' }} 
                    />
                  </RadarChart>
               </ResponsiveContainer>
             </div>
          </div>
        </div>

        {/* AI INSIGHTS (LEFT) */}
        <div className="lg:col-span-5 space-y-8 md:order-1">
          {!session.analysis ? (
            <div className="bg-[#09090b] rounded-[3.5rem] p-16 border-dashed border-2 border-zinc-800/50 text-center flex flex-col items-center justify-center min-h-[400px] space-y-6 opacity-40 hover:opacity-100 transition-opacity">
               <div className="w-24 h-24 bg-zinc-900 rounded-[2rem] flex items-center justify-center text-5xl">🧠</div>
               <div className="space-y-2">
                  <h3 className="text-xl font-black text-white">ממתין לניתוח אסטרטגי</h3>
                  <p className="text-zinc-500 text-sm max-w-xs mx-auto leading-relaxed">
                     הפעל את ניתוח ה-AI כדי לחלץ תובנות עומק וצעדי עבודה אופרטיביים מתוך הנתונים.
                  </p>
               </div>
            </div>
          ) : (
            <div className="space-y-8 animate-slideDown">
              
              {/* AI DIAGNOSIS */}
              <div className="bg-indigo-600 rounded-[3rem] p-10 text-white shadow-4xl relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 blur-3xl rounded-full"></div>
                 <h3 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-80 mb-4 flex items-center gap-2 justify-end">
                    אבחון ניהולי (AI)
                    <Activity size={12} />
                 </h3>
                 <p className="text-2xl font-black leading-tight text-right">{session.analysis.summary}</p>
              </div>

              {/* ACTIONABLE RECOMMENDATIONS */}
              <div className="bg-[#0c0c0e] rounded-[3.5rem] p-10 border border-white/5 space-y-8">
                 <div className="flex items-center gap-4 justify-end">
                    <h3 className="text-2xl font-black text-white">המלצות אופרטיביות</h3>
                    <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/20">
                      <Zap size={24} className="text-white" />
                    </div>
                 </div>

                 <div className="space-y-6">
                    {allRecs.map((rec, i) => (
                      <div key={i} className="space-y-4">
                         <div className="bg-zinc-900/50 p-6 rounded-[2rem] border border-zinc-800/50 flex flex-col md:flex-row-reverse justify-between items-center gap-4 transition-all hover:border-indigo-500/30">
                            <p className="text-lg font-bold text-zinc-100 text-right flex-grow leading-snug">{rec}</p>
                            <button 
                              onClick={() => handleExpandRec(rec)}
                              disabled={expandingRec === rec}
                              className={`shrink-0 w-full md:w-auto px-6 py-3 rounded-xl text-[11px] font-black transition-all ${expandedSteps[rec] ? 'bg-zinc-800 text-zinc-600' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white'}`}
                            >
                              {expandingRec === rec ? 'מעבד...' : expandedSteps[rec] ? 'צעדים מוכנים' : 'איך מבצעים?'}
                            </button>
                         </div>
                         
                         {expandedSteps[rec] && (
                           <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-[2.5rem] p-10 space-y-6 animate-slideDown shadow-inner text-right">
                              <h4 className="text-[11px] font-black text-indigo-400 uppercase tracking-widest border-b border-indigo-500/10 pb-4">מפת דרכים אופרטיבית:</h4>
                              <div className="space-y-4">
                                 {expandedSteps[rec].map((step, idx) => (
                                   <div key={idx} className="flex gap-4 items-start flex-row-reverse">
                                      <span className="w-8 h-8 bg-indigo-500 text-white rounded-xl flex items-center justify-center text-xs font-black shrink-0 shadow-lg">{idx+1}</span>
                                      <p className="text-base font-bold text-zinc-300 leading-relaxed pt-1">{step}</p>
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
  );
}; 

export default ResultsView;
