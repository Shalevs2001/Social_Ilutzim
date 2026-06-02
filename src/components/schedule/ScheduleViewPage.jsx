import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../../firebase';
import { SHIFT_TYPES, DAYS, DAY_KEYS } from '../../constants';

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
        <div className="font-mono text-[10px] opacity-75 leading-tight mt-0.5" style={{ direction: 'ltr' }}>
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
        <div className="mt-1.5 rounded-lg bg-black/10 px-2 py-1
          text-[10px] font-semibold leading-snug break-words">
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

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center">
          <div className="text-4xl mb-3">📋</div>
          <div className="text-gray-600 font-medium">הסידור טרם פורסם</div>
          <div className="text-gray-400 text-sm mt-1">המנהל לא שיתף סידור עדיין</div>
        </div>
      </div>
    );
  }

  const { schedule, scheduleDate, scheduleNotes, employees = [], shiftTimes = {}, savedAt } = data;

  const savedDate = savedAt
    ? new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(savedAt))
    : null;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col" dir="rtl">

      {/* Header */}
      <div className="bg-[#1a2e4a] text-white px-4 py-3 shrink-0">
        <div className="max-w-[1100px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base">📋 סידור</span>
            {scheduleDate && (
              <span className="text-white/70 text-sm border-r border-white/20 pr-2 mr-1">
                {scheduleDate}
              </span>
            )}
          </div>
          {savedDate && (
            <span className="text-white/40 text-[11px]">עודכן {savedDate}</span>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-3">
        <div
          className="grid grid-cols-7 gap-2 mx-auto"
          style={{ minWidth: '900px', maxWidth: '1100px' }}
        >
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

      {/* Notes footer */}
      {scheduleNotes && (
        <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-3" dir="rtl">
          <div className="max-w-[1100px] mx-auto">
            <div className="text-[10px] font-semibold text-gray-400 mb-1">הערות</div>
            <div
              className="text-sm text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: scheduleNotes }}
            />
          </div>
        </div>
      )}

    </div>
  );
}
