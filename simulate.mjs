/**
 * Fill random availability that satisfies ALL mandatory requirements
 * for every employee except Maya (who gets quota slots but no morning/evening).
 * Run:  node simulate.mjs
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set } from 'firebase/database';

const firebaseConfig = {
  apiKey:            'AIzaSyDlGZatpd00ZtQ76JC1qdBpHdPnhHF6Kjk',
  authDomain:        'kan-social.firebaseapp.com',
  databaseURL:       'https://kan-social-default-rtdb.europe-west1.firebasedatabase.app',
  projectId:         'kan-social',
  storageBucket:     'kan-social.firebasestorage.app',
  messagingSenderId: '111695937662',
  appId:             '1:111695937262:web:35eacb4b779057a719d82f',
};

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

// ─── Constants ────────────────────────────────────────────────────────────────
const EMPLOYEES = [
  { id: 'shalo',  name: 'שלו',   quota: 3 },
  { id: 'maya',   name: 'מאיה',  quota: 3 },
  { id: 'shira',  name: 'שירה',  quota: 2 },
  { id: 'tal',    name: 'טל',    quota: 3 },
  { id: 'daniel', name: 'דניאל', quota: 3 },
  { id: 'yuval',  name: 'יובל',  quota: 5 },
];

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu'];
const WEEKEND  = ['fri', 'sat'];
const ALL_DAYS = [...WEEKDAYS, ...WEEKEND];

// Morning-family weekday options
const MORNING_WD   = ['morning', 'short_morning'];
// Evening-family weekday options
const EVENING_WD   = ['evening', 'samples'];
// Middle weekday
const MIDDLE_WD    = ['middle'];

function emptyDay(day) {
  return WEEKEND.includes(day)
    ? { weekend_morning: null, weekend_middle: null, weekend_evening: null }
    : { morning: null, short_morning: null, middle: null, evening: null, samples: null };
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Build availability ────────────────────────────────────────────────────────
const availability = {};

for (const emp of EMPLOYEES) {
  const avail = {};
  ALL_DAYS.forEach((d) => { avail[d] = emptyDay(d); });

  if (emp.id === 'daniel') {
    // Daniel: meets quota (3 middle shifts) but fails all morning/evening requirements
    const days = shuffle(WEEKDAYS).slice(0, emp.quota);
    days.forEach((d) => { avail[d].middle = 'regular'; });
    availability[emp.id] = avail;
    continue;
  }

  // ── Step 1: pick a weekend day and mark morning + evening on it ──────────
  const wDay = pick(WEEKEND);
  avail[wDay].weekend_morning = 'regular';
  avail[wDay].weekend_evening = 'regular';

  // ── Step 2: pick 2 more weekday morning-family slots (different days) ────
  const wdShuffled = shuffle(WEEKDAYS);
  const morningDays = wdShuffled.slice(0, 2);
  morningDays.forEach((d) => { avail[d][pick(MORNING_WD)] = 'regular'; });

  // ── Step 3: pick 2 more weekday evening-family slots (different days) ────
  const remainingWD = wdShuffled.slice(2);
  const eveningDays = remainingWD.length >= 2
    ? remainingWD.slice(0, 2)
    : shuffle(WEEKDAYS).filter((d) => !morningDays.includes(d)).slice(0, 2);
  eveningDays.forEach((d) => { avail[d][pick(EVENING_WD)] = 'regular'; });

  // ── Step 4: fill up to quota if needed ───────────────────────────────────
  const countMarked = () => Object.values(avail).flatMap(Object.values).filter(Boolean).length;
  const extraPool = shuffle(WEEKDAYS.filter((d) => !morningDays.includes(d) && !eveningDays.includes(d)));
  let ei = 0;
  while (countMarked() < emp.quota && ei < extraPool.length) {
    avail[extraPool[ei]].middle = 'regular';
    ei++;
  }

  // ── Step 5: add 1-2 low-priority slots on unused days ────────────────────
  // Only after regular quota is met (so no validation warning)
  const usedDays = new Set(
    ALL_DAYS.filter((d) =>
      Object.values(avail[d] ?? {}).some((v) => v === 'regular')
    )
  );
  const lowPool = shuffle([...WEEKDAYS, ...WEEKEND].filter((d) => !usedDays.has(d)));
  const lowCount = 1 + Math.floor(Math.random() * 2); // 1 or 2 low slots
  lowPool.slice(0, lowCount).forEach((d) => {
    if (WEEKEND.includes(d)) {
      // pick whichever weekend slot is empty
      if (!avail[d].weekend_morning) avail[d].weekend_morning = 'low';
      else if (!avail[d].weekend_evening) avail[d].weekend_evening = 'low';
    } else {
      const opts = [...MORNING_WD, ...EVENING_WD, ...MIDDLE_WD].filter((s) => !avail[d][s]);
      if (opts.length) avail[d][pick(opts)] = 'low';
    }
  });

  availability[emp.id] = avail;
}

// ─── Print summary ────────────────────────────────────────────────────────────
for (const emp of EMPLOYEES) {
  const avail = availability[emp.id];
  const slots = [];
  for (const [day, shifts] of Object.entries(avail)) {
    for (const [shift, val] of Object.entries(shifts)) {
      if (val) slots.push(`${day}/${shift}`);
    }
  }
  const isFail = emp.id === 'daniel';
  const lowSlots = slots.filter((s) => {
    const [day, shift] = s.split('/');
    return availability[emp.id][day][shift] === 'low';
  });
  console.log(`${emp.name.padEnd(6)} (${slots.length}/${emp.quota}${lowSlots.length ? `, ${lowSlots.length} נמוך` : ''}) ${isFail ? '⚠️  לא עומד בדרישות' : '✓'}`);
  console.log(`       ${slots.join('  ')}`);
}

// ─── Write to Firebase ────────────────────────────────────────────────────────
console.log('\nכותב ל-Firebase...');
await set(ref(db, 'availability'), availability);
console.log('✅ נכתב בהצלחה!\n');
process.exit(0);
