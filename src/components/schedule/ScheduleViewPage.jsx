import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../../firebase';
import { SHIFT_TYPES, DAYS, DAY_KEYS } from '../../constants';

// ── Fixed, lean palette ───────────────────────────────────────────────────────
// Deliberately independent of the app's per-shift / per-status colors. Just a
// small set of neutral tones so the exported view stays clean and consistent.
const C = {
  headerBg:   '#1a2e4a',  // top header row + shift column
  headerText: '#ffffff',
  rowOdd:     '#ffffff',
  rowEven:    '#f3f6fa',
  border:     '#d7deea',
  name:       '#1a2e4a',  // employee names
  muted:      '#8a96a8',  // empty cells / secondary text
  shiftHours: '#aebacc', // hours under the shift label (on dark bg)
  deviation:  '#c2410c',  // changed hours — stands out
  deviationBg:'#fff4ec',
};

// Shift rows, top → bottom. Each row groups the weekday + weekend variants that
// share the same logical slot. `timeType` is the type whose hours represent the
// row's standard hours (shown in the right-hand shift column).
const ROW_DEFS = [
  { key: 'reshem',  types: ['reshem_bet'],                  label: 'רשת ב׳',  timeType: null },
  { key: 'morning', types: ['morning', 'weekend_morning'], label: 'בוקר',    timeType: 'morning' },
  { key: 'short',   types: ['short_morning'],               label: 'בוקר קצר', timeType: 'short_morning' },
  { key: 'middle',  types: ['middle', 'weekend_middle'],    label: 'אמצע',    timeType: 'middle' },
  { key: 'evening', types: ['evening', 'weekend_evening'],  label: 'ערב',     timeType: 'evening' },
  { key: 'samples', types: ['samples'],                     label: 'דגימות',  timeType: 'samples' },
  { key: 'custom',  types: ['custom'],                      label: 'בלת״ם',   timeType: null },
];

