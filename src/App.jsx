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
              <p className="text-[rgba(75,53,40,.66)]"></p>
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
        <p className="mt-4 text-[rgba(75,53,40,.68)] leading-8">ตอบสั้น ๆ เพื่อให้ AI นี้ให้คำแนะนำที่ใกล้เคียงบริบทของคุณมากขึ้นตั้งแต่วันแรก</p>
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
    ['tree', 'Tree', Leaf],
  ];
  return (
    <nav className="navbar glass-card">
      <button className="flex items-center gap-3 bg-transparent border-0 text-left" onClick={() => setPage('today')}>
        <div className="w-11 h-11 rounded-full bg-[rgba(111,78,55,.12)] grid place-items-center"><Moon size={21} /></div>
        <div>
          <div className="font-black leading-5">Mood Mirror Diary</div>
          <div className="text-xs text-[rgba(75,53,40,.58)]"></div>
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

  const submit = async () => {
    setError('');
    setIsProcessing(true);
    try {
      const analysis = await analyzeDiary({
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
     setPage('result');
   } catch (err) {
     setError('เกิดข้อผิดพลาด: ' + err.message);
   } finally {
     setIsProcessing(false);
   }
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
        <h1 className="text-3xl md:text-5xl font-black">ผลวิเคราะห์ {formatThaiDate(date)}</h1>
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
        <SimpleBarChart title="Stress Trend 7 วัน" entries={recent7} valueGetter={(e) => e.analysis?.stressScore || 0} max={100} color="#8B5E3C" type="bar" />
        <SimpleBarChart title="Energy Graph 7 วัน" entries={recent7} valueGetter={(e) => e.energy || 0} max={10} color="#7A9E7E" type="line" />
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
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const count = {};
  entries.forEach((e) => {
    const label = e.analysis?.emotionClassification?.[0]?.label || e.mood || 'ไม่ชัดเจน';
    count[label] = (count[label] || 0) + 1;
  });
  const items = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const colors = items.map(([l]) => MOOD_COLORS[l] || '#B89880');

  // คำนวณ height ตามจำนวน items — ขั้นต่ำ 200px
  const chartHeight = Math.max(200, items.length * 52 + 40);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !items.length) return;

    const buildChart = () => {
      if (!window.Chart) return;
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

      const maxVal = Math.max(...items.map(([, v]) => v));

      chartRef.current = new window.Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: items.map(([l]) => l),
          datasets: [{
            label: 'จำนวนวัน',
            data: items.map(([, v]) => v),
            backgroundColor: colors.map((c) => c + 'CC'),
            borderColor: colors,
            borderWidth: 2,
            borderRadius: 6,
            borderSkipped: false,
            barThickness: 28    // 👈 กำหนดความหนาแท่งตายตัว
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#fffaf2',
              titleColor: '#4b3528',
              bodyColor: '#9a7c62',
              borderColor: '#e8d7c0',
              borderWidth: 1,
              cornerRadius: 10,
              padding: 10,
              callbacks: {
                label: (ctx) => ` ${ctx.raw} วัน`
              }
            }
          },
          scales: {
            x: {
              grid: { color: 'rgba(139,94,60,0.10)' },
              ticks: { color: '#9a7c62', font: { size: 11 }, stepSize: 1 },
              min: 0,
              max: Math.max(maxVal + 1, 5)   // 👈 scale อย่างน้อย 5 เสมอ
            },
            y: {
              grid: { display: false },
              ticks: { color: '#9a7c62', font: { size: 13 } }
            }
          }
        }
      });
    };

    if (!window.Chart) {
      if (!document.getElementById('chartjs-cdn')) {
        const s = document.createElement('script');
        s.id = 'chartjs-cdn';
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
        s.onload = buildChart;
        document.head.appendChild(s);
      } else {
        const wait = setInterval(() => {
          if (window.Chart) { clearInterval(wait); buildChart(); }
        }, 50);
      }
    } else {
      buildChart();
    }

    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [entries]);

  return (
    <div className="glass-card p-6 chart-card">
      <h3 className="text-xl font-black">mood summary 30 วัน</h3>
      <p className="text-sm mt-1" style={{ color: '#9a7c62' }}>สัดส่วนอารมณ์ที่บันทึกทั้งหมด</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '10px 0 14px' }}>
        {items.map(([label, val], i) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#9a7c62' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: colors[i], display: 'inline-block' }} />
            {label} {val} วัน
          </span>
        ))}
      </div>
      {/* 👇 height คำนวณจากจำนวน items จริง */}
      <div style={{ position: 'relative', width: '100%', height: `${chartHeight}px` }}>
        <canvas ref={canvasRef} role="img" aria-label="mood summary 30 วัน" />
      </div>
    </div>
  );
}

