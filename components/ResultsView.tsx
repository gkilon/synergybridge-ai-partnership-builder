
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

  const chartData = useMemo(() => {
    const labels = Array.from(new Set(session.questions.map(q => q.shortLabel || 'אחר')));
    
    return labels.map(label => {
      const dataPoint: any = { subject: label };
      const relatedQuestions = session.questions.filter(q => q.shortLabel === label);
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

  const sortedParams = useMemo(() => {
    return [...chartData].sort((a, b) => b.average - a.average);
  }, [chartData]);

  const strongest = sortedParams.slice(0, 3);
  const weakest = [...sortedParams].reverse().slice(0, 3);

  const overallHealth = useMemo(() => {
    if (chartData.length === 0) return 0;
    const sum = chartData.reduce((acc, p) => acc + p.average, 0);
    return Math.round((sum / (chartData.length * 7)) * 100);
  }, [chartData]);

  return (
    <div className="space-y-12 animate-fadeIn pb-32 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
        <div>
          <button onClick={onBack} className="text-zinc-500 hover:text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-4 group transition-colors">
             <span className="group-hover:-translate-x-1 transition-transform">←</span> חזרה לממשקים
          </button>
          <h2 className="text-5xl font-black text-white tracking-tighter leading-none">{session.title}</h2>
          <p className="text-zinc-500 mt-2 font-bold text-lg">דוח מצב אסטרטגי מבוסס בינה מלאכותית</p>
        </div>
        <button 
          disabled={session.responses.length < 1 || loading}
          onClick={handleAnalyze}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white px-10 py-5 rounded-3xl font-black transition-all shadow-3xl shadow-indigo-600/20 active:scale-95 flex items-center gap-4 text-lg"
        >
          {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : '✨ הפק ניתוח AI מעמיק'}
        </button>
      </div>

      {/* Hero Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Health Score Card */}
        <div className="md:col-span-4 glass rounded-[3rem] p-10 flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden group">
           <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
           <h4 className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.2em] relative z-10">מדד בריאות הממשק</h4>
           <div className="relative inline-flex items-center justify-center relative z-10">
              <svg className="w-44 h-44 transform -rotate-90">
                 <circle cx="88" cy="88" r="80" stroke="currentColor" strokeWidth="16" fill="transparent" className="text-zinc-900" />
                 <circle cx="88" cy="88" r="80" stroke="currentColor" strokeWidth="16" fill="transparent" 
                   strokeDasharray={502.6}
                   strokeDashoffset={502.6 - (502.6 * overallHealth / 100)}
                   className="text-indigo-500" 
                   strokeLinecap="round"
                 />
              </svg>
              <span className="absolute text-5xl font-black text-white">{overallHealth}%</span>
           </div>
           <p className="text-xs text-zinc-500 font-bold max-w-[200px] leading-relaxed relative z-10">שיקוף של רמת הסנכרון והאפקטיביות בין {session.sides.join(' ו-')}.</p>
        </div>

        {/* Radar Comparison Card */}
        <div className="md:col-span-8 glass rounded-[3rem] p-10 space-y-8 min-h-[450px] flex flex-col relative group">
          <h3 className="text-xl font-black text-white relative z-10">פרופיל הממשק ההשוואתי</h3>
          <div className="w-full flex-grow h-[300px] relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
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
                    fillOpacity={0.25}
                    strokeWidth={4}
                  />
                ))}
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Strategic Pillars (Strengths) */}
        <div className="md:col-span-6 glass rounded-[3rem] p-10 space-y-8 border-emerald-500/10">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                 <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">העוגנים: חוזקות מרכזיות</h3>
           </div>
           <div className="space-y-4">
              {strongest.map((p, i) => (
                <div key={p.subject} className="bg-zinc-900/40 p-6 rounded-3xl border border-zinc-800 flex items-center justify-between group hover:border-emerald-500/30 transition-all">
                   <div className="flex items-center gap-4">
                      <span className="text-3xl font-black text-emerald-500 opacity-20">0{i+1}</span>
                      <span className="text-lg font-black text-zinc-100">{p.subject}</span>
                   </div>
                   <div className="text-2xl font-black text-emerald-500">{p.average}</div>
                </div>
              ))}
           </div>
        </div>

        {/* Strategic Anchors (Weaknesses) */}
        <div className="md:col-span-6 glass rounded-[3rem] p-10 space-y-8 border-rose-500/10">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-rose-500/10 rounded-xl flex items-center justify-center">
                 <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">המעכבים: חסמים קריטיים</h3>
           </div>
           <div className="space-y-4">
              {weakest.map((p, i) => (
                <div key={p.subject} className="bg-zinc-900/40 p-6 rounded-3xl border border-zinc-800 flex items-center justify-between group hover:border-rose-500/30 transition-all">
                   <div className="flex items-center gap-4">
                      <span className="text-3xl font-black text-rose-500 opacity-20">0{i+1}</span>
                      <span className="text-lg font-black text-zinc-100">{p.subject}</span>
                   </div>
                   <div className="text-2xl font-black text-rose-500">{p.average}</div>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* AI Intelligence Layer */}
      {session.analysis && (
        <div className="space-y-12 animate-slideUp">
          <div className="flex items-center gap-6">
             <span className="text-2xl font-black text-indigo-400 whitespace-nowrap">ניתוח AI אסטרטגי</span>
             <div className="h-px bg-zinc-800 flex-grow"></div>
          </div>

          {/* AI Summary Bento */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             <div className="md:col-span-2 glass rounded-[4rem] p-12 border-indigo-500/20 shadow-4xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10">
                   <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-8">Executive Summary</h4>
                   <div className="space-y-6">
                      {session.analysis.summary.split('\n').map((p, i) => (
                        <p key={i} className="text-2xl font-bold text-zinc-100 leading-snug tracking-tight">
                           {p}
                        </p>
                      ))}
                   </div>
                </div>
             </div>

             <div className="glass rounded-[4rem] p-10 flex flex-col justify-between border-emerald-500/10">
                <div>
                   <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-8">חוזקות ממוקדות</h4>
                   <div className="space-y-4">
                      {[...session.analysis.strengths.systemic, ...session.analysis.strengths.relational].slice(0, 3).map((s, i) => (
                        <div key={i} className="p-5 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 text-emerald-50 text-sm font-bold">
                           {s}
                        </div>
                      ))}
                   </div>
                </div>
                <div className="mt-8 pt-8 border-t border-zinc-800/50">
                   <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] mb-6">חסמים לטיפול</h4>
                   <div className="space-y-4">
                      {[...session.analysis.weaknesses.systemic, ...session.analysis.weaknesses.relational].slice(0, 2).map((w, i) => (
                        <div key={i} className="p-5 bg-rose-500/5 rounded-2xl border border-rose-500/10 text-rose-50 text-sm font-bold">
                           {w}
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>

          {/* Action Plan Milestone View */}
          <div className="space-y-8">
             <div className="flex justify-between items-end px-4">
                <h3 className="text-3xl font-black text-white">תוכנית עבודה אופרטיבית</h3>
                <span className="text-zinc-500 font-bold text-sm">Actionable Intelligence</span>
             </div>
             <div className="grid grid-cols-1 gap-4">
                {session.analysis.operationalRecommendations.map((rec, i) => (
                  <div key={i} className="bg-zinc-900/60 p-8 rounded-[2.5rem] border border-zinc-800 flex items-start gap-10 group hover:border-indigo-500/40 transition-all hover:bg-zinc-900 shadow-2xl">
                     <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-black text-2xl flex-shrink-0 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-500 shadow-indigo-500/10 shadow-xl">
                       {i+1}
                     </div>
                     <div className="space-y-2 py-2">
                        <p className="text-xl font-bold text-zinc-100 leading-relaxed">{rec}</p>
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
