
import React, { useState, useMemo } from 'react';
import { PartnershipSession, AIAnalysis, Category } from '../types';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, 
  LabelList 
} from 'recharts';
import { analyzePartnership } from '../services/geminiService';

interface Props {
  session: PartnershipSession | undefined;
  onUpdate: (updated: PartnershipSession) => void;
  onBack: () => void;
}

const SIDE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

const ResultsView: React.FC<Props> = ({ session, onUpdate, onBack }) => {
  const [loading, setLoading] = useState(false);

  if (!session) return null;

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const result = await analyzePartnership(session);
      onUpdate({ ...session, analysis: result });
    } catch (e: any) {
      alert(e.message || "חלה שגיאה בחיבור למערכת הניתוח");
    } finally {
      setLoading(false);
    }
  };

  const { chartData, sortedCategories, averageScore } = useMemo(() => {
    if (!session.questions || session.questions.length === 0) return { chartData: [], sortedCategories: [], averageScore: 0 };
    
    const groups = Array.from(new Set(session.questions.map(q => q.shortLabel || 'כללי')));
    let totalScore = 0;
    let totalPoints = 0;

    const stats = groups.map(label => {
      const dataPoint: any = { subject: label };
      const relatedQs = session.questions.filter(q => (q.shortLabel || 'כללי') === label);
      
      let catTotal = 0;
      let catCount = 0;

      session.sides.forEach(side => {
        const sideResponses = session.responses.filter(r => r.side === side);
        let sideTotal = 0;
        let sideCount = 0;
        
        sideResponses.forEach(r => {
          relatedQs.forEach(q => {
            if (r.scores[q.id] !== undefined) {
              sideTotal += r.scores[q.id];
              sideCount++;
              catTotal += r.scores[q.id];
              catCount++;
            }
          });
        });
        
        dataPoint[side] = sideCount > 0 ? Number((sideTotal / sideCount).toFixed(1)) : 0;
      });

      const avg = catCount > 0 ? Number((catTotal / catCount).toFixed(1)) : 0;
      dataPoint.average = avg;
      totalScore += catTotal;
      totalPoints += catCount;
      return dataPoint;
    });

    const sorted = [...stats].sort((a, b) => b.average - a.average);
    const finalAvg = totalPoints > 0 ? Number(((totalScore / totalPoints) / 7 * 100).toFixed(0)) : 0;

    return { chartData: stats, sortedCategories: sorted, averageScore: finalAvg };
  }, [session]);

  const healthStatus = useMemo(() => {
    if (averageScore >= 80) return { label: 'שותפות איתנה', color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: '💎' };
    if (averageScore >= 60) return { label: 'ממשק תקין', color: 'text-indigo-400', bg: 'bg-indigo-500/10', icon: '✅' };
    if (averageScore >= 40) return { label: 'נדרשת התערבות', color: 'text-amber-400', bg: 'bg-amber-500/10', icon: '⚠️' };
    return { label: 'שותפות בשבר', color: 'text-rose-400', bg: 'bg-rose-500/10', icon: '🚨' };
  }, [averageScore]);

  return (
    <div className="space-y-10 animate-fadeIn pb-32 max-w-7xl mx-auto px-4 text-right" dir="rtl">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 border-b border-zinc-800 pb-10">
        <div className="flex gap-6 items-center">
           <div className={`w-24 h-24 rounded-3xl ${healthStatus.bg} border border-white/5 flex flex-col items-center justify-center shadow-2xl`}>
              <span className="text-4xl">{healthStatus.icon}</span>
              <span className={`text-xl font-black ${healthStatus.color}`}>{averageScore}%</span>
           </div>
           <div>
              <h2 className="text-5xl font-black text-white tracking-tighter mb-2">{session.title}</h2>
              <p className="text-zinc-500 font-bold text-lg">דוח מודיעין שותפויות | {healthStatus.label}</p>
           </div>
        </div>
        <div className="flex gap-4">
           <button onClick={onBack} className="bg-zinc-900 text-zinc-400 px-8 py-4 rounded-2xl font-bold hover:text-white transition-all border border-zinc-800">חזרה</button>
           <button 
             disabled={loading || session.responses.length < 1}
             onClick={handleAnalyze}
             className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white px-12 py-4 rounded-2xl font-black transition-all shadow-3xl shadow-indigo-600/30 flex items-center gap-4 text-lg"
           >
             {loading ? <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : '✨ הפעל סוכן אסטרטגי AI'}
           </button>
        </div>
      </div>

      {/* DASHBOARD: Radar + Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
         {/* LEFT: Perception Spider Chart */}
         <div className="lg:col-span-7 glass rounded-[4rem] p-12 border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
            <h3 className="text-2xl font-black text-white mb-2 relative z-10">מיפוי פערים תפיסתיים</h3>
            <p className="text-zinc-500 text-sm font-bold mb-10 relative z-10">השוואה רב-ממדית בין הצדדים לאורך צירים אסטרטגיים</p>
            
            <div className="w-full h-[450px] relative z-10">
               <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                    <PolarGrid stroke="#27272a" strokeWidth={1} />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 12, fontWeight: 800 }} />
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
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '30px' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '12px', textAlign: 'right' }}
                    />
                  </RadarChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* RIGHT: Ranking Histogram */}
         <div className="lg:col-span-5 glass rounded-[4rem] p-12 border-white/5 shadow-2xl relative overflow-hidden group">
            <h3 className="text-2xl font-black text-white mb-2">דירוג ביצועי הממשק</h3>
            <p className="text-zinc-500 text-sm font-bold mb-10">ממוצעים מסודרים מהגבוה לנמוך (Scale 1-7)</p>
            
            <div className="w-full h-[450px]">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sortedCategories} layout="vertical" margin={{ right: 40, left: 10 }}>
                    <XAxis type="number" domain={[0, 7]} hide />
                    <YAxis dataKey="subject" type="category" width={110} tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 900 }} axisLine={false} tickLine={false} />
                    <Bar dataKey="average" radius={[0, 10, 10, 0]} barSize={28}>
                       {sortedCategories.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.average >= 5.5 ? '#10b981' : entry.average >= 4 ? '#6366f1' : '#f43f5e'} />
                       ))}
                       <LabelList dataKey="average" position="right" style={{ fill: '#ffffff', fontSize: 12, fontWeight: 900 }} />
                    </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>

      {/* AI STRATEGIC CONCLUSION - THE "BRAIN" */}
      {session.analysis && (
        <div className="space-y-10 animate-slideUp pt-10 border-t border-zinc-800">
           <div className="flex items-center gap-6">
              <h3 className="text-4xl font-black text-white tracking-tighter">המסקנות של המוח האסטרטגי (AI)</h3>
              <div className="h-px bg-zinc-800 flex-grow"></div>
           </div>

           {/* Summary Quote Box */}
           <div className="glass rounded-[4rem] p-16 border-indigo-500/20 bg-indigo-500/5 relative overflow-hidden shadow-4xl group">
              <div className="absolute -top-10 -right-10 text-zinc-900 font-black text-[200px] leading-none opacity-20 pointer-events-none">"</div>
              <h4 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.5em] mb-8 relative z-10">תובנת העל והפרשנות המערכתית</h4>
              <p className="text-3xl md:text-4xl font-black text-white leading-tight tracking-tight relative z-10 max-w-5xl">
                {session.analysis.summary}
              </p>
           </div>

           {/* Strengths / Weaknesses Details */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="glass p-12 rounded-[3rem] border-emerald-500/10 bg-emerald-500/5">
                 <h4 className="text-xl font-black text-emerald-400 mb-8 flex items-center gap-4">
                    <span className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center">✦</span>
                    עמודי התווך של הממשק
                 </h4>
                 <div className="space-y-8">
                    <div>
                       <h5 className="text-[10px] font-black text-emerald-600/60 uppercase mb-4 tracking-widest">ברמה המערכתית</h5>
                       <div className="space-y-3">
                          {session.analysis.strengths.systemic.map((s, i) => (
                            <p key={i} className="text-sm font-bold text-zinc-200 bg-black/20 p-4 rounded-2xl border border-emerald-500/10">{s}</p>
                          ))}
                       </div>
                    </div>
                    <div>
                       <h5 className="text-[10px] font-black text-emerald-600/60 uppercase mb-4 tracking-widest">בציר היחסים</h5>
                       <div className="space-y-3">
                          {session.analysis.strengths.relational.map((s, i) => (
                            <p key={i} className="text-sm font-bold text-zinc-200 bg-black/20 p-4 rounded-2xl border border-emerald-500/10">{s}</p>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>

              <div className="glass p-12 rounded-[3rem] border-rose-500/10 bg-rose-500/5">
                 <h4 className="text-xl font-black text-rose-400 mb-8 flex items-center gap-4">
                    <span className="w-10 h-10 rounded-2xl bg-rose-500/20 flex items-center justify-center">◇</span>
                    חסמים וסיכונים קריטיים
                 </h4>
                 <div className="space-y-8">
                    <div>
                       <h5 className="text-[10px] font-black text-rose-600/60 uppercase mb-4 tracking-widest">חסמי תשתית</h5>
                       <div className="space-y-3">
                          {session.analysis.weaknesses.systemic.map((w, i) => (
                            <p key={i} className="text-sm font-bold text-zinc-300 bg-black/20 p-4 rounded-2xl border border-rose-500/10">{w}</p>
                          ))}
                       </div>
                    </div>
                    <div>
                       <h5 className="text-[10px] font-black text-rose-600/60 uppercase mb-4 tracking-widest">חסמי תרבות</h5>
                       <div className="space-y-3">
                          {session.analysis.weaknesses.relational.map((w, i) => (
                            <p key={i} className="text-sm font-bold text-zinc-300 bg-black/20 p-4 rounded-2xl border border-rose-500/10">{w}</p>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           {/* IMPLEMENTATION ROADMAP */}
           <div className="space-y-8 pt-6">
              <h4 className="text-3xl font-black text-white">תוכנית יישום אופרטיבית</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {/* Systemic Recs */}
                 <div className="space-y-5">
                    <h5 className="text-sm font-black text-indigo-400 pr-4 border-r-2 border-indigo-500">מהלכים מערכתיים מיידיים</h5>
                    {session.analysis.recommendations.systemic.map((rec, i) => (
                       <div key={i} className="bg-zinc-900/60 p-8 rounded-[2rem] border border-zinc-800 flex items-start gap-6 group hover:border-indigo-500/40 transition-all shadow-xl">
                          <span className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-sm font-black flex-shrink-0 border border-indigo-500/10">{i+1}</span>
                          <p className="text-lg font-bold text-zinc-100 leading-snug">{rec}</p>
                       </div>
                    ))}
                 </div>
                 {/* Relational Recs */}
                 <div className="space-y-5">
                    <h5 className="text-sm font-black text-purple-400 pr-4 border-r-2 border-purple-500">שיקום וטיפוח ציר היחסים</h5>
                    {session.analysis.recommendations.relational.map((rec, i) => (
                       <div key={i} className="bg-zinc-900/60 p-8 rounded-[2rem] border border-zinc-800 flex items-start gap-6 group hover:border-purple-500/40 transition-all shadow-xl">
                          <span className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center text-sm font-black flex-shrink-0 border border-purple-500/10">{i+1}</span>
                          <p className="text-lg font-bold text-zinc-100 leading-snug">{rec}</p>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ResultsView;
