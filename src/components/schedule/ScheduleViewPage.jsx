import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../../firebase';
import { SHIFT_TYPES, DAYS, DAY_KEYS } from '../../constants';

// ── Mobile classic table ─────────────────────────────────────────────────────

const DAY_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

const ROW_DEFS = [
  { key: 'morning',  types: ['morning', 'weekend_morning'],           label: 'בוקר'     },
  { key: 'short',    types: ['short_morning'],                         label: 'בוקר ק׳'  },
  { key: 'middle',   types: ['middle', 'weekend_middle'],              label: 'אמצע'     },
  { key: 'evening',  types: ['evening', 'weekend_evening'],            label: 'ערב'      },
  { key: 'samples',  types: ['samples'],                               label: 'דגימות'   },
  { key: 'reshem',   types: ['reshem_bet'],                            label: 'רשת ב׳'   },
  { key: 'custom',   types: ['custom'],                                label: 'בלת״ם'    },
];

function MobileTable({ schedule, employees, shiftTimes }) {
  const findName = (id) => employees.find((e) => e.id === id)?.name ?? '';

  // adHoc-only types: show row whenever the slot exists (even without an assigned employee)
  const ADHOC_ONLY = new Set(['reshem_bet', 'custom']);
  const isAdHocRow = (row) => row.types.every((t) => ADHOC_ONLY.has(t));

  const activeRows = ROW_DEFS.filter((row) =>
    DAY_KEYS.some((dayKey) => {
      const adHoc = schedule?.[dayKey]?.adHocShifts ?? [];
      const slots = schedule?.[dayKey]?.slots ?? [];
      if (isAdHocRow(row)) {
        // reshem_bet / custom — show if the slot was added at all
        return adHoc.some((s) => row.types.includes(s.type));
      }
      // regular slots — show only if someone is assigned
      const all = [...slots, ...adHoc];
      return all.some((s) => row.types.includes(s.type) && (s.employee || s.manualEmployee));
    })
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-center" style={{ fontSize: '11px' }}>
        <thead>
          <tr className="bg-[#1a2e4a] text-white">
            <th className="py-2 px-1 font-semibold text-[10px] w-12 text-right pr-2">משמרת</th>
            {DAY_KEYS.map((d, i) => (
              <th key={d} className="py-2 px-0.5 font-bold">{DAY_SHORT[i]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {activeRows.map((row, ri) => (
            <tr key={row.key} className={`border-b border-gray-100 ${ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
              <td className="py-1.5 px-1 text-right pr-2 font-semibold text-gray-400 text-[10px] border-r border-gray-200 align-top pt-2">
                {row.label}
              </td>
              {DAY_KEYS.map((dayKey) => {
                const all = [...(schedule?.[dayKey]?.slots ?? []), ...(schedule?.[dayKey]?.adHocShifts ?? [])];
                const slot = all.find((s) => row.types.includes(s.type));
                if (!slot) return <td key={dayKey} className="py-1.5 px-0.5 text-gray-200">—</td>;

                const names = [
                  slot.employee       ? findName(slot.employee)  : '',
                  slot.employee2      ? findName(slot.employee2) : '',
                  slot.manualEmployee ?? '',
                ].filter(Boolean);

                const shiftDef = SHIFT_TYPES[slot.type] ?? SHIFT_TYPES.custom;
                const time = slot.time || shiftTimes?.[slot.type] || shiftDef.time || '';

                return (
                  <td key={dayKey} className="py-1.5 px-0.5 align-top">
                    {/* Employee names */}
                    {names.length > 0 ? (
                      <div className="font-bold text-[#1a2e4a] leading-snug">
                        {names.map((n, i) => <div key={i}>{n}</div>)}
                      </div>
                    ) : (
                      <span className="text-gray-200">—</span>
                    )}
                    {/* Time */}
                    {time && (
                      <div className="text-[9px] text-gray-400 font-mono mt-0.5" style={{ direction: 'ltr' }}>
                        {time}
                      </div>
                    )}
                    {/* Badges */}
                    <div className="flex justify-center gap-0.5 mt-0.5 flex-wrap">
                      {slot.reshemBetMark && (
                        <span className="text-[8px] bg-sky-100 text-sky-700 rounded px-0.5 font-bold">ב׳</span>
                      )}
                      {slot.konenutMark && (
                        <span className="text-[8px] bg-pink-100 text-pink-700 rounded px-0.5 font-bold">כ</span>
                      )}
                    </div>
                    {/* Note */}
                    {slot.note && (
                      <div className="text-[9px] text-gray-500 mt-0.5 leading-tight line-clamp-2">
                        {slot.note}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Read-only slot card ──────────────────────────────────────────────────────

function ViewSlot({ slot, employees }) {
  const shiftDef = SHIFT_TYPES[slot.type] ?? SHIFT_TYPES.custom;
  const label    = slot.label ?? shiftDef.label;
  const time     = slot.time  ?? shiftDef.time ?? '';

  const findName = (id) => employees.find((e) => e.id === id)?.name ?? id;

  const emp1Name = slot.employee  ? findName(slot.employee)  : null;
  const emp2Name = slot.employee2 ? findName(slot.employee2) : null;
  const manual   = slot.manualEmployee ?? null;

  // Status-based style overrides
  let containerClass = `${shiftDef.color} ${shiftDef.textColor}`;
  if (slot.status === 'forced') {
    containerClass = 'bg-red-200 border-red-400 text-red-800';
  } else if (slot.status === 'low') {
    containerClass = 'bg-gray-200 border-gray-400 border-dashed text-gray-600';
  }

  const isEmpty = !emp1Name && !emp2Name && !manual;

  return (
    <div className={`rounded-xl border p-2 text-xs flex-1 ${containerClass}`}>
      {/* Label + time */}
      <div className="font-bold leading-tight">{label}</div>
      {time && (
        <div className="font-mono text-sm font-semibold opacity-80 leading-tight mt-0.5" style={{ direction: 'ltr' }}>
          {time}
        </div>
      )}

      {/* Reshet bet badge */}
      {slot.reshemBetMark && (
        <div className="mt-1 text-[8px] bg-sky-100 text-sky-700 border border-sky-300
          rounded-lg px-1.5 py-0.5 font-medium text-center leading-tight">
          גיבוי רשת ב׳
        </div>
      )}

      {/* Konenut badge */}
      {slot.konenutMark && (
        <div className="mt-1 text-[8px] bg-pink-100 text-pink-700 border border-pink-300
          rounded-lg px-1.5 py-0.5 font-medium text-center leading-tight">
          כוננות
        </div>
      )}

      {/* Employee chips */}
      {emp1Name && (
        <div className="mt-1.5 rounded-md px-1 py-0.5 border border-orange-300 bg-orange-50
          text-center text-[18px] font-bold leading-tight text-orange-800 truncate">
          {emp1Name}
        </div>
      )}
      {emp2Name && (
        <div className="mt-1 rounded-md px-1 py-0.5 border border-orange-300 bg-orange-50
          text-center text-[18px] font-bold leading-tight text-orange-800 truncate">
          {emp2Name}
        </div>
      )}
      {manual && (
        <div className="mt-1.5 rounded-md px-1 py-0.5 border border-orange-300 bg-orange-50
          text-center text-[18px] font-bold leading-tight text-orange-800 truncate">
          {manual}
        </div>
      )}

      {/* Empty placeholder */}
      {isEmpty && (
        <div className="mt-1.5 h-6 rounded-md border border-current/20 border-dashed
          flex items-center justify-center opacity-30 text-[9px] select-none">
          —
        </div>
      )}

      {/* Slot note */}
      {slot.note && (
        <div className="mt-1.5 rounded-lg bg-black/10 px-2 py-1.5
          text-sm font-semibold leading-snug break-words">
          {slot.note}
        </div>
      )}
    </div>
  );
}

// ── Read-only day column ─────────────────────────────────────────────────────

const SLOT_POS = {
  morning: 'morning', short_morning: 'morning', weekend_morning: 'morning',
  middle: 'middle', weekend_middle: 'middle',
  evening: 'evening', samples: 'evening', weekend_evening: 'evening',
};

const ADHOC_POS = {
  morning: 'morning', short_morning: 'morning',
  middle: 'middle', weekend_middle: 'middle',
  evening: 'evening', samples: 'evening',
};

function ViewDayColumn({ dayKey, dayName, dayData, employees }) {
  const slots = dayData?.slots      ?? [];
  const adHoc = dayData?.adHocShifts ?? [];

  const reshemSlot        = adHoc.find((s) => s.type === 'reshem_bet')     ?? null;
  const weekendMiddleSlot = adHoc.find((s) => s.type === 'weekend_middle') ?? null;
  const trueAdHoc         = adHoc.filter((s) => s.type !== 'reshem_bet' && s.type !== 'weekend_middle');

  const groups = { morning: [], middle: [], evening: [], end: [] };
  trueAdHoc.forEach((s) => {
    const pos = ADHOC_POS[s.boundType] ?? 'end';
    groups[pos].push(s);
  });

  const renderAdHocs = (bucket) =>
    groups[bucket].map((slot) => (
      <ViewSlot key={slot.id} slot={slot} employees={employees} />
    ));

  const renderSlots = () => {
    const result = [];
    slots.forEach((slot) => {
      result.push(
        <div key={slot.id} className="flex-1 flex flex-col gap-1.5">
          <ViewSlot slot={slot} employees={employees} />
          {renderAdHocs(SLOT_POS[slot.type] ?? 'end')}
        </div>
      );
      if (slot.type === 'weekend_morning' && weekendMiddleSlot) {
        result.push(
          <div key={weekendMiddleSlot.id} className="flex-1 flex flex-col gap-1.5">
            <ViewSlot slot={weekendMiddleSlot} employees={employees} />
            {renderAdHocs('middle')}
          </div>
        );
      }
    });
    return result;
  };

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border p-2.5 bg-white border-gray-200">
      <div className="text-xs font-bold text-[#1a2e4a] pb-0.5 border-b border-gray-100">
        {dayName}
      </div>
      {reshemSlot && <ViewSlot slot={reshemSlot} employees={employees} />}
      <div className="flex-1 flex flex-col gap-1.5">
        {renderSlots()}
        {renderAdHocs('end')}
      </div>
    </div>
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
          <div className="max-w-[1100px] mx-auto">
            <div className="text-xs font-bold text-yellow-700 uppercase tracking-wide mb-1.5">📌 הערות</div>
            <div
              className="text-base text-gray-800 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: scheduleNotes }}
            />
          </div>
        </div>
      )}

      {/* Mobile: classic table */}
      <div className="lg:hidden p-2">
        <MobileTable schedule={schedule} employees={employees} shiftTimes={shiftTimes} />
      </div>

      {/* Desktop: card grid */}
      <div className="hidden lg:block flex-1 p-3">
        <div className="grid grid-cols-7 gap-2 mx-auto max-w-[1100px]">
          {DAY_KEYS.map((dayKey, i) => (
            <ViewDayColumn
              key={dayKey}
              dayKey={dayKey}
              dayName={DAYS[i]}
              dayData={schedule?.[dayKey]}
              employees={employees}
            />
          ))}
        </div>
      </div>

    </div>
  );
}
