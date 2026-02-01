
import React, { useState, useMemo } from 'react';
import { PartnershipSession, AIAnalysis } from '../types';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, Cell
} from 'recharts';
import { analyzePartnership, expandRecommendation } from '../services/geminiService';
import { DEFAULT_QUESTIONS } from '../constants';
import { Zap, Target, Activity, AlertCircle, Sparkles, TrendingUp, BarChart3, Info } from 'lucide-react';

interface Props {
  session: PartnershipSession | undefined;
  onUpdate: (updated: PartnershipSession) => void;
  onBack: () => void;
}

const SIDE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

/** 
 * LINEAR ALGEBRA HELPERS FOR REGRESSION 
 * Solving Beta = (X'X + lambda*I)^-1 * X'Y
 */
const matrixTranspose = (m: number[][]) => m[0].map((_, i) => m.map(row => row[i]));
const matrixMultiply = (a: number[][], b: number[][]) => a.map(row => b[0].map((_, i) => row.reduce((acc, val, j) => acc + val * b[j][i], 0)));

// Basic 2x2 to NxN matrix inversion using Gaussian elimination
const matrixInverse = (m: number[][]) => {
  const n = m.length;
  const inv = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  const copy = m.map(row => [...row]);

  for (let i = 0; i < n; i++) {
    let pivot = copy[i][i];
    if (Math.abs(pivot) < 1e-10) { // Tiny ridge adjustment for near-singular matrices
      pivot += 1e-6;
      copy[i][i] = pivot;
    }
    for (let j = 0; j < n; j++) {
      copy[i][j] /= pivot;
      inv[i][j] /= pivot;
    }
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = copy[k][i];
        for (let j = 0; j < n; j++) {
          copy[k][j] -= factor * copy[i][j];
          inv[k][j] -= factor * inv[i][j];
        }
      }
    }
  }
  return inv;
};

