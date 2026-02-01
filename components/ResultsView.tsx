
import React, { useState, useMemo } from 'react';
import { PartnershipSession, AIAnalysis } from '../types';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, Cell
} from 'recharts';
import { analyzePartnership, expandRecommendation } from '../services/geminiService';
import { DEFAULT_QUESTIONS } from '../constants';
import { Zap, Target, Activity, Sparkles, TrendingUp, BarChart3, Info, ChevronLeft, Boxes, AlertCircle } from 'lucide-react';

interface Props {
  session: PartnershipSession | undefined;
  onUpdate: (updated: PartnershipSession) => void;
  onBack: () => void;
}

const SIDE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

/** 
 * STATISTICAL UTILS
 */
const calculateCorrelation = (x: number[], y: number[]) => {
  const n = x.length;
  if (n < 3) return 0; // Not enough for correlation

  const muX = x.reduce((a, b) => a + b, 0) / n;
  const muY = y.reduce((a, b) => a + b, 0) / n;
  
  const num = x.reduce((acc, val, i) => acc + (val - muX) * (y[i] - muY), 0);
  const den = Math.sqrt(
    x.reduce((acc, v) => acc + Math.pow(v - muX, 2), 0) * 
    y.reduce((acc, v) => acc + Math.pow(v - muY, 2), 0)
  );

  if (den === 0) return 0;
  return Math.abs(num / den);
};

