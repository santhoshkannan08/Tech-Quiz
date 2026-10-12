import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import { ArrowRight, Award, Check, Clock3, LogIn, ShieldCheck, Sparkles, Trophy } from 'lucide-react';
import { api } from './lib/api';
import type { Attempt, Question } from './types';

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_right,_#312e81_0,_#0f172a_35%,_#020617_75%)]"><div className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-8">{children}</div></main>;
}

function Welcome({ onStarted }: { onStarted: (attempt: Attempt) => void }) {
  const [name, setName] = useState(''); const [participantId, setParticipantId] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  async function start() { setError(''); setLoading(true); try { const started = await api<{ attemptToken: string; attemptId: string }>('/quiz/start', { method: 'POST', body: JSON.stringify({ participantName: name, participantId }) }); const attempt = await api<Attempt>(`/quiz/attempts/${started.attemptToken}`); onStarted({ ...attempt, attemptToken: started.attemptToken }); localStorage.setItem('quizAttemptToken', started.attemptToken); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to start quiz'); } finally { setLoading(false); } }
  return <Shell><header className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="rounded-xl bg-indigo-500 p-2"><Sparkles size={22}/></div><span className="font-semibold tracking-wide">TECH QUIZ</span></div><a className="btn border border-white/10 bg-white/5 text-sm text-slate-300" href="/admin"><LogIn size={16}/> Admin</a></header><section className="grid items-center gap-14 py-20 lg:grid-cols-[1.1fr_.9fr]"><div><div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-300/20 bg-indigo-400/10 px-4 py-2 text-sm text-indigo-200"><Award size={16}/> Undergraduate challenge · Easy level</div><h1 className="max-w-3xl text-5xl font-bold leading-tight sm:text-7xl">Think in <span className="text-indigo-400">structures.</span><br/>Build your edge.</h1><p className="mt-7 max-w-xl text-lg leading-8 text-slate-400">A focused 15-question assessment across stacks, queues, trees, graphs, sorting, and algorithmic thinking.</p><div className="mt-10 grid max-w-xl grid-cols-3 gap-3">{[['15','Questions'],['15','Minutes'],['15','Marks']].map(([v,l])=><div className="glass rounded-2xl p-4" key={l}><p className="text-2xl font-bold text-white">{v}</p><p className="mt-1 text-sm text-slate-400">{l}</p></div>)}</div></div><div className="glass rounded-3xl p-7 shadow-2xl shadow-indigo-950/40"><h2 className="text-2xl font-bold">Ready when you are</h2><p className="mt-2 text-slate-400">Enter your details to start a secure attempt.</p><div className="mt-7 space-y-4"><label className="block text-sm text-slate-300">Participant name<input className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3.5 outline-none ring-indigo-400 transition focus:ring-2" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Priya Sharma"/></label><label className="block text-sm text-slate-300">Unique participant ID<input className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3.5 outline-none ring-indigo-400 transition focus:ring-2" value={participantId} onChange={e=>setParticipantId(e.target.value)} placeholder="e.g. CS2026-042"/></label>{error&&<p className="rounded-xl bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}<button className="btn w-full bg-indigo-500 py-4 hover:bg-indigo-400" disabled={loading} onClick={()=>{if(!name.trim()||!participantId.trim()){setError('Both fields are required.');return} void start()}}>{loading?'Preparing your attempt...':'Start quiz'} <ArrowRight size={18}/></button></div><div className="mt-6 flex gap-3 text-xs text-slate-500"><ShieldCheck size={16} className="text-emerald-400"/> Your question order is securely randomized and fixed for this attempt.</div></div></section></Shell>;
}

function Quiz({ attempt, onFinished }: { attempt: Attempt; onFinished: (result: any) => void }) {
  const [state, setState] = useState(attempt);
  const [remaining, setRemaining] = useState(Math.max(0, new Date(attempt.activeQuestionDeadline ?? attempt.deadline).getTime() - Date.now()));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const refreshPromise = useRef<Promise<Attempt> | null>(null);
  const activeQuestionId = state.activeQuestionId;
  const questionIndex = state.questions.findIndex((item) => item.questionId === activeQuestionId);
  const question = questionIndex >= 0 ? state.questions[questionIndex] : undefined;
  const answered = state.questions.filter((item) => item.selectedOptionId !== null).length;
  const seconds = Math.ceil(remaining / 1000);

  async function refreshAttempt() {
    if (refreshPromise.current) return refreshPromise.current;
    const request = api<Attempt>(`/quiz/attempts/${state.attemptToken}`)
      .then((refreshed) => {
        setState({ ...refreshed, attemptToken: state.attemptToken });
        const deadline = refreshed.activeQuestionDeadline ?? refreshed.deadline;
        setRemaining(Math.max(0, new Date(deadline).getTime() - Date.now()));
        return refreshed;
      })
      .finally(() => {
        refreshPromise.current = null;
      });
    refreshPromise.current = request;
    return request;
  }

  useEffect(() => {
    const deadline = state.activeQuestionDeadline ?? state.deadline;
    const timer = window.setInterval(() => {
      setRemaining(Math.max(0, new Date(deadline).getTime() - Date.now()));
    }, 100);
    return () => window.clearInterval(timer);
  }, [state.activeQuestionDeadline, state.deadline]);

  useEffect(() => {
    const deadline = state.activeQuestionDeadline ?? state.deadline;
    setRemaining(Math.max(0, new Date(deadline).getTime() - Date.now()));
    setSaving(false);
  }, [state.activeQuestionId, state.activeQuestionDeadline, state.deadline]);

  async function submit(confirmBefore = true) {
    if (submitting) return;
    if (confirmBefore && !window.confirm(`Submit your attempt with ${answered} answered and ${state.questions.length - answered} unanswered?`)) return;
    setSubmitting(true);
    try {
      const result = await api(`/quiz/attempts/${state.attemptToken}/submit`, { method: 'POST' });
      onFinished(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit');
      setSubmitting(false);
    }
  }

  async function choose(optionId: string) {
    if (!question || question.selectedOptionId || remaining <= 0 || saving) return;
    const questionId = question.questionId;
    setError('');
    setSaving(true);
    try {
      await api(`/quiz/attempts/${state.attemptToken}/answers`, {
        method: 'PUT',
        body: JSON.stringify({ questionId, optionId }),
      });
      const refreshed = await refreshAttempt();
      if (!refreshed.activeQuestionId) await submit(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save answer. The server did not accept it.');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (remaining > 0 || submitting || saving || !state.activeQuestionId) return;
    void refreshAttempt().then((refreshed) => {
      if (!refreshed.activeQuestionId) return submit(false);
    }).catch((e) => {
      setError(e instanceof Error ? e.message : 'Unable to refresh the timed attempt');
      setRemaining(250);
    });
  }, [remaining, state.activeQuestionId, saving, submitting]);

  if (!question) return <Shell><p className="py-20 text-center text-red-300">{error || 'No active question is available.'}</p></Shell>;
  const progress = Math.max(0, Math.min(100, (remaining / 7000) * 100));
  return <Shell><header className="mb-8 flex items-center justify-between"><div><p className="text-sm font-semibold uppercase tracking-[.25em] text-indigo-300">Data Structures</p><h1 className="mt-1 text-2xl font-bold">Tech Quiz</h1></div><div className={`flex items-center gap-2 rounded-xl border px-4 py-2 font-mono text-lg ${seconds <= 3 ? 'border-red-400/40 bg-red-400/10 text-red-300' : 'border-white/10 bg-white/5 text-white'}`}><Clock3 size={18}/>{seconds}s</div></header><div className="mb-2 h-2 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full transition-all ${seconds <= 3 ? 'bg-red-400' : 'bg-indigo-400'}`} style={{ width: `${progress}%` }}/></div>{seconds <= 3 && <p className="mb-5 text-sm text-red-300">Hurry — this question will lock when the timer reaches zero.</p>}<div className="grid gap-6 lg:grid-cols-[1fr_260px]"><section className="glass rounded-3xl p-6 sm:p-10"><div className="flex items-center justify-between text-sm text-slate-400"><span>Question {questionIndex + 1} of {state.questions.length}</span><span>{answered} answered</span></div><h2 className="mt-8 text-2xl font-semibold leading-relaxed sm:text-3xl">{question.prompt}</h2><div className="mt-9 grid gap-3">{question.options.map((option) => <button key={option.id} disabled={Boolean(question.selectedOptionId) || saving || remaining <= 0} onClick={() => void choose(option.id)} className={`flex items-start gap-4 rounded-2xl border p-4 text-left transition hover:border-indigo-300/60 disabled:cursor-not-allowed disabled:opacity-60 ${question.selectedOptionId === option.id ? 'border-indigo-400 bg-indigo-500/20' : 'border-white/10 bg-white/[.03]'}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${question.selectedOptionId === option.id ? 'bg-indigo-400 text-white' : 'bg-white/10 text-slate-300'}`}>{question.selectedOptionId === option.id ? <Check size={17}/> : option.label}</span><span className="pt-1 text-slate-200">{option.text}</span></button>)}</div>{error && <p className="mt-5 text-sm text-red-300">{error}</p>}<div className="mt-9 flex justify-end gap-3">{question.selectedOptionId && questionIndex === state.questions.length - 1 && <button className="btn bg-emerald-500 hover:bg-emerald-400" disabled={submitting} onClick={() => void submit()}>{submitting ? 'Submitting...' : 'Submit attempt'} <Trophy size={17}/></button>}</div></section><aside className="glass h-fit rounded-3xl p-5"><p className="text-sm font-semibold text-slate-300">Question palette</p><div className="mt-4 grid grid-cols-5 gap-2">{state.questions.map((item, index) => <div key={item.questionId} aria-label={`Question ${index + 1}`} className={`flex h-10 items-center justify-center rounded-lg text-sm font-semibold ${index === questionIndex ? 'bg-indigo-500 text-white' : item.selectedOptionId ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/10 text-slate-400'}`}>{index + 1}</div>)}</div><div className="mt-6 space-y-2 text-xs text-slate-500"><p><span className="mr-2 inline-block h-2 w-2 rounded-full bg-indigo-400"/>Current</p><p><span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-400"/>Answered</p><p><span className="mr-2 inline-block h-2 w-2 rounded-full bg-slate-500"/>Timed out</p></div></aside></div></Shell>;
}

function Results({ result, onRestart }: { result: any; onRestart:()=>void }) { return <Shell><div className="mx-auto max-w-3xl py-12"><div className="text-center"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300"><Trophy size={38}/></div><p className="mt-6 text-sm uppercase tracking-[.25em] text-emerald-300">Assessment complete</p><h1 className="mt-3 text-5xl font-bold">Excellent work.</h1><p className="mt-3 text-slate-400">Your result is securely calculated by the quiz server.</p></div><div className="glass mt-12 rounded-3xl p-8"><div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-7"><div><p className="text-sm text-slate-400">Participant</p><h2 className="mt-1 text-2xl font-bold">{result.participantName}</h2><p className="text-slate-400">{result.participantId}</p></div><div className="text-right"><p className="text-6xl font-bold text-indigo-300">{result.score}<span className="text-2xl text-slate-500">/15</span></p><p className="text-sm text-slate-400">{result.percentage}% score</p></div></div><div className="mt-8 grid grid-cols-3 gap-3 text-center">{[['Correct',result.correctCount,'text-emerald-300'],['Incorrect',result.incorrectCount,'text-amber-300'],['Unanswered',result.unansweredCount,'text-slate-300']].map(([label,value,color])=><div className="rounded-2xl bg-white/[.04] p-4" key={String(label)}><p className={`text-2xl font-bold ${color}`}>{value}</p><p className="mt-1 text-xs text-slate-500">{label}</p></div>)}</div><button className="btn mt-8 w-full bg-indigo-500 hover:bg-indigo-400" onClick={onRestart}>Start a new attempt <ArrowRight size={17}/></button></div></div></Shell> }

function Admin() {
  const [token, setToken] = useState(localStorage.getItem('adminToken') ?? ''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [questions, setQuestions] = useState<any[]>([]); const [selected, setSelected] = useState<string[]>([]); const [quizId, setQuizId] = useState(''); const [message, setMessage] = useState('');
  async function login() { try { const data=await api<{token:string}>('/admin/login',{method:'POST',body:JSON.stringify({email,password})}); localStorage.setItem('adminToken',data.token);setToken(data.token); } catch(e){setMessage(e instanceof Error?e.message:'Login failed')} }
  useEffect(()=>{if(!token)return; const headers={Authorization:`Bearer ${token}`}; void Promise.all([api<any[]>('/admin/questions',{headers}),api<any>('/admin/quiz',{headers})]).then(([qs,quiz])=>{setQuestions(qs);setQuizId(quiz.id);setSelected(qs.slice(0,15).map(q=>q.id))}).catch(e=>setMessage(e instanceof Error?e.message:'Could not load dashboard'))},[token]);
  async function publish(){try{await api(`/admin/quizzes/${quizId}/publish`,{method:'POST',headers:{Authorization:`Bearer ${token}`},body:JSON.stringify({questionIds:selected,durationMinutes:15,reviewEnabled:false})});setMessage('Published version created successfully.')}catch(e){setMessage(e instanceof Error?e.message:'Publish failed')}}
  if(!token)return <Shell><div className="mx-auto max-w-md py-24"><div className="glass rounded-3xl p-8"><h1 className="text-3xl font-bold">Administrator sign in</h1><p className="mt-2 text-slate-400">Manage the frozen quiz versions and results.</p><input className="mt-8 w-full rounded-xl bg-slate-950 p-3" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/><input className="mt-3 w-full rounded-xl bg-slate-950 p-3" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)}/><button className="btn mt-5 w-full bg-indigo-500" onClick={()=>void login()}>Sign in <LogIn size={17}/></button>{message&&<p className="mt-4 text-sm text-red-300">{message}</p>}</div></div></Shell>;
  return <Shell><header className="flex items-center justify-between"><div><p className="text-sm uppercase tracking-[.25em] text-indigo-300">Control room</p><h1 className="mt-2 text-4xl font-bold">Quiz administration</h1></div><button className="btn border border-white/10 bg-white/5" onClick={()=>{localStorage.removeItem('adminToken');setToken('')}}>Log out</button></header><div className="mt-10 flex flex-wrap items-center justify-between gap-4"><p className="text-slate-400">Select exactly 15 of the 20 imported PDF questions.</p><button className="btn bg-emerald-500" disabled={selected.length!==15} onClick={()=>void publish()}>Publish selected version <Check size={17}/></button></div>{message&&<p className="mt-4 rounded-xl bg-indigo-400/10 p-4 text-indigo-200">{message}</p>}<div className="mt-6 grid gap-3 md:grid-cols-2">{questions.map(q=><label key={q.id} className={`glass cursor-pointer rounded-2xl p-5 ${selected.includes(q.id)?'border-indigo-400/70':'opacity-70'}`}><input type="checkbox" className="mr-3 accent-indigo-500" checked={selected.includes(q.id)} onChange={()=>setSelected(s=>s.includes(q.id)?s.filter(id=>id!==q.id):s.length<15?[...s,q.id]:s)}/><span className="font-semibold">{q.id}</span><p className="mt-3 text-slate-300">{q.prompt}</p><p className="mt-2 text-xs text-emerald-300">{q.options?.find((o:any)=>o.isCorrect)?.label}. {q.options?.find((o:any)=>o.isCorrect)?.text}</p></label>)}</div></Shell>;
}

export function App() {
  const [attempt, setAttempt] = useState<Attempt|null>(null); const [result, setResult] = useState<any>(null);
  useEffect(()=>{const token=localStorage.getItem('quizAttemptToken'); if(token) void api<Attempt>(`/quiz/attempts/${token}`).then(data=>setAttempt({...data,attemptToken:token})).catch(()=>localStorage.removeItem('quizAttemptToken'))},[]);
  if(window.location.pathname.startsWith('/admin')) return <Admin/>;
  if(result) return <Results result={result} onRestart={()=>{localStorage.removeItem('quizAttemptToken');setResult(null);setAttempt(null)}}/>;
  if(attempt) return <Quiz attempt={attempt} onFinished={r=>{localStorage.removeItem('quizAttemptToken');setResult(r)}}/>;
  return <Welcome onStarted={setAttempt}/>;
}
