
import React, { useState, useMemo } from 'react';
import { PartnershipSession, AIAnalysis } from '../types';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, Cell
} from 'recharts';
import { analyzePartnership, expandRecommendation } from '../services/geminiService';
import { DEFAULT_QUESTIONS } from '../constants';
import { Zap, Target, Activity, AlertCircle, Sparkles, TrendingUp, BarChart3, Info, ChevronLeft } from 'lucide-react';

interface Props {
  session: PartnershipSession | undefined;
  onUpdate: (updated: PartnershipSession) => void;
  onBack: () => void;
}

const SIDE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

/** 
 * STATISTICAL UTILS
 */
const matrixTranspose = (m: number[][]) => m[0].map((_, i) => m.map(row => row[i]));
const matrixMultiply = (a: number[][], b: number[][]) => a.map(row => b[0].map((_, i) => row.reduce((acc, val, j) => acc + val * b[j][i], 0)));

const matrixInverse = (m: number[][]) => {
  const n = m.length;
  const inv = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  const copy = m.map(row => [...row]);
  for (let i = 0; i < n; i++) {
    let pivot = copy[i][i];
    if (Math.abs(pivot) < 1e-10) { pivot += 1e-6; copy[i][i] = pivot; }
    for (let j = 0; j < n; j++) { copy[i][j] /= pivot; inv[i][j] /= pivot; }
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = copy[k][i];
        for (let j = 0; j < n; j++) { copy[k][j] -= factor * copy[i][j]; inv[k][j] -= factor * inv[i][j]; }
      }
    }
  }
  return inv;
};

const calculatePearson = (x: number[], y: number[]) => {
  const n = x.length;
  if (n < 2) return 0;
  const muX = x.reduce((a, b) => a + b, 0) / n;
  const muY = y.reduce((a, b) => a + b, 0) / n;
  const num = x.reduce((acc, val, i) => acc + (val - muX) * (y[i] - muY), 0);
  const den = Math.sqrt(x.reduce((acc, v) => acc + Math.pow(v - muX, 2), 0) * y.reduce((acc, v) => acc + Math.pow(v - muY, 2), 0));
  return den === 0 ? 0 : num / den;
};

