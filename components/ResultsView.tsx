
import React, { useState, useMemo } from 'react';
import { PartnershipSession, AIAnalysis, Category } from '../types';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, Legend, Tooltip 
} from 'recharts';
import { analyzePartnership } from '../services/geminiService';

interface Props {
  session: PartnershipSession | undefined;
  onUpdate: (updated: PartnershipSession) => void;
  onBack: () => void;
}

const SIDE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
const INCLUSIVE_COLOR = '#71717a'; // Zinc-400 for inclusive line

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
      alert(e.message || "חלה שגיאה");
    } finally {
      setLoading(false);
    }
  };

  const { driverData, satisfactionScore } = useMemo(() => {
    if (!session.questions) return { driverData: [], satisfactionScore: 0 };
    
    // 1. Separate Drivers from Outcome
    const driverQs = session.questions.filter(q => q.shortLabel !== 'OUTCOME_SATISFACTION');
    const outcomeQs = session.questions.filter(q => q.shortLabel === 'OUTCOME_SATISFACTION');
    
    const groups = Array.from(new Set(driverQs.map(q => q.shortLabel || 'כללי')));
    
    const chartData = groups.map(label => {
      const dataPoint: any = { subject: label };
      const relatedQs = driverQs.filter(q => q.shortLabel === label);
      
      let allSidesTotal = 0;
      let allSidesCount = 0;

      session.sides.forEach(side => {
        const sideResponses = session.responses.filter(r => r.side === side);
        let sideTotal = 0, sideCount = 0;
        
        sideResponses.forEach(r => {
          relatedQs.forEach(q => {
            if (r.scores[q.id]) { 
              sideTotal += r.scores[q.id]; 
              sideCount++; 
              allSidesTotal += r.scores[q.id];
              allSidesCount++;
            }
          });
        });
        
        dataPoint[side] = sideCount > 0 ? Number((sideTotal / sideCount).toFixed(1)) : 0;
      });

      // Inclusive average (total of the partnership entity)
      dataPoint['כולל'] = allSidesCount > 0 ? Number((allSidesTotal / allSidesCount).toFixed(1)) : 0;
      
      return dataPoint;
    });

    // 2. Calculate Outcome (Satisfaction) - The Dependent Variable
    let sTotal = 0, sCount = 0;
    session.responses.forEach(r => {
      outcomeQs.forEach(q => {
        if (r.scores[q.id]) { sTotal += r.scores[q.id]; sCount++; }
      });
    });
    const finalSatisfaction = sCount > 0 ? Number(((sTotal / sCount) / 7 * 100).toFixed(0)) : 0;

    return { driverData: chartData, satisfactionScore: finalSatisfaction };
  }, [session]);

  return (
    <div className="space-y-10 animate-fadeIn pb-32 max-w-7xl mx-auto px-4 text-right" dir="rtl">
      
      {/* AI MODAL */}
      {showAIModal && session.analysis && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={() => setShowAIModal(false)}></div>
          <div className="glass w-full max-w-5xl max-h-[90vh] rounded-[3rem] border-indigo-500/30 shadow-3xl relative z-10 flex flex-col overflow-hidden animate-slideDown">
            <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-indigo-500/5">
               <h3 className="text-3xl font-black text-white">ניתוח אימפקט אסטרטגי AI</h3>
               <button onClick={() => setShowAIModal(false)} className="text-zinc-500 hover:text-white font-black">X</button>
            </div>
            <div className="flex-grow overflow-y-auto p-10 space-y-12 custom-scrollbar">
               <div className="p-8 bg-indigo-500/10 rounded-[2rem] border border-indigo-500/20">
                  <p className="text-2xl font-black text-white leading-tight">{session.analysis.summary}</p>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                     <h4 className="text-xl font-black text-indigo-400">המלצות מערכתיות (Impact)</h4>
                     {session.analysis.recommendations.systemic.map((r, i) => (
                       <div key={i} className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 font-bold text-zinc-200">{r}</div>
                     ))}
                  </div>
                  <div className="space-y-4">
                     <h4 className="text-xl font-black text-purple-400">המלצות יחסים (Cultural)</h4>
                     {session.analysis.recommendations.relational.map((r, i) => (
                       <div key={i} className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 font-bold text-zinc-200">{r}</div>
                     ))}
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-8 border-b border-zinc-900 pb-10">
        <div className="flex gap-6 items-center">
           <div className="w-24 h-24 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/10 to-transparent"></div>
              <span className="text-4xl z-10">🎯</span>
              <span className="text-xl font-black text-indigo-400 z-10">{satisfactionScore}%</span>
           </div>
           <div>
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter">{session.title}</h2>
              <p className="text-zinc-500 font-bold text-lg">ניתוח שביעות רצון (המשתנה התלוי)</p>
           </div>
        </div>
        <div className="flex gap-4">
           <button onClick={onBack} className="bg-zinc-900 text-zinc-500 px-8 py-4 rounded-2xl font-bold border border-zinc-800">חזרה</button>
           <button 
             onClick={handleAnalyze}
             disabled={loading || session.responses.length < 2}
             className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-2xl font-black shadow-3xl shadow-indigo-600/20"
           >
             {loading ? 'מנתח אימפקט...' : '✨ ניתוח מקדם השפה (AI)'}
           </button>
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
         <div className="glass rounded-[3.5rem] p-12 border-white/5 shadow-2xl">
            <h3 className="text-2xl font-black text-white mb-2">מפת התנאים (Drivers)</h3>
            <p className="text-zinc-500 font-bold mb-10">השוואת צדדים מול ממוצע כולל</p>
            <div className="h-[450px]">
               <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={driverData}>
                    <PolarGrid stroke="#27272a" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 13, fontWeight: 900 }} />
                    <PolarRadiusAxis domain={[0, 7]} tick={false} axisLine={false} />
                    
                    {/* Inclusive Line First (Background) */}
                    <Radar name="כולל (היישות השלישית)" dataKey="כולל" stroke={INCLUSIVE_COLOR} fill={INCLUSIVE_COLOR} fillOpacity={0.05} strokeWidth={2} strokeDasharray="5 5" />
                    
                    {/* Sides Lines */}
                    {session.sides.map((side, idx) => (
                      <Radar key={side} name={side} dataKey={side} stroke={SIDE_COLORS[idx % SIDE_COLORS.length]} fill={SIDE_COLORS[idx % SIDE_COLORS.length]} fillOpacity={0.15} strokeWidth={4} />
                    ))}
                    
                    <Legend iconType="circle" />
                    <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '16px', fontWeight: 'bold' }} />
                  </RadarChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="glass rounded-[3.5rem] p-12 border-white/5 shadow-2xl flex flex-col justify-center space-y-12">
            <div className="space-y-4">
               <h3 className="text-3xl font-black text-white">מדד המטרה (Outcome)</h3>
               <p className="text-zinc-500 font-bold">זהו המשתנה התלוי המושפע מהתנאים בגרף משמאל</p>
            </div>
            
            <div className="space-y-8">
               <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                     <span className="text-zinc-400 font-black uppercase tracking-widest text-xs">שביעות רצון ואפקטיביות</span>
                     <span className="text-7xl font-black text-white tabular-nums">{satisfactionScore}%</span>
                  </div>
                  <div className={`px-6 py-2 rounded-2xl font-black text-xs uppercase tracking-tighter ${satisfactionScore > 75 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : satisfactionScore > 50 ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                     {satisfactionScore > 75 ? 'ביצועים גבוהים' : satisfactionScore > 50 ? 'פוטנציאל שיפור' : 'סיכון אסטרטגי'}
                  </div>
               </div>
               
               <div className="h-6 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 p-1">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${satisfactionScore > 75 ? 'bg-emerald-500' : satisfactionScore > 50 ? 'bg-indigo-500' : 'bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)]'}`} 
                    style={{ width: `${satisfactionScore}%` }}
                  ></div>
               </div>
               
               <div className="p-8 bg-zinc-900/50 rounded-[2.5rem] border border-zinc-800">
                  <h4 className="font-black text-white mb-4 flex items-center gap-2">
                     <span className="text-indigo-500">ℹ️</span>
                     על הניתוח:
                  </h4>
                  <p className="text-zinc-400 font-medium leading-relaxed text-sm">
                     במקום להסתכל רק על ממוצעים, אנחנו בוחנים את הציון הזה כתוצאה של ששת הדרייברים בגרף העכביש. ניתוח ה-AI יגלה לך איזה מהדרייברים הוא "צוואר הבקבוק" שמונע מהציון הזה לעלות, ואיפה הפער בין הצדדים מייצר את מירב החיכוך.
                  </p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}; 

export default ResultsView;
