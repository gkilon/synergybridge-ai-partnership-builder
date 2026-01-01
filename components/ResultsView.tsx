
import React, { useState, useMemo } from 'react';
import { PartnershipSession, AIAnalysis, Category } from '../types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
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

  const sortedParameters = useMemo(() => {
    return [...chartData].sort((a, b) => b.average - a.average);
  }, [chartData]);

  const getSideAverages = (side: string) => {
    const sideResponses = session.responses.filter(r => r.side === side);
    if (sideResponses.length === 0) return { systemic: '0.0', relational: '0.0' };

    const systemicQs = session.questions.filter(q => q.category === Category.SYSTEMIC);
    const relationalQs = session.questions.filter(q => q.category === Category.RELATIONAL);

    const calcAvg = (qs: any[]) => {
      let sum = 0;
      let count = 0;
      sideResponses.forEach(r => {
        qs.forEach(q => {
          if (r.scores[q.id]) {
            sum += r.scores[q.id];
            count++;
          }
        });
      });
      return count > 0 ? (sum / count).toFixed(1) : '0.0';
    };

    return {
      systemic: calcAvg(systemicQs),
      relational: calcAvg(relationalQs)
    };
  };

  return (
    <div className="space-y-12 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <button onClick={onBack} className="text-zinc-500 hover:text-white text-sm font-bold flex items-center gap-2 mb-2 group">
             <span className="group-hover:-translate-x-1 transition-transform">←</span> חזרה לרשימה
          </button>
          <h2 className="text-4xl font-black text-white">{session.title} - דוח שותפות אסטרטגי</h2>
        </div>
        <div className="flex gap-4">
           <button 
            disabled={session.responses.length < 1 || loading}
            onClick={handleAnalyze}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white px-8 py-4 rounded-2xl font-black transition-all shadow-xl shadow-indigo-600/20 active:scale-95 flex items-center gap-3"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : '✨ הפק ניתוח AI מעמיק'}
          </button>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass rounded-[2.5rem] p-10 space-y-8 min-h-[500px] flex flex-col">
          <h3 className="text-xl font-black text-white">פרופיל הממשק השוואתי</h3>
          <div className="w-full flex-grow h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                <PolarGrid stroke="#3f3f46" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 13, fontWeight: 900 }} />
                <PolarRadiusAxis angle={90} domain={[0, 7]} tick={false} axisLine={false} />
                {session.sides.map((side, idx) => (
                  <Radar
                    key={side}
                    name={side}
                    dataKey={side}
                    stroke={SIDE_COLORS[idx % SIDE_COLORS.length]}
                    fill={SIDE_COLORS[idx % SIDE_COLORS.length]}
                    fillOpacity={0.3}
                    strokeWidth={3}
                  />
                ))}
                <Legend iconType="circle" />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-[2.5rem] p-10 space-y-8 flex flex-col">
          <h3 className="text-xl font-black text-white">דירוג פרמטרים (חוזקות מול חולשות)</h3>
          <div className="w-full flex-grow h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortedParameters} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" domain={[0, 7]} hide />
                <YAxis dataKey="subject" type="category" tick={{ fill: '#f4f4f5', fontWeight: 700 }} width={80} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl shadow-2xl">
                          <p className="text-white font-black">{payload[0].payload.subject}</p>
                          <p className="text-indigo-400 font-bold">ממוצע: {payload[0].value}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="average" radius={[0, 10, 10, 0]} barSize={24}>
                  {sortedParameters.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.average >= 5 ? '#10b981' : entry.average >= 3.5 ? '#6366f1' : '#f43f5e'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500 px-4">
             <span className="text-rose-500">חולשה מרכזית</span>
             <span className="text-emerald-500">חוזקה משמעותית</span>
          </div>
        </div>
      </div>

      {/* Gap Analysis and Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <div className="md:col-span-2 glass rounded-[2.5rem] p-10 space-y-8">
            <h3 className="text-xl font-black text-white">מחוון פערים בין תפיסות הצדדים</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="text-zinc-500 text-[10px] font-black uppercase tracking-widest border-b border-zinc-800">
                    <th className="pb-4">צד בשותפות</th>
                    <th className="pb-4 text-center">ציון מערכתי (מנגנונים)</th>
                    <th className="pb-4 text-center">ציון יחסים (הון אנושי)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {session.sides.map((side, idx) => {
                    const avgs = getSideAverages(side);
                    return (
                      <tr key={side}>
                        <td className="py-6 font-bold text-white flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SIDE_COLORS[idx % SIDE_COLORS.length] }}></div>
                          {side}
                        </td>
                        <td className="py-6 text-center font-black text-lg text-indigo-400">{avgs.systemic}</td>
                        <td className="py-6 text-center font-black text-lg text-purple-400">{avgs.relational}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
         </div>

         <div className="glass rounded-[2.5rem] p-10 flex flex-col justify-center text-center space-y-6">
            <h4 className="text-zinc-500 font-black text-xs uppercase tracking-widest">מדד הבריאות הכולל</h4>
            <div className="relative inline-flex items-center justify-center">
               <svg className="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-zinc-800" />
                  <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" 
                    strokeDasharray={364}
                    strokeDashoffset={364 - (364 * (sortedParameters.reduce((a,b)=>a+b.average,0) / (sortedParameters.length || 1)) / 7)}
                    className="text-indigo-500" 
                    strokeLinecap="round"
                  />
               </svg>
               <span className="absolute text-4xl font-black text-white">
                 {((sortedParameters.reduce((a,b)=>a+b.average,0) / (sortedParameters.length || 1)) / 7 * 100).toFixed(0)}%
               </span>
            </div>
            <p className="text-xs text-zinc-400 font-medium leading-relaxed">ציון זה משקף את מידת הסנכרון והאפקטיביות הכוללת של הממשק על בסיס כלל המענים.</p>
         </div>
      </div>

      {/* AI Analysis Section */}
      {session.analysis && (
        <div className="space-y-10 animate-slideDown">
          <div className="flex items-center gap-6">
             <h3 className="text-3xl font-black text-white">ניתוח AI אסטרטגי</h3>
             <div className="h-px bg-zinc-800 flex-grow"></div>
          </div>

          <div className="glass rounded-[3rem] p-12 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
             <div className="relative z-10 space-y-8">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                   </div>
                   <h4 className="text-sm font-black text-indigo-400 uppercase tracking-widest">תובנות עומק והמלצות אסטרטגיות</h4>
                </div>
                <div className="prose prose-invert max-w-none">
                   {session.analysis.summary.split('\n').map((p, i) => (
                     <p key={i} className="text-xl font-bold text-zinc-200 leading-relaxed mb-6">{p}</p>
                   ))}
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="glass rounded-[2.5rem] p-10 space-y-6 border-emerald-500/20">
                <h4 className="text-emerald-500 font-black text-xs uppercase tracking-widest">חוזקות הממשק כעוגן לצמיחה</h4>
                <div className="space-y-4">
                   {[...session.analysis.strengths.systemic, ...session.analysis.strengths.relational].map((s, i) => (
                     <div key={i} className="flex gap-4 p-5 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 text-emerald-100 font-bold">
                        <span className="text-emerald-500">●</span> {s}
                     </div>
                   ))}
                </div>
             </div>
             <div className="glass rounded-[2.5rem] p-10 space-y-6 border-rose-500/20">
                <h4 className="text-rose-500 font-black text-xs uppercase tracking-widest">חסמים הדורשים טיפול שורש</h4>
                <div className="space-y-4">
                   {[...session.analysis.weaknesses.systemic, ...session.analysis.weaknesses.relational].map((w, i) => (
                     <div key={i} className="flex gap-4 p-5 bg-rose-500/5 rounded-2xl border border-rose-500/10 text-rose-100 font-bold">
                        <span className="text-rose-500">●</span> {w}
                     </div>
                   ))}
                </div>
             </div>
          </div>

          <div className="space-y-8">
             <h4 className="text-xl font-black text-white">תוכנית פעולה אופרטיבית (Action Plan)</h4>
             <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-4">
                {session.analysis.operationalRecommendations.map((rec, i) => (
                  <div key={i} className="bg-zinc-900/60 p-8 rounded-[2rem] border border-zinc-800 flex items-start gap-6 hover:border-indigo-500/40 transition-all group">
                     <span className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-black text-xl flex-shrink-0 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                       {i+1}
                     </span>
                     <p className="text-lg font-bold text-zinc-200 leading-relaxed">{rec}</p>
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
