
import React, { useState, useMemo } from 'react';
import { PartnershipSession, AIAnalysis, Category } from '../types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';
import { analyzePartnership } from '../services/geminiService';

interface Props {
  session: PartnershipSession | undefined;
  onUpdate: (updated: PartnershipSession) => void;
  onBack: () => void;
}

const SIDE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

const ResultsView: React.FC<Props> = ({ session, onUpdate, onBack }) => {
  const [loading, setLoading] = useState(false);

  if (!session) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-6">
        <p className="text-zinc-500 font-bold">הממשק המבוקש לא נמצא.</p>
        <button onClick={onBack} className="bg-zinc-800 px-6 py-2 rounded-xl text-white">חזרה</button>
      </div>
    );
  }

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const result = await analyzePartnership(session);
      onUpdate({ ...session, analysis: result });
    } catch (e: any) {
      if (e.message === "AUTH_ERROR") {
        alert("נדרשת בחירת מפתח API תקין להרצת הניתוח.");
        if (typeof (window as any).aistudio?.openSelectKey === 'function') {
          await (window as any).aistudio.openSelectKey();
        }
      } else {
        alert(e.message || "חלה שגיאה בחיבור ל-AI");
      }
    } finally {
      setLoading(false);
    }
  };

  // Improved chart logic: Group by 'shortLabel' to be resilient to custom question IDs
  const chartData = useMemo(() => {
    const groups = new Set(session.questions.map(q => q.shortLabel || 'אחר'));
    
    return Array.from(groups).map(label => {
      const dataPoint: any = { subject: label };
      const relatedQuestions = session.questions.filter(q => (q.shortLabel || 'אחר') === label);

      let totalAllSides = 0;
      let countAllSides = 0;

      session.sides.forEach(side => {
        const sideResponses = session.responses.filter(r => r.side === side);
        let totalSide = 0;
        let countSide = 0;
        
        sideResponses.forEach(r => {
          relatedQuestions.forEach(q => {
            if (r.scores && r.scores[q.id] !== undefined) {
              totalSide += r.scores[q.id];
              countSide++;
              totalAllSides += r.scores[q.id];
              countAllSides++;
            }
          });
        });
        
        dataPoint[side] = countSide > 0 ? Number((totalSide / countSide).toFixed(1)) : 0;
      });

      dataPoint.average = countAllSides > 0 ? Number((totalAllSides / countAllSides).toFixed(1)) : 0;
      return dataPoint;
    });
  }, [session]);

  const globalOutcomeData = useMemo(() => {
    // Look for effectiveness/satisfaction questions specifically
    const outcomeQuestions = session.questions.filter(q => 
      q.text.includes('אפקטיביות') || q.text.includes('שביעות רצון') || q.id === 'q23' || q.id === 'q24'
    );
    
    if (outcomeQuestions.length === 0) return 0;

    let total = 0;
    let count = 0;
    session.responses.forEach(r => {
      outcomeQuestions.forEach(q => {
        if (r.scores && r.scores[q.id] !== undefined) {
          total += r.scores[q.id];
          count++;
        }
      });
    });
    return count > 0 ? (total / count) : 0;
  }, [session]);

  const overallHealthMeta = useMemo(() => {
    const score = (globalOutcomeData / 7) * 100;
    if (score >= 80) return { label: 'שותפות אסטרטגית מסונכרנת', color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: '💎', desc: 'הממשק פועל ברמת סנכרון ושותפות יוצאת דופן.' };
    if (score >= 60) return { label: 'בסיס עבודה יציב ומקצועי', color: 'text-indigo-400', bg: 'bg-indigo-400/10', icon: '✅', desc: 'יש בסיס עבודה בריא עם מרחב לשיפור ביצועים.' };
    if (score >= 35) return { label: 'נדרשת התערבות ממוקדת', color: 'text-amber-400', bg: 'bg-amber-400/10', icon: '⚠️', desc: 'נדרשת השקעה ממוקדת בבניית הממשק והאמון.' };
    return { label: 'כשל מערכתי בממשק', color: 'text-rose-400', bg: 'bg-rose-400/10', icon: '🚨', desc: 'קיימים חסמים קריטיים המעכבים את הפעילות המשותפת.' };
  }, [globalOutcomeData]);

  const perceptionGapMeta = useMemo(() => {
    if (session.sides.length < 2 || chartData.length === 0) return null;
    const s1 = session.sides[0];
    const s2 = session.sides[1];
    let totalGap = 0;
    chartData.forEach(p => {
      totalGap += Math.abs((p[s1] || 0) - (p[s2] || 0));
    });
    const avgGap = totalGap / chartData.length;
    if (avgGap <= 0.8) return { label: 'הלימה גבוהה', color: 'text-emerald-400', desc: 'שני הצדדים חווים את הממשק בצורה דומה.' };
    if (avgGap <= 1.5) return { label: 'פערים מתונים', color: 'text-amber-400', desc: 'קיימת אי-הסכמה מסוימת לגבי אפקטיביות הממשק.' };
    return { label: 'דיסוננס תפיסתי', color: 'text-rose-400', desc: 'פער משמעותי באופן בו הצדדים רואים את השותפות.' };
  }, [chartData, session.sides]);

  // Safely check for analysis data to avoid crashes
  const hasAnalysis = session.analysis && typeof session.analysis === 'object';
  const analysis = session.analysis;

  return (
    <div className="space-y-12 animate-fadeIn pb-32 max-w-7xl mx-auto px-4 md:px-0 text-right" dir="rtl">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
        <div>
          <button onClick={onBack} className="text-zinc-500 hover:text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-4 group transition-colors">
             <span className="group-hover:-translate-x-1 transition-transform">←</span> חזרה לממשקים
          </button>
          <h2 className="text-5xl font-black text-white tracking-tighter leading-none">{session.title}</h2>
          <p className="text-zinc-500 mt-2 font-bold text-lg">דוח מצב אסטרטגי | Partnership Intelligence Report</p>
        </div>
        <button 
          disabled={session.responses.length < 1 || loading}
          onClick={handleAnalyze}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white px-10 py-5 rounded-3xl font-black transition-all shadow-3xl shadow-indigo-600/20 active:scale-95 flex items-center gap-4 text-lg border border-indigo-400/30"
        >
          {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : '✨ הפק המלצות AI'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-4 glass rounded-[3rem] p-12 flex flex-col items-center justify-center text-center space-y-8 relative overflow-hidden group border-indigo-500/10">
           <h4 className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.3em] relative z-10">סטטוס בריאות הממשק</h4>
           <div className={`w-44 h-44 rounded-full flex items-center justify-center relative z-10 ${overallHealthMeta.bg} border border-white/5 shadow-2xl transition-all group-hover:scale-105 duration-700`}>
              <span className="text-6xl">{overallHealthMeta.icon}</span>
           </div>
           <div className="space-y-4 relative z-10">
              <h3 className={`text-2xl font-black tracking-tight ${overallHealthMeta.color}`}>{overallHealthMeta.label}</h3>
              <p className="text-sm text-zinc-400 font-medium leading-relaxed max-w-[220px] mx-auto">{overallHealthMeta.desc}</p>
           </div>
        </div>

        <div className="md:col-span-8 glass rounded-[3rem] p-10 space-y-8 min-h-[450px] flex flex-col relative group">
          <div className="flex justify-between items-center relative z-10">
             <h3 className="text-xl font-black text-white">פרופיל אבחוני (צירים אסטרטגיים)</h3>
             {perceptionGapMeta && (
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-2xl border border-white/5">
                   <span className={`text-[10px] font-black uppercase tracking-widest ${perceptionGapMeta.color}`}>{perceptionGapMeta.label}</span>
                </div>
             )}
          </div>
          <div className="w-full flex-grow h-[350px] min-h-[350px] relative z-10">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                  <PolarGrid stroke="#27272a" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 10, fontWeight: 900 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 7]} tick={false} axisLine={false} />
                  {session.sides.map((side, idx) => (
                    <Radar
                      key={side}
                      name={side}
                      dataKey={side}
                      stroke={SIDE_COLORS[idx % SIDE_COLORS.length]}
                      fill={SIDE_COLORS[idx % SIDE_COLORS.length]}
                      fillOpacity={0.2}
                      strokeWidth={3}
                    />
                  ))}
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-600">אין מספיק נתונים להצגת גרף.</div>
            )}
          </div>
        </div>
      </div>

      {hasAnalysis && analysis && (
        <div className="space-y-12 animate-slideUp">
          <div className="flex items-center gap-6">
             <span className="text-3xl font-black text-white tracking-tight whitespace-nowrap underline decoration-indigo-500 decoration-4 underline-offset-8">ניתוח המומחה (AI Strategic Insight)</span>
             <div className="h-px bg-zinc-800 flex-grow"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             <div className="md:col-span-2 glass rounded-[4rem] p-16 border-indigo-500/20 shadow-4xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 text-zinc-900 font-black text-9xl opacity-10 pointer-events-none">"</div>
                <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] mb-10">תובנות עומק וניתוח השפעה</h4>
                <div className="space-y-8">
                   {(analysis.summary || '').split('\n').map((p, i) => (
                     <p key={i} className="text-2xl font-bold text-zinc-200 leading-snug tracking-tight">{p}</p>
                   ))}
                </div>
             </div>
             
             <div className="space-y-8">
                <div className="glass rounded-[3rem] p-10 border-emerald-500/10">
                   <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-6">חוזקות</h4>
                   <ul className="space-y-4">
                      {([...(analysis.strengths?.systemic || []), ...(analysis.strengths?.relational || [])]).map((s, i) => (
                        <li key={i} className="text-sm font-bold text-zinc-300 flex items-start gap-3">
                           <span className="text-emerald-500">◆</span> {s}
                        </li>
                      ))}
                   </ul>
                </div>
                <div className="glass rounded-[3rem] p-10 border-rose-500/10">
                   <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em] mb-6">חסמים</h4>
                   <ul className="space-y-4">
                      {([...(analysis.weaknesses?.systemic || []), ...(analysis.weaknesses?.relational || [])]).map((w, i) => (
                        <li key={i} className="text-sm font-bold text-zinc-300 flex items-start gap-3">
                           <span className="text-rose-500">◇</span> {w}
                        </li>
                      ))}
                   </ul>
                </div>
             </div>
          </div>

          <div className="space-y-10 pt-10">
             <h3 className="text-4xl font-black text-white tracking-tighter">המלצות לשיפור הממשק</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Systemic Recommendations */}
                <div className="space-y-6">
                   <h4 className="text-xl font-black text-indigo-400 border-r-4 border-indigo-400 pr-4">צד מערכתי (מנגנונים ותהליכים)</h4>
                   <div className="space-y-4">
                      {(analysis.recommendations?.systemic || []).map((rec, i) => (
                        <div key={i} className="bg-zinc-900/60 p-6 rounded-[2rem] border border-zinc-800 flex items-start gap-6 group hover:border-indigo-500/40 transition-all shadow-lg">
                           <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-black text-sm flex-shrink-0">
                             {i+1}
                           </div>
                           <p className="text-lg font-bold text-zinc-100 leading-snug">{rec}</p>
                        </div>
                      ))}
                   </div>
                </div>

                {/* Relational Recommendations */}
                <div className="space-y-6">
                   <h4 className="text-xl font-black text-purple-400 border-r-4 border-purple-400 pr-4">ציר היחסים (אמון ותקשורת)</h4>
                   <div className="space-y-4">
                      {(analysis.recommendations?.relational || []).map((rec, i) => (
                        <div key={i} className="bg-zinc-900/60 p-6 rounded-[2rem] border border-zinc-800 flex items-start gap-6 group hover:border-purple-500/40 transition-all shadow-lg">
                           <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 font-black text-sm flex-shrink-0">
                             {i+1}
                           </div>
                           <p className="text-lg font-bold text-zinc-100 leading-snug">{rec}</p>
                        </div>
                      ))}
                   </div>
                </div>
             </div> 
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsView;
