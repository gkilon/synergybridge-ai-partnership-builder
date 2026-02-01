
import React, { useState, useMemo } from 'react';
import { PartnershipSession, AIAnalysis } from '../types';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, Cell
} from 'recharts';
import { analyzePartnership, expandRecommendation } from '../services/geminiService';
import { DEFAULT_QUESTIONS } from '../constants';
import { Zap, Target, Activity, AlertCircle, Sparkles, TrendingUp, BarChart3, Info, ChevronLeft, Boxes } from 'lucide-react';

interface Props {
  session: PartnershipSession | undefined;
  onUpdate: (updated: PartnershipSession) => void;
  onBack: () => void;
}

const SIDE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

/** 
 * STATISTICAL UTILS for Small Samples (Chi-Square / Cramér's V logic)
 */
const calculateCramersV = (x: number[], y: number[]) => {
  const n = x.length;
  if (n < 2) return 0;

  // Create contingency table for 1-7 Likert scales
  const levels = [1, 2, 3, 4, 5, 6, 7];
  const table: number[][] = Array.from({ length: 7 }, () => Array(7).fill(0));
  
  x.forEach((val, i) => {
    const row = Math.min(6, Math.max(0, Math.round(val) - 1));
    const col = Math.min(6, Math.max(0, Math.round(y[i]) - 1));
    table[row][col]++;
  });

  const rowSums = table.map(row => row.reduce((a, b) => a + b, 0));
  const colSums = Array.from({ length: 7 }, (_, c) => table.reduce((a, b) => a + b[c], 0));
  
  let chiSquare = 0;
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const expected = (rowSums[r] * colSums[c]) / n;
      if (expected > 0) {
        chiSquare += Math.pow(table[r][c] - expected, 2) / expected;
      }
    }
  }

  // Cramér's V = sqrt( (chi2/n) / min(r-1, c-1) )
  const k = 7; // dimensions
  const v = Math.sqrt((chiSquare / n) / (k - 1));
  return isNaN(v) ? 0 : Math.min(1, v);
};

