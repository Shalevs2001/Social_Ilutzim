import { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  DAYS, DAY_KEYS, WEEKEND_DAYS, WEEKDAY_DAYS, AVAIL, SLOT_ALTERNATIVES,
} from '../../constants';
import { AvailabilityCell } from './AvailabilityCell';
import { ValidationSummary } from './ValidationSummary';

const WEEKDAY_SHIFTS = ['morning', 'short_morning', 'middle', 'evening', 'samples'];

const HEBREW_ORDINALS = ['', 'ראשונה', 'שנייה', 'שלישית', 'רביעית', 'חמישית',
  'שישית', 'שביעית', 'שמינית', 'תשיעית', 'עשירית'];
function toHebrewOrdinal(n) {
  return n <= 10 ? HEBREW_ORDINALS[n] : `ה-${n}`;
}

function AvailLegend() {
  return (
    <div className="flex items-center gap-3 text-[10px] text-gray-500">
      <span>מקרא:</span>
      <span className="flex items-center gap-1">
        <span className="w-8 h-5 rounded-md bg-white border border-dashed border-gray-200 inline-block" />
        לא זמין
      </span>
      <span className="flex items-center gap-1">
        <span className="w-8 h-5 rounded-md bg-green-100 border border-green-300 inline-block" />
        זמין
      </span>
      <span className="flex items-center gap-1">
        <span className="w-8 h-5 rounded-md bg-sky-100 border border-dashed border-sky-200 inline-block" />
        עדיפות נמוכה
      </span>
    </div>
  );
}

