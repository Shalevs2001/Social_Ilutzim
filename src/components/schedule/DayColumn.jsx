import { useApp } from '../../context/AppContext';
import { ShiftSlot } from './ShiftSlot';

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

export function DayColumn({ dayKey, dayName, isWeekend, onAddAdHoc, compact = false }) {
  const { schedule, toggleReshemBet, toggleWeekendMiddle } = useApp();
  const day = schedule[dayKey];

  const reshemSlot        = day.adHocShifts.find((s) => s.type === 'reshem_bet')      ?? null;
  const weekendMiddleSlot = day.adHocShifts.find((s) => s.type === 'weekend_middle')  ?? null;
  const trueAdHoc         = day.adHocShifts.filter((s) => s.type !== 'reshem_bet' && s.type !== 'weekend_middle');

  const groups = { morning: [], middle: [], evening: [], end: [] };
  trueAdHoc.forEach((s) => {
    const pos = ADHOC_POS[s.boundType] ?? 'end';
    groups[pos].push(s);
  });

  const pad = compact ? 'p-1.5' : 'p-2.5';
  const gap = compact ? 'gap-1' : 'gap-1.5';
  const txt = compact ? 'text-[10px]' : 'text-xs';

  const renderAdHocs = (bucket) =>
    groups[bucket].map((slot) => (
      <ShiftSlot key={slot.id} slot={slot} dayKey={dayKey} isAdHoc compact={compact} />
    ));

  // Render main slots, injecting weekend_middle between morning and evening
  const renderSlots = () => {
    const result = [];
    day.slots.forEach((slot) => {
      result.push(
        <div key={slot.id} className={`flex-1 flex flex-col ${gap}`}>
          <ShiftSlot slot={slot} dayKey={dayKey} compact={compact} fill />
          {renderAdHocs(SLOT_POS[slot.type] ?? 'end')}
        </div>
      );
      // After weekend_morning, inject the middle slot
      if (slot.type === 'weekend_morning' && weekendMiddleSlot) {
        result.push(
          <div key={weekendMiddleSlot.id} className={`flex-1 flex flex-col ${gap}`}>
            <ShiftSlot slot={weekendMiddleSlot} dayKey={dayKey} isAdHoc compact={compact} fill />
            {renderAdHocs('middle')}
          </div>
        );
      }
    });
    return result;
  };

  return (
    <div className={`flex flex-col ${gap} rounded-xl border ${pad} bg-white border-gray-200`}>

      {/* ── Day header ── */}
      <div className="flex items-center justify-between">
        <span className={`${txt} font-bold text-[#1a2e4a]`}>{dayName}</span>
      </div>

      {/* ── Toggles (non-compact only) ── */}
      {!compact && (
        <div className="flex gap-1">
          <button
            onClick={() => toggleReshemBet(dayKey)}
            className={`flex-1 text-center text-[10px] px-2 py-0.5 rounded-full border transition-colors font-medium ${
              day.reshemBetBackup
                ? 'bg-sky-100 border-sky-400 text-sky-700'
                : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-sky-300 hover:text-sky-600'
            }`}
          >
            {day.reshemBetBackup ? '✓ רשת ב׳' : '+ רשת ב׳'}
          </button>

          {isWeekend && (
            <button
              onClick={() => toggleWeekendMiddle(dayKey)}
              className={`flex-1 text-center text-[10px] px-2 py-0.5 rounded-full border transition-colors font-medium ${
                day.weekendMiddle
                  ? 'bg-amber-100 border-amber-400 text-amber-700'
                  : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-amber-300 hover:text-amber-600'
              }`}
            >
              {day.weekendMiddle ? '✓ אמצע' : '+ אמצע'}
            </button>
          )}
        </div>
      )}

      {/* ── Reshet Bet slot ── */}
      {reshemSlot && <ShiftSlot slot={reshemSlot} dayKey={dayKey} isAdHoc compact={compact} />}

      {/* ── Main slots (with weekend_middle injected between morning and evening) ── */}
      <div className={`flex-1 flex flex-col ${gap}`}>
        {renderSlots()}
        {renderAdHocs('end')}
      </div>

      {/* ── Add ad-hoc button ── */}
      {!compact && (
        <button
          onClick={onAddAdHoc}
          className="text-[10px] text-gray-400 hover:text-[#1a2e4a] border border-dashed border-gray-200 hover:border-[#38bcd4] hover:bg-[#e8f4f8] rounded-xl py-1.5 transition-colors"
        >
          + בלת״ם
        </button>
      )}
    </div>
  );
}