const MOOD_COLORS = {
  'สดใส': '#7A9E7E',
  'เฉยๆ': '#B89880',
  'เหนื่อย': '#8B5E3C',
  'เศร้า': '#A67C5B',
  'เครียด': '#C27A5A',
  'กังวล': '#C4956A',
  'โกรธ': '#9a4a3c'
};

const WARM = {
  grid: 'rgba(139,94,60,0.10)',
  tick: '#9a7c62',
};

const tooltipConfig = {
  backgroundColor: '#fffaf2',
  titleColor: '#4b3528',
  bodyColor: '#9a7c62',
  borderColor: '#e8d7c0',
  borderWidth: 1,
  cornerRadius: 10,
  padding: 10
};

function SimpleBarChart({ title, entries, valueGetter, max, color = '#8B5E3C', type = 'bar' }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !entries.length) return;

    const buildChart = () => {
      if (!window.Chart) return;
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }

      const ctx = canvas.getContext('2d');
      const data = entries.map((e) => Number(valueGetter(e)));
      const labels = entries.map((e) => e.date?.slice(5) || '');

      let dataset;
      if (type === 'line') {
        const grad = ctx.createLinearGradient(0, 0, 0, 160);
        grad.addColorStop(0, color + '55');
        grad.addColorStop(1, color + '00');
        dataset = {
          data, borderColor: color, backgroundColor: grad,
          borderWidth: 2.5,
          pointBackgroundColor: '#fffaf2',
          pointBorderColor: color,
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          fill: true, tension: 0.45
        };
      } else {
        const grad = ctx.createLinearGradient(0, 0, 0, 160);
        grad.addColorStop(0, color);
        grad.addColorStop(1, color + '44');
        dataset = {
          data, backgroundColor: grad, borderColor: color,
          borderWidth: 0, borderRadius: 8, borderSkipped: false
        };
      }

      chartRef.current = new window.Chart(ctx, {
        type,
        data: { labels, datasets: [{ label: title, ...dataset }] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#fffaf2',
              titleColor: '#4b3528',
              bodyColor: '#9a7c62',
              borderColor: '#e8d7c0',
              borderWidth: 1,
              cornerRadius: 10,
              padding: 10
            }
          },
          scales: {
            x: {
              grid: { color: 'rgba(139,94,60,0.10)' },
              ticks: {
                color: '#9a7c62',
                font: { size: 11 },
                autoSkip: false,      // 👈 บังคับแสดงทุก label
                maxRotation: 0
              }
            },
            y: {
              grid: { color: 'rgba(139,94,60,0.10)' },
              ticks: { color: '#9a7c62', font: { size: 11 } },
              min: 0,
              max
            }
          }
        }
      });
    };

    if (!window.Chart) {
      if (!document.getElementById('chartjs-cdn')) {
        const s = document.createElement('script');
        s.id = 'chartjs-cdn';
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
        s.onload = buildChart;
        document.head.appendChild(s);
      } else {
        const wait = setInterval(() => {
          if (window.Chart) { clearInterval(wait); buildChart(); }
        }, 50);
      }
    } else {
      buildChart();
    }

    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [entries]);

  return (
    <div className="glass-card p-6 chart-card">
      <h3 className="text-xl font-black">{title}</h3>
      <p className="text-sm mt-1" style={{ color: '#9a7c62' }}>
        คะแนน 0–{max}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '10px 0', fontSize: 12, color: '#9a7c62' }}>
        <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block' }} />
        {type === 'line' ? 'ระดับพลังงาน' : 'stress score'}
      </div>
      {/* 👇 ต้องกำหนด height ที่ wrapper ไม่ใช่ canvas */}
      <div style={{ position: 'relative', width: '100%', height: '200px' }}>
        <canvas ref={canvasRef} role="img" aria-label={title} />
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
  const growthLabel =
    streak >= 14 ? 'ต้นไม้กำลังเติบโตดีมาก'
    : streak >= 7 ? 'เริ่มเป็นพุ่มใหญ่แล้ว'
    : streak >= 3 ? 'กำลังแตกใบใหม่'
    : 'ต้นกล้าเริ่มเติบโต';

  const s = Math.min(1.45, 0.55 + streak * 0.065);
  const op = resetVisual ? 0.28 : 1;

  return (
    <section style={{
      position: 'relative', minHeight: 600, overflow: 'hidden', borderRadius: 32,
      background: 'linear-gradient(180deg,#cce8f4 0%,#e8f4f0 30%,#f0ece0 62%,#dfc9a0 85%,#c8a870 100%)'
    }}>
      <svg style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', pointerEvents:'none' }}
        viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="sunG" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff8c0"/><stop offset="40%" stopColor="#ffe880"/>
            <stop offset="75%" stopColor="#ffd060" stopOpacity=".5"/><stop offset="100%" stopColor="#ffc040" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="sunCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fffde0"/><stop offset="60%" stopColor="#ffe890"/><stop offset="100%" stopColor="#ffd060"/>
          </radialGradient>
          <radialGradient id="trunkG" cx="32%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#d4a878"/><stop offset="45%" stopColor="#a87848"/><stop offset="100%" stopColor="#6e4c28"/>
          </radialGradient>
          <radialGradient id="c1" cx="38%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#d8f0c8"/><stop offset="45%" stopColor="#a8d888"/><stop offset="100%" stopColor="#78b858"/>
          </radialGradient>
          <radialGradient id="c2" cx="32%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#e8f8d8"/><stop offset="45%" stopColor="#c0e898"/><stop offset="100%" stopColor="#90c868"/>
          </radialGradient>
          <radialGradient id="c3" cx="28%" cy="25%" r="72%">
            <stop offset="0%" stopColor="#f0fce4"/><stop offset="50%" stopColor="#d4f0a8"/><stop offset="100%" stopColor="#a8d878"/>
          </radialGradient>
          <radialGradient id="c4" cx="25%" cy="22%" r="70%">
            <stop offset="0%" stopColor="#f8fef0"/><stop offset="55%" stopColor="#e4f8c8"/><stop offset="100%" stopColor="#c0e890"/>
          </radialGradient>
          <radialGradient id="c5" cx="22%" cy="20%" r="68%">
            <stop offset="0%" stopColor="#fefffa"/><stop offset="60%" stopColor="#eefcd8"/><stop offset="100%" stopColor="#d0f0a8"/>
          </radialGradient>
          <filter id="fs"><feDropShadow dx="2" dy="5" stdDeviation="7" floodColor="#4a7030" floodOpacity=".22"/></filter>
          <filter id="fs2"><feDropShadow dx="1" dy="3" stdDeviation="4" floodColor="#4a7030" floodOpacity=".15"/></filter>
          <filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>

        {/* ดวงอาทิตย์ */}
        <ellipse cx="640" cy="80" rx="130" ry="130" fill="url(#sunG)" style={{animation:'sunPulse 7s ease-in-out infinite'}}/>
        <ellipse cx="640" cy="80" rx="46" ry="46" fill="url(#sunCore)" style={{animation:'sunPulse 7s ease-in-out infinite'}}/>

        {/* เมฆ */}
        <g style={{animation:'cloudDrift 16s ease-in-out infinite'}}>
          <ellipse cx="180" cy="90" rx="54" ry="20" fill="rgba(255,255,255,.72)"/>
          <ellipse cx="155" cy="98" rx="32" ry="16" fill="rgba(255,255,255,.68)"/>
          <ellipse cx="215" cy="95" rx="36" ry="15" fill="rgba(255,255,255,.65)"/>
        </g>
        <g style={{animation:'cloudDrift 20s ease-in-out infinite', animationDelay:'-8s'}}>
          <ellipse cx="520" cy="60" rx="40" ry="15" fill="rgba(255,255,255,.55)"/>
          <ellipse cx="500" cy="68" rx="24" ry="12" fill="rgba(255,255,255,.50)"/>
          <ellipse cx="548" cy="65" rx="28" ry="11" fill="rgba(255,255,255,.48)"/>
        </g>

        {/* พื้นดิน */}
        <rect x="0" y="500" width="800" height="100" fill="#c0a068"/>
        <ellipse cx="400" cy="500" rx="430" ry="28" fill="#c8b07a"/>
        <ellipse cx="400" cy="488" rx="380" ry="18" fill="#d4bc8a"/>

        {/* ต้นไม้ */}
        <g style={{animation:'treeSway 7s ease-in-out infinite', transformOrigin:'400px 500px'}}>
          {/* ลำต้น */}
          <path d="M388,500 Q382,430 378,360 Q374,290 380,240 Q384,208 396,190 Q400,182 404,182 Q408,190 416,208 Q422,240 422,290 Q422,360 418,430 Q414,470 412,500Z" fill="url(#trunkG)"/>
          <path d="M396,500 Q392,420 390,340 Q388,270 392,228 Q395,205 400,192" fill="none" stroke="rgba(255,235,200,.25)" strokeWidth="3" strokeLinecap="round"/>

          {/* กิ่ง */}
          {[
            ["M400,310 Q348,298 318,278 Q296,262 292,244","#9a7040",10],
            ["M400,310 Q452,296 482,276 Q506,260 510,242","#9a7040",10],
            ["M400,268 Q355,252 330,230 Q312,212 310,192","#aa8050",7.5],
            ["M400,268 Q445,250 470,228 Q488,210 490,190","#aa8050",7.5],
            ["M400,232 Q366,214 348,192 Q336,174 336,156","#ba9060",6],
            ["M400,232 Q434,212 452,190 Q464,172 464,154","#ba9060",6],
            ["M400,204 Q378,184 366,162 Q358,144 360,126","#c8a070",4.5],
            ["M400,204 Q422,182 434,160 Q442,142 440,124","#c8a070",4.5],
          ].map(([d,s,w],i) => <path key={i} d={d} fill="none" stroke={s} strokeWidth={w} strokeLinecap="round"/>)}

          {/* ทรงพุ่ม */}
          <g transform={`translate(400,220) scale(${s}) translate(-400,-220)`} opacity={op}>
            <ellipse cx="400" cy="220" rx="170" ry="128" fill="url(#c1)" filter="url(#fs)" opacity=".85"/>
            <ellipse cx="310" cy="255" rx="82" ry="65" fill="url(#c1)" filter="url(#fs2)" opacity=".80"/>
            <ellipse cx="492" cy="250" rx="78" ry="62" fill="url(#c1)" filter="url(#fs2)" opacity=".78"/>
            <ellipse cx="388" cy="198" rx="154" ry="116" fill="url(#c2)" opacity=".88"/>
            <ellipse cx="380" cy="172" rx="132" ry="102" fill="url(#c3)" opacity=".90"/>
            <ellipse cx="370" cy="148" rx="112" ry="88" fill="url(#c3)" opacity=".88"/>
            <ellipse cx="360" cy="126" rx="90" ry="72" fill="url(#c4)" opacity=".90"/>
            <ellipse cx="356" cy="106" rx="70" ry="57" fill="url(#c4)" opacity=".88"/>
            <ellipse cx="354" cy="88" rx="52" ry="43" fill="url(#c5)" opacity=".92"/>
            <ellipse cx="353" cy="74" rx="36" ry="30" fill="url(#c5)" opacity=".90"/>
            <ellipse cx="352" cy="62" rx="22" ry="19" fill="rgba(250,255,242,.88)" opacity=".85"/>
            <ellipse cx="332" cy="168" rx="34" ry="26" fill="rgba(240,255,220,.50)" transform="rotate(-18,332,168)"/>
            <ellipse cx="428" cy="155" rx="30" ry="22" fill="rgba(240,255,220,.44)" transform="rotate(14,428,155)"/>
            <ellipse cx="352" cy="74" rx="16" ry="12" fill="rgba(255,255,248,.70)"/>
            <g filter="url(#glow)">
              {[[348,148,4.5,.80,3.2],[428,138,3.5,.72,4.1,-.7],[362,92,4,.85,2.8,-1.4],[390,68,3,.90,3.6,-2],[310,200,3,.65,5,-.4],[486,195,3,.62,4.4,-1.1]].map(([x,y,r,o,d,dl=0],i)=>(
                <circle key={i} cx={x} cy={y} r={r} fill={`rgba(255,240,100,${o})`} style={{animation:`sparkle ${d}s ease-in-out infinite`, animationDelay:`${dl}s`}}/>
              ))}
            </g>
          </g>
        </g>

        {/* เงาต้นไม้ */}
        <ellipse cx="400" cy="498" rx="96" ry="12" fill="rgba(80,50,20,.20)"/>
        {/* พุ่มไม้เล็กข้างๆ */}
        <ellipse cx="158" cy="490" rx="44" ry="38" fill="#c8d8a8" opacity=".55"/>
        <ellipse cx="630" cy="488" rx="38" ry="34" fill="#c8d8a8" opacity=".50"/>
      </svg>

      {/* ข้อความ */}
      <div style={{ position:'relative', zIndex:10, padding:'28px 32px', maxWidth:480 }}>
        <div className="badge mb-4"><Leaf size={16}/> Growth Tree</div>
        <h1 className="text-3xl md:text-5xl font-black" style={{color:'#3a2a18'}}>ต้นไม้สุขภาพใจของคุณ</h1>
        <p className="mt-4 leading-8 text-[rgba(75,53,40,.70)]">
          เขียน Diary ต่อเนื่องทุกวัน ต้นไม้จะค่อยๆ เติบโตและใบจะสดใสขึ้น หากหยุดเขียนเกิน 7 วัน ต้นไม้จะเริ่มเหี่ยวเฉา ต้องรอการดูแลใหม่
        </p>
        <div className="flex flex-wrap gap-3 mt-5">
          <span className="badge"><Flame size={16}/> Streak {streak} วัน</span>
          <span className="badge"><Sprout size={16}/> {growthLabel}</span>
          {resetVisual && <span className="badge text-[#9a4a3c]"><RotateCcw size={16}/> ต้นไม้ต้องการการดูแล</span>}
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
