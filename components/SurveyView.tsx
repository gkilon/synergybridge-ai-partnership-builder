
import React, { useState } from 'react';
import { PartnershipSession, ParticipantResponse, Category, Language } from '../types';
import { LayoutDashboard, Lock, Settings } from 'lucide-react';

interface Props {
  session?: PartnershipSession;
  onSubmit: (res: ParticipantResponse) => void;
  onGoAdmin: () => void;
}

const SurveyView: React.FC<Props> = ({ session, onSubmit, onGoAdmin }) => {
  const [step, setStep] = useState(0);
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
      identify: 'זיהוי משתתף',
      chooseSide: 'בחר את הממשק שלך:',
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
      successDesc: 'תודה על המענה, המידע שלך יסייע ל-AI.',
      back: 'סגור וחזור',
      admin: 'ניהול מערכת'
    },
    en: {
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
  }[lang] || { /* Safe fallback if lang is neither 'he' nor 'en' */
    identify: 'Identify', chooseSide: 'Side:', personalDetails: 'Details:', fullName: 'Name', role: 'Role', start: 'Start', question: 'Q', of: 'of', weak: 'Weak', excellent: 'Excellent', further: 'More?', furtherDesc: 'Notes', notes: '...', finish: 'Finish', success: 'Done', successDesc: '...', back: 'Back', admin: 'Admin'
  };

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

  if (!session) return <div className="min-h-screen flex items-center justify-center text-white">Interface Not Found</div>;

  const questions = session.questions || [];

  if (done) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 bg-zinc-950 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="glass max-w-md w-full p-12 rounded-[3rem] text-center space-y-8 animate-fadeIn border-emerald-500/20">
          <div className="w-24 h-24 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto">✓</div>
          <div className="space-y-3">
             <h2 className="text-4xl font-black text-white">{t.success}</h2>
             <p className="text-zinc-400 font-medium">{t.successDesc}</p>
          </div>
          <button onClick={onGoAdmin} className="w-full bg-zinc-900 text-zinc-400 py-4 rounded-2xl font-bold">{t.back}</button>
        </div>
      </div>
    );
  }

  const currentQ = questions[step - 1];

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
          <h1 className="text-4xl font-black text-white leading-tight">{session.title}</h1>
          <p className="text-zinc-500 font-black uppercase tracking-[0.2em] text-[10px]">Partnership Intelligence Assessment</p>
        </div>

        {step === 0 ? (
          <div className="glass rounded-[2.5rem] p-10 space-y-10 shadow-2xl border-white/5">
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
                <input placeholder={t.fullName} className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-4 text-white font-bold" value={name} onChange={e => setName(e.target.value)} />
                <input placeholder={t.role} className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-4 text-white font-bold" value={role} onChange={e => setRole(e.target.value)} />
              </div>
            </div>
            <button disabled={!name || !side} onClick={() => setStep(1)} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white py-6 rounded-2xl font-black text-xl transition-all shadow-xl shadow-indigo-600/20">{t.start}</button>
          </div>
        ) : step <= questions.length ? (
          <div className="glass rounded-[2.5rem] p-10 space-y-12 relative overflow-hidden shadow-2xl border-white/5">
            <div className="absolute top-0 left-0 h-2 bg-indigo-500 transition-all duration-700" style={{ width: `${(step / questions.length) * 100}%` }}></div>
            <div className="space-y-6">
              <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest">{t.question} {step} {t.of} {questions.length}</p>
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
        ) : (
          <div className="glass rounded-[2.5rem] p-10 space-y-10 shadow-2xl border-white/5">
            <div className="space-y-4">
              <h3 className="text-3xl font-black text-white">{t.further}</h3>
              <p className="text-zinc-400 text-sm font-medium">{t.furtherDesc}</p>
            </div>
            <textarea rows={6} className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-3xl p-6 text-white resize-none" placeholder={t.notes} value={comments} onChange={e => setComments(e.target.value)} />
            <button onClick={handleFinalSubmit} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-6 rounded-2xl font-black text-xl transition-all shadow-xl active:scale-95">{t.finish}</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveyView;