const ADHOC_ONLY = new Set(['reshem_bet', 'custom']);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Default (standard) hours for a shift type, from settings or the constant. */
function defaultTimeFor(type, shiftTimes) {
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
function formatDeviation(slotTime, defaultTime) {
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

// ── Table ──────────────────────────────────────────────────────────────────────

function ScheduleTable({ schedule, employees, shiftTimes }) {
  const findName = (id) => employees.find((e) => e.id === id)?.name ?? '';

  const slotsForRowDay = (row, dayKey) => {
    const all = [
      ...(schedule?.[dayKey]?.slots ?? []),
      ...(schedule?.[dayKey]?.adHocShifts ?? []),
    ];
    return all.filter((s) => row.types.includes(s.type));
  };

  const slotHasContent = (s) =>
    Boolean(s.employee || s.employee2 || s.manualEmployee);

  // A row is shown when at least one day has something to display in it.
  const isAdHocRow = (row) => row.types.every((t) => ADHOC_ONLY.has(t));
  const activeRows = ROW_DEFS.filter((row) =>
    DAY_KEYS.some((dayKey) => {
      const slots = slotsForRowDay(row, dayKey);
      return isAdHocRow(row) ? slots.length > 0 : slots.some(slotHasContent);
    })
  );

  if (activeRows.length === 0) {
    return <div className="text-center text-gray-400 py-10">אין משמרות לשבוע זה</div>;
  }

  const cellBorder = `1px solid ${C.border}`;

  const renderSlot = (slot) => {
    const names = [
      slot.employee ? findName(slot.employee) : '',
      slot.employee2 ? findName(slot.employee2) : '',
      slot.manualEmployee ?? '',
    ].filter(Boolean);

    const deviation = formatDeviation(slot.time, defaultTimeFor(slot.type, shiftTimes));
    const customLabel = slot.type === 'custom' ? slot.label : null;

    return (
      <div key={slot.id} className="py-0.5">
        {customLabel && (
          <div style={{ color: C.muted }} className="text-[11px] font-semibold leading-tight mb-0.5">
            {customLabel}
          </div>
        )}

        {names.length > 0 ? (
          names.map((n, i) => (
            <div
              key={i}
              style={{ color: C.name }}
              className="font-bold text-[15px] leading-tight"
            >
              {n}
              {i === 0 && slot.konenutMark && (
                <span style={{ color: C.muted }} className="text-[10px] font-semibold mr-1">(כ)</span>
              )}
              {i === 0 && slot.reshemBetMark && (
                <span style={{ color: C.muted }} className="text-[10px] font-semibold mr-1">(ב׳)</span>
              )}
            </div>
          ))
        ) : (
          <span style={{ color: C.muted }}>—</span>
        )}

        {deviation && (
          <div
            style={{ color: C.deviation, backgroundColor: C.deviationBg, direction: 'ltr' }}
            className="mt-1 inline-block rounded px-1.5 py-0.5 text-[15px] font-extrabold leading-tight"
          >
            {deviation}
          </div>
        )}

        {slot.note && (
          <div style={{ color: C.muted }} className="text-[11px] font-medium leading-tight mt-0.5 break-words">
            {slot.note}
          </div>
        )}
      </div>
    );
  };

  return (
    <table
      className="w-full border-collapse text-center"
      style={{ tableLayout: 'fixed' }}
    >
      <thead>
        <tr>
          <th
            style={{
              backgroundColor: C.headerBg,
              color: C.headerText,
              border: cellBorder,
              width: '15%',
            }}
            className="py-2.5 px-2 text-[13px] font-bold"
          >
            משמרת
          </th>
          {DAY_KEYS.map((d, i) => (
            <th
              key={d}
              style={{ backgroundColor: C.headerBg, color: C.headerText, border: cellBorder }}
              className="py-2.5 px-1 text-[14px] font-bold"
            >
              {DAYS[i]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {activeRows.map((row, ri) => {
          const hours = row.timeType ? defaultTimeFor(row.timeType, shiftTimes) : '';
          const rowBg = ri % 2 === 0 ? C.rowOdd : C.rowEven;
          return (
            <tr key={row.key}>
              {/* Right-hand shift column: name + standard hours */}
              <th
                scope="row"
                style={{ backgroundColor: C.headerBg, color: C.headerText, border: cellBorder }}
                className="py-2 px-2 align-middle"
              >
                <div className="text-[14px] font-bold leading-tight">{row.label}</div>
                {hours && (
                  <div
                    style={{ color: C.shiftHours, direction: 'ltr' }}
                    className="text-[11px] font-mono mt-0.5"
                  >
                    {hours}
                  </div>
                )}
              </th>

              {DAY_KEYS.map((dayKey) => {
                const slots = slotsForRowDay(row, dayKey).filter(
                  (s) => isAdHocRow(row) || slotHasContent(s)
                );
                return (
                  <td
                    key={dayKey}
                    style={{ backgroundColor: rowBg, border: cellBorder }}
                    className="py-1.5 px-1 align-top"
                  >
                    {slots.length > 0
                      ? slots.map(renderSlot)
                      : <span style={{ color: C.muted }} className="text-[13px]">—</span>}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── Main view page ───────────────────────────────────────────────────────────

export function ScheduleViewPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onValue(ref(db, 'sharedSchedule'), (snap) => {
      setData(snap.exists() ? snap.val() : null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-gray-400 text-sm">⏳ טוען סידור...</div>
      </div>
    );
  }

  if (!data || !data.visible) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center select-none">
          <div className="text-7xl mb-4">🚧</div>
          <div className="text-2xl font-bold text-gray-700 mb-1">הסידור בבנייה</div>
          <div className="text-gray-400 text-sm">חזרו מאוחר יותר</div>
        </div>
      </div>
    );
  }

  const { schedule, scheduleDate, scheduleNotes, employees = [], shiftTimes = {}, savedAt } = data;

  const savedDate = savedAt
    ? new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(savedAt))
    : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">

      {/* Header */}
      <div className="bg-[#1a2e4a] text-white px-4 py-5 shrink-0 text-center">
        <div className="text-2xl font-bold tracking-tight">סידור משמרות</div>
        {scheduleDate && (
          <div className="text-white/75 text-base mt-1 font-medium">{scheduleDate}</div>
        )}
        {savedDate && (
          <div className="text-white/35 text-xs mt-1">עודכן {savedDate}</div>
        )}
      </div>

      {/* Notes — prominently above the grid */}
      {scheduleNotes && (
        <div className="bg-yellow-50 border-b-2 border-yellow-200 px-4 py-3 shrink-0">
          <div className="max-w-[760px] mx-auto">
            <div className="text-xs font-bold text-yellow-700 uppercase tracking-wide mb-1.5">📌 הערות</div>
            <div
              className="text-base text-gray-800 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: scheduleNotes }}
            />
          </div>
        </div>
      )}

      {/* Schedule — single square table for all screen sizes */}
      <div className="flex-1 p-3">
        <div className="mx-auto max-w-[760px] overflow-x-auto">
          <ScheduleTable schedule={schedule} employees={employees} shiftTimes={shiftTimes} />
        </div>
      </div>

    </div>
  );
}
