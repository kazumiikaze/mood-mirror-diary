import React, { useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  BookOpen,
  CalendarDays,
  Download,
  Flame,
  HeartHandshake,
  History,
  Leaf,
  LogOut,
  Moon,
  RotateCcw,
  Settings,
  ShieldAlert,
  Sparkles,
  Sprout,
  UserRound
} from 'lucide-react';
import {
  calculateStreak,
  clearSession,
  createUser,
  daysSinceLastEntry,
  formatThaiDate,
  getCurrentUsername,
  getSortedEntries,
  getUser,
  resetAllData,
  saveUser,
  setCurrentUsername,
  todayKey,
  updateUser
} from './utils/storage.js';
import { analyzeDiary } from './utils/aiGroq.js';

const moods = [
  { label: 'สดใส', emoji: '😆' },
  { label: 'เฉยๆ', emoji: '😐' },
  { label: 'เหนื่อย', emoji: '😥' },
  { label: 'เศร้า', emoji: '😭' },
  { label: 'เครียด', emoji: '😖' },
  { label: 'กังวล', emoji: '😟' },
  { label: 'โกรธ', emoji: '😠' }
];

const reflectionQuestions = [
  'วันนี้เหตุการณ์ไหนกระทบใจคุณมากที่สุด?',
  'ตอนเหตุการณ์นั้นเกิดขึ้น ร่างกายหรือความคิดของคุณตอบสนองอย่างไร?',
  'มีอะไรบ้างที่คุณยังควบคุมได้ในสถานการณ์นี้?',
  'คืนนี้คุณอยากดูแลตัวเองแบบเล็ก ๆ อย่างไร?'
];

