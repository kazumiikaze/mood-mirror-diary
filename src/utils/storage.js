const STORAGE_KEY = 'moodMirrorDiary:v4:sentence-ai-earthtone';
const SESSION_KEY = 'moodMirrorDiary:v4:session';

const defaultDB = {
  users: {},
  version: 4,
  createdAt: new Date().toISOString()
};

export function loadDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultDB;
  } catch (error) {
    console.warn('Cannot load database', error);
    return defaultDB;
  }
}

export function saveDB(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function getCurrentUsername() {
  return localStorage.getItem(SESSION_KEY);
}

export function setCurrentUsername(username) {
  localStorage.setItem(SESSION_KEY, username);
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function resetAllData() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SESSION_KEY);
}

export function getUser(username) {
  const db = loadDB();
  return db.users[username] || null;
}

export function saveUser(username, userData) {
  const db = loadDB();
  db.users[username] = userData;
  saveDB(db);
  return userData;
}

export function createUser({ username, age, email, password }) {
  const db = loadDB();
  if (db.users[username]) {
    throw new Error('Username นี้ถูกใช้งานแล้ว');
  }
  db.users[username] = {
    username,
    age,
    email,
    password,
    onboarded: false,
    onboarding: null,
    entries: {},
    createdAt: new Date().toISOString()
  };
  saveDB(db);
  return db.users[username];
}

export function updateUser(username, updater) {
  const user = getUser(username);
  if (!user) throw new Error('ไม่พบผู้ใช้');
  const nextUser = typeof updater === 'function' ? updater(user) : { ...user, ...updater };
  return saveUser(username, nextUser);
}

export function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatThaiDate(dateKey) {
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).format(new Date(`${dateKey}T12:00:00`));
}

export function getSortedEntries(user) {
  const entries = Object.entries(user?.entries || {}).map(([date, entry]) => ({ date, ...entry }));
  return entries.sort((a, b) => b.date.localeCompare(a.date));
}

export function calculateStreak(entriesObject = {}) {
  const dates = new Set(Object.keys(entriesObject));
  if (dates.size === 0) return 0;
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  while (true) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    if (!dates.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function daysSinceLastEntry(entriesObject = {}) {
  const dates = Object.keys(entriesObject).sort((a, b) => b.localeCompare(a));
  if (!dates.length) return Infinity;
  const last = new Date(`${dates[0]}T12:00:00`);
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  return Math.floor((now - last) / (1000 * 60 * 60 * 24));
}