const ResultsView: React.FC<Props> = ({ session, onUpdate, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [expandingRec, setExpandingRec] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, string[]>>({});

  const stats = useMemo(() => {
    if (!session || !session.responses || session.responses.length === 0) {
      return { driverData: [], impactData: [], satisfactionScore: 0, method: 'אין נתונים', primaryDriver: null };
    }

    const questions = (session.questions && session.questions.length > 0) ? session.questions : DEFAULT_QUESTIONS;
    
    // Outcome calculation
    const outcomeQs = questions.filter(q => q.shortLabel === 'OUTCOME_SATISFACTION');
    const driverQs = questions.filter(q => q.shortLabel !== 'OUTCOME_SATISFACTION');
    const groups = Array.from(new Set(driverQs.map(q => q.shortLabel).filter(Boolean))) as string[];
    
    // 1. Prepare Target Y (Outcome)
    const Y = session.responses.map(r => {
      let sum = 0, count = 0;
      outcomeQs.forEach(q => {
        const score = r.scores?.[q.id];
        if (typeof score === 'number' && score > 0) { sum += score; count++; }
      });
      return count > 0 ? sum / count : 4; // Baseline 4
    });

    // 2. Prepare Driver Data & Impact
    const driverResults = groups.map(label => {
      const relatedQs = driverQs.filter(q => q.shortLabel === label);
      
      // Values for each response in this group
      const groupX = session.responses.map(r => {
        let s = 0, c = 0;
        relatedQs.forEach(q => {
          const score = r.scores?.[q.id];
          if (typeof score === 'number' && score > 0) { s += score; c++; }
        });
        return c > 0 ? s / c : 4;
      });

      // Side Averages for Radar
      const sideAvgs: any = { subject: label };
      session.sides.forEach(sideName => {
        const sideRes = session.responses.filter(r => r.side === sideName);
        let s = 0, c = 0;
        sideRes.forEach(r => {
          relatedQs.forEach(q => {
            const score = r.scores?.[q.id];
            if (typeof score === 'number' && score > 0) { s += score; c++; }
          });
        });
        sideAvgs[sideName] = c > 0 ? Number((s / c).toFixed(1)) : 0;
      });

      // Impact Logic: 
      // If N < 5, correlation is noise. Use "Opportunity Gap" instead (Impact = Inverse of Score)
      let impactValue = 0;
      if (session.responses.length >= 5) {
        impactValue = calculateCorrelation(groupX, Y);
      } else {
        // Gap Analysis: Drivers with lower scores are more "impactful" to fix
        const avgScore = groupX.reduce((a, b) => a + b, 0) / groupX.length;
        impactValue = Math.max(0, (7 - avgScore) / 7); 
      }

      return { label, impact: impactValue, sideAvgs };
    });

    // Satisfaction Score
    const totalAvgY = Y.reduce((a, b) => a + b, 0) / Y.length;
    const satisfactionScore = Math.round(((totalAvgY - 1) / 6) * 100);

    // Method Label
    const methodLabel = session.responses.length >= 5 ? 'Statistical Correlation' : 'Gap Analysis';

    // Primary Driver check: avoid Agenda favoritism if all are zero
    const sortedImpact = [...driverResults].sort((a, b) => b.impact - a.impact);
    const primary = sortedImpact[0].impact > 0 ? sortedImpact[0] : null;

    return { 
      driverData: driverResults.map(r => r.sideAvgs), 
      impactData: driverResults.map(r => ({ label: r.label, impact: Number(r.impact.toFixed(2)) })).sort((a, b) => b.impact - a.impact), 
      satisfactionScore,
      method: methodLabel,
      primaryDriver: primary
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
                 <span className="text-indigo-500 font-black text-[11px] uppercase tracking-[0.3em]">Statistical Synergy Mapping</span>
                 <div className="w-12 h-px bg-zinc-800"></div>
              </div>
           </div>
           <div className="w-20 h-20 bg-indigo-600 rounded-[2.2rem] flex items-center justify-center shadow-3xl shadow-indigo-600/40 transform -rotate-2 hover:rotate-0 transition-transform">
              <Boxes className="text-white" size={36} />
           </div>
        </div>

        <div className="flex gap-4">
           <button onClick={onBack} className="bg-zinc-900 text-zinc-400 px-10 py-5 rounded-[1.5rem] font-black border border-zinc-800 hover:text-white transition-all flex items-center gap-2">
             <ChevronLeft size={18} /> חזרה
           </button>
           <button onClick={handleAnalyze} disabled={loading} className={`px-14 py-5 rounded-[1.5rem] font-black transition-all flex items-center gap-3 shadow-2xl ${loading ? 'bg-zinc-800 text-zinc-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 active:scale-95'}`}>
             {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <Sparkles size={22} />}
             {loading ? 'מפענח...' : 'הפעל ניתוח AI'}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        <div className="xl:col-span-8 space-y-10">
          
          {/* Top Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#0b0b0d] rounded-[2.5rem] p-10 border border-white/5 text-right shadow-xl">
               <Activity className="text-indigo-500 mb-6" size={32} />
               <h3 className="text-zinc-500 text-[11px] font-black uppercase tracking-widest mb-1">מדד בריאות (Global Health)</h3>
               <div className="text-7xl font-black text-white tracking-tighter">{stats.satisfactionScore}%</div>
            </div>

            <div className="bg-[#0b0b0d] rounded-[2.5rem] p-10 border border-white/5 text-right shadow-xl">
               <Zap className="text-amber-500 mb-6" size={32} />
               <h3 className="text-zinc-500 text-[11px] font-black uppercase tracking-widest mb-1">המניע המשפיע ביותר</h3>
               <div className="text-3xl font-black text-white leading-tight min-h-[3.5rem] flex items-center justify-end">
                  {stats.primaryDriver ? stats.primaryDriver.label : 'לא נמצא מניע בולט'}
               </div>
            </div>

            <div className="bg-[#0b0b0d] rounded-[2.5rem] p-10 border border-white/5 text-right shadow-xl">
               <TrendingUp className="text-emerald-500 mb-6" size={32} />
               <h3 className="text-zinc-500 text-[11px] font-black uppercase tracking-widest mb-1">שיטת שקלול</h3>
               <div className="text-3xl font-black text-white tracking-tighter flex items-center justify-end h-16">
                  {stats.method}
               </div>
               <p className="text-zinc-600 text-[10px] font-bold mt-2">דיוק סטטיסטי מותאם למדגם</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Radar View */}
            <div className="bg-[#0b0b0d] rounded-[3.5rem] p-10 border border-white/5 shadow-2xl h-[600px] flex flex-col items-center">
               <div className="w-full flex items-center gap-4 justify-end mb-10">
                  <div className="text-right">
                     <h3 className="text-2xl font-black text-white">תמונת מצב (Averages)</h3>
                     <p className="text-zinc-500 text-[10px] font-bold">איך הצוותים רואים את המציאות?</p>
                  </div>
                  <Target className="text-indigo-500" size={28} />
               </div>
               <div className="w-full h-full flex items-center justify-center">
                 <ResponsiveContainer width="100%" height="90%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={stats.driverData}>
                      <PolarGrid stroke="#1a1a1e" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 13, fontWeight: 900 }} />
                      <PolarRadiusAxis domain={[0, 7]} tick={false} axisLine={false} />
                      {(session.sides || []).map((side, idx) => (
                        <Radar 
                          key={side} 
                          name={side} 
                          dataKey={side} 
                          stroke={SIDE_COLORS[idx % SIDE_COLORS.length]} 
                          fill={SIDE_COLORS[idx % SIDE_COLORS.length]} 
                          fillOpacity={0.15} 
                          strokeWidth={4} 
                        />
                      ))}
                      <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 900 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#000', borderRadius: '16px', border: '1px solid #27272a', textAlign: 'right' }} />
                    </RadarChart>
                 </ResponsiveContainer>
               </div>
            </div>

            {/* Impact Chart (Prediction Map) */}
            <div className="bg-[#0b0b0d] rounded-[3.5rem] p-10 border border-white/5 shadow-2xl h-[600px] flex flex-col">
               <div className="flex items-center gap-4 justify-end mb-10">
                  <div className="text-right">
                     <h3 className="text-2xl font-black text-white">מפת השפעה (Impact)</h3>
                     <p className="text-zinc-500 text-[10px] font-bold">מי המשתנים שקובעים את ההצלחה?</p>
                  </div>
                  <Info className="text-emerald-500" size={28} />
               </div>
               
               <div className="flex-grow">
                 {stats.impactData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={stats.impactData} 
                        layout="vertical" 
                        margin={{ left: 20, right: 30, top: 10, bottom: 10 }}
                      >
                        <XAxis type="number" hide domain={[0, 1]} />
                        <YAxis 
                          dataKey="label" 
                          type="category" 
                          tick={{ fill: '#a1a1aa', fontSize: 13, fontWeight: 900, textAnchor: 'end' }} 
                          width={110} 
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip cursor={{ fill: 'transparent' }} content={({ active, payload }) => {
                          if (active && payload?.[0]) {
                            return (
                              <div className="bg-black p-4 rounded-2xl border border-zinc-800 text-right shadow-2xl">
                                 <p className="text-white font-black text-sm">{payload[0].payload.label}</p>
                                 <p className="text-emerald-400 text-xs mt-1">עוצמת השפעה: {Number(payload[0].value).toFixed(2)}</p>
                                 <p className="text-[9px] text-zinc-600 mt-2 max-w-[140px]">ניתוח מנבאי המזהה את הדרייברים עם פוטנציאל ההשפעה הגבוה ביותר על הממשק.</p>
                              </div>
                            );
                          }
                          return null;
                        }} />
                        <Bar dataKey="impact" radius={[0, 20, 20, 0]} barSize={34}>
                          {stats.impactData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.impact > 0.6 ? '#10b981' : entry.impact > 0.3 ? '#6366f1' : '#27272a'} 
                              className="transition-all duration-500"
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                 ) : (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-600 italic">
                       <AlertCircle size={48} className="mb-4 opacity-20" />
                       <p>אין מספיק נתונים להצגת מפת השפעה</p>
                    </div>
                 )}
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
                     <p className="text-zinc-500 text-xs font-bold leading-relaxed">ה-AI ישקלל את הנתונים ויבנה תוכנית עבודה לשיפור הממשק הארגוני.</p>
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