function emptyDraft() {
  return {
    mood: '',
    moodEmoji: '',
    energy: 5,
    diaryText: '',
    reflections: reflectionQuestions.map((question) => ({ question, answer: '' }))
  };
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const username = getCurrentUsername();
    return username ? getUser(username) : null;
  });
  const [page, setPage] = useState('today');

  const refreshUser = (username = currentUser?.username) => {
    if (!username) return;
    const fresh = getUser(username);
    setCurrentUser(fresh);
  };

  if (!currentUser) {
    return <AuthScreen onLogin={(user) => { setCurrentUsername(user.username); setCurrentUser(user); }} />;
  }

  if (!currentUser.onboarded) {
    return <OnboardingScreen user={currentUser} onDone={(user) => { setCurrentUser(user); setPage('today'); }} />;
  }

  return (
    <div className="app-shell">
      <Navbar user={currentUser} page={page} setPage={setPage} onLogout={() => { clearSession(); setCurrentUser(null); }} />
      <main className="page fade-in">
        {page === 'today' && <DailyWizard user={currentUser} refreshUser={refreshUser} setPage={setPage} />}
        {page === 'result' && <ResultToday user={currentUser} />}
        {page === 'dashboard' && <Dashboard user={currentUser} />}
        {page === 'history' && <HistoryPage user={currentUser} setPage={setPage} />}
        {page === 'tree' && <TreePage user={currentUser} />}
        {page === 'settings' && <SettingsPage user={currentUser} onUserChange={setCurrentUser} onLogout={() => { clearSession(); setCurrentUser(null); }} />}
      </main>
    </div>
  );
}

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [login, setLogin] = useState({ username: '', password: '' });
  const [signup, setSignup] = useState({ username: '', age: '', email: '', password: '', confirmPassword: '' });

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSignup = (event) => {
    event.preventDefault();
    setError('');
    if (!signup.username || !signup.age || !signup.email || !signup.password || !signup.confirmPassword) {
      setError('กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }
    if (!validateEmail(signup.email)) {
      setError('รูปแบบ Email ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
      return;
    }
    if (signup.password.length < 6) {
      setError('Password ควรมีอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (signup.password !== signup.confirmPassword) {
      setError('Password และ Confirm Password ต้องตรงกัน');
      return;
    }
    try {
      const user = createUser(signup);
      onLogin(user);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogin = (event) => {
    event.preventDefault();
    setError('');
    const user = getUser(login.username);
    if (!user || user.password !== login.password) {
      setError('Username หรือ Password ไม่ถูกต้อง');
      return;
    }
    onLogin(user);
  };

  return (
    <div className="app-shell flex items-center justify-center">
      <div className="grid lg:grid-cols-[1.05fr_.95fr] gap-6 max-w-6xl w-full items-stretch">
        <section className="glass-card hero-gradient p-8 md:p-12 flex flex-col justify-between min-h-[620px]">
          <div>
            <div className="badge mb-6"><Sparkles size={16} /> Local Mental Wellness Demo</div>
            <h1 className="text-4xl md:text-6xl font-black leading-tight text-[var(--cocoa)]">Mood Mirror Diary</h1>
            <p className="text-lg md:text-xl mt-5 text-[rgba(75,53,40,.74)] leading-9">
              บันทึกใจวันละ 3 นาที ให้ระบบช่วยสะท้อนอารมณ์ หาต้นเหตุความเครียด และสรุปแนวโน้มสุขภาพใจแบบเข้าใจง่าย
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 mt-8">
            <FeatureMini icon={<BookOpen size={18} />} title="Diary" text="เขียนบันทึกใจรายวัน" />
            <FeatureMini icon={<HeartHandshake size={18} />} title="AI Coach" text="ถามกลับและให้คำแนะนำ" />
            <FeatureMini icon={<Sprout size={18} />} title="Growth" text="ต้นไม้โตตาม streak" />
          </div>
        </section>

        <section className="glass-card p-6 md:p-8">
          <div className="flex p-1 bg-[rgba(111,78,55,.08)] rounded-full mb-6">
            <button className={`flex-1 rounded-full py-3 font-bold ${mode === 'login' ? 'bg-white shadow' : ''}`} onClick={() => { setMode('login'); setError(''); }}>Login</button>
            <button className={`flex-1 rounded-full py-3 font-bold ${mode === 'signup' ? 'bg-white shadow' : ''}`} onClick={() => { setMode('signup'); setError(''); }}>Sign up</button>
          </div>

          {error && <div className="soft-card p-4 mb-4 text-[#9a4a3c] font-bold">{error}</div>}

          {mode === 'login' ? (
            <form className="space-y-4" onSubmit={handleLogin}>
              <h2 className="text-2xl font-black">ยินดีต้อนรับกลับมา</h2>
              <p className="text-[rgba(75,53,40,.66)]">เข้าสู่ระบบด้วยบัญชีที่เคยสมัครไว้ใน browser นี้</p>
              <input className="input-field" placeholder="Username" value={login.username} onChange={(e) => setLogin({ ...login, username: e.target.value })} />
              <input className="input-field" placeholder="Password" type="password" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} />
              <button className="btn-primary w-full" type="submit">เข้าสู่ระบบ</button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleSignup}>
              <h2 className="text-2xl font-black">สร้างบัญชีใหม่</h2>
              <p className="text-[rgba(75,53,40,.66)]">ข้อมูลถูกเก็บแบบ localStorage สำหรับ demo เท่านั้น</p>
              <input className="input-field" placeholder="Username" value={signup.username} onChange={(e) => setSignup({ ...signup, username: e.target.value })} />
              <input className="input-field" placeholder="Age" type="number" value={signup.age} onChange={(e) => setSignup({ ...signup, age: e.target.value })} />
              <input className="input-field" placeholder="Email" value={signup.email} onChange={(e) => setSignup({ ...signup, email: e.target.value })} />
              <input className="input-field" placeholder="Password" type="password" value={signup.password} onChange={(e) => setSignup({ ...signup, password: e.target.value })} />
              <input className="input-field" placeholder="Confirm Password" type="password" value={signup.confirmPassword} onChange={(e) => setSignup({ ...signup, confirmPassword: e.target.value })} />
              <button className="btn-primary w-full" type="submit">สมัครสมาชิก</button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}

function FeatureMini({ icon, title, text }) {
  return <div className="soft-card p-4"><div className="text-[var(--coffee)] mb-2">{icon}</div><div className="font-black">{title}</div><div className="text-sm text-[rgba(75,53,40,.62)] mt-1">{text}</div></div>;
}

function OnboardingScreen({ user, onDone }) {
  const [form, setForm] = useState({ issue: 'งาน', goal: '', tone: 'อบอุ่นและตรงไปตรงมา' });
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    if (!form.issue || !form.goal || !form.tone) {
      setError('กรุณาตอบคำถามให้ครบก่อนเริ่มใช้งาน');
      return;
    }
    const nextUser = saveUser(user.username, { ...user, onboarded: true, onboarding: form });
    onDone(nextUser);
  };

  return (
    <div className="app-shell flex items-center justify-center">
      <form className="glass-card p-8 md:p-10 max-w-3xl w-full" onSubmit={submit}>
        <div className="badge mb-4"><UserRound size={16} /> Onboarding</div>
        <h1 className="text-3xl md:text-5xl font-black">เริ่มปรับคำแนะนำให้เหมาะกับคุณ</h1>
        <p className="mt-4 text-[rgba(75,53,40,.68)] leading-8">ตอบสั้น ๆ เพื่อให้ AI mock ในเว็บ demo นี้ให้คำแนะนำที่ใกล้เคียงบริบทของคุณมากขึ้นตั้งแต่วันแรก</p>
        {error && <div className="soft-card p-4 mt-5 text-[#9a4a3c] font-bold">{error}</div>}
        <div className="space-y-5 mt-7">
          <label className="block">
            <span className="font-bold">ตอนนี้คุณกำลังเผชิญกับอะไรอยู่?</span>
            <select className="input-field mt-2" value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })}>
              <option>งาน</option>
              <option>การเรียน</option>
              <option>ความสัมพันธ์</option>
              <option>สุขภาพ</option>
              <option>การเงิน</option>
              <option>อนาคต/ความไม่แน่นอน</option>
            </select>
          </label>
          <label className="block">
            <span className="font-bold">เป้าหมายของคุณในการใช้แอปนี้คืออะไร?</span>
            <textarea className="input-field mt-2 min-h-28" placeholder="เช่น อยากเข้าใจอารมณ์ตัวเองมากขึ้น / อยากลดความเครียดจากงาน" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
          </label>
          <label className="block">
            <span className="font-bold">อยากให้ AI ตอบกลับสไตล์ไหน?</span>
            <select className="input-field mt-2" value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })}>
              <option>อบอุ่นและตรงไปตรงมา</option>
              <option>นุ่มนวล ให้กำลังใจ</option>
              <option>เป็นระบบ เน้นแผนปฏิบัติ</option>
              <option>เหมือนเพื่อนคุยด้วย</option>
            </select>
          </label>
        </div>
        <button className="btn-primary mt-7 w-full" type="submit">เริ่มใช้ Mood Mirror Diary</button>
      </form>
    </div>
  );
}

