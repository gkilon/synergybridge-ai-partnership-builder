
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
  const [showAIModal, setShowAIModal] = useState(false);

  if (!session) return null;

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const result = await analyzePartnership(session);
      onUpdate({ ...session, analysis: result });
      setShowAIModal(true); 
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
    <div className="space-y-6 md:space-y-10 animate-fadeIn pb-24 md:pb-32 max-w-7xl mx-auto px-4 text-right relative" dir="rtl">
      
      {/* AI STRATEGIC MODAL (The Popup) */}
      {showAIModal && session.analysis && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-10 animate-fadeIn">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={() => setShowAIModal(false)}></div>
          <div className="glass w-full max-w-5xl max-h-[92vh] md:max-h-[90vh] rounded-[2.5rem] md:rounded-[4rem] border-indigo-500/30 shadow-[0_0_100px_rgba(99,102,241,0.2)] relative z-10 flex flex-col overflow-hidden animate-slideDown">
            
            {/* Modal Header */}
            <div className="p-6 md:p-10 border-b border-zinc-800 flex justify-between items-center bg-indigo-500/5">
               <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-500 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                     <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-xl md:text-3xl font-black text-white leading-none">המוח האסטרטגי: מסקנות</h3>
                    <p className="text-indigo-400 text-[10px] md:text-xs font-black uppercase tracking-widest mt-1">AI Intelligence Briefing</p>
                  </div>
               </div>
               <button onClick={() => setShowAIModal(false)} className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500 hover:text-white transition-colors border border-zinc-800">
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>

            {/* Modal Content */}
            <div className="flex-grow overflow-y-auto p-6 md:p-10 space-y-8 md:space-y-12 custom-scrollbar">
               {/* Summary Quote */}
               <div className="relative p-6 md:p-10 bg-indigo-500/5 rounded-3xl md:rounded-[3rem] border border-indigo-500/10">
                  <div className="absolute -top-3 right-6 md:-top-6 md:right-10 px-3 py-1 md:px-4 md:py-2 bg-indigo-600 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black text-white uppercase tracking-[0.2em]">תובנת העל</div>
                  <p className="text-lg md:text-3xl font-black text-white leading-tight tracking-tight">
                    {session.analysis.summary}
                  </p>
               </div>

               {/* RoadMap Sections */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                  <div className="space-y-4 md:space-y-6">
                     <h4 className="text-lg md:text-xl font-black text-indigo-400 border-r-4 border-indigo-400 pr-3 md:pr-4">מערכת ותשתית</h4>
                     <div className="space-y-3 md:space-y-4">
                        {session.analysis.recommendations.systemic.map((rec, i) => (
                          <div key={i} className="bg-zinc-900/50 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-zinc-800 flex items-start gap-3 md:gap-4">
                             <span className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-[10px] md:text-xs font-black flex-shrink-0 border border-indigo-500/10">{i+1}</span>
                             <p className="text-sm md:text-lg font-bold text-zinc-200 leading-snug">{rec}</p>
                          </div>
                        ))}
                     </div>
                  </div>
                  <div className="space-y-4 md:space-y-6">
                     <h4 className="text-lg md:text-xl font-black text-purple-400 border-r-4 border-purple-400 pr-3 md:pr-4">יחסים ותרבות</h4>
                     <div className="space-y-3 md:space-y-4">
                        {session.analysis.recommendations.relational.map((rec, i) => (
                          <div key={i} className="bg-zinc-900/50 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-zinc-800 flex items-start gap-3 md:gap-4">
                             <span className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center text-[10px] md:text-xs font-black flex-shrink-0 border border-purple-500/10">{i+1}</span>
                             <p className="text-sm md:text-lg font-bold text-zinc-200 leading-snug">{rec}</p>
                          </div>
                        ))}
                     </div>
                  </div>
               </div>

               {/* Quick View */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-zinc-800 pt-8 md:pt-10">
                  <div className="space-y-3 md:space-y-4">
                     <h5 className="text-[10px] md:text-xs font-black text-emerald-500 uppercase tracking-widest px-1">חוזקות לשימור</h5>
                     <div className="flex flex-wrap gap-2">
                        {[...session.analysis.strengths.systemic, ...session.analysis.strengths.relational].map((s, i) => (
                          <span key={i} className="px-3 py-1.5 md:px-4 md:py-2 bg-emerald-500/10 rounded-xl text-[10px] md:text-xs font-bold text-emerald-400 border border-emerald-500/10">{s}</span>
                        ))}
                     </div>
                  </div>
                  <div className="space-y-3 md:space-y-4">
                     <h5 className="text-[10px] md:text-xs font-black text-rose-500 uppercase tracking-widest px-1">סיכונים לטיפול</h5>
                     <div className="flex flex-wrap gap-2">
                        {[...session.analysis.weaknesses.systemic, ...session.analysis.weaknesses.relational].map((w, i) => (
                          <span key={i} className="px-3 py-1.5 md:px-4 md:py-2 bg-rose-500/10 rounded-xl text-[10px] md:text-xs font-bold text-rose-400 border border-rose-500/10">{w}</span>
                        ))}
                     </div>
                  </div>
               </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 md:p-8 bg-zinc-950/50 border-t border-zinc-800 flex justify-center">
               <button onClick={() => setShowAIModal(false)} className="w-full md:w-auto bg-white text-black px-12 py-4 rounded-2xl font-black text-base md:text-lg shadow-xl active:scale-95 transition-all">
                  הבנתי, בואו ניישם
               </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-zinc-800 pb-8 md:pb-10">
        <div className="flex gap-4 md:gap-6 items-center">
           <div className={`w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-3xl ${healthStatus.bg} border border-white/5 flex flex-col items-center justify-center shadow-2xl flex-shrink-0`}>
              <span className="text-2xl md:text-4xl">{healthStatus.icon}</span>
              <span className={`text-sm md:text-xl font-black ${healthStatus.color}`}>{averageScore}%</span>
           </div>
           <div>
              <h2 className="text-2xl md:text-5xl font-black text-white tracking-tighter mb-1 md:mb-2">{session.title}</h2>
              <p className="text-zinc-500 font-bold text-sm md:text-lg">דוח מודיעין שותפויות | {healthStatus.label}</p>
           </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
           <button onClick={onBack} className="order-2 sm:order-1 bg-zinc-900 text-zinc-400 px-6 md:px-8 py-3 md:py-4 rounded-2xl font-bold hover:text-white transition-all border border-zinc-800 text-sm md:text-base">חזרה</button>
           {session.analysis ? (
             <button 
               onClick={() => setShowAIModal(true)}
               className="order-1 sm:order-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 md:px-10 py-3 md:py-4 rounded-2xl font-black transition-all shadow-xl flex items-center justify-center gap-3 text-sm md:text-lg border border-indigo-400/30 animate-pulse"
             >
               ✨ צפה בתובנות AI
             </button>
           ) : (
             <button 
               disabled={loading || session.responses.length < 1}
               onClick={handleAnalyze}
               className="order-1 sm:order-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white px-8 md:px-12 py-3 md:py-4 rounded-2xl font-black transition-all shadow-3xl shadow-indigo-600/30 flex items-center justify-center gap-3 md:gap-4 text-sm md:text-lg"
             >
               {loading ? <div className="w-5 h-5 md:w-6 md:h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : '✨ הפעל סוכן אסטרטגי AI'}
             </button>
           )}
        </div>
      </div>

      {/* DASHBOARD: Radar + Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
         {/* Perception Spider Chart */}
         <div className="lg:col-span-7 glass rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-12 border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 md:w-64 h-48 md:h-64 bg-indigo-500/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-2xl md:blur-3xl"></div>
            <h3 className="text-xl md:text-2xl font-black text-white mb-1 relative z-10">מיפוי פערים תפיסתיים</h3>
            <p className="text-zinc-500 text-xs md:text-sm font-bold mb-6 md:mb-10 relative z-10">השוואה רב-ממדית לאורך צירים אסטרטגיים</p>
            
            <div className="w-full h-[300px] md:h-[450px] relative z-10">
               <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                    <PolarGrid stroke="#27272a" strokeWidth={1} />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 10, fontWeight: 800 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 7]} tick={false} axisLine={false} />
                    {session.sides.map((side, idx) => (
                      <Radar
                        key={side}
                        name={side}
                        dataKey={side}
                        stroke={SIDE_COLORS[idx % SIDE_COLORS.length]}
                        fill={SIDE_COLORS[idx % SIDE_COLORS.length]}
                        fillOpacity={0.2}
                        strokeWidth={2.5}
                      />
                    ))}
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '15px', fontSize: '10px' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '11px', textAlign: 'right' }}
                    />
                  </RadarChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Ranking Histogram */}
         <div className="lg:col-span-5 glass rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-12 border-white/5 shadow-2xl relative overflow-hidden group">
            <h3 className="text-xl md:text-2xl font-black text-white mb-1">דירוג ביצועי הממשק</h3>
            <p className="text-zinc-500 text-xs md:text-sm font-bold mb-6 md:mb-10">ממוצעים מסודרים (Scale 1-7)</p>
            
            <div className="w-full h-[300px] md:h-[450px]">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sortedCategories} layout="vertical" margin={{ right: 35, left: 0, top: 0, bottom: 0 }}>
                    <XAxis type="number" domain={[0, 7]} hide />
                    <YAxis dataKey="subject" type="category" width={85} tick={{ fill: '#a1a1aa', fontSize: 9, fontWeight: 800 }} axisLine={false} tickLine={false} />
                    <Bar dataKey="average" radius={[0, 8, 8, 0]} barSize={20}>
                       {sortedCategories.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.average >= 5.5 ? '#10b981' : entry.average >= 4 ? '#6366f1' : '#f43f5e'} />
                       ))}
                       <LabelList dataKey="average" position="right" style={{ fill: '#ffffff', fontSize: 10, fontWeight: 900 }} />
                    </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>
      
      {/* Background Brain Icon for UI Polish - hidden on very small screens */}
      <div className="fixed bottom-10 left-10 opacity-5 pointer-events-none hidden sm:block">
         <svg className="w-32 h-32 md:w-64 md:h-64 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
      </div>

    </div>
  );
}; 

export default ResultsView;
