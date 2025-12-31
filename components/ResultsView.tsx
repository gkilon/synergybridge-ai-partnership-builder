
import React, { useState } from 'react';
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
    // Check for API Key selection if the capability exists
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

  const getChartData = () => {
    return session.questions.map(q => {
      // Use shortLabel if available, otherwise truncate the text
      const dataPoint: any = { subject: q.shortLabel || (q.text.length > 12 ? q.text.slice(0, 10) + '...' : q.text) };
      session.sides.forEach(side => {
        const sideResponses = session.responses.filter(r => r.side === side);
        const avg = sideResponses.length > 0 
          ? sideResponses.reduce((acc, curr) => acc + (curr.scores[q.id] || 0), 0) / sideResponses.length 
          : 0;
        dataPoint[side] = Number(avg.toFixed(1));
      });
      return dataPoint;
    });
  };

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
          <h2 className="text-4xl font-black text-white">{session.title} - דו"ח תמונת מצב</h2>
        </div>
        <button 
          disabled={session.responses.length < 1 || loading}
          onClick={handleAnalyze}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white px-8 py-4 rounded-2xl font-black transition-all shadow-xl shadow-emerald-600/20 active:scale-95"
        >
          {loading ? (
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              <span>מנתח נתונים...</span>
            </div>
          ) : (
            '✨ הפק ניתוח AI מעמיק'
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Spider Chart Section */}
        <div className="glass rounded-[2.5rem] p-8 md:p-10 space-y-8 min-h-[500px] flex flex-col">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black text-white">השוואת תפיסות (ציר 1-7)</h3>
            <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">{session.responses.length} מענים</span>
          </div>
          
          <div className="w-full flex-grow h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={getChartData()}>
                <PolarGrid stroke="#3f3f46" />
                <PolarAngleAxis 
                  dataKey="subject" 
                  tick={{ fill: '#a1a1aa', fontSize: 12, fontWeight: 800 }} 
                />
                <PolarRadiusAxis 
                  angle={30} 
                  domain={[0, 7]} 
                  tick={{ fill: '#3f3f46', fontSize: 10 }} 
                />
                {session.sides.map((side, idx) => (
                  <Radar
                    key={side}
                    name={side}
                    dataKey={side}
                    stroke={SIDE_COLORS[idx % SIDE_COLORS.length]}
                    fill={SIDE_COLORS[idx % SIDE_COLORS.length]}
                    fillOpacity={0.3}
                  />
                ))}
                <Legend iconType="circle" />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-xs text-zinc-500 italic">הגרף מציג את הממוצע של כל צד במילים מרכזיות למניעת חפיפה.</p>
        </div>

        {/* Gap Analysis Table */}
        <div className="glass rounded-[2.5rem] p-8 md:p-10 space-y-8 flex flex-col">
          <h3 className="text-xl font-black text-white">מחוון פערים (Gap Analysis)</h3>
          <div className="overflow-x-auto flex-grow">
            <table className="w-full text-right">
              <thead>
                <tr className="text-zinc-500 text-[10px] font-black uppercase tracking-widest border-b border-zinc-800">
                  <th className="pb-4 text-right">צד בממשק</th>
                  <th className="pb-4 text-center">ממוצע מערכתי</th>
                  <th className="pb-4 text-center">ממוצע יחסים</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {session.sides.map((side, idx) => {
                  const avgs = getSideAverages(side);
                  return (
                    <tr key={side} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="py-5 font-bold text-white flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full shadow-lg" style={{ backgroundColor: SIDE_COLORS[idx % SIDE_COLORS.length] }}></span>
                        {side}
                      </td>
                      <td className="py-5 text-center">
                         <span className={`px-3 py-1.5 rounded-xl font-black text-sm ${Number(avgs.systemic) < 4 ? 'text-rose-400 bg-rose-400/10' : 'text-emerald-400 bg-emerald-400/10'}`}>
                           {avgs.systemic}
                         </span>
                      </td>
                      <td className="py-5 text-center">
                        <span className={`px-3 py-1.5 rounded-xl font-black text-sm ${Number(avgs.relational) < 4 ? 'text-rose-400 bg-rose-400/10' : 'text-emerald-400 bg-emerald-400/10'}`}>
                           {avgs.relational}
                         </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-6 bg-indigo-500/5 rounded-3xl border border-indigo-500/10 mt-4">
             <div className="flex items-center gap-3 mb-2">
                <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest">תובנת פערים:</h4>
             </div>
             <p className="text-xs text-zinc-400 leading-relaxed font-medium">
               {session.responses.length < 2 
                ? "יש צורך במענים משני הצדדים כדי להציג ניתוח פערים השוואתי." 
                : "בסקאלה של 7, פער של מעל 1.5 נקודות בין הצדדים מעיד על חוסר הלימה משמעותי."}
             </p>
          </div>
        </div>
      </div>

      {/* AI Results Section */}
      {session.analysis && (
        <div className="space-y-8 animate-slideDown">
          <div className="flex items-center gap-6">
             <h3 className="text-2xl font-black text-white whitespace-nowrap">ניתוח והמלצות AI</h3>
             <div className="h-px bg-zinc-800 flex-grow"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             <div className="md:col-span-2 glass rounded-[2.5rem] p-10 border-indigo-500/20 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-6">סיכום תמונת מצב אסטרטגית</h4>
                <p className="text-xl font-bold text-indigo-50 leading-relaxed">
                  "{session.analysis.summary}"
                </p>
             </div>
             
             <div className="glass rounded-[2.5rem] p-8 space-y-6">
                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">חוזקות הממשק</h4>
                <div className="space-y-3">
                   {session.analysis.strengths.systemic.map((s, i) => (
                     <div key={i} className="flex gap-3 text-xs font-bold text-emerald-400 bg-emerald-400/5 p-4 rounded-2xl border border-emerald-400/10">
                        <span className="flex-shrink-0">✓</span> {s}
                     </div>
                   ))}
                   {session.analysis.strengths.relational.map((s, i) => (
                     <div key={i} className="flex gap-3 text-xs font-bold text-blue-400 bg-blue-400/5 p-4 rounded-2xl border border-blue-400/10">
                        <span className="flex-shrink-0">✓</span> {s}
                     </div>
                   ))}
                </div>
             </div>
          </div>

          <div className="glass rounded-[3rem] p-10 border-zinc-800">
             <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <h4 className="text-sm font-black text-white uppercase tracking-widest">תוכנית פעולה אופרטיבית (Quick Wins)</h4>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {session.analysis.operationalRecommendations.map((rec, i) => (
                  <div key={i} className="bg-zinc-900/40 p-8 rounded-[2rem] border border-zinc-800 hover:border-indigo-500/30 transition-all group relative overflow-hidden">
                     <span className="absolute -top-4 -left-4 text-7xl font-black text-white/[0.03] group-hover:text-indigo-500/[0.05] transition-colors">{i+1}</span>
                     <p className="text-sm font-bold text-zinc-300 leading-relaxed relative z-10">{rec}</p>
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