function Navbar({ user, page, setPage, onLogout }) {
  const streak = calculateStreak(user.entries);
  const links = [
    ['today', 'เขียนวันนี้', BookOpen],
    ['result', 'ผลวันนี้', Sparkles],
    ['dashboard', 'Dashboard', CalendarDays],
    ['history', 'History', History],
    ['tree', 'ต้นไม้', Leaf],
    ['settings', 'Settings', Settings]
  ];
  return (
    <nav className="navbar glass-card">
      <button className="flex items-center gap-3 bg-transparent border-0 text-left" onClick={() => setPage('today')}>
        <div className="w-11 h-11 rounded-full bg-[rgba(111,78,55,.12)] grid place-items-center"><Moon size={21} /></div>
        <div>
          <div className="font-black leading-5">Mood Mirror</div>
          <div className="text-xs text-[rgba(75,53,40,.58)]">Diary v2</div>
        </div>
      </button>
      <div className="nav-links">
        {links.map(([key, label, Icon]) => <button key={key} className={`nav-link ${page === key ? 'active' : ''}`} onClick={() => setPage(key)}><span className="inline-flex items-center gap-1.5"><Icon size={15} /> {label}</span></button>)}
      </div>
      <div className="flex items-center gap-2 justify-end">
        <span className="badge"><Flame size={15} /> {streak} วัน</span>
        <button className="btn-secondary !px-3" onClick={onLogout} title="ออกจากระบบ"><LogOut size={16} /></button>
      </div>
    </nav>
  );
}

function DailyWizard({ user, refreshUser, setPage }) {
  const today = todayKey();
  const existing = user.entries?.[today];
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState(emptyDraft());
  const [remaining, setRemaining] = useState(180);
  const [timerStarted, setTimerStarted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (step === 2 && !timerStarted) setTimerStarted(true);
  }, [step, timerStarted]);

  useEffect(() => {
    if (step !== 2 || !timerStarted || remaining <= 0) return;
    const id = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, [step, timerStarted, remaining]);

  const history = useMemo(() => getSortedEntries(user), [user]);
  const isTimeUp = remaining <= 0;
  const minuteText = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;

  if (existing) {
    return (
      <section className="glass-card p-8 md:p-10">
        <div className="badge mb-4"><ShieldAlert size={16} /> Daily Entry Locked</div>
        <h1 className="text-3xl md:text-5xl font-black">วันนี้คุณบันทึก Diary แล้ว</h1>
        <p className="mt-4 text-[rgba(75,53,40,.68)] leading-8">ระบบล็อกการเขียนวันละ 1 ครั้ง เพื่อให้ข้อมูลรายวันไม่ถูกแก้ซ้ำและใช้ดูแนวโน้มย้อนหลังได้ชัดเจน</p>
        <div className="grid-auto mt-7">
          <StatCard title="อารมณ์วันนี้" value={`${existing.moodEmoji} ${existing.mood}`} />
          <StatCard title="พลังงาน" value={`${existing.energy}/10`} />
          <StatCard title="ความเครียด" value={`${existing.analysis?.stressScore ?? '-'} / 100`} />
        </div>
        <div className="flex flex-wrap gap-3 mt-8">
          <button className="btn-primary" onClick={() => setPage('result')}>ดูผลวิเคราะห์วันนี้</button>
          <button className="btn-secondary" onClick={() => setPage('dashboard')}>ไป Dashboard</button>
        </div>
      </section>
    );
  }

  const goNext = () => {
    setError('');
    if (step === 1 && !draft.mood) return setError('กรุณาเลือกอารมณ์วันนี้ก่อน');
    if (step === 2 && draft.diaryText.trim().length < 10) return setError('กรุณาเขียน Diary อย่างน้อย 10 ตัวอักษร');
    if (step === 3 && draft.reflections.some((item) => !item.answer.trim())) return setError('กรุณาตอบคำถามจาก AI Reflection Coach ให้ครบทุกข้อ');
    setStep((value) => Math.min(4, value + 1));
  };

  const submit = () => {
    setError('');
    setIsProcessing(true);
    window.setTimeout(() => {
      const analysis = analyzeDiary({
        mood: draft.mood,
        energy: draft.energy,
        diaryText: draft.diaryText,
        reflections: draft.reflections,
        onboarding: user.onboarding,
        history
      });
      const entry = {
        ...draft,
        analysis,
        createdAt: new Date().toISOString()
      };
      updateUser(user.username, (oldUser) => ({
        ...oldUser,
        entries: {
          ...(oldUser.entries || {}),
          [today]: entry
        }
      }));
      refreshUser();
      setIsProcessing(false);
      setPage('result');
    }, 1300);
  };

  return (
    <section className="glass-card p-6 md:p-10">
      <div className="flex flex-wrap gap-3 justify-between items-start">
        <div>
          <div className="badge mb-4"><BookOpen size={16} /> Daily Diary Wizard</div>
          <h1 className="text-3xl md:text-5xl font-black">บันทึกใจวันนี้</h1>
          <p className="mt-3 text-[rgba(75,53,40,.66)]">วันที่ {formatThaiDate(today)}</p>
        </div>
        <div className="badge"><Flame size={16} /> เขียนได้วันละครั้ง</div>
      </div>

      <div className="flex gap-2 mt-8">
        {[1, 2, 3, 4].map((item) => <div className="step-pill" key={item}><span style={{ width: step >= item ? '100%' : '0%' }} /></div>)}
      </div>
      {error && <div className="soft-card p-4 mt-5 text-[#9a4a3c] font-bold">{error}</div>}

      {step === 1 && <MoodEnergyStep draft={draft} setDraft={setDraft} />}
      {step === 2 && <DiaryTextStep draft={draft} setDraft={setDraft} minuteText={minuteText} isTimeUp={isTimeUp} />}
      {step === 3 && <ReflectionStep draft={draft} setDraft={setDraft} />}
      {step === 4 && <ReviewStep draft={draft} isProcessing={isProcessing} />}

      <div className="flex flex-wrap justify-between gap-3 mt-8">
        <button className="btn-secondary" disabled={step === 1 || isProcessing} onClick={() => setStep((value) => Math.max(1, value - 1))}>ย้อนกลับ</button>
        {step < 4 ? <button className="btn-primary" onClick={goNext}>ถัดไป</button> : <button className="btn-primary" disabled={isProcessing} onClick={submit}>{isProcessing ? 'กำลังประมวลผล...' : 'Submit และดูผลวิเคราะห์'}</button>}
      </div>
    </section>
  );
}

