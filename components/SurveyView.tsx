
import React, { useState } from 'react';
import { PartnershipSession, ParticipantResponse } from '../types';

interface Props {
  session?: PartnershipSession;
  onSubmit: (res: ParticipantResponse) => void;
}

const SurveyView: React.FC<Props> = ({ session, onSubmit }) => {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState('');
  const [done, setDone] = useState(false);

  if (!session) return <div className="min-h-screen flex items-center justify-center text-zinc-500">שותפות לא נמצאה. בדוק את הקישור שקיבלת.</div>;

  const handleFinalSubmit = () => {
    const res: ParticipantResponse = {
      id: Math.random().toString(36).substr(2, 9),
      participantName: name,
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
        <div className="glass max-w-md w-full p-10 rounded-3xl text-center space-y-6 animate-fadeIn">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-2xl font-black">תודה רבה!</h2>
          <p className="text-zinc-400 leading-relaxed">התשובות שלך נשמרו בהצלחה. המידע ישמש לשיפור הממשק והעבודה המשותפת.</p>
          <div className="h-px bg-zinc-800 w-full my-6"></div>
          <p className="text-zinc-600 text-xs italic">ניתן לסגור את החלון כעת.</p>
        </div>
      </div>
    );
  }

  const currentQ = session.questions[step - 1];

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center p-6 md:p-12 selection:bg-indigo-500/30">
      <div className="max-w-xl w-full space-y-8 animate-fadeIn">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-white">{session.title}</h1>
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">הערכת שותפות ארגונית</p>
        </div>

        {step === 0 ? (
          <div className="glass rounded-3xl p-8 space-y-8">
            <div className="space-y-4">
              <h3 className="text-xl font-bold">נעים להכיר,</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">אנא מלא את פרטיך כדי שנוכל לשייך את המשוב שלך לתמונת המצב הכללית של הממשק.</p>
            </div>
            <div className="space-y-4">
              <input 
                placeholder="שם מלא"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 outline-none focus:border-indigo-500 transition-all text-lg"
                value={name} onChange={e => setName(e.target.value)}
              />
              <input 
                placeholder="תפקיד / צד בממשק"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 outline-none focus:border-indigo-500 transition-all text-lg"
                value={role} onChange={e => setRole(e.target.value)}
              />
            </div>
            <button 
              disabled={!name}
              onClick={() => setStep(1)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white py-5 rounded-2xl font-black text-xl transition-all shadow-xl shadow-indigo-600/20"
            >
              התחל בשאלון →
            </button>
          </div>
        ) : step <= session.questions.length ? (
          <div className="glass rounded-3xl p-8 space-y-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 h-1 bg-indigo-500 transition-all duration-500" style={{ width: `${(step / session.questions.length) * 100}%` }}></div>
            
            <div className="space-y-2">
              <p className="text-zinc-500 font-bold text-xs uppercase">שאלה {step} מתוך {session.questions.length}</p>
              <h3 className="text-2xl font-black leading-tight">{currentQ.text}</h3>
            </div>

            <div className="grid grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map(num => (
                <button
                  key={num}
                  onClick={() => {
                    setScores({ ...scores, [currentQ.id]: num });
                    setTimeout(() => setStep(step + 1), 300);
                  }}
                  className={`aspect-square rounded-2xl text-xl font-black flex items-center justify-center transition-all ${scores[currentQ.id] === num ? 'bg-indigo-600 text-white scale-110' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}
                >
                  {num}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">
              <span>חלש מאוד 👎</span>
              <span>מצוין 👍</span>
            </div>
          </div>
        ) : (
          <div className="glass rounded-3xl p-8 space-y-8 animate-fadeIn">
            <div className="space-y-2">
              <h3 className="text-2xl font-black">משהו שחשוב שנדע?</h3>
              <p className="text-zinc-500 text-sm">הערות חופשיות עוזרות ל-AI לדייק את ההמלצות האופרטיביות.</p>
            </div>
            <textarea 
              rows={5}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 outline-none focus:border-indigo-500 transition-all"
              placeholder="כתוב כאן..."
              value={comments} onChange={e => setComments(e.target.value)}
            />
            <button 
              onClick={handleFinalSubmit}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-2xl font-black text-xl transition-all shadow-xl shadow-emerald-900/20"
            >
              סיים ושלח משוב
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveyView;
