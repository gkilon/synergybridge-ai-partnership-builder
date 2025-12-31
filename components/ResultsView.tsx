
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
    setLoading(true);
    try {
      const result = await analyzePartnership(session);
      onUpdate({ ...session, analysis: result });
    } catch (e) {
      alert(e);
    } finally {
      setLoading(false);
    }
  };

  const getChartData = () => {
    return session.questions.map(q => {
      const dataPoint: any = { subject: q.text.slice(0, 15) + '...' };
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
    if (sideResponses.length === 0) return { systemic: 0, relational: 0, total: 0 };

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
      return count > 0 ? (sum / count).toFixed(1) : 0;
    };

    return {
      systemic: calcAvg(systemicQs),
      relational: calcAvg(relationalQs)
    };
  };

  return (
    <div className="space-y-12 animate-fadeIn pb-20">
      <div className="flex justify-between items-center">
        <div>
          <button onClick={onBack} className="text-zinc-500 hover:text-white text-sm font-bold flex items-center gap-2 mb-2">
             <span>← חזרה לרשימה</span>
          </button>
          <h2 className="text-4xl font-black text-white">{session.title} - דו"ח תמונת מצב</h2>
        </div>
        <button 
          disabled={session.responses.length < 2 || loading}
          onClick={handleAnalyze}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white px-8 py-3.5 rounded-2xl font-black transition-all shadow-xl shadow-emerald-600/20"
        >
          {loading ? 'מנתח נתונים...' : '✨ הפק ניתוח AI מעמיק'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Spider Chart Section */}
        <div className="glass rounded-[2.5rem] p-10 space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black text-white">השוואת תפיסות בין הצדדים</h3>
            <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">{session.responses.length} מענים סה"כ</span>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={getChartData()}>
                <PolarGrid stroke="#3f3f46" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fill: '#3f3f46' }} />
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
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-xs text-zinc-500 italic">הגרף מציג את הממוצע של כל צד בכל אחד מהקריטריונים.</p>
        </div>

        {/* Gap Analysis Table */}
        <div className="glass rounded-[2.5rem] p-10 space-y-8">
          <h3 className="text-xl font-black text-white">מחוון פערים (Gap Analysis)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="text-zinc-500 text-xs font-black uppercase tracking-widest border-b border-zinc-800">
                  <th className="pb-4">צד בממשק</th>
                  <th className="pb-4">ממוצע מערכתי</th>
                  <th className="pb-4">ממוצע יחסים</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {session.sides.map((side, idx) => {
                  const avgs = getSideAverages(side);
                  return (
                    <tr key={side} className="group">
                      <td className="py-5 font-bold text-white flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SIDE_COLORS[idx % SIDE_COLORS.length] }}></span>
                        {side}
                      </td>
                      <td className="py-5">
                         <span className={`px-3 py-1 rounded-lg font-black ${Number(avgs.systemic) < 3 ? 'text-rose-400 bg-rose-400/10' : 'text-zinc-300'}`}>
                           {avgs.systemic}
                         </span>
                      </td>
                      <td className="py-5">
                        <span className={`px-3 py-1 rounded-lg font-black ${Number(avgs.relational) < 3 ? 'text-rose-400 bg-rose-400/10' : 'text-zinc-300'}`}>
                           {avgs.relational}
                         </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-5 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
             <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-2">תובנת פערים מהירה:</h4>
             <p className="text-sm text-zinc-400">
               {session.responses.length < 2 
                ? "ממתין לנתונים נוספים כדי לזהות פערים." 
                : "שים לב לפערים של מעל 1.0 נקודה בין הצדדים - אלו נקודות עיוורון (Blind Spots) שדורשות שיח מיידי."}
             </p>
          </div>
        </div>
      </div>

      {/* AI Results Section */}
      {session.analysis && (
        <div className="space-y-8 animate-slideDown">
          <div className="flex items-center gap-4">
             <div className="h-px bg-zinc-800 flex-grow"></div>
             <h3 className="text-2xl font-black text-white whitespace-nowrap">ניתוח והמלצות AI</h3>
             <div className="h-px bg-zinc-800 flex-grow"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             <div className="md:col-span-2 glass rounded-[2.5rem] p-10 border-indigo-500/20 shadow-2xl shadow-indigo-500/5">
                <h4 className="text-sm font-black text-zinc-500 uppercase tracking-widest mb-6">סיכום תמונת מצב אסטרטגית</h4>
                <p className="text-xl font-bold text-indigo-100 leading-relaxed italic">
                  "{session.analysis.summary}"
                </p>
             </div>
             
             <div className="glass rounded-[2.5rem] p-8 space-y-6">
                <h4 className="text-sm font-black text-zinc-500 uppercase tracking-widest">חוזקות הממשק</h4>
                <div className="space-y-3">
                   {session.analysis.strengths.systemic.slice(0, 2).map((s, i) => (
                     <div key={i} className="flex gap-3 text-sm font-bold text-emerald-400 bg-emerald-400/5 p-3 rounded-xl border border-emerald-400/10">
                        <span>✓</span> {s}
                     </div>
                   ))}
                   {session.analysis.strengths.relational.slice(0, 1).map((s, i) => (
                     <div key={i} className="flex gap-3 text-sm font-bold text-blue-400 bg-blue-400/5 p-3 rounded-xl border border-blue-400/10">
                        <span>✓</span> {s}
                     </div>
                   ))}
                </div>
             </div>
          </div>

          <div className="glass rounded-[3rem] p-10 overflow-hidden relative">
             <div className="absolute top-0 right-0 p-10 opacity-10">
                <svg className="w-32 h-32 text-indigo-500" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
             </div>
             <h4 className="text-sm font-black text-zinc-500 uppercase tracking-widest mb-8">תוכנית פעולה אופרטיבית (Quick Wins)</h4>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {session.analysis.operationalRecommendations.map((rec, i) => (
                  <div key={i} className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800 hover:border-indigo-500/30 transition-all group">
                     <span className="text-3xl font-black text-zinc-800 group-hover:text-indigo-500 transition-colors">0{i+1}</span>
                     <p className="mt-4 text-sm font-bold text-zinc-200 leading-relaxed">{rec}</p>
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