function MoodEnergyStep({ draft, setDraft }) {
  return (
    <div className="mt-8 fade-in">
      <h2 className="text-2xl font-black">วันนี้คุณรู้สึกยังไงบ้าง?</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mt-5">
        {moods.map((mood) => (
          <button key={mood.label} className={`mood-tile ${draft.mood === mood.label ? 'active' : ''}`} onClick={() => setDraft({ ...draft, mood: mood.label, moodEmoji: mood.emoji })}>
            <div className="mood-emoji">{mood.emoji}</div>
            <div className="font-bold">{mood.label}</div>
          </button>
        ))}
      </div>
      <div className="soft-card p-6 mt-7">
        <div className="flex justify-between items-center gap-4">
          <div>
            <h3 className="text-xl font-black">วันนี้มีแรงแค่ไหน?</h3>
            <p className="text-[rgba(75,53,40,.62)] mt-1">ระดับพลังงานชีวิต 1–10</p>
          </div>
          <div className="text-4xl font-black text-[var(--coffee)]">{draft.energy}</div>
        </div>
        <input className="energy-track mt-5" type="range" min="1" max="10" value={draft.energy} onChange={(e) => setDraft({ ...draft, energy: Number(e.target.value) })} />
      </div>
    </div>
  );
}

function DiaryTextStep({ draft, setDraft, minuteText, isTimeUp }) {
  return (
    <div className="mt-8 fade-in">
      <div className="flex flex-wrap justify-between gap-3 items-center">
        <div>
          <h2 className="text-2xl font-black">เขียน Diary 3 นาที</h2>
          <p className="text-[rgba(75,53,40,.64)] mt-1">เขียนสิ่งที่เกิดขึ้น ความรู้สึก และสิ่งที่ยังค้างในใจ</p>
        </div>
        <div className={`badge text-lg ${isTimeUp ? 'text-[#9a4a3c]' : ''}`}>⏳ {minuteText}</div>
      </div>
      {isTimeUp && <div className="soft-card p-4 mt-4 text-[#9a4a3c] font-bold">ครบ 3 นาทีแล้ว ระบบล็อกกล่องเขียน Diary และไม่อนุญาตให้พิมพ์ต่อ กรุณาไปขั้นตอนถัดไป</div>}
      <textarea
        className="input-field mt-5 min-h-[280px] resize-none leading-8"
        disabled={isTimeUp}
        placeholder="ตัวอย่าง: วันนี้งานเยอะมาก เหนื่อยสุด ๆ รู้สึกกดดัน deadline ใกล้มาก..."
        value={draft.diaryText}
        onChange={(e) => {
          if (!isTimeUp) setDraft({ ...draft, diaryText: e.target.value });
        }}
      />
      <p className="mt-3 text-sm text-[rgba(75,53,40,.58)]">จำนวนตัวอักษร: {draft.diaryText.length}</p>
    </div>
  );
}

