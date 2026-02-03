
import React, { useState } from 'react';
import { PartnershipSession, ParticipantResponse, Category, Language } from '../types';
import { LayoutDashboard, Lock, Settings, MessageCircle, ArrowLeft, ArrowRight, ClipboardCheck } from 'lucide-react';

interface Props {
  session?: PartnershipSession;
  onSubmit: (res: ParticipantResponse) => void;
  onGoAdmin: () => void;
}

const SurveyView: React.FC<Props> = ({ session, onSubmit, onGoAdmin }) => {
  const [step, setStep] = useState(0); // 0: Intro, 1: Identity, 2+: Questions
  const [name, setName] = useState('');
  const [side, setSide] = useState('');
  const [role, setRole] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState('');
  const [done, setDone] = useState(false);

  const lang = session?.language || 'he';
  const isRtl = lang === 'he';

  const t = {
    he: {
      welcome: 'ברוכים הבאים לשאלון השותפות',
      introTitle: 'הערכת ממשק ושיתוף פעולה',
      introDesc: 'להלן מספר שאלות העוסקות בממשק ובשותפות בין היחידות הארגוניות. עבור כל היבט, תתבקש/י לציין באיזו מידה לדעתך הדברים מתנהלים בצורה טובה ואפקטיבית.',
      introGuidance: 'התשובות שלך ינותחו על ידי מערכת ה-AI שלנו כדי לייצר תובנות והמלצות לשיפור הממשק.',
      next: 'המשך לזיהוי →',
      identify: 'זיהוי משתתף',
      chooseSide: 'בחר את הצד שלך בממשק:',
      personalDetails: 'פרטים אישיים:',
      fullName: 'שם מלא',
      role: 'תפקיד בארגון',
      start: 'התחל בהערכה →',
      question: 'שאלה',
      of: 'מתוך',
      weak: 'חלש מאוד',
      excellent: 'מצוין',
      further: 'תובנות נוספות?',
      furtherDesc: 'יש משהו שחשוב שה-AI ידע על הממשק?',
      notes: 'כתוב כאן הערות חופשיות...',
      finish: 'סיים ושלח לאדמין',
      success: 'נשלח בהצלחה!',
      successDesc: 'תודה על המענה, המידע שלך יסייע לשיפור השותפות.',
      back: 'סגור וחזור',
      admin: 'ניהול מערכת'
    },
    en: {
      welcome: 'Welcome to the Partnership Survey',
      introTitle: 'Interface & Collaboration Assessment',
      introDesc: 'The following questions address the interface and partnership between the involved organizational units. For each aspect, you will be asked to indicate to what extent you feel things are functioning effectively.',
      introGuidance: 'Your responses will be analyzed by our AI system to generate insights and recommendations for interface optimization.',
      next: 'Continue to Identification →',
      identify: 'Identify Participant',
      chooseSide: 'Choose your side:',
      personalDetails: 'Personal Details:',
      fullName: 'Full Name',
      role: 'Role in Organization',
      start: 'Start Assessment →',
      question: 'Question',
      of: 'of',
      weak: 'Very Weak',
      excellent: 'Excellent',
      further: 'Further Insights?',
      furtherDesc: 'Anything else the AI should know about this interface?',
      notes: 'Write your notes here...',
      finish: 'Finish and Submit',
      success: 'Submitted Successfully!',
      successDesc: 'Thank you for your response, it will feed our AI analysis.',
      back: 'Close and Return',
      admin: 'Admin Login'
    }
  }[lang];

  const handleFinalSubmit = () => {
    const newResponse: ParticipantResponse = {
      id: Math.random().toString(36).substr(2, 9),
      participantName: name,
      side: side,
      role: role,
      scores,
      comments,
      submittedAt: new Date().toISOString()
    };
    onSubmit(newResponse);
    setDone(true);
  };

  if (!session) return <div className="min-h-screen flex items-center justify-center text-white font-black">Interface Not Found</div>;

  const questions = session.questions || [];

  if (done) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 bg-zinc-950 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="glass max-w-md w-full p-12 rounded-[3rem] text-center space-y-8 animate-fadeIn border-emerald-500/20 shadow-2xl">
          <div className="w-24 h-24 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-500/10">✓</div>
          <div className="space-y-3">
             <h2 className="text-4xl font-black text-white leading-tight">{t.success}</h2>
             <p className="text-zinc-400 font-medium">{t.successDesc}</p>
          </div>
          <button onClick={onGoAdmin} className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 py-4 rounded-2xl font-bold transition-colors">{t.back}</button>
        </div>
      </div>
    );
  }

  // Questions start at step 2. Index = step - 2.
  const currentQ = step >= 2 && step <= questions.length + 1 ? questions[step - 2] : null;

  return (
    <div className={`min-h-screen bg-zinc-950 flex flex-col items-center p-6 md:p-12 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      
      <button 
        onClick={onGoAdmin}
        className={`fixed top-8 ${isRtl ? 'left-8' : 'right-8'} bg-zinc-900/50 backdrop-blur-md border border-white/10 px-6 py-3 rounded-2xl text-zinc-500 hover:text-white transition-all z-50 flex items-center gap-3 group shadow-2xl`}
      >
         <span className="text-[10px] font-black uppercase tracking-widest">{t.admin}</span>
         <div className="w-8 h-8 bg-zinc-800 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
            <Settings size={16} />
         </div>
      </button>

      <div className="max-w-xl w-full space-y-10 animate-fadeIn pt-16">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-black text-white leading-tight tracking-tight">{session.title}</h1>
          <p className="text-zinc-500 font-black uppercase tracking-[0.2em] text-[10px]">Partnership Intelligence Assessment</p>
        </div>

        {/* STEP 0: INTRODUCTION SPLASH */}
        {step === 0 && (
          <div className="glass rounded-[3rem] p-12 space-y-10 shadow-3xl border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <div className="flex flex-col items-center text-center space-y-8">
               <div className="w-20 h-20 bg-indigo-600 rounded-[1.8rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-600/40">
                  <ClipboardCheck size={36} />
               </div>
               <div className="space-y-4">
                  <h2 className="text-3xl font-black text-white leading-tight">{t.introTitle}</h2>
                  <p className="text-zinc-400 text-lg font-medium leading-relaxed">{t.introDesc}</p>
                  <div className="p-4 bg-zinc-900/50 rounded-2xl border border-white/5">
                     <p className="text-zinc-500 text-xs font-bold leading-relaxed">{t.introGuidance}</p>
                  </div>
               </div>
            </div>
            <button 
              onClick={() => setStep(1)} 
              className="w-full bg-white text-black py-6 rounded-2xl font-black text-xl transition-all shadow-xl hover:bg-zinc-200 active:scale-95 flex items-center justify-center gap-3"
            >
               {t.next}
            </button>
          </div>
        )}

        {/* STEP 1: IDENTIFICATION */}
        {step === 1 && (
          <div className="glass rounded-[3rem] p-10 space-y-10 shadow-3xl border-white/5 animate-fadeIn">
            <h3 className="text-2xl font-black text-white">{t.identify}</h3>
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest block">{t.chooseSide}</label>
                <div className="grid grid-cols-1 gap-3">
                  {(session.sides || []).map(s => (
                    <button 
                      key={s}
                      onClick={() => setSide(s)}
                      className={`p-5 rounded-2xl text-right font-black transition-all border-2 ${side === s ? 'bg-indigo-600 border-indigo-400 text-white shadow-xl scale-[1.02]' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest block">{t.personalDetails}</label>
                <input placeholder={t.fullName} className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-indigo-500" value={name} onChange={e => setName(e.target.value)} />
                <input placeholder={t.role} className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-indigo-500" value={role} onChange={e => setRole(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(0)} className="w-20 bg-zinc-900 text-zinc-500 p-6 rounded-2xl font-black transition-colors hover:text-white flex items-center justify-center">
                {isRtl ? <ArrowRight size={24} /> : <ArrowLeft size={24} />}
              </button>
              <button disabled={!name || !side} onClick={() => setStep(2)} className="flex-grow bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white py-6 rounded-2xl font-black text-xl transition-all shadow-xl shadow-indigo-600/20">{t.start}</button>
            </div>
          </div>
        )}

        {/* STEP 2 to N+1: QUESTIONS */}
        {step >= 2 && step <= questions.length + 1 ? (
          <div className="glass rounded-[3rem] p-10 space-y-12 relative overflow-hidden shadow-3xl border-white/5 animate-fadeIn">
            <div className="absolute top-0 left-0 h-2 bg-indigo-500 transition-all duration-700 shadow-[0_0_15px_rgba(99,102,241,0.5)]" style={{ width: `${((step - 1) / questions.length) * 100}%` }}></div>
            <div className="space-y-6">
              <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest">{t.question} {step - 1} {t.of} {questions.length}</p>
              <h3 className="text-3xl font-black leading-tight text-white">{currentQ?.text || 'Loading question...'}</h3>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map(num => (
                <button
                  key={num}
                  disabled={!currentQ}
                  onClick={() => { 
                    if (!currentQ) return;
                    setScores({ ...scores, [currentQ.id]: num }); 
                    setTimeout(() => setStep(step + 1), 200); 
                  }}
                  className={`aspect-square rounded-xl text-xl font-black flex items-center justify-center transition-all ${currentQ && scores[currentQ.id] === num ? 'bg-indigo-600 text-white scale-110 shadow-2xl shadow-indigo-500/40' : 'bg-zinc-900 text-zinc-600 hover:bg-zinc-800'}`}
                >
                  {num}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-[11px] font-black text-zinc-500 uppercase px-2">
              <span>{t.weak} (1)</span>
              <span>{t.excellent} (7)</span>
            </div>
          </div>
        ) : step > questions.length + 1 && (
          /* FINAL FEEDBACK STEP */
          <div className="glass rounded-[3rem] p-10 space-y-10 shadow-3xl border-white/5 animate-fadeIn">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mb-6">
                <MessageCircle size={28} />
              </div>
              <h3 className="text-3xl font-black text-white">{t.further}</h3>
              <p className="text-zinc-400 text-sm font-medium leading-relaxed">{t.furtherDesc}</p>
            </div>
            <textarea rows={6} className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-3xl p-6 text-white resize-none font-medium outline-none focus:border-indigo-500 transition-colors" placeholder={t.notes} value={comments} onChange={e => setComments(e.target.value)} />
            <button onClick={handleFinalSubmit} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-6 rounded-2xl font-black text-xl transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3">
               <ClipboardCheck size={24} />
               <span>{t.finish}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveyView;