const ResultsView: React.FC<Props> = ({ session, onUpdate, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [expandingRec, setExpandingRec] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, string[]>>({});

  const stats = useMemo(() => {
    if (!session || !session.responses || session.responses.length === 0) {
      return { driverData: [], impactData: [], satisfactionScore: 0, biggestGap: null, primaryDriver: null, method: 'none' };
    }

    const questions = (session.questions?.length > 0) ? session.questions : DEFAULT_QUESTIONS;
    const outcomeIds = ['q23', 'q24'];
    const outcomeQs = questions.filter(q => outcomeIds.includes(q.id) || q.shortLabel === 'OUTCOME_SATISFACTION');
    const driverQs = questions.filter(q => !outcomeQs.find(oq => oq.id === q.id));
    const groups = Array.from(new Set(driverQs.map(q => q.shortLabel || 'General'))).filter(Boolean);
    
    // 1. Prepare Target Y
    const Y_raw = session.responses.map(r => {
      let sum = 0, count = 0;
      outcomeQs.forEach(q => { if (r.scores?.[q.id]) { sum += r.scores[q.id]; count++; } });
      return count > 0 ? sum / count : 0;
    });

    // 2. Prepare Feature Matrix X
    const X_raw = session.responses.map(r => 
      groups.map(label => {
        const related = driverQs.filter(q => q.shortLabel === label);
        let s = 0, c = 0;
        related.forEach(q => { if (r.scores?.[q.id]) { s += r.scores[q.id]; c++; } });
        return c > 0 ? s / c : 0;
      })
    );

    // Decision: OLS Regression vs Pearson Fallback
    // Regression requires N > P (respondents > categories)
    let weights: number[] = [];
    let method: 'Regression (β)' | 'Correlation (r)' = 'Correlation (r)';

    if (session.responses.length > groups.length + 1) {
      try {
        // Standardize Y
        const yMean = Y_raw.reduce((a, b) => a + b, 0) / Y_raw.length;
        const yStd = Math.sqrt(Y_raw.reduce((a, b) => a + Math.pow(b - yMean, 2), 0) / Y_raw.length) || 1;
        const Y_std = Y_raw.map(y => (y - yMean) / yStd);

        // Standardize X
        const X_std = X_raw.map(row => row.map((val, colIdx) => {
          const col = X_raw.map(r => r[colIdx]);
          const mean = col.reduce((a, b) => a + b, 0) / col.length;
          const std = Math.sqrt(col.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / col.length) || 1;
          return (val - mean) / std;
        }));

        const Xt = matrixTranspose(X_std);
        const XtX = matrixMultiply(Xt, X_std);
        for (let i = 0; i < XtX.length; i++) XtX[i][i] += 0.1; // Ridge
        const XtXInv = matrixInverse(XtX);
        const XtY = matrixMultiply(Xt, Y_std.map(y => [y]));
        weights = matrixMultiply(XtXInv, XtY).map(r => Math.max(0, r[0]));
        method = 'Regression (β)';
      } catch (e) {
        // Fallback to Pearson
        weights = groups.map((_, i) => calculatePearson(X_raw.map(r => r[i]), Y_raw));
        method = 'Correlation (r)';
      }
    } else {
      weights = groups.map((_, i) => calculatePearson(X_raw.map(r => r[i]), Y_raw));
      method = 'Correlation (r)';
    }

    // 3. Finalize Visualization Data
    const driverData = groups.map((label, idx) => {
      const dataPoint: any = { subject: label };
      session.sides.forEach(side => {
        const sideRes = session.responses.filter(r => r.side === side);
        let s = 0, c = 0;
        const related = driverQs.filter(q => q.shortLabel === label);
        sideRes.forEach(r => related.forEach(q => { if (r.scores?.[q.id]) { s += r.scores[q.id]; c++; } }));
        dataPoint[side] = c > 0 ? Number((s / c).toFixed(1)) : 0;
      });
      return dataPoint;
    });

    const impactData = groups.map((label, idx) => ({
      label,
      impact: Number((weights[idx] || 0).toFixed(2))
    })).sort((a, b) => b.impact - a.impact);

    // Global Score
    let sTotal = 0, sCount = 0;
    session.responses.forEach(r => outcomeQs.forEach(q => { if (r.scores?.[q.id]) { sTotal += r.scores[q.id]; sCount++; } }));
    const satisfactionScore = sCount > 0 ? Math.round(((sTotal / sCount - 1) / 6) * 100) : 0;

    return { 
      driverData, 
      impactData, 
      satisfactionScore, 
      method,
      primaryDriver: impactData[0]
    };
  }, [session]);

  if (!session) return null;

  const handleAnalyze = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await analyzePartnership(session, stats);
      onUpdate({ ...session, analysis: result });
    } catch (e) { alert("Analysis failed."); } finally { setLoading(true); setLoading(false); }
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
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-8 border-b border-zinc-900 pb-12">
        <div className="flex items-center gap-6 flex-row-reverse">
           <div className="text-right">
              <h2 className="text-5xl font-black text-white tracking-tighter leading-none mb-2">{session.title}</h2>
              <div className="flex items-center gap-3 justify-end">
                 <span className="text-indigo-500 font-black text-[11px] uppercase tracking-[0.3em]">Strategic Analysis Engine</span>
                 <div className="w-12 h-px bg-zinc-800"></div>
              </div>
           </div>
           <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center shadow-3xl shadow-indigo-600/40">
              <BarChart3 className="text-white" size={36} />
           </div>
        </div>

        <div className="flex gap-4">
           <button onClick={onBack} className="bg-zinc-900 text-zinc-400 px-10 py-5 rounded-[1.5rem] font-black border border-zinc-800 hover:text-white transition-all flex items-center gap-2">
             <ChevronLeft size={18} /> חזרה
           </button>
           <button onClick={handleAnalyze} disabled={loading} className={`px-14 py-5 rounded-[1.5rem] font-black transition-all flex items-center gap-3 shadow-2xl ${loading ? 'bg-zinc-800 text-zinc-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 active:scale-95'}`}>
             {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <Sparkles size={22} />}
             {loading ? 'מעבד נתונים...' : 'הפעל ניתוח AI'}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        <div className="xl:col-span-8 space-y-10">
          
          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#0b0b0d] rounded-[2.5rem] p-10 border border-white/5 text-right shadow-xl">
               <Activity className="text-indigo-500 mb-6" size={32} />
               <h3 className="text-zinc-500 text-[11px] font-black uppercase tracking-widest mb-1">מדד בריאות (Health Score)</h3>
               <div className="text-7xl font-black text-white tracking-tighter">{stats.satisfactionScore}%</div>
            </div>

            <div className="bg-[#0b0b0d] rounded-[2.5rem] p-10 border border-white/5 text-right shadow-xl">
               <Zap className="text-amber-500 mb-6" size={32} />
               <h3 className="text-zinc-500 text-[11px] font-black uppercase tracking-widest mb-1">הדרייבר המשמעותי ביותר</h3>
               <div className="text-3xl font-black text-white leading-tight min-h-[3.5rem] flex items-center justify-end">
                  {stats.primaryDriver ? stats.primaryDriver.label : 'בחישוב...'}
               </div>
            </div>

            <div className="bg-[#0b0b0d] rounded-[2.5rem] p-10 border border-white/5 text-right shadow-xl">
               <TrendingUp className="text-emerald-500 mb-6" size={32} />
               <h3 className="text-zinc-500 text-[11px] font-black uppercase tracking-widest mb-1">שיטת ניתוח</h3>
               <div className="text-4xl font-black text-white tracking-tighter flex items-center justify-end h-16">
                  {stats.method}
               </div>
               <p className="text-zinc-600 text-[10px] font-bold mt-2">התאמה אוטומטית לפי גודל המדגם</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Radar Chart */}
            <div className="bg-[#0b0b0d] rounded-[3rem] p-10 border border-white/5 shadow-2xl h-[550px] flex flex-col">
               <div className="flex items-center gap-4 justify-end mb-8">
                  <div className="text-right">
                     <h3 className="text-2xl font-black text-white">פרופיל הממשק</h3>
                     <p className="text-zinc-500 text-[10px] font-bold">איפה הצדדים מסונכרנים?</p>
                  </div>
                  <Target className="text-indigo-500" size={28} />
               </div>
               <div className="flex-grow">
                 <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={stats.driverData} margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
                      <PolarGrid stroke="#1a1a1e" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 12, fontWeight: 800 }} />
                      <PolarRadiusAxis domain={[0, 7]} tick={false} axisLine={false} />
                      {(session.sides || []).map((side, idx) => (
                        <Radar key={side} name={side} dataKey={side} stroke={SIDE_COLORS[idx % SIDE_COLORS.length]} fill={SIDE_COLORS[idx % SIDE_COLORS.length]} fillOpacity={0.15} strokeWidth={4} />
                      ))}
                      <Tooltip contentStyle={{ backgroundColor: '#000', borderRadius: '16px', border: '1px solid #27272a', textAlign: 'right', fontSize: '12px' }} />
                      <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 900 }} />
                    </RadarChart>
                 </ResponsiveContainer>
               </div>
            </div>

            {/* Impact Map */}
            <div className="bg-[#0b0b0d] rounded-[3rem] p-10 border border-white/5 shadow-2xl h-[550px] flex flex-col">
               <div className="flex items-center gap-4 justify-end mb-8">
                  <div className="text-right">
                     <h3 className="text-2xl font-black text-white">מפת השפעה (Drivers)</h3>
                     <p className="text-zinc-500 text-[10px] font-bold">מה באמת מנבא הצלחה?</p>
                  </div>
                  <Info className="text-emerald-500" size={28} />
               </div>
               <div className="flex-grow overflow-hidden">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.impactData} layout="vertical" margin={{ left: 10, right: 40, top: 20 }}>
                      <XAxis type="number" hide domain={[0, 'dataMax']} />
                      <YAxis dataKey="label" type="category" tick={{ fill: '#a1a1aa', fontSize: 13, fontWeight: 900 }} width={90} />
                      <Tooltip cursor={{ fill: 'transparent' }} content={({ active, payload }) => {
                        if (active && payload?.[0]) {
                          return (
                            <div className="bg-black p-4 rounded-2xl border border-zinc-800 text-right shadow-2xl">
                               <p className="text-white font-black">{payload[0].payload.label}</p>
                               <p className="text-emerald-400 text-xs mt-1">עוצמת השפעה: {payload[0].value}</p>
                            </div>
                          );
                        }
                        return null;
                      }} />
                      <Bar dataKey="impact" radius={[0, 15, 15, 0]} barSize={38}>
                        {stats.impactData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.impact > 0.4 ? '#10b981' : entry.impact > 0.15 ? '#6366f1' : '#27272a'} />
                        ))}
                      </Bar>
                    </BarChart>
                 </ResponsiveContainer>
               </div>
               <div className="mt-6 p-5 bg-zinc-900/40 rounded-3xl border border-white/5">
                  <p className="text-[10px] text-zinc-500 font-bold text-center leading-relaxed">
                    הניתוח משתמש ב-Multiple Regression כברירת מחדל לבידוד השפעות. במדגמים קטנים המערכת עוברת לניתוח מתאם (Correlation) לשמירה על דיוק.
                  </p>
               </div>
            </div>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="xl:col-span-4">
          <div className="bg-[#111114] rounded-[3.5rem] p-10 border border-indigo-500/10 shadow-3xl min-h-[1140px] flex flex-col">
             <div className="flex items-center gap-4 justify-end mb-12 border-b border-zinc-900 pb-10">
                <div className="text-right">
                   <h3 className="text-2xl font-black text-white">אבחון וייעוץ AI</h3>
                   <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Advanced Strategic Insights</p>
                </div>
                <Sparkles className="text-indigo-500" size={28} />
             </div>

             {!session.analysis ? (
               <div className="flex-grow flex flex-col items-center justify-center text-center space-y-10 opacity-30">
                  <div className="w-24 h-24 bg-zinc-900 rounded-[2.5rem] flex items-center justify-center text-5xl shadow-inner animate-pulse">📊</div>
                  <p className="text-zinc-500 text-sm font-bold max-w-[240px]">ה-AI ינתח את מקדמי ההשפעה הסטטיסטיים כדי לבנות תוכנית עבודה מותאמת אישית.</p>
               </div>
             ) : (
               <div className="space-y-14 overflow-y-auto custom-scrollbar pr-2 h-[850px]">
                  <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-indigo-600/20 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-3xl"></div>
                     <h4 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-70 mb-6 text-right">Executive Diagnosis</h4>
                     <p className="text-xl font-black leading-snug text-right italic relative z-10">"{session.analysis.summary}"</p>
                  </div>
                  
                  <div className="space-y-12 text-right">
                     <h4 className="text-xs font-black text-zinc-600 uppercase tracking-widest border-r-2 border-zinc-800 pr-4">המלצות אופרטיביות</h4>
                     <div className="space-y-8">
                        {[...(session.analysis.recommendations?.systemic || []), ...(session.analysis.recommendations?.relational || [])].map((rec, i) => (
                          <div key={i} className="group">
                             <div className="bg-zinc-900/50 p-8 rounded-[2rem] border border-zinc-800/50 hover:border-indigo-500/30 transition-all flex flex-col gap-6 shadow-lg">
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
