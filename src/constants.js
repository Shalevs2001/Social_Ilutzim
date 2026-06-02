// Days
export const DAYS        = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
export const DAY_KEYS    = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const WEEKEND_DAYS  = ['fri', 'sat'];
export const WEEKDAY_DAYS  = ['sun', 'mon', 'tue', 'wed', 'thu'];

// Shift definitions
// color = Tailwind bg class for the block; used in weekday slots
const CREAM = 'bg-amber-50 border-amber-200';
const CREAM_TEXT = 'text-stone-700';

export const SHIFT_TYPES = {
  morning: {
    id: 'morning',
    label: 'בוקר',
    time: '08:00–16:30',
    color: CREAM,
    textColor: CREAM_TEXT,
    days: 'weekday',
  },
  short_morning: {
    id: 'short_morning',
    label: 'בוקר קצר',
    time: '08:00–13:00',
    color: 'bg-yellow-100 border-yellow-300',
    textColor: 'text-yellow-800',
    days: 'weekday',
  },
  middle: {
    id: 'middle',
    label: 'אמצע',
    time: '13:00–21:30',
    color: CREAM,
    textColor: CREAM_TEXT,
    days: 'weekday',
  },
  evening: {
    id: 'evening',
    label: 'ערב',
    time: '15:00–23:30',
    color: CREAM,
    textColor: CREAM_TEXT,
    days: 'weekday',
  },
  samples: {
    id: 'samples',
    label: 'דגימות',
    time: '19:00–23:30',
    color: 'bg-orange-100 border-orange-300',
    textColor: 'text-orange-900',
    days: 'weekday',
  },
  weekend_morning: {
    id: 'weekend_morning',
    label: 'בוקר',
    time: '08:00–16:30',
    color: CREAM,
    textColor: CREAM_TEXT,
    days: 'weekend',
  },
  weekend_evening: {
    id: 'weekend_evening',
    label: 'ערב',
    time: '15:00–23:30',
    color: CREAM,
    textColor: CREAM_TEXT,
    days: 'weekend',
  },
  weekend_middle: {
    id: 'weekend_middle',
    label: 'אמצע',
    time: '13:00–21:30',
    color: CREAM,
    textColor: CREAM_TEXT,
    days: 'weekend',
  },
  custom: {
    id: 'custom',
    label: 'בלת״ם',
    time: '',
    color: 'bg-purple-100 border-purple-300',
    textColor: 'text-purple-800',
    days: 'any',
  },
  reshem_bet: {
    id: 'reshem_bet',
    label: 'רשת ב׳',
    time: '',
    color: 'bg-sky-100 border-sky-300',
    textColor: 'text-sky-800',
    days: 'any',
  },
};

// Status overrides for shift blocks (override the base color)
export const SLOT_STATUS = {
  normal:  null,
  low:     'low',     // low-priority availability → desaturated style
  forced:  'forced',  // manually placed despite no availability → pastel-red
};

// Visual classes for each status
export const STATUS_STYLES = {
  low:    'bg-gray-200 border-gray-400 border-dashed text-gray-600',
  forced: 'bg-red-200 border-red-400 text-red-800',
};

// Default employee roster
export const DEFAULT_EMPLOYEES = [
  { id: 'shalo',  name: 'שלו',   quota: 3 },
  { id: 'maya',   name: 'מאיה',  quota: 3 },
  { id: 'shira',  name: 'שירה',  quota: 2 },
  { id: 'tal',    name: 'טל',    quota: 3 },
  { id: 'daniel', name: 'דניאל', quota: 3 },
  { id: 'yuval',  name: 'יובל',  quota: 5 },
  { id: 'alon',   name: 'אלון',  quota: 0, joker: true },
  { id: 'shimi',  name: 'שימי',  quota: 0, joker: true },
];

export const SETTINGS_VERSION = 5;

// Default scheduling rules (editable via Settings Panel)
export const DEFAULT_SETTINGS = {
  version: SETTINGS_VERSION,
  mandatoryRequirements: [
    { id: 'req_evening_weekend', label: 'ערב - סוף שבוע',  shiftTypes: ['weekend_evening'],                              minCount: 1 },
    { id: 'req_evening_total',   label: 'ערב - סה״כ',       shiftTypes: ['evening', 'samples', 'weekend_evening'],        minCount: 3 },
    { id: 'req_morning_weekend', label: 'בוקר - סוף שבוע', shiftTypes: ['weekend_morning'],                              minCount: 1 },
    { id: 'req_morning_total',   label: 'בוקר - סה״כ',      shiftTypes: ['morning', 'short_morning', 'weekend_morning'],  minCount: 3 },
  ],
};

// One-directional fallbacks:
// morning avail  → covers morning + short_morning slots
// evening avail  → covers evening + samples slots
// short_morning avail → covers short_morning only
// samples avail       → covers samples only
export const SLOT_ALTERNATIVES = {
  short_morning: 'morning',   // short_morning slot can fall back to morning avail
  samples:       'evening',   // samples slot can fall back to evening avail
};

// Availability slot groups: types within the same group on the same day count as ONE slot.
// Used for minimum-availability counting and low-priority eligibility.
export const SLOT_GROUPS = [
  ['morning', 'short_morning'],
  ['middle'],
  ['evening', 'samples'],
  ['weekend_morning'],
  ['weekend_middle'],
  ['weekend_evening'],
];

// Default shift times (editable via Settings, synced via Firebase)
export const DEFAULT_SHIFT_TIMES = {
  morning:         '08:00–16:30',
  short_morning:   '08:00–13:00',
  middle:          '13:00–21:30',
  evening:         '15:00–23:30',
  samples:         '19:00–23:30',
  weekend_morning: '08:00–16:30',
  weekend_middle:  '13:00–21:30',
  weekend_evening: '15:00–23:30',
};

// Default soft preferences per employee
export const DEFAULT_PREFERENCES = {
  notAlone:            false,  // try to always pair with a second employee
  notAloneMandatory:   false,  // must have a partner — unschedule if none found
  shiftRules:          [],     // [{id, shiftType, days: [] (empty=all), direction: 'prefer'|'avoid', mandatory}]
  preferWith:          [],     // empIds to prefer as employee2 partner (soft)
  avoidWith:           [],     // empIds to avoid as employee2 partner (soft)
  preferWithMandatory: [],     // empIds to strongly prefer as employee2 partner (hard)
  avoidWithMandatory:  [],     // empIds to never pair with as employee2 (hard)
};

// Availability values a cell can hold
export const AVAIL = {
  none:    null,       // not available
  regular: 'regular', // available
  low:     'low',      // low priority
};
