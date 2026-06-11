import { useState, useRef, useEffect, useCallback } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { SHIFT_TYPES, STATUS_STYLES, SLOT_ALTERNATIVES, AVAIL } from '../../constants';
import { useApp } from '../../context/AppContext';
import { bestAvailability } from '../../utils/autoSchedule';

const TYPE_TOGGLE = {
  morning:       { toType: 'short_morning', label: 'בוקר קצר' },
  short_morning: { toType: 'morning',       label: 'בוקר מלא' },
  evening:       { toType: 'samples',       label: 'דגימות'   },
  samples:       { toType: 'evening',       label: 'ערב'      },
};

/**
 * Draggable chip for an assigned employee.
 */
function AssignedChip({ empId, empName, slotId, dayKey, isAdHoc, isSecondary = false, onClear, status, onDoubleClickName }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `slot-emp${isSecondary ? '2' : ''}-${slotId}`,
    data: {
      type:            'slot-employee',
      empId,
      fromSlotId:      slotId,
      fromDayKey:      dayKey,
      fromIsAdHoc:     isAdHoc,
      fromIsSecondary: isSecondary,
    },
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  const isForced = status === 'forced';

  return (
    <div className="mt-1 flex items-center justify-between gap-1 rounded-md px-1 py-0.5
      border border-orange-300 bg-orange-50">
      <span
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        onDoubleClick={onDoubleClickName}
        className={`flex-1 text-center text-[18px] font-bold leading-tight
          truncate cursor-grab active:cursor-grabbing select-none touch-none text-orange-800
          ${isDragging ? 'opacity-30' : ''}`}
        title="גרור להעברה / לחץ פעמיים להדגשת זמינות"
      >
        {empName}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onClear(); }}
        className="opacity-40 hover:opacity-100 text-[9px] leading-none shrink-0"
        title="הסר עובד"
      >
        ✕
      </button>
    </div>
  );
}

/**
 * Inline free-text employee name for reshem_bet slots — styled like AssignedChip.
 */
function ManualEmployeeInput({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value ?? '');
  const inputRef = useRef(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const save = () => { onSave(draft.trim()); setEditing(false); };
  const clear = (e) => { e.stopPropagation(); onSave(null); setDraft(''); };
  const start = (e) => { e.stopPropagation(); setDraft(value ?? ''); setEditing(true); };

  // Editing: chip-shaped input
  if (editing) {
    return (
      <div className="mt-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') { setDraft(value ?? ''); setEditing(false); }
          }}
          placeholder="שם עובד..."
          className="flex-1 bg-white/70 rounded-md px-1.5 py-0.5 text-xs font-semibold
            leading-tight focus:outline-none min-w-0 border border-current/20"
        />
      </div>
    );
  }

  // Filled: identical styling to AssignedChip
  if (value) {
    return (
      <div className="mt-1 flex items-center justify-between gap-1 rounded-md px-1 py-0.5
        border border-orange-300 bg-orange-50">
        <span
          onClick={start}
          className="flex-1 text-center text-[18px] font-bold leading-tight
            truncate cursor-text select-none text-orange-800"
          title="לחץ לעריכה"
        >
          {value}
        </span>
        <button
          onClick={clear}
          className="opacity-40 hover:opacity-100 text-[9px] leading-none shrink-0"
          title="הסר שם"
        >
          ✕
        </button>
      </div>
    );
  }

  // Empty: dashed drop-zone style, clickable
  return (
    <div
      onClick={start}
      className="mt-1 h-6 rounded-md border border-current/20 border-dashed
        flex items-center justify-center opacity-40 hover:opacity-70 text-[9px]
        select-none cursor-text transition-opacity"
      title="כתוב שם עובד ידנית"
    >
      ✎
    </div>
  );
}

/**
 * Inline note editor / display for a slot.
 */
