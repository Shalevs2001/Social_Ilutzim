import { SHIFT_TYPES, DAY_KEYS } from '../constants';

// Shared "what to show in the read-only view" logic, used by both the on-screen
// table (ScheduleViewPage) and the square image export (exportScheduleSquare).

// Shift rows, top → bottom. Each row groups the weekday + weekend variants that
// share the same logical slot. `timeType` is the type whose hours represent the
// row's standard hours (shown in the right-hand shift column).
export const VIEW_ROW_DEFS = [
  { key: 'reshem',  types: ['reshem_bet'],                             label: 'רשת ב׳',   timeType: null },
  { key: 'morning', types: ['morning', 'weekend_morning'],            label: 'בוקר',     timeType: 'morning' },
  { key: 'short',   types: ['short_morning'],                          label: 'בוקר קצר', timeType: 'short_morning' },
  { key: 'middle',  types: ['middle', 'weekend_middle'],              label: 'אמצע',     timeType: 'middle' },
  // 'samples' is folded into the evening row — it's flagged inside the cell.
  { key: 'evening', types: ['evening', 'weekend_evening', 'samples'], label: 'ערב',      timeType: 'evening' },
  { key: 'custom',  types: ['custom'],                                 label: 'בלת״ם',    timeType: null },
];

const ADHOC_ONLY = new Set(['reshem_bet', 'custom']);

/** Default (standard) hours for a shift type, from settings or the constant. */
export function defaultTimeFor(type, shiftTimes) {
  return shiftTimes?.[type] || SHIFT_TYPES[type]?.time || '';
}

/**
 * Compare a slot's custom hours against the standard hours and describe only the
 * change in a short, human form:
 *   end moved earlier   → "עד 14:00"
 *   start moved later    → "מ-17:00"
 *   both changed / odd   → the full custom range
 * Returns null when there's no deviation.
 */
export function formatDeviation(slotTime, defaultTime) {
  if (!slotTime) return null;
  if (!defaultTime || slotTime === defaultTime) return null;

  const sep = /\s*[–—-]\s*/;
  const sp = slotTime.split(sep).map((s) => s.trim());
  const dp = defaultTime.split(sep).map((s) => s.trim());

  if (sp.length === 2 && dp.length === 2) {
    const startDiff = sp[0] !== dp[0];
    const endDiff   = sp[1] !== dp[1];
    if (startDiff && !endDiff) return `מ-${sp[0]}`;
    if (endDiff && !startDiff) return `עד ${sp[1]}`;
  }
  return slotTime;
}

/**
 * Build the rows model consumed by the renderers.
 * Each row: { key, label, hours, days: Entry[][] } where days[i] is the list of
 * entries for that day, and Entry = { names, tags, deviation, customLabel }.
 * Only rows that have content on at least one day are returned.
 */
export function buildScheduleView({ schedule, employees = [], shiftTimes = {} }) {
  const findName = (id) => employees.find((e) => e.id === id)?.name ?? '';

  const allSlotsForDay = (dayKey) => [
    ...(schedule?.[dayKey]?.slots ?? []),
    ...(schedule?.[dayKey]?.adHocShifts ?? []),
  ];

  const slotHasContent = (s) => Boolean(s.employee || s.employee2 || s.manualEmployee);

  const namesOf = (s) => [
    s.employee  ? findName(s.employee)  : '',
    s.employee2 ? findName(s.employee2) : '',
    s.manualEmployee ?? '',
  ].filter(Boolean);

  // The רשת ב׳ row gathers everyone covering reshet-bet that day: both dedicated
  // reshem_bet slots and the editors on regular slots flagged as backup.
  const reshemNamesForDay = (dayKey) => {
    const names = [];
    allSlotsForDay(dayKey).forEach((s) => {
      if (s.type !== 'reshem_bet' && !s.reshemBetMark) return;
      namesOf(s).forEach((n) => names.push(n));
    });
    return [...new Set(names)];
  };

  const isReshemRow = (row) => row.key === 'reshem';
  const isAdHocRow  = (row) => row.types.every((t) => ADHOC_ONLY.has(t));

  const entriesFor = (row, dayKey) => {
    if (isReshemRow(row)) {
      const names = reshemNamesForDay(dayKey);
      return names.length ? [{ names, tags: [], deviation: null, customLabel: null }] : [];
    }
    return allSlotsForDay(dayKey)
      .filter((s) => row.types.includes(s.type))
      .filter((s) => isAdHocRow(row) || slotHasContent(s))
      .map((s) => {
        const tags = [];
        if (s.type === 'samples') tags.push('דגימות');
        if (s.konenutMark)        tags.push('כוננות');
        return {
          names: namesOf(s),
          tags,
          deviation: formatDeviation(s.time, defaultTimeFor(s.type, shiftTimes)),
          customLabel: s.type === 'custom' ? (s.label ?? null) : null,
        };
      });
  };

  return VIEW_ROW_DEFS
    .map((row) => ({
      key: row.key,
      label: row.label,
      hours: row.timeType ? defaultTimeFor(row.timeType, shiftTimes) : '',
      days: DAY_KEYS.map((dayKey) => entriesFor(row, dayKey)),
    }))
    .filter((row) => row.days.some((entries) => entries.length > 0));
}
