
import React, { useState, useMemo } from 'react';
import { PartnershipSession, AIAnalysis, Category } from '../types';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, Tooltip, Cell 
} from 'recharts';
import { analyzePartnership } from '../services/geminiService';

interface Props {
  session: PartnershipSession | undefined;
  onUpdate: (updated: PartnershipSession) => void;
  onBack: () => void;
}

const SIDE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
const CHART_TEXT_STYLE = { fill: '#71717a', fontSize: 10, fontWeight: 900 };

const ResultsView: React.FC<Props> = ({ session, onUpdate, onBack }) => {
  const [loading, setLoading] = useState(false);

  if (!session) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-6 animate-fadeIn">
        <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-700">
           <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <p className="text-zinc-500 font-black text-xl">הממשק המבוקש לא נמצא</p>
        <button onClick={onBack} className="bg-indigo-600 px-8 py-3 rounded-2xl text-white font-bold shadow-xl">חזרה לרשימה</button>
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
        alert("שגיאת הרשאה: וודא שהגדרת VITE_GEMINI_API_KEY תקין בסביבת העבודה.");
      } else {
        alert(e.message || "חלה שגיאה בחיבור למערכת הניתוח");
      }
    } finally {
      setLoading(false);
    }
  };

  // Data Processing: Merge outcomes and prepare chart data
  const { chartData, sortedCategories } = useMemo(() => {
    if (!session.questions || session.questions.length === 0) return { chartData: [], sortedCategories: [] };
    
    const outcomeLabels = ["אפקטיביות גלובלית", "שביעות רצון"];
    const rawGroups = Array.from(new Set(session.questions.map(q => q.shortLabel || 'כללי')));
    
    // Process unique categories, merging outcomes
    const categoryLabels = rawGroups.filter(g => !outcomeLabels.includes(g));
    categoryLabels.push("שביעות רצון ותוצאות");

    const stats = categoryLabels.map(label => {
      const dataPoint: any = { subject: label };
      const relatedQuestions = session.questions.filter(q => {
        if (label === "שביעות רצון ותוצאות") return outcomeLabels.includes(q.shortLabel || "");
        return (q.shortLabel || 'כללי') === label;
      });

      if (relatedQuestions.length === 0) return null;

      let totalGlobal = 0;
      let countGlobal = 0;
      const sideAverages: Record<string, number> = {};

      session.sides.forEach(side => {
        const sideResponses = session.responses.filter(r => r.side === side);
        let totalSide = 0;
        let countSide = 0;
        
        sideResponses.forEach(r => {
          relatedQuestions.forEach(q => {
            if (r.scores && r.scores[q.id] !== undefined) {
              totalSide += r.scores[q.id];
              countSide++;
              totalGlobal += r.scores[q.id];
              countGlobal++;
            }
          });
        });
        
        const avg = countSide > 0 ? Number((totalSide / countSide).toFixed(1)) : 0;
        dataPoint[side] = avg;
        sideAverages[side] = avg;
      });

      const totalAvg = countGlobal > 0 ? Number((totalGlobal / countGlobal).toFixed(1)) : 0;
      dataPoint.average = totalAvg;

      let gap = 0;
      if (session.sides.length >= 2) {
        const vals = session.sides.map(s => sideAverages[s]);
        gap = Number((Math.max(...vals) - Math.min(...vals)).toFixed(1));
      }

      return { ...dataPoint, totalAvg, gap };
    }).filter(Boolean) as any[];

    const sorted = [...stats].sort((a, b) => b.totalAvg - a.totalAvg);
    return { chartData: stats, sortedCategories: sorted };
  }, [session]);

  const healthIndicator = useMemo(() => {
    const outcome = sortedCategories.find(s => s.subject === "שביעות רצון ותוצאות");
    const score = outcome ? (outcome.totalAvg / 7) * 100 : 0;
    
    if (score >= 85) return { label: 'שותפות מופתית', color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: '💎' };
    if (score >= 65) return { label: 'ממשק יציב', color: 'text-indigo-400', bg: 'bg-indigo-400/10', icon: '✅' };
    if (score >= 40) return { label: 'ממשק בסיסי', color: 'text-amber-400', bg: 'bg-amber-400/10', icon: '⚠️' };
    return { label: 'שותפות בשבר', color: 'text-rose-400', bg: 'bg-rose-400/10', icon: '🚨' };
  }, [sortedCategories]);

  return (
    <div className="space-y-10 animate-fadeIn pb-32 max-w-7xl mx-auto px-4 md:px-0 text-right" dir="rtl">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-zinc-800 pb-8">
        <div className="flex items-center gap-6">
           <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${healthIndicator.bg} border border-white/5 shadow-xl`}>
              <span className="text-4xl">{healthIndicator.icon}</span>
           </div>
           <div>
              <h2 className="text-4xl font-black text-white tracking-tighter">{session.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                 <span className={`text-sm font-black ${healthIndicator.color}`}>{healthIndicator.label}</span>
                 <span className="text-zinc-600">•</span>
                 <span className="text-zinc-500 text-sm font-bold">{session.responses.length} משתתפים</span>
              </div>
           </div>
        </div>
        <div className="flex gap-4">
           <button onClick={onBack} className="bg-zinc-900 text-zinc-400 px-6 py-4 rounded-2xl font-bold hover:text-white transition-all border border-zinc-800">חזרה</button>
           <button 
             disabled={session.responses.length < 1 || loading}
             onClick={handleAnalyze}
             className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white px-10 py-4 rounded-2xl font-black transition-all shadow-xl flex items-center gap-3"
           >
             {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : '✨ הפק תובנות אסטרטגיות (AI)'}
           </button>
        </div>
      </div>

      {/* DASHBOARD: Radar + Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Radar Chart: Global View */}
         <div className="glass rounded-[3rem] p-10 min-h-[450px] flex flex-col border-white/5 shadow-2xl overflow-hidden">
            <h3 className="text-xl font-black text-white mb-2">תמונת מצב היקפית</h3>
            <p className="text-zinc-500 text-xs font-bold mb-6">השוואת תפיסות בין הצדדים לאורך הצירים</p>
            <div className="flex-grow w-full h-[350px]">
               <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                    <PolarGrid stroke="#27272a" />
                    <PolarAngleAxis dataKey="subject" tick={CHART_TEXT_STYLE} />
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

         {/* Bar Chart: Rankings */}
         <div className="glass rounded-[3rem] p-10 min-h-[450px] flex flex-col border-white/5 shadow-2xl overflow-hidden">
            <h3 className="text-xl font-black text-white mb-2">דירוג ביצועי הממשק</h3>
            <p className="text-zinc-500 text-xs font-bold mb-6">ממוצעי הצירים מסודרים מהגבוה לנמוך</p>
            <div className="flex-grow w-full h-[350px]">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sortedCategories} layout="vertical" margin={{ left: 20, right: 30, top: 0, bottom: 0 }}>
                    <XAxis type="number" domain={[0, 7]} hide />
                    <YAxis dataKey="subject" type="category" width={100} tick={CHART_TEXT_STYLE} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{fill: 'rgba(255,255,255,0.05)'}}
                      contentStyle={{backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px', textAlign: 'right'}}
                    />
                    <Bar dataKey="totalAvg" radius={[0, 8, 8, 0]} barSize={24}>
                       {sortedCategories.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.totalAvg >= 5.5 ? '#10b981' : entry.totalAvg >= 4 ? '#6366f1' : '#f43f5e'} />
                       ))}
                    </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>

      {/* AI STRATEGIC DEEP DIVE */}
      {session.analysis && (
        <div className="space-y-12 animate-slideUp pt-8 border-t border-zinc-800">
           <div className="flex items-center gap-4">
              <h3 className="text-3xl font-black text-white tracking-tighter">ניתוח אסטרטגי ותוכנית פעולה (AI)</h3>
              <div className="h-px bg-zinc-800 flex-grow"></div>
           </div>

           {/* Insights Summary */}
           <div className="glass rounded-[4rem] p-12 md:p-16 border-indigo-500/20 bg-indigo-500/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 text-zinc-900 font-black text-9xl opacity-10 pointer-events-none">"</div>
              <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-8">תובנת העל והפרשנות המערכתית</h4>
              <p className="text-2xl md:text-3xl font-black text-zinc-100 leading-tight tracking-tight max-w-4xl">
                {session.analysis.summary}
              </p>
           </div>

           {/* Strengths & Weaknesses Grid */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="glass p-10 rounded-[3rem] border-emerald-500/10 bg-emerald-500/5">
                 <h4 className="text-lg font-black text-emerald-400 mb-8 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">✦</span>
                    חוזקות הממשק
                 </h4>
                 <div className="space-y-6">
                    <div>
                       <h5 className="text-[10px] font-black text-emerald-600/60 uppercase mb-4 tracking-widest">מערכתי</h5>
                       <ul className="space-y-3">
                          {session.analysis.strengths.systemic.map((s, i) => (
                            <li key={i} className="text-sm font-bold text-zinc-300 flex items-start gap-3">
                               <span className="text-emerald-500/40 mt-1.5">•</span> {s}
                            </li>
                          ))}
                       </ul>
                    </div>
                    <div>
                       <h5 className="text-[10px] font-black text-emerald-600/60 uppercase mb-4 tracking-widest">יחסים</h5>
                       <ul className="space-y-3">
                          {session.analysis.strengths.relational.map((s, i) => (
                            <li key={i} className="text-sm font-bold text-zinc-300 flex items-start gap-3">
                               <span className="text-emerald-500/40 mt-1.5">•</span> {s}
                            </li>
                          ))}
                       </ul>
                    </div>
                 </div>
              </div>

              <div className="glass p-10 rounded-[3rem] border-rose-500/10 bg-rose-500/5">
                 <h4 className="text-lg font-black text-rose-400 mb-8 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center">◇</span>
                    חסמים וסיכונים
                 </h4>
                 <div className="space-y-6">
                    <div>
                       <h5 className="text-[10px] font-black text-rose-600/60 uppercase mb-4 tracking-widest">מערכתי</h5>
                       <ul className="space-y-3">
                          {session.analysis.weaknesses.systemic.map((w, i) => (
                            <li key={i} className="text-sm font-bold text-zinc-400 flex items-start gap-3">
                               <span className="text-rose-500/40 mt-1.5">•</span> {w}
                            </li>
                          ))}
                       </ul>
                    </div>
                    <div>
                       <h5 className="text-[10px] font-black text-rose-600/60 uppercase mb-4 tracking-widest">יחסים</h5>
                       <ul className="space-y-3">
                          {session.analysis.weaknesses.relational.map((w, i) => (
                            <li key={i} className="text-sm font-bold text-zinc-400 flex items-start gap-3">
                               <span className="text-rose-500/40 mt-1.5">•</span> {w}
                            </li>
                          ))}
                       </ul>
                    </div>
                 </div>
              </div>
           </div>

           {/* Operational Recommendations */}
           <div className="space-y-8 pt-6">
              <h4 className="text-2xl font-black text-white">תוכנית עבודה אופרטיבית</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Systemic Recommendations */}
                 <div className="space-y-4">
                    <h5 className="text-sm font-black text-indigo-400 pr-3 border-r-2 border-indigo-500">מהלכים מערכתיים</h5>
                    {session.analysis.recommendations.systemic.map((rec, i) => (
                       <div key={i} className="bg-zinc-900/40 p-6 rounded-3xl border border-white/5 flex items-start gap-4 shadow-xl">
                          <span className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-xs font-black flex-shrink-0">{i+1}</span>
                          <p className="text-sm font-bold text-zinc-100 leading-snug">{rec}</p>
                       </div>
                    ))}
                 </div>
                 {/* Relational Recommendations */}
                 <div className="space-y-4">
                    <h5 className="text-sm font-black text-purple-400 pr-3 border-r-2 border-purple-500">טיפול בציר היחסים</h5>
                    {session.analysis.recommendations.relational.map((rec, i) => (
                       <div key={i} className="bg-zinc-900/40 p-6 rounded-3xl border border-white/5 flex items-start gap-4 shadow-xl">
                          <span className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center text-xs font-black flex-shrink-0">{i+1}</span>
                          <p className="text-sm font-bold text-zinc-100 leading-snug">{rec}</p>
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