function ReflectionStep({ draft, setDraft }) {
  const updateAnswer = (index, answer) => {
    const next = draft.reflections.map((item, idx) => idx === index ? { ...item, answer } : item);
    setDraft({ ...draft, reflections: next });
  };
  return (
    <div className="mt-8 fade-in">
      <h2 className="text-2xl font-black">AI Reflection Coach</h2>
      <p className="text-[rgba(75,53,40,.64)] mt-1">ตอบคำถามสั้น ๆ เพื่อให้ระบบจับบริบทได้ตรงขึ้น</p>
      <div className="space-y-4 mt-5">
        {draft.reflections.map((item, index) => (
          <div className="soft-card p-5" key={item.question}>
            <div className="badge mb-3">คำถามที่ {index + 1}</div>
            <h3 className="font-black text-lg">{item.question}</h3>
            <textarea className="input-field mt-3 min-h-24" value={item.answer} onChange={(e) => updateAnswer(index, e.target.value)} placeholder="ตอบเพิ่มเติมตรงนี้..." />
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewStep({ draft, isProcessing }) {
  if (isProcessing) {
    return (
      <div className="mt-8 soft-card p-10 flex flex-col items-center text-center fade-in">
        <div className="loading-orb" />
        <h2 className="text-2xl font-black mt-6">กำลังอ่านความรู้สึกของคุณอยู่...</h2>
        <p className="text-[rgba(75,53,40,.64)] mt-2 max-w-xl">ระบบกำลังตรวจจับอารมณ์ สาเหตุความเครียด สัญญาณ burnout และสร้างคำแนะนำภาษาไทยที่อิงกับข้อความวันนี้</p>
      </div>
    );
  }
  return (
    <div className="mt-8 fade-in">
      <h2 className="text-2xl font-black">ตรวจสอบก่อน Submit</h2>
      <div className="grid-auto mt-5">
        <StatCard title="Mood" value={`${draft.moodEmoji} ${draft.mood}`} />
        <StatCard title="Energy" value={`${draft.energy}/10`} />
        <StatCard title="Diary Length" value={`${draft.diaryText.length} ตัวอักษร`} />
      </div>
      <div className="soft-card p-5 mt-5">
        <h3 className="font-black mb-2">ข้อความ Diary</h3>
        <p className="leading-8 whitespace-pre-wrap text-[rgba(75,53,40,.76)]">{draft.diaryText}</p>
      </div>
    </div>
  );
}

function ResultToday({ user }) {
  const entry = user.entries?.[todayKey()];
  if (!entry) return <EmptyState title="ยังไม่มีผลวิเคราะห์ของวันนี้" text="เริ่มเขียน Diary วันนี้ก่อน แล้วระบบจะแสดงผลวิเคราะห์ตรงนี้" icon={<Sparkles size={42} />} />;
  return <ResultView entry={entry} date={todayKey()} />;
}

function ResultView({ entry, date }) {
  const analysis = entry.analysis || {};
  if (analysis.safeMode) return <CrisisView analysis={analysis} date={date} />;
  return (
    <section className="space-y-5">
      <div className="glass-card p-7 md:p-9">
        <div className="badge mb-4"><Sparkles size={16} /> Result Today</div>
        <h1 className="text-3xl md:text-5xl font-black">ผลวิเคราะห์วันที่ {formatThaiDate(date)}</h1>
        <p className="mt-4 leading-8 text-[rgba(75,53,40,.72)]">{analysis.mentalSummary}</p>
        <div className="grid-auto mt-7">
          <StatCard title="Stress Score" value={`${analysis.stressScore}/100`} sub={analysis.stressLevel} />
          <StatCard title="Sentiment" value={`${analysis.sentimentScore}`} sub={analysis.sentimentLabel} />
          <StatCard title="Energy" value={`${entry.energy}/10`} sub={`${entry.moodEmoji} ${entry.mood}`} />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <AnalysisList title="Emotion Classification" summary={analysis.emotionSummary} items={analysis.emotionClassification} />
        <AnalysisList title="Trigger Detection" summary={analysis.triggerSummary} items={analysis.triggers} />
      </div>

      <div className="glass-card p-7 md:p-9">
        <div className="badge mb-4"><HeartHandshake size={16} /> Smart Response System</div>
        <h2 className="text-2xl md:text-3xl font-black">คำแนะนำเฉพาะตัวจากข้อความวันนี้</h2>
        <div className="space-y-4 mt-5">
          {(analysis.smartResponse || []).map((text, index) => <div className="soft-card p-5 leading-8" key={index}><span className="font-black text-[var(--coffee)]">{index + 1}. </span>{text}</div>)}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <InfoCard title="AI Insight" text={analysis.aiInsight} />
        <InfoCard title="Burnout Warning" text={analysis.burnout?.risk ? analysis.burnout.message : 'วันนี้ยังไม่พบ pattern burnout ที่ชัดเจน แต่ควรติดตามระดับพลังงานต่อเนื่อง'} alert={analysis.burnout?.risk} />
        <InfoCard title="Weekly AI Report" text={analysis.weeklyReport} />
      </div>
    </section>
  );
}

function CrisisView({ analysis, date }) {
  return (
    <section className="glass-card crisis-card p-8 md:p-10">
      <div className="badge mb-4"><ShieldAlert size={16} /> Safe Mode</div>
      <h1 className="text-3xl md:text-5xl font-black text-[#7c382e]">ตรวจพบข้อความที่อาจเกี่ยวข้องกับความปลอดภัย</h1>
      <p className="mt-4 text-sm text-[rgba(75,53,40,.58)]">วันที่ {formatThaiDate(date)}</p>
      <p className="mt-6 leading-9 text-lg">{analysis.supportiveMessage}</p>
      <div className="grid-auto mt-7">
        {analysis.immediateSteps?.map((step, index) => <div className="soft-card p-5 leading-8" key={step}><b>{index + 1}.</b> {step}</div>)}
      </div>
      <div className="flex flex-wrap gap-3 mt-8">
        <a className="btn-primary no-underline" href="tel:1323">โทรสายด่วนสุขภาพจิต 1323</a>
        <a className="btn-secondary no-underline" href="tel:1669">โทรฉุกเฉิน 1669</a>
      </div>
    </section>
  );
}

function AnalysisList({ title, summary, items = [] }) {
  return (
    <div className="glass-card p-7">
      <h2 className="text-2xl font-black">{title}</h2>
      <div className="soft-card p-4 mt-4 leading-7"><b>สรุปย่อ:</b> {summary}</div>
      <div className="space-y-4 mt-5">
        {items.map((item) => (
          <div key={item.label}>
            <div className="flex justify-between gap-4 font-black"><span>{item.label}</span><span>{item.percent}%</span></div>
            <div className="analysis-bar mt-2"><span style={{ width: `${item.percent}%` }} /></div>
            <p className="text-sm leading-7 mt-2 text-[rgba(75,53,40,.70)]"><b>เกิดจาก:</b> {item.reason}</p>
            {item.evidence?.length > 0 && <p className="text-xs leading-6 mt-1 text-[rgba(75,53,40,.56)]">หลักฐานจากข้อความ: “{item.evidence.join('” / “')}”</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Dashboard({ user }) {
  const entries = getSortedEntries(user);
  const reportRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const recent7 = [...entries].reverse().slice(-7);
  const recent30 = entries.slice(0, 30);
  const avgStress = entries.length ? Math.round(entries.reduce((sum, item) => sum + Number(item.analysis?.stressScore || 0), 0) / entries.length) : 0;
  const avgEnergy = entries.length ? (entries.reduce((sum, item) => sum + Number(item.energy || 0), 0) / entries.length).toFixed(1) : 0;
  const maxStress = entries.reduce((max, item) => Number(item.analysis?.stressScore || 0) > Number(max.analysis?.stressScore || -1) ? item : max, entries[0] || {});

  const downloadPDF = async () => {
    if (!entries.length || !reportRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#fffaf2', useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`mood-mirror-report-${todayKey()}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  if (!entries.length) return <EmptyState title="Dashboard ยังไม่มีข้อมูล" text="เริ่มเขียนวันนี้เพื่อดูกราฟ สถิติ และรายงานสุขภาพใจของคุณที่นี่" icon={<CalendarDays size={42} />} />;

  return (
    <section className="space-y-5">
      <div className="glass-card p-7 md:p-9">
        <div className="flex flex-wrap justify-between gap-4 items-start">
          <div>
            <div className="badge mb-4"><CalendarDays size={16} /> Dashboard</div>
            <h1 className="text-3xl md:text-5xl font-black">ภาพรวมสุขภาพใจย้อนหลัง</h1>
            <p className="mt-4 text-[rgba(75,53,40,.68)]">ดูแนวโน้ม 7 วัน / 30 วัน และดาวน์โหลดรายงาน PDF</p>
          </div>
          <button className="btn-primary" onClick={downloadPDF} disabled={downloading}><Download size={16} className="inline mr-2" /> {downloading ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลดรายงานสุขภาพใจ PDF'}</button>
        </div>
        <div className="grid-auto mt-7">
          <StatCard title="จำนวนวันที่บันทึก" value={`${entries.length} วัน`} />
          <StatCard title="Stress เฉลี่ย" value={`${avgStress}/100`} />
          <StatCard title="Energy เฉลี่ย" value={`${avgEnergy}/10`} />
          <StatCard title="วันที่เครียดที่สุด" value={maxStress?.date || '-'} sub={maxStress?.analysis?.stressScore ? `${maxStress.analysis.stressScore}/100` : ''} />
        </div>
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <SimpleBarChart title="Stress Trend 7 วัน" entries={recent7} valueGetter={(item) => item.analysis?.stressScore || 0} max={100} />
        <SimpleBarChart title="Energy Graph 7 วัน" entries={recent7} valueGetter={(item) => item.energy || 0} max={10} />
        <MoodSummary entries={recent30} />
      </div>
      <div ref={reportRef} className="report-print">
        <ReportDocument user={user} entries={entries} avgStress={avgStress} avgEnergy={avgEnergy} maxStress={maxStress} />
      </div>
    </section>
  );
}

function ReportDocument({ user, entries, avgStress, avgEnergy, maxStress }) {
  return (
    <div>
      <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0 }}>Mood Mirror Diary Report</h1>
      <p style={{ marginTop: 8 }}>รายงานสุขภาพใจของ {user.username} | สร้างเมื่อ {formatThaiDate(todayKey())}</p>
      <hr style={{ margin: '22px 0', border: 0, borderTop: '1px solid #e8d7c0' }} />
      <h2>สรุปภาพรวม</h2>
      <p>จำนวนวันที่บันทึกทั้งหมด: {entries.length} วัน</p>
      <p>Stress เฉลี่ย: {avgStress}/100</p>
      <p>Energy เฉลี่ย: {avgEnergy}/10</p>
      <p>วันที่เครียดที่สุด: {maxStress?.date || '-'} ({maxStress?.analysis?.stressScore || '-'} / 100)</p>
      <h2 style={{ marginTop: 28 }}>บันทึกล่าสุด</h2>
      {entries.slice(0, 8).map((entry) => (
        <div key={entry.date} style={{ border: '1px solid #e8d7c0', borderRadius: 18, padding: 16, marginTop: 14 }}>
          <h3 style={{ margin: 0 }}>{formatThaiDate(entry.date)} | {entry.moodEmoji} {entry.mood}</h3>
          <p><b>Stress:</b> {entry.analysis?.stressScore}/100 | <b>Energy:</b> {entry.energy}/10</p>
          <p><b>Emotion:</b> {entry.analysis?.emotionSummary}</p>
          <p><b>Trigger:</b> {entry.analysis?.triggerSummary}</p>
          <p><b>Summary:</b> {entry.analysis?.mentalSummary}</p>
        </div>
      ))}
    </div>
  );
}

function MoodSummary({ entries }) {
  const count = {};
  entries.forEach((entry) => {
    const label = entry.analysis?.emotionClassification?.[0]?.label || entry.mood || 'ไม่ชัดเจน';
    count[label] = (count[label] || 0) + 1;
  });
  const items = Object.entries(count).sort((a, b) => b[1] - a[1]);
  return (
    <div className="glass-card p-6 chart-card">
      <h3 className="text-xl font-black">Mood Summary 30 วัน</h3>
      <div className="space-y-4 mt-5">
        {items.map(([label, value]) => (
          <div key={label}>
            <div className="flex justify-between font-bold"><span>{label}</span><span>{value} วัน</span></div>
            <div className="analysis-bar mt-2"><span style={{ width: `${Math.min(100, value * 18)}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimpleBarChart({ title, entries, valueGetter, max }) {
  return (
    <div className="glass-card p-6 chart-card">
      <h3 className="text-xl font-black">{title}</h3>
      <div className="bar-chart">
        {entries.map((entry) => {
          const value = Number(valueGetter(entry));
          return (
            <div className="bar-item" key={entry.date} title={`${entry.date}: ${value}`}>
              <div className="bar" style={{ height: `${Math.max(8, (value / max) * 138)}px` }} />
              <div className="text-xs font-bold">{value}</div>
              <div className="bar-label">{entry.date.slice(5)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HistoryPage({ user, setPage }) {
  const entries = getSortedEntries(user);
  if (!entries.length) return <EmptyState title="History ยังว่างอยู่" text="เมื่อคุณเขียน Diary แล้ว รายการย้อนหลังจะปรากฏที่นี่" icon={<History size={42} />} />;
  return (
    <section className="space-y-5">
      <div className="glass-card p-7 md:p-9">
        <div className="badge mb-4"><History size={16} /> History</div>
        <h1 className="text-3xl md:text-5xl font-black">Diary ย้อนหลัง</h1>
      </div>
      {entries.map((entry) => (
        <article className="glass-card p-6" key={entry.date}>
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black">{formatThaiDate(entry.date)}</h2>
              <p className="text-[rgba(75,53,40,.62)] mt-1">{entry.moodEmoji} {entry.mood} | Energy {entry.energy}/10 | Stress {entry.analysis?.stressScore}/100</p>
            </div>
            {entry.date === todayKey() && <button className="btn-secondary" onClick={() => setPage('result')}>ดูผลวันนี้</button>}
          </div>
          <p className="soft-card p-5 mt-5 leading-8 whitespace-pre-wrap">{entry.diaryText}</p>
          {!entry.analysis?.safeMode && <div className="grid md:grid-cols-2 gap-4 mt-4"><InfoCard title="Emotion" text={entry.analysis?.emotionSummary} /><InfoCard title="Trigger" text={entry.analysis?.triggerSummary} /></div>}
        </article>
      ))}
    </section>
  );
}

function TreePage({ user }) {
  const streak = calculateStreak(user.entries);
  const daysAway = daysSinceLastEntry(user.entries);
  const resetVisual = daysAway > 7;
  const leafCount = Math.min(90, Math.max(6, streak * 7));
  const visibleLeaves = resetVisual ? 6 : leafCount;
  const growthLabel = streak >= 14 ? 'ต้นไม้กำลังเติบโตดีมาก' : streak >= 7 ? 'เริ่มเป็นพุ่มใหญ่แล้ว' : streak >= 3 ? 'กำลังแตกใบใหม่' : 'ต้นกล้าเริ่มเติบโต';

  return (
    <section className={`glass-card tree-scene p-7 md:p-9 ${resetVisual ? 'tree-reset' : ''}`}>
      <div className="tree-sky-orb" />
      <div className="tree-cloud cloud-one" />
      <div className="tree-cloud cloud-two" />
      <div className="relative z-10 max-w-xl">
        <div className="badge mb-4"><Leaf size={16} /> Minimal Growth Tree</div>
        <h1 className="text-3xl md:text-5xl font-black">ต้นไม้สุขภาพใจของคุณ</h1>
        <p className="mt-4 leading-8 text-[rgba(75,53,40,.70)]">
          เขียน Diary ต่อเนื่องทุกวัน ต้นไม้จะค่อย ๆ แตกใบแบบละมุน minimal หากไม่ได้กลับมาเขียนเกิน 7 วัน animation จะ reset เพื่อเริ่มดูแลใจใหม่อีกครั้ง
        </p>
        <div className="flex flex-wrap gap-3 mt-5">
          <span className="badge"><Flame size={16} /> Streak {streak} วัน</span>
          <span className="badge"><Sprout size={16} /> {growthLabel}</span>
          <span className="badge"><Leaf size={16} /> ใบไม้ {visibleLeaves} ใบ</span>
          {resetVisual && <span className="badge text-[#9a4a3c]"><RotateCcw size={16} /> reset animation แล้ว</span>}
        </div>
      </div>

      <div className="ground minimal-ground" />
      <div className="tree-aura aura-one" />
      <div className="tree-aura aura-two" />
      <div className="planter" aria-hidden="true">
        <div className="planter-lip" />
        <div className="planter-body" />
        <div className="planter-soil" />
        <div className="planter-shadow" />
      </div>
      <div className="tree minimal-tree" aria-label="minimal animated diary tree">
        <div className="tree-depth-shadow" />
        <div className="root root-left" />
        <div className="root root-right" />
        <div className="trunk minimal-trunk"><span className="trunk-line line-a" /><span className="trunk-line line-b" /></div>
        <div className="branch one" /><div className="branch two" /><div className="branch three" /><div className="branch four" /><div className="branch five" /><div className="branch six" />
        <div className="canopy canopy-back" />
        <div className="canopy canopy-mid" />
        <div className="canopy canopy-front" />
        {Array.from({ length: 9 }).map((_, index) => (
          <span
            key={`spark-${index}`}
            className="tree-spark"
            style={{
              '--sx': `${14 + ((index * 23) % 72)}%`,
              '--sy': `${8 + ((index * 17) % 48)}%`,
              '--sd': `${index * 0.45}s`
            }}
          />
        ))}
        {Array.from({ length: visibleLeaves }).map((_, index) => {
          const angle = (index * 137.508 + streak * 8) % 360;
          const ring = index % 5;
          const radiusX = 38 + ring * 18 + (index % 3) * 6;
          const radiusY = 24 + ring * 11 + (index % 2) * 5;
          const centerX = 50 + (index % 5 - 2) * 1.6;
          const centerY = 31 + (index % 6 - 3) * 1.0;
          const x = centerX + Math.cos(angle * Math.PI / 180) * radiusX;
          const y = centerY + Math.sin(angle * Math.PI / 180) * radiusY;
          const tone = index % 5;
          const depth = ring <= 1 ? 'back' : ring === 2 ? 'mid' : 'front';
          return (
            <span
              key={index}
              className={`leaf minimal-leaf tone-${tone} depth-${depth}`}
              style={{
                '--x': `${Math.max(7, Math.min(93, x))}%`,
                '--y': `${Math.max(2, Math.min(65, y))}%`,
                '--r': `${angle}deg`,
                '--d': `${index * 0.026}s`,
                '--size': `${11 + (index % 6) * 2.7}px`
              }}
            />
          );
        })}
      </div>
    </section>
  );
}

function SettingsPage({ user, onUserChange, onLogout }) {
  const [confirmText, setConfirmText] = useState('');
  const resetUserOnly = () => {
    if (confirmText !== 'RESET') return;
    const nextUser = { ...user, entries: {} };
    saveUser(user.username, nextUser);
    onUserChange(nextUser);
    setConfirmText('');
  };
  const resetWholeApp = () => {
    if (confirmText !== 'RESET') return;
    resetAllData();
    onLogout();
  };
  return (
    <section className="glass-card p-7 md:p-9">
      <div className="badge mb-4"><Settings size={16} /> Settings</div>
      <h1 className="text-3xl md:text-5xl font-black">ตั้งค่า</h1>
      <div className="grid-auto mt-7">
        <InfoCard title="ผู้ใช้" text={`${user.username} | ${user.email}`} />
        <InfoCard title="ข้อมูล demo" text="ข้อมูลทั้งหมดเก็บใน localStorage ของ browser นี้เท่านั้น" />
      </div>
      <div className="soft-card p-6 mt-6">
        <h2 className="text-2xl font-black">Reset เว็บ/ข้อมูล demo</h2>
        <p className="mt-2 leading-8 text-[rgba(75,53,40,.68)]">พิมพ์ RESET เพื่อยืนยันการล้างข้อมูล เหมาะสำหรับเริ่ม demo ใหม่ตั้งแต่ต้น</p>
        <input className="input-field mt-4" placeholder="พิมพ์ RESET" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
        <div className="flex flex-wrap gap-3 mt-5">
          <button className="btn-danger" disabled={confirmText !== 'RESET'} onClick={resetUserOnly}>ล้าง Diary ของผู้ใช้นี้</button>
          <button className="btn-danger" disabled={confirmText !== 'RESET'} onClick={resetWholeApp}>รีเซ็ตเว็บทั้งหมด</button>
          <button className="btn-secondary" onClick={onLogout}>Log out</button>
        </div>
      </div>
    </section>
  );
}

function EmptyState({ title, text, icon }) {
  return (
    <section className="glass-card p-10 text-center min-h-[420px] grid place-items-center">
      <div>
        <div className="mx-auto w-20 h-20 rounded-full bg-[rgba(111,78,55,.10)] grid place-items-center text-[var(--coffee)]">{icon}</div>
        <h1 className="text-3xl md:text-4xl font-black mt-6">{title}</h1>
        <p className="mt-4 max-w-xl mx-auto leading-8 text-[rgba(75,53,40,.68)]">{text}</p>
      </div>
    </section>
  );
}

function StatCard({ title, value, sub }) {
  return <div className="soft-card p-5"><div className="text-sm font-bold text-[rgba(75,53,40,.58)]">{title}</div><div className="text-2xl md:text-3xl font-black mt-2">{value}</div>{sub && <div className="text-sm mt-1 text-[rgba(75,53,40,.62)]">{sub}</div>}</div>;
}

function InfoCard({ title, text, alert }) {
  return <div className={`soft-card p-5 ${alert ? 'border-[#c79583]' : ''}`}><h3 className="text-xl font-black">{title}</h3><p className="leading-8 mt-3 text-[rgba(75,53,40,.72)]">{text}</p></div>;
}