function GridSection({ empId, sectionLabel, shiftTypes, days, compact = false }) {
  const { weekendMiddleActive } = useApp();
  const dayIndices = days.map((d) => DAY_KEYS.indexOf(d));

  return (
    <div>
      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
        {sectionLabel}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs table-fixed" style={{ minWidth: `${days.length * (compact ? 44 : 52)}px` }}>
          <thead>
            <tr>
              {days.map((dayKey, i) => (
                <th
                  key={dayKey}
                  className={`pb-1 text-center font-semibold text-[11px] ${
                    WEEKEND_DAYS.includes(dayKey) ? 'text-cyan-600' : 'text-[#1a2e4a]'
                  }`}
                >
                  {DAYS[dayIndices[i]]}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {shiftTypes.map((shiftType) => {
              return (
                <tr key={shiftType}>
                  {days.map((dayKey) => {
                    const disabled = shiftType === 'weekend_middle' && !weekendMiddleActive?.[dayKey];
                    return (
                      <td key={dayKey} className="px-0.5 py-0.5">
                        {disabled ? (
                          <div className={`w-full ${compact ? 'h-9' : 'h-11'} rounded-lg bg-gray-100 border border-dashed border-gray-200 opacity-40`} />
                        ) : (
                          <AvailabilityCell empId={empId} dayKey={dayKey} shiftType={shiftType} compact={compact} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmployeeNotes({ empId }) {
  const { employeeNotes, addEmployeeNote, toggleEmployeeNote, deleteEmployeeNote } = useApp();
  const notes = Object.values(employeeNotes[empId] ?? {});
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  const handleAdd = () => {
    if (!draft.trim()) return;
    addEmployeeNote(empId, draft.trim());
    setDraft('');
    inputRef.current?.focus();
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
      <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
        הערות
      </div>

      {notes.length > 0 && (
        <ul className="flex flex-col gap-1 mb-2">
          {notes.map((note) => (
            <li key={note.id} className="flex items-center gap-2 group">
              <input
                type="checkbox"
                checked={note.checked}
                onChange={() => toggleEmployeeNote(empId, note.id)}
                className="accent-[#1a2e4a] w-3.5 h-3.5 shrink-0 cursor-pointer"
              />
              <span className={`flex-1 text-xs ${note.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {note.text}
              </span>
              <button
                onClick={() => deleteEmployeeNote(empId, note.id)}
                className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-[10px] text-gray-400 hover:text-red-500 transition-opacity shrink-0"
                title="מחק הערה"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-1.5">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="הוסף הערה..."
          className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5
            focus:outline-none focus:border-[#38bcd4] bg-white"
        />
        <button
          onClick={handleAdd}
          disabled={!draft.trim()}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-[#1a2e4a] text-white
            hover:bg-[#2563a8] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

function ClearEmployeeButton({ empId }) {
  const { clearEmployeeAvailability, toast } = useApp();

  const handleClear = () => {
    clearEmployeeAvailability(empId);
    toast('האילוצים נוקו', 'info');
  };

  return (
    <button
      onClick={handleClear}
      className="text-[10px] text-[#1a2e4a] hover:text-red-500 border border-dashed border-[#1a2e4a] hover:border-red-300 rounded-lg px-2 py-1 transition-colors"
    >
      ניקוי אילוצים
    </button>
  );
}

/**
 * Main availability view.
 * singleEmpId — when set, shows only that employee (no sidebar, auto-save indicator).
 */
function RestoreButton({ empId }) {
  const { availSnapshots, notesSnapshots, restoreAvailability, toast } = useApp();

  const hasSnapshot = !!availSnapshots[empId] || notesSnapshots[empId] !== undefined;

  const handle = () => {
    if (!hasSnapshot) {
      toast('אין גרסה שמורה עדיין — תתקבל בהגשה הבאה', 'info');
      return;
    }
    restoreAvailability(empId);
    toast('האילוצים שוחזרו להגשה האחרונה', 'success');
  };

  return (
    <button
      onClick={handle}
      title={hasSnapshot ? 'שחזר לאילוצים שהעובד הגיש' : 'אין גרסה שמורה עדיין'}
      className={`text-[10px] rounded-lg px-2 py-1 transition-colors shrink-0 border ${
        hasSnapshot
          ? 'border-amber-300 text-amber-600 hover:bg-amber-50'
          : 'border-gray-200 text-gray-300 cursor-default'
      }`}
    >
      שחזור הגשה
    </button>
  );
}

// Direct availability lookup for display — uses SLOT_ALTERNATIVES (one-directional) but
// NOT SLOT_TYPE_SWITCH, so morning-only markers don't bleed into the "בוקר" column.
function shiftDisplayAvail(empId, dayKey, slotType, availability) {
  const direct = availability?.[empId]?.[dayKey]?.[slotType] ?? null;
  const altType = SLOT_ALTERNATIVES[slotType];
  const alt = altType ? (availability?.[empId]?.[dayKey]?.[altType] ?? null) : null;
  if (direct === 'regular' || alt === 'regular') return 'regular';
  if (direct === 'low'     || alt === 'low')     return 'low';
  return null;
}

const DAY_SHORT = { sun: 'א', mon: 'ב', tue: 'ג', wed: 'ד', thu: 'ה', fri: 'ו', sat: 'ש' };

const SHIFT_LABEL_SHORT = {
  morning: 'בוקר', short_morning: 'קצר', middle: 'אמצע', evening: 'ערב', samples: 'דגימות',
  weekend_morning: 'בוקר', weekend_middle: 'אמצע', weekend_evening: 'ערב',
};

export function AvailabilityGrid({ compact = false, singleEmpId = null }) {
  const { employees: allEmployees, availability, clearAvailability, resetWeek, submissions, weekendMiddleActive } = useApp();

  const showWeekendMiddle = !!(weekendMiddleActive?.fri || weekendMiddleActive?.sat);
  const WEEKEND_SHIFTS = showWeekendMiddle
    ? ['weekend_morning', 'weekend_middle', 'weekend_evening']
    : ['weekend_morning', 'weekend_evening'];
  const employees = allEmployees.filter((e) => !e.joker);
  const [selectedEmpId, setSelectedEmpId] = useState(singleEmpId ?? employees[0]?.id ?? null);

  const isSingle = !!singleEmpId;

  const [byShift, setByShift] = useState(false);
  const [selDay, setSelDay] = useState('sun');
  const [selShifts, setSelShifts] = useState(['morning']);

  const isWeekendSelDay = WEEKEND_DAYS.includes(selDay);
  const validShifts = isWeekendSelDay
    ? ['weekend_morning', ...(weekendMiddleActive?.[selDay] ? ['weekend_middle'] : []), 'weekend_evening']
    : ['morning', 'short_morning', 'middle', 'evening', 'samples'];
  const effectiveShifts = selShifts.filter((st) => validShifts.includes(st));

  const toggleShift = (st) =>
    setSelShifts((prev) => prev.includes(st) ? prev.filter((s) => s !== st) : [...prev, st]);

  const bestAvailForShifts = (empId, dayKey) =>
    effectiveShifts.reduce((best, st) => {
      if (best === 'regular') return 'regular';
      const av = shiftDisplayAvail(empId, dayKey, st, availability);
      if (av === 'regular') return 'regular';
      if (av === 'low') return 'low';
      return best;
    }, null);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className={`flex items-center gap-2 bg-white border-b border-gray-200 sticky top-0 z-10 ${compact ? 'px-2 py-1.5 justify-end' : 'px-4 py-2.5'}`}>
        {/* Right spacer (full boss mode only) */}
        {!compact && !isSingle && <div className="flex-1" />}

        {/* Center: legend */}
        {!compact && !isSingle && <AvailLegend />}

        {/* Left: action buttons */}
        {!isSingle && (
          <div className={`${!compact ? 'flex-1' : ''} flex justify-end items-center gap-1.5`}>
            {selectedEmpId && <RestoreButton empId={selectedEmpId} />}
            <button
              onClick={clearAvailability}
              className="text-[10px] px-2 py-1 rounded-lg border border-orange-200 text-orange-500 hover:bg-orange-50 transition-colors shrink-0"
            >
              ניקוי אילוצים
            </button>
            <button
              onClick={resetWeek}
              className="text-[10px] px-2 py-1 rounded-lg border border-pink-200 text-pink-500 hover:bg-pink-50 transition-colors shrink-0"
            >
              🔄 שבוע חדש
            </button>
          </div>
        )}
        {isSingle && selectedEmpId && (
          <div className="flex-1 flex justify-end">
            <ClearEmployeeButton empId={selectedEmpId} />
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Employee tab sidebar — hidden in single mode */}
        {!isSingle && (
          <aside className={`shrink-0 border-l border-gray-200 bg-gray-50 flex flex-col gap-1.5 overflow-y-auto ${
            compact
              ? (byShift ? 'w-36 p-1.5' : 'w-24 p-1')
              : (byShift ? 'w-48 p-3'   : 'w-36 p-2')
          }`}>

            {/* Mode toggle */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-0.5 shrink-0">
              <button
                onClick={() => setByShift(false)}
                className={`flex-1 text-xs py-1 font-medium transition-colors ${
                  !byShift ? 'bg-[#1a2e4a] text-white' : 'bg-white text-gray-500 hover:bg-gray-100'
                }`}
              >
                עובד
              </button>
              <button
                onClick={() => setByShift(true)}
                className={`flex-1 text-xs py-1 font-medium transition-colors ${
                  byShift ? 'bg-[#1a2e4a] text-white' : 'bg-white text-gray-500 hover:bg-gray-100'
                }`}
              >
                משמרת
              </button>
            </div>

            {!byShift ? (
              /* ── Employee list (original) ── */
              <>
                <p className="text-[10px] text-gray-400 px-1 mb-0.5">בחר עובד</p>
                {employees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedEmpId(emp.id)}
                    className={`flex items-center justify-between gap-1 rounded-xl font-medium text-right transition-colors ${
                      compact ? 'px-1.5 py-1 text-[10px]' : 'px-2.5 py-2 text-sm'
                    } ${
                      selectedEmpId === emp.id
                        ? 'bg-[#1a2e4a] text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-700 hover:border-[#38bcd4]'
                    }`}
                  >
                    <span className="truncate flex-1">{emp.name}</span>
                    {submissions[emp.id]?.submitted && (
                      <span className="flex items-center gap-0.5 shrink-0">
                        {(submissions[emp.id]?.editing || submissions[emp.id]?.hasEdited) && (
                          <span
                            title={submissions[emp.id]?.editing ? 'בעריכה כעת' : 'ערך לאחר הגשה'}
                            className={`text-[8px] font-bold px-1 py-0.5 rounded leading-none border ${
                              submissions[emp.id]?.editing
                                ? 'bg-amber-100 text-amber-600 border-amber-300'
                                : 'bg-orange-50 text-orange-400 border-orange-200'
                            }`}
                          >
                            ✎
                          </span>
                        )}
                        <span
                          title="הוגש"
                          className="text-[8px] font-bold px-1 py-0.5 rounded leading-none bg-green-100 text-green-700 border border-green-300"
                        >
                          ✓
                        </span>
                      </span>
                    )}
                  </button>
                ))}
              </>
            ) : (
              /* ── By-shift panel ── */
              <div className="flex flex-col gap-2">
                {/* Day buttons */}
                <div className="flex flex-wrap gap-1">
                  {DAY_KEYS.map((dk) => (
                    <button
                      key={dk}
                      onClick={() => setSelDay(dk)}
                      className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
                        selDay === dk
                          ? 'bg-[#1a2e4a] text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:border-[#38bcd4]'
                      }`}
                    >
                      {DAY_SHORT[dk]}
                    </button>
                  ))}
                </div>

                {/* Shift buttons — multi-select */}
                <div className="flex flex-col gap-1">
                  {validShifts.map((st) => (
                    <button
                      key={st}
                      onClick={() => toggleShift(st)}
                      className={`text-sm px-2.5 py-1.5 rounded-lg font-medium text-right transition-colors ${
                        effectiveShifts.includes(st)
                          ? 'bg-[#38bcd4] text-white'
                          : 'bg-white border border-gray-200 text-gray-500 hover:border-[#38bcd4]'
                      }`}
                    >
                      {SHIFT_LABEL_SHORT[st]}
                    </button>
                  ))}
                </div>

                {/* Employee chips */}
                <div className="flex flex-col gap-1 pt-1.5 border-t border-gray-200">
                  {employees.map((emp) => {
                    const avLevel = effectiveShifts.length === 0 ? null : bestAvailForShifts(emp.id, selDay);
                    return (
                      <div
                        key={emp.id}
                        className={`text-sm font-medium px-2.5 py-1.5 rounded-lg truncate ${
                          avLevel === 'regular'
                            ? 'bg-green-100 text-green-800 border border-green-300'
                            : avLevel === 'low'
                            ? 'bg-sky-100 text-sky-700 border border-sky-300'
                            : 'bg-gray-100 text-gray-400 border border-gray-200'
                        }`}
                      >
                        {emp.name}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>
        )}

        {/* Main grid area */}
        <main className={`relative flex-1 ${compact ? 'overflow-auto p-2' : 'overflow-auto p-4'}`}>
          {byShift && !isSingle && (
            <div className="absolute inset-0 z-10 bg-gray-100/60 backdrop-blur-[1px] pointer-events-auto" />
          )}
          {selectedEmpId ? (
            <div className={`flex flex-col ${compact ? 'gap-2' : 'gap-5 max-w-3xl mx-auto'}`}>
              {isSingle && !compact && (() => {
                const emp = allEmployees.find((e) => e.id === selectedEmpId);
                const quota = emp?.quota ?? 1;
                return (
                  <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-500">
                    <AvailLegend />
                    <span>(משמרת בעדיפות נמוכה — מסמנים בשתי לחיצות, אפשר לבחור החל מהמשמרת ה{toHebrewOrdinal(quota)})</span>
                  </div>
                );
              })()}
              <GridSection
                empId={selectedEmpId}
                sectionLabel="ימי חול — ראשון עד חמישי"
                shiftTypes={WEEKDAY_SHIFTS}
                days={WEEKDAY_DAYS}
                compact={compact}
              />
              <GridSection
                empId={selectedEmpId}
                sectionLabel="סוף שבוע — שישי ושבת"
                shiftTypes={WEEKEND_SHIFTS}
                days={WEEKEND_DAYS}
                compact={compact}
              />
              <ValidationSummary empId={selectedEmpId} />
              <EmployeeNotes empId={selectedEmpId} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              בחר עובד מהרשימה
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