function SlotNote({ note, onSave, compact }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(note ?? '');
  const taRef = useRef(null);

  useEffect(() => { if (editing) taRef.current?.focus(); }, [editing]);

  const save = () => { onSave(draft.trim()); setEditing(false); };

  // Compact (split view): show note with subtle highlight
  if (compact) {
    if (!note) return null;
    return (
      <div className="mt-1 text-xs font-semibold leading-snug rounded-md bg-black/10 px-1.5 py-0.5">
        {note}
      </div>
    );
  }

  if (editing) {
    return (
      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
        <textarea
          ref={taRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => { if (e.key === 'Escape') { setDraft(note ?? ''); setEditing(false); } }}
          rows={2}
          placeholder="הוסף הערה..."
          className="w-full text-xs resize-none rounded-lg border-2 border-current/30 bg-white/70
            px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#38bcd4]/50 leading-snug font-medium"
        />
      </div>
    );
  }

  if (note) {
    return (
      <div
        className="mt-2 rounded-lg bg-black/10 px-2 py-1.5
          text-[16px] font-semibold leading-snug cursor-pointer hover:bg-black/15 transition-colors
          whitespace-normal break-words w-full"
        onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        title="לחץ לעריכת הערה"
      >
        <span className="opacity-40 text-[10px] ml-1">✎</span>{note}
      </div>
    );
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      className="mt-1.5 text-xs opacity-35 hover:opacity-70 leading-tight block transition-opacity"
      title="הוסף הערה"
    >
      ✎ הערה
    </button>
  );
}

/**
 * Editable shift time — click to edit (full view only), Enter/blur to save.
 * Clearing the field reverts to the default time from settings/shiftDef.
 */
function SlotTime({ displayTime, customTime, onSave, compact }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState('');
  const inputRef = useRef(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const startEdit = (e) => {
    e.stopPropagation();
    setDraft(customTime ?? displayTime ?? '');
    setEditing(true);
  };

  const save = () => {
    const trimmed = draft.trim();
    // Empty → revert to default (null); otherwise save custom value
    onSave(trimmed || null);
    setEditing(false);
  };

  if (compact) {
    if (!displayTime) return null;
    return (
      <div className="opacity-80 text-xs mt-0.5 font-mono font-medium leading-tight">
        {displayTime}
      </div>
    );
  }

  if (editing) {
    return (
      <div className="mt-0.5" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter')  save();
            if (e.key === 'Escape') { setEditing(false); }
          }}
          placeholder="00:00–00:00"
          className="w-full text-xs font-mono bg-white/70 border border-current/25 rounded px-1 py-0.5
            focus:outline-none focus:ring-1 focus:ring-[#38bcd4]/60 leading-tight"
          style={{ direction: 'ltr' }}
        />
      </div>
    );
  }

  if (!displayTime) {
    return (
      <button
        onClick={startEdit}
        className="mt-0.5 text-[9px] opacity-30 hover:opacity-70 leading-tight block transition-opacity"
        title="הוסף שעה"
      >
        + שעה
      </button>
    );
  }

  return (
    <button
      onClick={startEdit}
      className={`mt-0.5 font-mono font-semibold leading-tight block text-right transition-opacity hover:opacity-70 ${
        customTime ? 'text-sm opacity-100' : 'text-sm opacity-75'
      }`}
      title="לחץ לעריכת שעה (משפיע רק על משמרת זו)"
      style={{ direction: 'ltr' }}
    >
      {displayTime}
    </button>
  );
}

/**
 * A single shift slot — drop target, shows up to two assigned employees.
 */