const ResultsView: React.FC<Props> = ({ session, onUpdate, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [expandingRec, setExpandingRec] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, string[]>>({});

  const stats = useMemo(() => {
    if (!session || !session.responses || session.responses.length < 3) {
      return { driverData: [], impactData: [], satisfactionScore: null, biggestGap: null, primaryDriver: null, isRegressionValid: false };
    }

    const questions = (session.questions && session.questions.length > 0) ? session.questions : DEFAULT_QUESTIONS;
    const outcomeIds = ['q23', 'q24'];
    const outcomeQs = questions.filter(q => outcomeIds.includes(q.id) || q.shortLabel === 'OUTCOME_SATISFACTION');
    const driverQs = questions.filter(q => !outcomeQs.find(oq => oq.id === q.id));
    
    const groups: string[] = Array.from<string>(new Set(driverQs.map(q => q.shortLabel || 'General'))).filter((g): g is string => !!g);
    
    // 1. Dependent Variable (Y): Standardized Outcome
    const Y_raw = session.responses.map(r => {
      let sum = 0, count = 0;
      outcomeQs.forEach(q => { if (r.scores?.[q.id]) { sum += r.scores[q.id]; count++; } });
      return count > 0 ? sum / count : 0;
    });

    const yMean = Y_raw.reduce((a, b) => a + b, 0) / Y_raw.length;
    const yStd = Math.sqrt(Y_raw.reduce((a, b) => a + Math.pow(b - yMean, 2), 0) / Y_raw.length) || 1;
    const Y_std = Y_raw.map(y => (y - yMean) / yStd);

    // 2. Independent Variables (X): Matrix of drivers
    const X_matrix_raw = session.responses.map(r => {
      return groups.map(label => {
        const relatedQs = driverQs.filter(q => q.shortLabel === label);
        let sum = 0, count = 0;
        relatedQs.forEach(q => { if (r.scores?.[q.id]) { sum += r.scores[q.id]; count++; } });
        return count > 0 ? sum / count : 0;
      });
    });

    // Standardize X columns
    const X_matrix_std = X_matrix_raw[0].map((_, colIndex) => {
      const col = X_matrix_raw.map(row => row[colIndex]);
      const mean = col.reduce((a, b) => a + b, 0) / col.length;
      const std = Math.sqrt(col.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / col.length) || 1;
      return col.map(x => (x - mean) / std);
    });

    // Transpose back to row-major
    const X_std = matrixTranspose(X_matrix_std);
    
    // 3. Solve Multiple Linear Regression: Beta = (X'X)^-1 * X'Y
    let betas: number[] = [];
    let isRegressionValid = false;

    try {
      const Xt = matrixTranspose(X_std);
      const XtX = matrixMultiply(Xt, X_std);
      
      // Add small Ridge penalty (lambda=0.1) for stability
      for (let i = 0; i < XtX.length; i++) XtX[i][i] += 0.1;
      
      const XtXInv = matrixInverse(XtX);
      const XtY = matrixMultiply(Xt, Y_std.map(y => [y]));
      const betaMatrix = matrixMultiply(XtXInv, XtY);
      betas = betaMatrix.map(row => row[0]);
      isRegressionValid = true;
    } catch (e) {
      console.warn("Regression failed, likely singular matrix.", e);
    }

    // 4. Build visualization data
    const impactData: any[] = [];
    const driverData = groups.map((label, idx) => {
      const dataPoint: any = { subject: label };
      const relatedQs = driverQs.filter(q => q.shortLabel === label);
      
      let allSidesTotal = 0, allSidesCount = 0;
      const sideAverages: number[] = [];
      session.sides.forEach(side => {
        const sideResponses = session.responses.filter(r => r.side === side);
        let sideTotal = 0, sideCount = 0;
        sideResponses.forEach(r => {
          relatedQs.forEach(q => { if (r.scores?.[q.id]) { sideTotal += r.scores[q.id]; sideCount++; allSidesTotal += r.scores[q.id]; allSidesCount++; } });
        });
        const avg = sideCount > 0 ? Number((sideTotal / sideCount).toFixed(1)) : 0;
        dataPoint[side] = avg;
        sideAverages.push(avg);
      });

      const combinedAvg = allSidesCount > 0 ? Number((allSidesTotal / allSidesCount).toFixed(1)) : 0;
      dataPoint['Avg'] = combinedAvg;

      const beta = betas[idx] || 0;
      impactData.push({
        label,
        impact: Math.max(0, beta), // Standardized Beta
        avg: combinedAvg
      });

      return dataPoint;
    });

    const sortedImpact = [...impactData].sort((a, b) => b.impact - a.impact);
    
    // Satisfaction Score (0-100)
    let sTotal = 0, sCount = 0;
    session.responses.forEach(r => {
      outcomeQs.forEach(q => { if (r.scores?.[q.id]) { sTotal += r.scores[q.id]; sCount++; } });
    });
    const satisfactionScore = sCount > 0 ? Math.round(((sTotal / sCount - 1) / 6) * 100) : null;

    return { 
      driverData, 
      impactData: sortedImpact,
      satisfactionScore, 
      biggestGap: null, // Removed for brevity
      primaryDriver: sortedImpact[0]?.impact > 0.1 ? sortedImpact[0] : null,
      isRegressionValid
    };
  }, [session]);

  if (!session) return null;

  const handleAnalyze = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await analyzePartnership(session, stats);
      onUpdate({ ...session, analysis: result });
    } catch (e: any) {
      alert("הניתוח נכשל. וודא שיש מספיק מענים ונסה שוב.");
    } finally {
      setLoading(false);
    }
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
    <div className="space-y-8 animate-fadeIn pb-24 max-w-[1650px] mx-auto px-6" dir="rtl">
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6 border-b border-zinc-900 pb-10">
        <div className="flex items-center gap-6 flex-row-reverse">
           <div className="text-right">
              <h2 className="text-4xl font-black text-white tracking-tighter leading-none">{session.title}</h2>
              <div className="flex items-center gap-2 justify-end mt-2">
                 <span className="text-indigo-500 font-bold text-[10px] uppercase tracking-[0.2em]">Strategic Regression Model</span>
                 <div className="w-8 h-px bg-zinc-800"></div>
              </div>
           </div>
           <div className="w-16 h-16 bg-indigo-600 rounded-[1.8rem] flex items-center justify-center shadow-3xl shadow-indigo-600/40">
              <BarChart3 className="text-white" size={32} />
           </div>
        </div>

        <div className="flex gap-4">
           <button onClick={onBack} className="bg-zinc-900 text-zinc-400 px-10 py-4 rounded-2xl font-black border border-zinc-800 hover:text-white hover:bg-zinc-800 transition-all">חזרה</button>
           <button 
             onClick={handleAnalyze} 
             disabled={loading} 
             className={`px-12 py-4 rounded-2xl font-black transition-all flex items-center gap-3 shadow-2xl shadow-indigo-600/20 ${loading ? 'bg-zinc-800 text-zinc-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95'}`}
           >
             {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <Sparkles size={20} />}
             {loading ? 'מבצע רגרסיה...' : 'הפעל ניתוח AI'}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        <div className="xl:col-span-8 space-y-10">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#0b0b0d] rounded-[2.5rem] p-10 border border-white/5 relative overflow-hidden text-right shadow-xl">
               <Activity className="text-indigo-500 mb-6" size={28} />
               <h3 className="text-zinc-500 text-[11px] font-black uppercase tracking-[0.2em] mb-1">מדד בריאות הממשק (Outcome)</h3>
               <div className="flex items-baseline gap-2 justify-end">
                  <span className="text-7xl font-black text-white tracking-tighter">
                    {stats.satisfactionScore !== null ? `${stats.satisfactionScore}%` : '---'}
                  </span>
               </div>
               <p className="text-[10px] text-zinc-600 font-bold mt-2">חישוב משולב של אפקטיביות ושביעות רצון</p>
            </div>

            <div className="bg-[#0b0b0d] rounded-[2.5rem] p-10 border border-white/5 text-right shadow-xl relative overflow-hidden">
               <Zap className="text-amber-500 mb-6" size={28} />
               <h3 className="text-zinc-500 text-[11px] font-black uppercase tracking-[0.2em] mb-1">המניע העיקרי (Top Beta)</h3>
               <div className="text-3xl font-black text-white leading-tight min-h-[3rem] flex items-center justify-end">
                  {stats.primaryDriver ? stats.primaryDriver.label : 'מעט מדי מענים'}
               </div>
               <p className="text-zinc-600 text-[10px] font-bold mt-2">המשתנה עם ההשפעה הייחודית הגבוהה ביותר</p>
            </div>

            <div className="bg-[#0b0b0d] rounded-[2.5rem] p-10 border border-white/5 text-right shadow-xl">
               <TrendingUp className="text-emerald-500 mb-6" size={28} />
               <h3 className="text-zinc-500 text-[11px] font-black uppercase tracking-[0.2em] mb-1">דירוג מודל הרגרסיה</h3>
               <div className="text-4xl font-black text-white tracking-tighter flex items-center justify-end h-16">
                  {stats.isRegressionValid ? 'Stable' : 'Low N'}
               </div>
               <p className="text-zinc-600 text-[10px] font-bold mt-2">{stats.isRegressionValid ? 'מודל סטטיסטי תקף ומנורמל' : 'נדרשים לפחות 3 מענים'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Radar: Raw Distribution */}
            <div className="bg-[#0b0b0d] rounded-[3.5rem] p-10 border border-white/5 shadow-2xl flex flex-col">
               <div className="flex items-center gap-4 justify-end mb-10">
                  <div className="text-right">
                     <h3 className="text-2xl font-black text-white">תמונת מצב (Averages)</h3>
                     <p className="text-zinc-500 text-[10px] font-bold">איך הצוותים רואים את המציאות?</p>
                  </div>
                  <Target className="text-indigo-500" size={28} />
               </div>
               <div className="h-[400px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={stats.driverData}>
                      <PolarGrid stroke="#1a1a1e" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 11, fontWeight: 800 }} />
                      <PolarRadiusAxis domain={[0, 7]} tick={false} axisLine={false} />
                      {(session.sides || []).map((side, idx) => (
                        <Radar key={side} name={side} dataKey={side} stroke={SIDE_COLORS[idx % SIDE_COLORS.length]} fill={SIDE_COLORS[idx % SIDE_COLORS.length]} fillOpacity={0.1} strokeWidth={3} />
                      ))}
                      <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '10px', fontWeight: 800 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#000', borderRadius: '12px', border: 'none', textAlign: 'right' }} />
                    </RadarChart>
                 </ResponsiveContainer>
               </div>
            </div>

            {/* Regression Impact Map */}
            <div className="bg-[#0b0b0d] rounded-[3.5rem] p-10 border border-white/5 shadow-2xl flex flex-col relative">
               <div className="flex items-center gap-4 justify-end mb-10">
                  <div className="text-right">
                     <h3 className="text-2xl font-black text-white">מפת השפעה (Impact Weight)</h3>
                     <p className="text-zinc-500 text-[10px] font-bold">משקולות Beta מנורמלות (Unique Contribution)</p>
                  </div>
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 shadow-inner">
                    <Info size={20} />
                  </div>
               </div>
               <div className="h-[400px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.impactData} layout="vertical" margin={{ left: 20, right: 40 }}>
                      <XAxis type="number" domain={[0, 'dataMax']} hide />
                      <YAxis dataKey="label" type="category" tick={{ fill: '#a1a1aa', fontSize: 12, fontWeight: 900 }} width={80} />
                      <Tooltip cursor={{ fill: 'transparent' }} content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const val = Number(payload[0].value);
                          return (
                            <div className="bg-black p-4 rounded-2xl border border-zinc-800 text-right shadow-2xl">
                               <p className="text-white font-black">{payload[0].payload.label}</p>
                               <p className="text-emerald-400 text-xs mt-1">משקל רגרסיה (β): {val.toFixed(2)}</p>
                               <p className="text-[9px] text-zinc-600 mt-2 max-w-[150px]">זהו הכוח הייחודי של המשתנה בניבוי שביעות רצון, ללא קשר למשתנים אחרים.</p>
                            </div>
                          );
                        }
                        return null;
                      }} />
                      <Bar dataKey="impact" radius={[0, 12, 12, 0]} barSize={34}>
                        {stats.impactData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.impact > 0.4 ? '#10b981' : entry.impact > 0.15 ? '#6366f1' : '#18181b'} />
                        ))}
                      </Bar>
                    </BarChart>
                 </ResponsiveContainer>
               </div>
               <div className="mt-4 p-4 bg-zinc-900/50 rounded-2xl border border-white/5">
                  <p className="text-[10px] text-zinc-500 font-bold text-center leading-relaxed">
                    שימוש ברגרסיה מרובה (Multiple Linear Regression) מאפשר לבודד את ההשפעה של כל דרייבר. בניגוד למתאם פשוט, כאן מוצגת התרומה המזוקקת של כל פרמטר.
                  </p>
               </div>
            </div>
          </div>
        </div>

        {/* AI Analysis */}
        <div className="xl:col-span-4">
          <div className="bg-[#111114] rounded-[3rem] p-10 border border-indigo-500/10 shadow-3xl min-h-[900px] flex flex-col">
             <div className="flex items-center gap-4 justify-end mb-10 border-b border-zinc-800 pb-8">
                <div className="text-right">
                   <h3 className="text-2xl font-black text-white">תובנות אסטרטגיות AI</h3>
                   <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-1">Regression-Informed Guidance</p>
                </div>
                <Sparkles className="text-indigo-500" size={24} />
             </div>

             {!session.analysis ? (
               <div className="flex-grow flex flex-col items-center justify-center text-center space-y-8 opacity-40">
                  <div className="w-20 h-20 bg-zinc-900 rounded-[2rem] flex items-center justify-center text-4xl shadow-inner">📊</div>
                  <p className="text-zinc-500 text-sm font-bold max-w-[200px]">ה-AI ינתח את מקדמי הרגרסיה כדי להבין על אילו צירים כדאי להשקיע מאמץ ניהולי.</p>
               </div>
             ) : (
               <div className="space-y-12 overflow-y-auto custom-scrollbar pr-4">
                  <div className="bg-indigo-600 rounded-[2.2rem] p-10 text-white shadow-2xl shadow-indigo-600/20">
                     <h4 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-80 mb-6 text-right">Diagnosis Summary</h4>
                     <p className="text-xl font-black leading-tight text-right italic">"{session.analysis.summary}"</p>
                  </div>
                  
                  <div className="space-y-10 text-right">
                     <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest">מפת דרכים לשיפור</h4>
                     <div className="space-y-6">
                        {[...(session.analysis.recommendations?.systemic || []), ...(session.analysis.recommendations?.relational || [])].map((rec, i) => (
                          <div key={i} className="group">
                             <div className="bg-zinc-900 p-6 rounded-[1.8rem] border border-zinc-800/50 hover:border-indigo-500/30 transition-all flex flex-col gap-4">
                                <p className="text-[15px] font-bold text-zinc-200 leading-relaxed">{rec}</p>
                                <button onClick={() => handleExpandRec(rec)} className="self-end text-[10px] font-black text-indigo-400 hover:text-white transition-colors bg-indigo-500/5 px-4 py-2 rounded-lg border border-indigo-500/10">
                                  {expandingRec === rec ? 'בונה תוכנית...' : expandedSteps[rec] ? '✓ צעדים מוכנים' : 'איך ליישם? ←'}
                                </button>
                             </div>
                             {expandedSteps[rec] && (
                               <div className="mr-6 border-r-2 border-indigo-500/30 pr-6 mt-4 space-y-4 animate-slideDown">
                                  {expandedSteps[rec].map((step, idx) => (
                                    <div key={idx} className="flex gap-4 items-start flex-row-reverse">
                                       <span className="w-5 h-5 bg-indigo-500/20 text-indigo-400 rounded flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5">{idx+1}</span>
                                       <p className="text-[11px] text-zinc-400 font-bold leading-relaxed">{step}</p>
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
