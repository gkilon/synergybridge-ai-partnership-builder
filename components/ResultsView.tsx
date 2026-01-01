
import React, { useState, useMemo } from 'react';
import { PartnershipSession, AIAnalysis, Category } from '../types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';
import { analyzePartnership } from '../services/geminiService';

interface Props {
  session: PartnershipSession;
  onUpdate: (updated: PartnershipSession) => void;
  onBack: () => void;
}

const SIDE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

const ResultsView: React.FC<Props> = ({ session, onUpdate, onBack }) => {
  const [loading, setLoading] = useState(false);

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

  const PILLAR_MAPPING = [
    { label: "אג'נדה ומטרות", range: [1, 4] },
    { label: "תפקידים", range: [5, 7] },
    { label: "קבלת החלטות", range: [8, 11] },
    { label: "תהליכים ושגרות", range: [12, 14] },
    { label: "כבוד הדדי", range: [15, 18] },
    { label: "תקשורת פתוחה", range: [19, 22] }
  ];

  const chartData = useMemo(() => {
    return PILLAR_MAPPING.map(pillar => {
      const dataPoint: any = { subject: pillar.label };
      
      const relatedQuestions = session.questions.filter(q => {
        const qNum = parseInt(q.id.replace('q', ''));
        return qNum >= pillar.range[0] && qNum <= pillar.range[1];
      });

      let totalAllSides = 0;
      let countAllSides = 0;

      session.sides.forEach(side => {
        const sideResponses = session.responses.filter(r => r.side === side);
        let totalSide = 0;
        let countSide = 0;
        
        sideResponses.forEach(r => {
          relatedQuestions.forEach(q => {
            if (r.scores[q.id]) {
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
    const qIds = ['q23', 'q24'];
    let total = 0;
    let count = 0;
    session.responses.forEach(r => {
      qIds.forEach(id => {
        if (r.scores[id]) {
          total += r.scores[id];
          count++;
        }
      });
    });
    return count > 0 ? (total / count) : 0;
  }, [session.responses]);

  const overallHealthMeta = useMemo(() => {
    const score = (globalOutcomeData / 7) * 100;
    if (score >= 80) return { label: 'שותפות מעולה', color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: '💎', desc: 'הממשק פועל ברמת סנכרון ושותפות יוצאת דופן.' };
    if (score >= 60) return { label: 'ממשק טוב', color: 'text-indigo-400', bg: 'bg-indigo-400/10', icon: '✅', desc: 'יש בסיס עבודה בריא עם מרחב לשיפור ביצועים.' };
    if (score >= 35) return { label: 'יש עוד מה לעבוד', color: 'text-amber-400', bg: 'bg-amber-400/10', icon: '⚠️', desc: 'נדרשת השקעה ממוקדת בבניית הממשק והאמון.' };
    return { label: 'ממשק טעון שיפור', color: 'text-rose-400', bg: 'bg-rose-400/10', icon: '🚨', desc: 'קיימים חסמים קריטיים המעכבים את הפעילות המשותפת.' };
  }, [globalOutcomeData]);

  const perceptionGapMeta = useMemo(() => {
    if (session.sides.length < 2) return null;
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

  return (
    <div className="space-y-12 animate-fadeIn pb-32 max-w-7xl mx-auto px-4 md:px-0">
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
              <h3 className={`text-4xl font-black tracking-tight ${overallHealthMeta.color}`}>{overallHealthMeta.label}</h3>
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
          </div>
        </div>
      </div>

      {session.analysis && (
        <div className="space-y-12 animate-slideUp">
          <div className="flex items-center gap-6">
             <span className="text-3xl font-black text-white tracking-tight whitespace-nowrap underline decoration-indigo-500 decoration-4 underline-offset-8">ניתוח המומחה (AI Senior Consultant)</span>
             <div className="h-px bg-zinc-800 flex-grow"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             <div className="md:col-span-2 glass rounded-[4rem] p-16 border-indigo-500/20 shadow-4xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 text-zinc-900 font-black text-9xl opacity-10 pointer-events-none">"</div>
                <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] mb-10">Strategic Narrative & Impact Analysis</h4>
                <div className="space-y-8">
                   {session.analysis.summary.split('\n').map((p, i) => (
                     <p key={i} className="text-2xl font-bold text-zinc-200 leading-snug tracking-tight">{p}</p>
                   ))}
                </div>
             </div>
             
             <div className="space-y-8">
                <div className="glass rounded-[3rem] p-10 border-emerald-500/10">
                   <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-6">חוזקות מערכתיות</h4>
                   <ul className="space-y-4">
                      {session.analysis.strengths.systemic.map((s, i) => (
                        <li key={i} className="text-sm font-bold text-zinc-300 flex items-start gap-3">
                           <span className="text-emerald-500">◆</span> {s}
                        </li>
                      ))}
                   </ul>
                </div>
                <div className="glass rounded-[3rem] p-10 border-rose-500/10">
                   <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em] mb-6">חסמים לטיפול</h4>
                   <ul className="space-y-4">
                      {session.analysis.weaknesses.systemic.map((w, i) => (
                        <li key={i} className="text-sm font-bold text-zinc-300 flex items-start gap-3">
                           <span className="text-rose-500">◇</span> {w}
                        </li>
                      ))}
                   </ul>
                </div>
             </div>
          </div>

          <div className="space-y-10 pt-10">
             <h3 className="text-4xl font-black text-white tracking-tighter">תוכנית פעולה אופרטיבית</h3>
             <div className="grid grid-cols-1 gap-6">
                {session.analysis.operationalRecommendations.map((rec, i) => (
                  <div key={i} className="bg-zinc-900/60 p-10 rounded-[3rem] border border-zinc-800 flex items-start gap-12 group hover:border-indigo-500/40 transition-all shadow-xl">
                     <div className="w-16 h-16 rounded-[2rem] bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-black text-2xl flex-shrink-0 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-inner">
                       {i+1}
                     </div>
                     <p className="text-2xl font-bold text-zinc-100 leading-snug tracking-tight py-2">{rec}</p>
                  </div>
                ))}
             </div> 
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsView;