export function ShiftSlot({ slot, dayKey, isAdHoc = false, compact = false, fill = false }) {
  const { employees, availability, updateSlot, updateAdHocSlot, removeAdHocSlot, shiftTimes, showLowPriority, showMissingSlots, showCenterAlert, highlightEmpId, setHighlightEmpId } = useApp();

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id:   slot.id,
    data: { dayKey, slotId: slot.id, isAdHoc },
  });

  const shiftDef  = SHIFT_TYPES[slot.type] ?? SHIFT_TYPES.custom;
  const employee  = employees.find((e) => e.id === slot.employee)  ?? null;
  const employee2 = employees.find((e) => e.id === slot.employee2) ?? null;
  const label     = slot.label ?? shiftDef.label;
  const time      = slot.time  || shiftTimes?.[slot.type] || shiftDef.time;
  const isReshem        = slot.type === 'reshem_bet';
  const canMarkReshem   = !compact && (
    (!isAdHoc && ['morning', 'short_morning', 'middle', 'evening', 'samples', 'weekend_morning', 'weekend_evening'].includes(slot.type)) ||
    slot.type === 'weekend_middle'
  );
  const hasReshemMark   = slot.reshemBetMark   ?? false;
  const canMarkKonenut  = !compact && !isReshem;
  const hasKonenutMark  = slot.konenutMark      ?? false;

  const hasTwoEmps = !!(employee && employee2);
  const isMissing  = showMissingSlots && !employee;

  // Per-status background overlay class
  const overlayBg = (st) => {
    if (st === 'forced') return 'bg-red-200';
    if (st === 'low' && showLowPriority && !highlightEmpId) return 'bg-gray-200';
    return null;
  };
  const overlay1 = overlayBg(slot.status);
  const overlay2 = overlayBg(slot.status2);

  // Base block class — missing slots override to dark gray + white text
  const blockClass = isMissing
    ? 'bg-gray-600 text-white'
    : `${shiftDef.color} ${shiftDef.textColor}`;

  const borderStyle = 'border-solid';

  const overClass = isOver ? 'ring-2 ring-[#38bcd4] ring-offset-1 scale-[1.02]' : '';

  // Highlight: ring showing availability for the currently-highlighted employee
  let highlightClass = '';
  if (highlightEmpId) {
    const highlightEmp = employees.find((e) => e.id === highlightEmpId);
    if (highlightEmp && !highlightEmp.joker) {
      const best = bestAvailability(highlightEmpId, dayKey, slot.type, availability, slot.boundType ?? null);
      if (best?.av === AVAIL.regular) {
        highlightClass = 'ring-[6px] ring-green-400';
      } else if (best?.av === AVAIL.low) {
        highlightClass = 'ring-[6px] ring-blue-400 ring-offset-1';
      }
    }
  }

  const patch = (p) =>
    isAdHoc ? updateAdHocSlot(dayKey, slot.id, p) : updateSlot(dayKey, slot.id, p);

  const clearEmployee    = () => {
    if (slot.employee2) {
      // Promote employee2 → employee1 so the second isn't orphaned
      patch({ employee: slot.employee2, status: slot.status2, employee2: null, status2: null });
    } else {
      patch({ employee: null, status: null });
    }
  };
  const clearEmployee2   = () => patch({ employee2: null, status2: null });
  const removeSlot       = (e) => { e.stopPropagation(); removeAdHocSlot(dayKey, slot.id); };
  const saveNote         = (text) => patch({ note: text || null });
  const toggleReshemMark  = (e) => { e.stopPropagation(); patch({ reshemBetMark: !hasReshemMark }); };
  const toggleKonenutMark = (e) => { e.stopPropagation(); patch({ konenutMark:   !hasKonenutMark }); };

  const toggleType = (e) => {
    e.stopPropagation();
    const alt = TYPE_TOGGLE[slot.type];
    if (!alt) return;
    const newType = alt.toType;

    const getStatus = (empId) => {
      if (!empId) return null;
      const direct = availability[empId]?.[dayKey]?.[newType] ?? null;
      if (direct === AVAIL.regular) return null;
      if (direct === AVAIL.low)     return 'low';
      const fallback = SLOT_ALTERNATIVES[newType];
      if (fallback) {
        const fb = availability[empId]?.[dayKey]?.[fallback] ?? null;
        if (fb === AVAIL.regular) return null;
        if (fb === AVAIL.low)     return 'low';
      }
      return 'forced';
    };

    const newStatus  = getStatus(slot.employee);
    const newStatus2 = getStatus(slot.employee2);

    updateSlot(dayKey, slot.id, {
      type:    newType,
      status:  newStatus,
      status2: newStatus2,
      time:    null,   // drop any custom time — it belonged to the previous type
    });

    // Alert if any assigned employee becomes forced after the type switch
    const forcedEmp = newStatus === 'forced' ? employee : newStatus2 === 'forced' ? employee2 : null;
    if (forcedEmp) {
      const isFemale = forcedEmp.gender === 'female';
      showCenterAlert(
        `שיבוץ חסום — ${forcedEmp.name} לא ${isFemale ? 'סימנה' : 'סימן'} זמינות למשמרת זו`,
        'forced'
      );
    }
  };

  const altToggle = !isAdHoc ? TYPE_TOGGLE[slot.type] : null;

  return (
    <div
      ref={setDropRef}
      className={`relative rounded-xl border transition-all duration-100
        ${compact ? 'p-1 text-[10px]' : 'p-2 text-xs'}
        ${fill ? 'flex-1' : ''}
        ${blockClass} ${borderStyle} ${overClass} ${highlightClass}`}
    >
      {/* Status overlays — rendered at z-0, behind all content (z-[1]) */}
      {!hasTwoEmps && overlay1 && (
        <div className={`absolute inset-0 rounded-xl z-0 ${overlay1} pointer-events-none`} />
      )}
      {hasTwoEmps && overlay1 && (
        <div className={`absolute inset-x-0 top-0 h-1/2 rounded-t-xl z-0 ${overlay1} pointer-events-none`} />
      )}
      {hasTwoEmps && overlay2 && (
        <div className={`absolute inset-x-0 bottom-0 h-1/2 rounded-b-xl z-0 ${overlay2} pointer-events-none`} />
      )}

      {/* All content at z-[1] — always above the overlays */}
      <div className="relative z-[1]">
        {/* Label row */}
        <div className="flex items-start justify-between gap-1 min-h-[18px]">
          <div className="flex-1 min-w-0">
            <div className="font-bold leading-tight truncate">{label}</div>
            <SlotTime
              displayTime={time}
              customTime={slot.time || null}
              onSave={(val) => patch({ time: val })}
              compact={compact}
            />
            {altToggle && !compact && (
              <button
                onClick={toggleType}
                className="mt-0.5 text-[8px] opacity-50 hover:opacity-100 underline leading-tight block"
                title={`החלף ל${altToggle.label}`}
              >
                ↔ {altToggle.label}
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {canMarkKonenut && (
              <button
                onClick={toggleKonenutMark}
                title="כוננות"
                className={`text-[8px] w-4 h-4 rounded-full border font-bold leading-none transition-colors flex items-center justify-center ${
                  hasKonenutMark
                    ? 'bg-pink-400 border-pink-500 text-white'
                    : 'bg-transparent border-pink-400 text-pink-500 opacity-70 hover:opacity-100'
                }`}
              >
                כ
              </button>
            )}
            {canMarkReshem && (
              <button
                onClick={toggleReshemMark}
                title="גיבוי רשת ב׳"
                className={`text-[8px] w-4 h-4 rounded-full border font-bold leading-none transition-colors flex items-center justify-center ${
                  hasReshemMark
                    ? 'bg-sky-400 border-sky-500 text-white'
                    : 'bg-transparent border-sky-300 text-sky-500 opacity-40 hover:opacity-100'
                }`}
              >
                ב
              </button>
            )}
            {isAdHoc && !employee && !isReshem && slot.type !== 'weekend_middle' && (
              <button
                onClick={removeSlot}
                className="opacity-40 hover:opacity-100 text-[10px] leading-none"
                title="הסר משמרת"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Reshem bet badge */}
        {hasReshemMark && (
          <div className="mt-1.5 text-[8px] bg-sky-100 text-sky-700 border border-sky-300
            rounded-lg px-1.5 py-0.5 font-medium text-center leading-tight">
            גיבוי רשת ב׳
          </div>
        )}

        {/* Konenut badge */}
        {hasKonenutMark && (
          <div className="mt-1 text-[8px] bg-pink-100 text-pink-700 border border-pink-300
            rounded-lg px-1.5 py-0.5 font-medium text-center leading-tight">
            כוננות
          </div>
        )}

        {/* ── Primary employee or empty drop zone ── */}
        {employee ? (
          <AssignedChip
            empId={slot.employee}
            empName={employee.name}
            slotId={slot.id}
            dayKey={dayKey}
            isAdHoc={isAdHoc}
            status={slot.status}
            onClear={clearEmployee}
            onDoubleClickName={(e) => {
              e.stopPropagation();
              setHighlightEmpId((prev) => prev === slot.employee ? null : slot.employee);
            }}
          />
        ) : (
          <div className={`rounded-md border border-current/20 border-dashed
            flex items-center justify-center opacity-40 select-none
            ${compact ? 'mt-1 h-4 text-[8px]' : 'mt-1.5 h-6 text-[9px]'}`}>
            {isOver ? '↓' : '·'}
          </div>
        )}

        {/* ── Second employee ── */}
        {employee && (
          employee2 ? (
            <AssignedChip
              empId={slot.employee2}
              empName={employee2.name}
              slotId={slot.id}
              dayKey={dayKey}
              isAdHoc={isAdHoc}
              isSecondary
              status={slot.status2}
              onClear={clearEmployee2}
              onDoubleClickName={(e) => {
                e.stopPropagation();
                setHighlightEmpId((prev) => prev === slot.employee2 ? null : slot.employee2);
              }}
            />
          ) : (
            !compact && (
              <div className={`mt-1 rounded-md border border-current/20 border-dashed
                flex items-center justify-center opacity-40 select-none h-6 text-[9px]`}>
                {isOver ? '↓' : '·'}
              </div>
            )
          )
        )}

        {/* Manual employee name (reshem_bet only) */}
        {isReshem && !compact && (
          <ManualEmployeeInput
            value={slot.manualEmployee ?? ''}
            onSave={(text) => patch({ manualEmployee: text || null })}
          />
        )}

        {/* Note */}
        <SlotNote note={slot.note ?? null} onSave={saveNote} compact={compact} />

      </div>
    </div>
  );
}