const ResultsView: React.FC<Props> = ({ session, onUpdate, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [expandingRec, setExpandingRec] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, string[]>>({});

  const stats = useMemo(() => {
    if (!session || !session.responses || session.responses.length === 0) {
      return { driverData: [], impactData: [], satisfactionScore: 0, method: 'none' };
    }

    const questions = (session.questions?.length > 0) ? session.questions : DEFAULT_QUESTIONS;
    const outcomeIds = ['q23', 'q24'];
    const outcomeQs = questions.filter(q => outcomeIds.includes(q.id) || q.shortLabel === 'OUTCOME_SATISFACTION');
    const driverQs = questions.filter(q => !outcomeQs.find(oq => oq.id === q.id));
    const groups = Array.from(new Set(driverQs.map(q => q.shortLabel || 'General'))).filter(Boolean);
    
    // Dependent Variable (Y) - Average Outcome
    const Y = session.responses.map(r => {
      let sum = 0, count = 0;
      outcomeQs.forEach(q => { if (r.scores?.[q.id]) { sum += r.scores[q.id]; count++; } });
      return count > 0 ? sum / count : 0;
    });

    // Drivers Impact via Cramér's V (Robust for small N)
    const impactData = groups.map(label => {
      const related = driverQs.filter(q => q.shortLabel === label);
      const X = session.responses.map(r => {
        let s = 0, c = 0;
        related.forEach(q => { if (r.scores?.[q.id]) { s += r.scores[q.id]; c++; } });
        return c > 0 ? s / c : 0;
      });

      const impactValue = calculateCramersV(X, Y);
      
      // Calculate Side Averages for Radar
      const sideAvgs: any = { subject: label };
      session.sides.forEach(side => {
        const sideRes = session.responses.filter(r => r.side === side);
        let s = 0, c = 0;
        sideRes.forEach(r => related.forEach(q => { if (r.scores?.[q.id]) { s += r.scores[q.id]; c++; } }));
        sideAvgs[side] = c > 0 ? Number((s / c).toFixed(1)) : 0;
      });

      return { label, impactValue, sideAvgs };
    });

    const satisfactionScore = Y.length > 0 ? Math.round(((Y.reduce((a, b) => a + b, 0) / Y.length - 1) / 6) * 100) : 0;

    return { 
      driverData: impactData.map(d => d.sideAvgs), 
      impactData: impactData.map(d => ({ label: d.label, impact: d.impactValue })).sort((a, b) => b.impact - a.impact), 
      satisfactionScore,
      method: session.responses.length < 10 ? 'Chi-Square (Cramér\'s V)' : 'Significance Analysis',
      primaryDriver: impactData.sort((a, b) => b.impactValue - a.impactValue)[0]
    };
  }, [session]);

  if (!session) return null;

  const handleAnalyze = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await analyzePartnership(session, stats);
      onUpdate({ ...session, analysis: result });
    } catch (e) { alert("Analysis failed."); } finally { setLoading(false); }
  };

  const handleExpandRec = async (rec: string) => {
    if (expandedSteps[rec]) return;
    setExpandingRec(rec);
    try {
      const steps = await expandRecommendation(rec, session.context || session.title);
      setExpandedSteps(prev => ({ ...prev, [rec]: steps }));
    } catch (e) { console.error(e); } finally { setExpandingRec(null); }
  };

  return (
    <div className="space-y-10 animate-fadeIn pb-24 max-w-[1600px] mx-auto px-6" dir="rtl">
      
      {/* Dynamic Header */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-8 border-b border-zinc-900 pb-12">
        <div className="flex items-center gap-6 flex-row-reverse">
           <div className="text-right">
              <h2 className="text-5xl font-black text-white tracking-tighter leading-none mb-2">{session.title}</h2>
              <div className="flex items-center gap-3 justify-end">
                 <span className="text-indigo-500 font-black text-[11px] uppercase tracking-[0.3em]">Advanced Relationship Analytics</span>
                 <div className="w-12 h-px bg-zinc-800"></div>
              </div>
           </div>
           <div className="w-20 h-20 bg-indigo-600 rounded-[2.2rem] flex items-center justify-center shadow-3xl shadow-indigo-600/40 transform -rotate-3 hover:rotate-0 transition-transform">
              <Boxes className="text-white" size={36} />
           </div>
        </div>

        <div className="flex gap-4">
           <button onClick={onBack} className="bg-zinc-900 text-zinc-400 px-10 py-5 rounded-[1.5rem] font-black border border-zinc-800 hover:text-white transition-all flex items-center gap-2">
             <ChevronLeft size={18} /> חזרה
           </button>
           <button onClick={handleAnalyze} disabled={loading} className={`px-14 py-5 rounded-[1.5rem] font-black transition-all flex items-center gap-3 shadow-2xl ${loading ? 'bg-zinc-800 text-zinc-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 active:scale-95'}`}>
             {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <Sparkles size={22} />}
             {loading ? 'מבצע אופטימיזציה...' : 'הפעל ניתוח AI'}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        <div className="xl:col-span-8 space-y-10">
          
          {/* Dashboard Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#0b0b0d] rounded-[2.5rem] p-10 border border-white/5 text-right shadow-xl">
               <Activity className="text-indigo-500 mb-6" size={32} />
               <h3 className="text-zinc-500 text-[11px] font-black uppercase tracking-widest mb-1">מדד בריאות הממשק</h3>
               <div className="text-7xl font-black text-white tracking-tighter">{stats.satisfactionScore}%</div>
            </div>

            <div className="bg-[#0b0b0d] rounded-[2.5rem] p-10 border border-white/5 text-right shadow-xl relative overflow-hidden group">
               <Zap className="text-amber-500 mb-6" size={32} />
               <h3 className="text-zinc-500 text-[11px] font-black uppercase tracking-widest mb-1">מנוף השיפור העיקרי</h3>
               <div className="text-3xl font-black text-white leading-tight min-h-[3.5rem] flex items-center justify-end">
                  {stats.primaryDriver ? stats.primaryDriver.label : 'מעבד...'}
               </div>
               <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/20 group-hover:bg-amber-500/50 transition-all"></div>
            </div>

            <div className="bg-[#0b0b0d] rounded-[2.5rem] p-10 border border-white/5 text-right shadow-xl">
               <TrendingUp className="text-emerald-500 mb-6" size={32} />
               <h3 className="text-zinc-500 text-[11px] font-black uppercase tracking-widest mb-1">מודל סטטיסטי</h3>
               <div className="text-3xl font-black text-white tracking-tighter flex items-center justify-end h-16">
                  {stats.method}
               </div>
               <p className="text-zinc-600 text-[10px] font-bold mt-2">מותאם אוטומטית למדגמים קטנים</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Radar View */}
            <div className="bg-[#0b0b0d] rounded-[3.5rem] p-10 border border-white/5 shadow-2xl h-[600px] flex flex-col items-center">
               <div className="w-full flex items-center gap-4 justify-end mb-10">
                  <div className="text-right">
                     <h3 className="text-2xl font-black text-white">פרופיל הממשק</h3>
                     <p className="text-zinc-500 text-[10px] font-bold">ממוצע ציונים לפי דרייבר (Averages)</p>
                  </div>
                  <Target className="text-indigo-500" size={28} />
               </div>
               <div className="w-full h-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={stats.driverData}>
                      <PolarGrid stroke="#1a1a1e" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 13, fontWeight: 900 }} />
                      <PolarRadiusAxis domain={[0, 7]} tick={false} axisLine={false} />
                      {(session.sides || []).map((side, idx) => (
                        <Radar key={side} name={side} dataKey={side} stroke={SIDE_COLORS[idx % SIDE_COLORS.length]} fill={SIDE_COLORS[idx % SIDE_COLORS.length]} fillOpacity={0.15} strokeWidth={4} />
                      ))}
                      <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 900 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#000', borderRadius: '16px', border: '1px solid #27272a', textAlign: 'right' }} />
                    </RadarChart>
                 </ResponsiveContainer>
               </div>
            </div>

            {/* Impact Map View */}
            <div className="bg-[#0b0b0d] rounded-[3.5rem] p-10 border border-white/5 shadow-2xl h-[600px] flex flex-col">
               <div className="flex items-center gap-4 justify-end mb-10">
                  <div className="text-right">
                     <h3 className="text-2xl font-black text-white">מפת השפעה (Impact Weight)</h3>
                     <p className="text-zinc-500 text-[10px] font-bold">חוזק הקשר לשביעות רצון (Cramér's V)</p>
                  </div>
                  <Info className="text-emerald-500" size={28} />
               </div>
               <div className="flex-grow">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.impactData} layout="vertical" margin={{ left: 10, right: 40, top: 20 }}>
                      <XAxis type="number" hide domain={[0, 1]} />
                      <YAxis dataKey="label" type="category" tick={{ fill: '#a1a1aa', fontSize: 14, fontWeight: 900 }} width={90} />
                      <Tooltip cursor={{ fill: 'transparent' }} content={({ active, payload }) => {
                        if (active && payload?.[0]) {
                          return (
                            <div className="bg-black p-4 rounded-2xl border border-zinc-800 text-right shadow-2xl">
                               <p className="text-white font-black text-sm">{payload[0].payload.label}</p>
                               <p className="text-emerald-400 text-xs mt-1">עוצמת תלות: {Number(payload[0].value).toFixed(2)}</p>
                               <p className="text-[9px] text-zinc-600 mt-2 max-w-[140px]">מחושב באמצעות Chi-Square - מדויק יותר למדגמים קטנים.</p>
                            </div>
                          );
                        }
                        return null;
                      }} />
                      <Bar dataKey="impact" radius={[0, 20, 20, 0]} barSize={40}>
                        {stats.impactData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.impact > 0.5 ? '#10b981' : entry.impact > 0.25 ? '#6366f1' : '#1a1a1e'} />
                        ))}
                      </Bar>
                    </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>
          </div>
        </div>

        {/* AI Analysis Sidebar */}
        <div className="xl:col-span-4">
          <div className="bg-[#111114] rounded-[3.5rem] p-10 border border-indigo-500/10 shadow-3xl min-h-[1000px] flex flex-col">
             <div className="flex items-center gap-4 justify-end mb-12 border-b border-zinc-900 pb-10">
                <div className="text-right">
                   <h3 className="text-2xl font-black text-white">אבחון אסטרטגי AI</h3>
                   <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Interface Intelligence Report</p>
                </div>
                <Sparkles className="text-indigo-500" size={28} />
             </div>

             {!session.analysis ? (
               <div className="flex-grow flex flex-col items-center justify-center text-center space-y-12 opacity-30 px-8">
                  <div className="w-24 h-24 bg-zinc-900 rounded-[2.5rem] flex items-center justify-center text-5xl shadow-inner border border-white/5 animate-pulse">🧠</div>
                  <div className="space-y-4">
                     <p className="text-white text-xl font-black">ממתין להרצת הניתוח</p>
                     <p className="text-zinc-500 text-xs font-bold leading-relaxed">ה-AI ישקלל את עוצמת התלות בין הדרייברים לתוצאות כדי לבנות תוכנית עבודה מותאמת אישית.</p>
                  </div>
               </div>
             ) : (
               <div className="space-y-16 overflow-y-auto custom-scrollbar pr-2 h-[800px]">
                  <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-indigo-600/20 relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                     <h4 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-70 mb-6 text-right">Diagnosis Summary</h4>
                     <p className="text-xl font-black leading-snug text-right italic relative z-10">"{session.analysis.summary}"</p>
                  </div>
                  
                  <div className="space-y-12 text-right">
                     <h4 className="text-xs font-black text-zinc-600 uppercase tracking-widest border-r-2 border-zinc-800 pr-4">המלצות אופרטיביות</h4>
                     <div className="space-y-8">
                        {[...(session.analysis.recommendations?.systemic || []), ...(session.analysis.recommendations?.relational || [])].map((rec, i) => (
                          <div key={i} className="group">
                             <div className="bg-zinc-900/40 p-8 rounded-[2rem] border border-zinc-800/50 hover:border-indigo-500/30 transition-all flex flex-col gap-6 shadow-xl">
                                <p className="text-[16px] font-bold text-zinc-200 leading-relaxed">{rec}</p>
                                <button onClick={() => handleExpandRec(rec)} className="self-end text-[11px] font-black text-indigo-400 hover:text-white transition-colors bg-indigo-500/5 px-6 py-3 rounded-xl border border-indigo-500/10">
                                  {expandingRec === rec ? 'בונה תוכנית...' : expandedSteps[rec] ? '✓ צעדים מוכנים' : 'איך ליישם? ←'}
                                </button>
                             </div>
                             {expandedSteps[rec] && (
                               <div className="mr-8 border-r-2 border-indigo-500/30 pr-8 mt-6 space-y-5 animate-slideDown">
                                  {expandedSteps[rec].map((step, idx) => (
                                    <div key={idx} className="flex gap-4 items-start flex-row-reverse">
                                       <span className="w-6 h-6 bg-indigo-500/20 text-indigo-400 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 shadow-sm">{idx+1}</span>
                                       <p className="text-[12px] text-zinc-400 font-bold leading-relaxed">{step}</p>
                                    </div>
                                  ))}
                               </div>
                             )}
                          </div>
                        ))}
                     </div>
                  </div>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}; 

export default ResultsView;
