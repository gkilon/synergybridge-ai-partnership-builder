
import React, { useState } from 'react';
import { PartnershipSession, ParticipantResponse, Category } from '../types';

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

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-950 text-center space-y-8 animate-fadeIn">
        <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center border border-red-500/20 shadow-2xl">
           <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-black text-white">השותפות לא נמצאה</h2>
          <p className="text-zinc-500 max-w-sm mx-auto">נראה שהקישור אינו תקין, פג תוקפו או שהשותפות הוסרה על ידי המנהל.</p>
        </div>
        <button 
          onClick={onGoAdmin}
          className="bg-zinc-800 hover:bg-zinc-700 text-white px-8 py-3 rounded-2xl font-bold transition-all"
        >
          חזרה לדף הבית
        </button>
      </div>
    );
  }

  const handleFinalSubmit = () => {
    const res: ParticipantResponse = {
      id: Math.random().toString(36).substr(2, 9),
      participantName: name,
      side,
      role,
      scores,
      comments,
      submittedAt: new Date().toISOString()
    };
    onSubmit(res);
    setDone(true);
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-950">
        <div className="glass max-w-md w-full p-12 rounded-[3rem] text-center space-y-8 animate-fadeIn border-emerald-500/20 shadow-2xl shadow-emerald-500/5">
          <div className="w-24 h-24 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
          </div>
          <div className="space-y-3">
             <h2 className="text-4xl font-black text-white">נשלח בהצלחה!</h2>
             <p className="text-zinc-400 leading-relaxed font-medium">תודה על המענה, המידע שלך יסייע ל-AI לבנות תמונת מצב מדויקת.</p>
          </div>
          <button 
            onClick={onGoAdmin}
            className="w-full bg-zinc-900 text-zinc-400 py-4 rounded-2xl font-bold hover:text-white transition-all"
          >
            סגור וחזור
          </button>
        </div>
      </div>
    );
  }

  const currentQ = session.questions[step - 1];

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center p-6 md:p-12 overflow-x-hidden">
      <div className="max-w-xl w-full space-y-10 animate-fadeIn">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-black text-white leading-tight">{session.title}</h1>
          <div className="flex items-center justify-center gap-2">
             <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
             <p className="text-zinc-500 font-black uppercase tracking-[0.2em] text-[10px]">הערכת ממשק עבודה אסטרטגי</p>
             <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
          </div>
        </div>

        {step === 0 ? (
          <div className="glass rounded-[2.5rem] p-10 space-y-10 shadow-2xl border-white/5">
            <div className="space-y-4">
              <h3 className="text-2xl font-black">זיהוי משתתף</h3>
              <p className="text-zinc-400 text-sm leading-relaxed font-medium">נא לבחור את הצד אותו אתם מייצגים בשותפות זו.</p>
            </div>
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest block">בחר את הממשק שלך:</label>
                <div className="grid grid-cols-1 gap-3">
                  {session.sides.map(s => (
                    <button 
                      key={s}
                      onClick={() => setSide(s)}
                      className={`p-5 rounded-2xl text-right font-black transition-all border-2 ${side === s ? 'bg-indigo-600 border-indigo-400 text-white shadow-xl shadow-indigo-600/30 scale-[1.02]' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest block">פרטים אישיים:</label>
                <input 
                  placeholder="שם מלא"
                  className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-4 outline-none focus:border-indigo-500 transition-all text-lg font-bold text-white"
                  value={name} onChange={e => setName(e.target.value)}
                />
                <input 
                  placeholder="תפקיד בארגון"
                  className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-4 outline-none focus:border-indigo-500 transition-all text-lg font-bold text-white"
                  value={role} onChange={e => setRole(e.target.value)}
                />
              </div>
            </div>
            <button 
              disabled={!name || !side}
              onClick={() => setStep(1)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white py-6 rounded-2xl font-black text-xl transition-all shadow-xl shadow-indigo-600/20"
            >
              התחל בהערכה →
            </button>
          </div>
        ) : step <= session.questions.length ? (
          <div className="glass rounded-[2.5rem] p-10 space-y-12 relative overflow-hidden shadow-2xl border-white/5">
            <div className="absolute top-0 left-0 h-2 bg-indigo-500 transition-all duration-700 ease-out" style={{ width: `${(step / session.questions.length) * 100}%` }}></div>
            
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                 <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${currentQ.category === Category.SYSTEMIC ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}`}>
                    {currentQ.category === Category.SYSTEMIC ? 'מנגנון עבודה' : 'צד היחסים'}
                 </span>
                 <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest">שאלה {step} מתוך {session.questions.length}</p>
              </div>
              <h3 className="text-3xl font-black leading-tight text-white">{currentQ.text}</h3>
            </div>

            <div className="grid grid-cols-7 gap-2 md:gap-4">
              {[1, 2, 3, 4, 5, 6, 7].map(num => (
                <button
                  key={num}
                  onClick={() => {
                    setScores({ ...scores, [currentQ.id]: num });
                    setTimeout(() => setStep(step + 1), 250);
                  }}
                  className={`aspect-square rounded-xl md:rounded-2xl text-xl md:text-3xl font-black flex items-center justify-center transition-all duration-300 ${scores[currentQ.id] === num ? 'bg-indigo-600 text-white scale-110 shadow-2xl shadow-indigo-500/40' : 'bg-zinc-900 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300'}`}
                >
                  {num}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em] px-2">
              <span className="flex items-center gap-1">👎 חלש מאוד (1)</span>
              <span className="flex items-center gap-1">מצוין 👍 (7)</span>
            </div>
          </div>
        ) : (
          <div className="glass rounded-[2.5rem] p-10 space-y-10 animate-fadeIn shadow-2xl border-white/5">
            <div className="space-y-4">
              <h3 className="text-3xl font-black">תובנות נוספות?</h3>
              <p className="text-zinc-400 text-sm font-medium leading-relaxed">יש משהו שחשוב שה-AI ידע על הממשק? קונפליקטים נקודתיים או הצלחות שראויות לציון?</p>
            </div>
            <textarea 
              rows={6}
              className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-3xl p-6 outline-none focus:border-indigo-500 transition-all font-medium text-white resize-none"
              placeholder="כתוב כאן הערות חופשיות..."
              value={comments} onChange={e => setComments(e.target.value)}
            />
            <button 
              onClick={handleFinalSubmit}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-6 rounded-2xl font-black text-xl transition-all shadow-xl shadow-emerald-900/20 active:scale-95"
            >
              סיים ושלח לאדמין
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveyView;
