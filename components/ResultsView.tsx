
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
    if (typeof (window as any).aistudio?.hasSelectedApiKey === 'function') {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await (window as any).aistudio.openSelectKey();
      }
    }

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
        alert(e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Define the 6 main pillars we want to show on the radar
  const PROCESS_PILLARS = [
    'אג\'נדה ומטרות',
    'תפקידים',
    'קבלת החלטות',
    'תהליכים ושגרות',
    'כבוד הדדי',
    'תקשורת פתוחה'
  ];

  const chartData = useMemo(() => {
    return PROCESS_PILLARS.map(pillarLabel => {
      const dataPoint: any = { subject: pillarLabel };
      const relatedQuestions = session.questions.filter(q => q.shortLabel === pillarLabel);
      
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

  // Global Performance score based on q23, q24
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

  const sortedParams = useMemo(() => {
    return [...chartData].sort((a, b) => b.average - a.average);
  }, [chartData]);

  const strongest = sortedParams.slice(0, 3);
  const weakest = [...sortedParams].reverse().slice(0, 3);

  const overallHealthMeta = useMemo(() => {
    const score = (globalOutcomeData / 7) * 100;

    if (score >= 80) return { label: 'שותפות מעולה', color: 'text-emerald-400', bg: 'bg-emerald-400/10', desc: 'הממשק פועל ברמת סנכרון ושותפות יוצאת דופן.' };
    if (score >= 60) return { label: 'ממשק טוב', color: 'text-indigo-400', bg: 'bg-indigo-400/10', desc: 'יש בסיס עבודה בריא עם מרחב לשיפור ביצועים.' };
    if (score >= 35) return { label: 'יש עוד מה לעבוד', color: 'text-amber-400', bg: 'bg-amber-400/10', desc: 'נדרשת השקעה ממוקדת בבניית הממשק והאמון.' };
    return { label: 'ממשק טעון שיפור', color: 'text-rose-400', bg: 'bg-rose-400/10', desc: 'קיימים חסמים קריטיים המעכבים את הפעילות המשותפת.' };
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
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
        <div>
          <button onClick={onBack} className="text-zinc-500 hover:text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-4 group transition-colors">
             <span className="group-hover:-translate-x-1 transition-transform">←</span> חזרה לממשקים
          </button>
          <h2 className="text-5xl font-black text-white tracking-tighter leading-none">{session.title}</h2>
          <p className="text-zinc-500 mt-2 font-bold text-lg">דוח מצב אסטרטגי | Partnership Intelligence</p>
        </div>
        <button 
          disabled={session.responses.length < 1 || loading}
          onClick={handleAnalyze}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white px-10 py-5 rounded-3xl font-black transition-all shadow-3xl shadow-indigo-600/20 active:scale-95 flex items-center gap-4 text-lg border border-indigo-400/30"
        >
          {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : '✨ ניתוח AI מעמיק'}
        </button>
      </div>

      {/* Hero Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Status Card (Outcome Oriented) */}
        <div className="md:col-span-4 glass rounded-[3rem] p-12 flex flex-col items-center justify-center text-center space-y-8 relative overflow-hidden group border-indigo-500/10">
           <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
           <h4 className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.3em] relative z-10">מדד אפקטיביות ורצון</h4>
           
           <div className={`w-44 h-44 rounded-full flex items-center justify-center relative z-10 ${overallHealthMeta.bg} border border-white/5 shadow-2xl transition-all group-hover:scale-105 duration-700`}>
              <div className="absolute inset-0 rounded-full animate-pulse-slow opacity-10 bg-current"></div>
              <div className="absolute inset-4 rounded-full border-2 border-dashed border-white/10 opacity-30"></div>
              <div className="text-4xl font-black">{globalOutcomeData.toFixed(1)}</div>
           </div>
           
           <div className="space-y-4 relative z-10">
              <h3 className={`text-4xl font-black tracking-tight ${overallHealthMeta.color}`}>{overallHealthMeta.label}</h3>
              <p className="text-sm text-zinc-400 font-medium leading-relaxed max-w-[220px] mx-auto">{overallHealthMeta.desc}</p>
           </div>
        </div>

        {/* Radar Comparison Card */}
        <div className="md:col-span-8 glass rounded-[3rem] p-10 space-y-8 min-h-[450px] flex flex-col relative group">
          <div className="flex justify-between items-center relative z-10">
             <h3 className="text-xl font-black text-white">פרופיל הממשק ההשוואתי</h3>
             {perceptionGapMeta && (
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-2xl border border-white/5">
                   <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">תיאום:</span>
                   <span className={`text-[10px] font-black uppercase tracking-widest ${perceptionGapMeta.color}`}>{perceptionGapMeta.label}</span>
                </div>
             )}
          </div>
          <div className="w-full flex-grow h-[300px] relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="85%" data={chartData}>
                <PolarGrid stroke="#27272a" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 11, fontWeight: 900 }} />
                <PolarRadiusAxis angle={90} domain={[0, 7]} tick={false} axisLine={false} />
                {session.sides.map((side, idx) => (
                  <Radar
                    key={side}
                    name={side}
                    dataKey={side}
                    stroke={SIDE_COLORS[idx % SIDE_COLORS.length]}
                    fill={SIDE_COLORS[idx % SIDE_COLORS.length]}
                    fillOpacity={0.2}
                    strokeWidth={4}
                  />
                ))}
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance Pillars Bento Row */}
        <div className="md:col-span-6 glass rounded-[3.5rem] p-12 space-y-10 border-emerald-500/10 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
           <div className="flex items-center gap-4 relative z-10">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                 <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight">העוגנים האסטרטגיים</h3>
           </div>
           <div className="grid grid-cols-1 gap-4 relative z-10">
              {strongest.map((p, i) => (
                <div key={p.subject} className="bg-zinc-950/50 p-6 rounded-[2rem] border border-zinc-800/50 flex items-center justify-between group hover:border-emerald-500/20 transition-all duration-500">
                   <div className="flex items-center gap-6">
                      <span className="text-4xl font-black text-emerald-500/10 group-hover:text-emerald-500/20 transition-colors italic">0{i+1}</span>
                      <span className="text-xl font-bold text-zinc-100">{p.subject}</span>
                   </div>
                   <div className="flex gap-1">
                      {[...Array(7)].map((_, idx) => (
                        <div key={idx} className={`w-1.5 h-6 rounded-full transition-all duration-700 ${idx < Math.round(p.average) ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-800'}`}></div>
                      ))}
                   </div>
                </div>
              ))}
           </div>
        </div>

        <div className="md:col-span-6 glass rounded-[3.5rem] p-12 space-y-10 border-rose-500/10 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
           <div className="flex items-center gap-4 relative z-10">
              <div className="w-10 h-10 bg-rose-500/10 rounded-2xl flex items-center justify-center border border-rose-500/20">
                 <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight">חסמים ומרחבי צמיחה</h3>
           </div>
           <div className="grid grid-cols-1 gap-4 relative z-10">
              {weakest.map((p, i) => (
                <div key={p.subject} className="bg-zinc-950/50 p-6 rounded-[2rem] border border-zinc-800/50 flex items-center justify-between group hover:border-rose-500/20 transition-all duration-500">
                   <div className="flex items-center gap-6">
                      <span className="text-4xl font-black text-rose-500/10 group-hover:text-rose-500/20 transition-colors italic">0{i+1}</span>
                      <span className="text-xl font-bold text-zinc-100">{p.subject}</span>
                   </div>
                   <div className="flex gap-1">
                      {[...Array(7)].map((_, idx) => (
                        <div key={idx} className={`w-1.5 h-6 rounded-full transition-all duration-700 ${idx < Math.round(p.average) ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'bg-zinc-800'}`}></div>
                      ))}
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* AI Intelligence Layer */}
      {session.analysis && (
        <div className="space-y-12 animate-slideUp">
          <div className="flex items-center gap-6">
             <span className="text-3xl font-black text-white tracking-tight whitespace-nowrap">התובנה האסטרטגית</span>
             <div className="h-px bg-zinc-800 flex-grow"></div>
          </div>

          {/* AI Summary Bento */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             <div className="md:col-span-2 glass rounded-[4rem] p-16 border-indigo-500/20 shadow-4xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10">
                   <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] mb-10">Strategic Narrative</h4>
                   <div className="space-y-8">
                      {session.analysis.summary.split('\n').map((p, i) => (
                        <p key={i} className="text-2xl font-bold text-zinc-200 leading-snug tracking-tight">
                           {p}
                        </p>
                      ))}
                   </div>
                </div>
             </div>

             <div className="glass rounded-[4rem] p-12 flex flex-col justify-between border-white/5 bg-zinc-900/40">
                <div className="space-y-8">
                   <div>
                      <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em] mb-6">מפת פערים</h4>
                      {perceptionGapMeta ? (
                        <div className="space-y-4">
                           <div className={`text-2xl font-black ${perceptionGapMeta.color}`}>{perceptionGapMeta.label}</div>
                           <p className="text-sm text-zinc-400 font-medium leading-relaxed">{perceptionGapMeta.desc}</p>
                        </div>
                      ) : (
                        <p className="text-zinc-600 text-xs italic">לא נמצאו פערים משמעותיים בין תפיסות הצדדים.</p>
                      )}
                   </div>
                   
                   <div className="pt-8 border-t border-zinc-800/50">
                      <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-6">פוקוס המלצות</h4>
                      <div className="space-y-3">
                         {session.analysis.operationalRecommendations.slice(0, 2).map((r, i) => (
                            <div key={i} className="flex gap-3 text-xs font-bold text-zinc-300">
                               <span className="text-indigo-500">•</span> {r.slice(0, 60)}...
                            </div>
                         ))}
                      </div>
                   </div>
                </div>
                
                <div className="mt-10 p-6 bg-indigo-500/10 rounded-3xl border border-indigo-500/10">
                   <p className="text-[10px] font-black text-indigo-400 leading-relaxed text-center uppercase tracking-widest">מערכת ה-AI זיהתה את "הפער התפיסתי" כמעכב המרכזי בשותפות זו.</p>
                </div>
             </div>
          </div>

          {/* Action Plan Milestone View */}
          <div className="space-y-10">
             <div className="flex justify-between items-end px-6">
                <h3 className="text-4xl font-black text-white tracking-tighter">תוכנית הפעולה</h3>
                <span className="text-zinc-600 font-black text-xs uppercase tracking-widest mb-2">Priority Milestones</span>
             </div>
             <div className="grid grid-cols-1 gap-6">
                {session.analysis.operationalRecommendations.map((rec, i) => (
                  <div key={i} className="bg-zinc-900/60 p-10 rounded-[3rem] border border-zinc-800 flex items-start gap-12 group hover:border-indigo-500/40 transition-all hover:bg-zinc-900 shadow-2xl relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                     <div className="w-20 h-20 rounded-[2rem] bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-black text-3xl flex-shrink-0 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-700 shadow-indigo-500/10 shadow-xl border border-indigo-500/20">
                       {i+1}
                     </div>
                     <div className="space-y-3 py-2 flex-grow relative z-10">
                        <p className="text-2xl font-bold text-zinc-100 leading-snug tracking-tight">{rec}</p>
                     </div>
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
