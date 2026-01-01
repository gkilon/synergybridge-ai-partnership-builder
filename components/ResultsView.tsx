
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

  // Safety guard for missing session
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
        if (typeof (window as any).aistudio?.openSelectKey === 'function') {
          await (window as any).aistudio.openSelectKey();
        }
      } else {
        alert(e.message || "חלה שגיאה בחיבור למערכת הניתוח");
      }
    } finally {
      setLoading(false);
    }
  };

  // Safe chart data calculation and detailed component stats
  const { chartData, componentStats } = useMemo(() => {
    if (!session.questions || session.questions.length === 0) return { chartData: [], componentStats: [] };
    
    const groups = Array.from(new Set(session.questions.map(q => q.shortLabel || 'כללי')));
    
    const calculatedData = groups.map(label => {
      const dataPoint: any = { subject: label };
      const relatedQuestions = session.questions.filter(q => (q.shortLabel || 'כללי') === label);

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

      // Calculate gap if there are at least 2 sides
      let gap = 0;
      if (session.sides.length >= 2) {
        const vals = session.sides.map(s => sideAverages[s]);
        gap = Number((Math.max(...vals) - Math.min(...vals)).toFixed(1));
      }

      return {
        ...dataPoint,
        totalAvg,
        gap
      };
    });

    // Sort stats from highest average to lowest
    const stats = [...calculatedData].sort((a, b) => b.totalAvg - a.totalAvg);

    return { chartData: calculatedData, componentStats: stats };
  }, [session]);

  const globalOutcomeScore = useMemo(() => {
    const outcomeQs = session.questions.filter(q => 
      q.text.includes('אפקטיביות') || q.text.includes('שביעות רצון') || q.id === 'q23' || q.id === 'q24'
    );
    if (outcomeQs.length === 0) return 0;
    
    let total = 0;
    let count = 0;
    session.responses.forEach(r => {
      outcomeQs.forEach(q => {
        if (r.scores && r.scores[q.id] !== undefined) {
          total += r.scores[q.id];
          count++;
        }
      });
    });
    return count > 0 ? (total / count) : 0;
  }, [session]);

  const healthIndicator = useMemo(() => {
    const s = (globalOutcomeScore / 7) * 100;
    if (s >= 85) return { label: 'שותפות אסטרטגית מופתית', color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: '💎', desc: 'הממשק מתפקד בסנכרון מלא וערך מוסף גבוה מאוד.' };
    if (s >= 65) return { label: 'ממשק עבודה יציב', color: 'text-indigo-400', bg: 'bg-indigo-400/10', icon: '✅', desc: 'בסיס עבודה בריא המאפשר השגת תוצאות בשגרה.' };
    if (s >= 40) return { label: 'ממשק תפעולי בסיסי', color: 'text-amber-400', bg: 'bg-amber-400/10', icon: '⚠️', desc: 'ישנם חסמים המונעים מהשותפות להפוך לאסטרטגית.' };
    return { label: 'שותפות בשבר תפקודי', color: 'text-rose-400', bg: 'bg-rose-400/10', icon: '🚨', desc: 'נדרשת התערבות ניהולית מיידית לשיקום הממשק.' };
  }, [globalOutcomeScore]);

  const analysis = session.analysis;

  return (
    <div className="space-y-12 animate-fadeIn pb-32 max-w-7xl mx-auto px-4 md:px-0 text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
        <div>
          <button onClick={onBack} className="text-zinc-500 hover:text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-4 group transition-colors">
             <span className="group-hover:-translate-x-1 transition-transform">←</span> חזרה לממשקים
          </button>
          <h2 className="text-5xl font-black text-white tracking-tighter leading-none">{session.title}</h2>
          <p className="text-zinc-500 mt-2 font-bold text-lg">דוח אבחון מבוסס בינה מלאכותית | Partnership Intel</p>
        </div>
        <button 
          disabled={session.responses.length < 1 || loading}
          onClick={handleAnalyze}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white px-10 py-5 rounded-3xl font-black transition-all shadow-3xl shadow-indigo-600/20 active:scale-95 flex items-center gap-4 text-lg border border-indigo-400/30"
        >
          {loading ? <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : '✨ הפק ניתוח AI'}
        </button>
      </div>

      {/* Health & Chart Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Health Summary Card */}
        <div className="md:col-span-4 glass rounded-[3rem] p-12 flex flex-col items-center justify-center text-center space-y-8 relative overflow-hidden group border-indigo-500/10 shadow-2xl">
           <h4 className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.3em] relative z-10">דירוג חוסן הממשק</h4>
           <div className={`w-44 h-44 rounded-full flex items-center justify-center relative z-10 ${healthIndicator.bg} border border-white/5 shadow-2xl transition-all group-hover:scale-105 duration-700`}>
              <span className="text-6xl">{healthIndicator.icon}</span>
           </div>
           <div className="space-y-4 relative z-10">
              <h3 className={`text-2xl font-black tracking-tight ${healthIndicator.color}`}>{healthIndicator.label}</h3>
              <p className="text-sm text-zinc-400 font-medium leading-relaxed max-w-[220px] mx-auto">{healthIndicator.desc}</p>
           </div>
        </div>

        {/* Diagnostic Radar Chart */}
        <div className="md:col-span-8 glass rounded-[3rem] p-10 min-h-[450px] flex flex-col relative group border-white/5 shadow-2xl">
          <div className="flex justify-between items-center relative z-10 mb-6">
             <h3 className="text-xl font-black text-white">מיפוי פערים תפיסתיים</h3>
          </div>
          <div className="w-full flex-grow h-[350px] relative z-10">
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
              <div className="flex items-center justify-center h-full text-zinc-600 font-bold italic">ממתין למענים נוספים להצגת גרף...</div>
            )}
          </div>
        </div>
      </div>

      {/* Component Deep Dive - NEW SECTION */}
      <div className="space-y-8">
        <div className="flex items-center gap-6">
           <span className="text-3xl font-black text-white tracking-tight whitespace-nowrap">צלילה למרכיבי השותפות</span>
           <div className="h-px bg-zinc-800 flex-grow"></div>
           <p className="text-zinc-500 text-xs font-black uppercase tracking-widest">(ממוצעים מסודרים מהגבוה לנמוך)</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {componentStats.map((stat, i) => (
            <div key={i} className="glass p-8 rounded-[2.5rem] border-white/5 space-y-4 hover:border-indigo-500/30 transition-all group">
              <div className="flex justify-between items-start">
                <h4 className="text-lg font-black text-white leading-tight">{stat.subject}</h4>
                <div className="bg-indigo-500/10 px-3 py-1 rounded-lg text-indigo-400 font-black text-sm">
                  {stat.totalAvg}
                </div>
              </div>
              
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  <span>פער בין צדדים:</span>
                  <span className={`${stat.gap > 1.5 ? 'text-rose-400' : stat.gap > 0.8 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {stat.gap} נק'
                  </span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-1000" 
                    style={{ width: `${(stat.totalAvg / 7) * 100}%` }}
                  ></div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {session.sides.map((side, idx) => (
                    <div key={side} className="flex flex-col">
                      <span className="text-[9px] text-zinc-600 font-black uppercase truncate">{side}</span>
                      <span className="text-xs font-bold text-zinc-300">{stat[side]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Analysis Sections */}
      {analysis && (
        <div className="space-y-12 animate-slideUp">
          <div className="flex items-center gap-6">
             <span className="text-3xl font-black text-white tracking-tight whitespace-nowrap underline decoration-indigo-500 decoration-4 underline-offset-8">ניתוח המומחה (Strategic Insight)</span>
             <div className="h-px bg-zinc-800 flex-grow"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             {/* Summary Box */}
             <div className="md:col-span-2 glass rounded-[4rem] p-16 border-indigo-500/20 shadow-4xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 text-zinc-900 font-black text-9xl opacity-10 pointer-events-none">"</div>
                <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] mb-10">תמונת מצב וניתוח ה-Key Driver</h4>
                <div className="space-y-8">
                   {(analysis.summary || '').split('\n').map((p, i) => (
                     <p key={i} className="text-2xl font-bold text-zinc-200 leading-snug tracking-tight">{p}</p>
                   ))}
                </div>
             </div>
             
             {/* Strengths & Weaknesses */}
             <div className="space-y-8">
                <div className="glass rounded-[3rem] p-10 border-emerald-500/10">
                   <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-6">חוזקות מרכזיות</h4>
                   <ul className="space-y-4">
                      {([...(analysis.strengths?.systemic || []), ...(analysis.strengths?.relational || [])]).map((s, i) => (
                        <li key={i} className="text-sm font-bold text-zinc-300 flex items-start gap-3">
                           <span className="text-emerald-500">◆</span> {s}
                        </li>
                      ))}
                   </ul>
                </div>
                <div className="glass rounded-[3rem] p-10 border-rose-500/10">
                   <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em] mb-6">חסמים וסיכונים</h4>
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

          {/* Detailed Recommendations Grid */}
          <div className="space-y-10 pt-10">
             <h3 className="text-4xl font-black text-white tracking-tighter">המלצות אסטרטגיות לביצוע</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Systemic Section */}
                <div className="space-y-6">
                   <h4 className="text-xl font-black text-indigo-400 border-r-4 border-indigo-400 pr-4">צד מערכתי (מנגנונים ומבנה)</h4>
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

                {/* Relational Section */}
                <div className="space-y-6">
                   <h4 className="text-xl font-black text-purple-400 border-r-4 border-purple-400 pr-4">ציר היחסים (אמון ותרבות עבודה)</h4>
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
