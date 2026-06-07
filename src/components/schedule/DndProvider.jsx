import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useApp } from '../../context/AppContext';
import { AVAIL, DAY_KEYS, WEEKEND_DAYS, SLOT_ALTERNATIVES } from '../../constants';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EVENING_TYPES = ['evening', 'samples', 'weekend_evening'];
const MORNING_TYPES = ['morning', 'short_morning', 'weekend_morning', 'reshem_bet'];

function adjacentDay(dayKey, delta) {
  const i = DAY_KEYS.indexOf(dayKey) + delta;
  return i >= 0 && i < DAY_KEYS.length ? DAY_KEYS[i] : null;
}

function allSlots(dayData) {
  return [...(dayData?.slots ?? []), ...(dayData?.adHocShifts ?? [])];
}

function findSlot(schedule, dayKey, slotId, isAdHoc) {
  const day = schedule[dayKey];
  if (!day) return null;
  return isAdHoc
    ? day.adHocShifts.find((s) => s.id === slotId) ?? null
    : day.slots.find((s) => s.id === slotId) ?? null;
}

/**
 * After placing empId in (dayKey, shiftType), check for constraint violations.
 * fromSlotId/fromDayKey let us exclude the source slot when counting existing assignments.
 * Returns array of warning strings.
 */
function checkConstraints(schedule, empId, dayKey, shiftType, fromSlotId, fromDayKey) {
  const warnings = [];

  // ── Clopening ──
  if (EVENING_TYPES.includes(shiftType)) {
    const nextKey = adjacentDay(dayKey, 1);
    if (nextKey) {
      const hasMorning = allSlots(schedule[nextKey]).some(
        (s) => s.employee === empId && MORNING_TYPES.includes(s.type)
              && !(s.id === fromSlotId && nextKey === fromDayKey)
      );
      if (hasMorning) warnings.push('משמרת ערב לפני בוקר למחרת');
    }
  }
  if (MORNING_TYPES.includes(shiftType)) {
    const prevKey = adjacentDay(dayKey, -1);
    if (prevKey) {
      const hasEvening = allSlots(schedule[prevKey]).some(
        (s) => s.employee === empId && EVENING_TYPES.includes(s.type)
              && !(s.id === fromSlotId && prevKey === fromDayKey)
      );
      if (hasEvening) warnings.push('משמרת בוקר אחרי ערב ביום הקודם');
    }
  }

  // ── Weekend: max 1 shift ──
  if (WEEKEND_DAYS.includes(dayKey)) {
    const otherWeekendShift = WEEKEND_DAYS.some((wd) => {
      if (wd === dayKey) return false;
      return allSlots(schedule[wd]).some(
        (s) => s.employee === empId && !(s.id === fromSlotId && wd === fromDayKey)
      );
    });
    if (otherWeekendShift) warnings.push('כלל סוף שבוע: יותר ממשמרת אחת בסוף שבוע');
  }

  return warnings;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DndProvider({ children }) {
  const {
    schedule,
    availability,
    employees,
    updateSlot,
    updateAdHocSlot,
    applySchedulePatches,
    toast,
    showCenterAlert,
    setHighlightEmpId,
  } = useApp();

  const [draggedEmployee, setDraggedEmployee] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = ({ active }) => {
    setHighlightEmpId(null); // Clear highlight when a drag begins
    const empId = active.data.current?.empId;
    const emp   = employees.find((e) => e.id === empId);
    setDraggedEmployee(emp ?? null);
  };

  const handleDragCancel = () => setDraggedEmployee(null);

  const handleDragEnd = ({ active, over }) => {
    setDraggedEmployee(null);
    if (!over) return;

    const drag = active.data.current;
    const drop = over.data.current;
    if (!drag || !drop) return;

    const empId = drag.empId;
    const { dayKey, slotId, isAdHoc } = drop;

    // Dropping on the same slot — no-op
    if (drag.type === 'slot-employee'
        && drag.fromSlotId === slotId
        && drag.fromDayKey === dayKey) return;

    const fromSlotId      = drag.fromSlotId      ?? null;
    const fromDayKey      = drag.fromDayKey      ?? null;
    const fromIsAdHoc     = drag.fromIsAdHoc     ?? false;
    const fromIsSecondary = drag.fromIsSecondary ?? false;

    // ── 1. Compute status BEFORE touching anything ────────────────────────
    const targetSlot = findSlot(schedule, dayKey, slotId, isAdHoc);
    if (!targetSlot) return;
    const slotType = targetSlot.type;

    // Slot is full (both employees occupied and neither is the dragged emp)
    if (targetSlot.employee && targetSlot.employee2
        && targetSlot.employee !== empId && targetSlot.employee2 !== empId) {
      toast('המשבצת כבר מלאה בשני עובדים', 'warning');
      return;
    }

    const fillSecondary = !!targetSlot.employee && targetSlot.employee !== empId;

    let effectiveType = slotType;
    let status        = null;

    const isJoker = employees.find((e) => e.id === empId)?.joker ?? false;

    if (!isJoker) {
      let effectiveAv;
      const lookupType = (slotType === 'custom' && targetSlot.boundType) ? targetSlot.boundType : slotType;

      if (lookupType === 'reshem_bet') {
        const dayAvail  = availability[empId]?.[dayKey] ?? {};
        const morFamily = [dayAvail.morning, dayAvail.short_morning, dayAvail.weekend_morning];
        if (morFamily.includes(AVAIL.regular))      effectiveAv = AVAIL.regular;
        else if (morFamily.includes(AVAIL.low))     effectiveAv = AVAIL.low;
        else                                        effectiveAv = null;
      } else {
        const availVal    = availability[empId]?.[dayKey]?.[lookupType] ?? null;
        const altType     = SLOT_ALTERNATIVES[lookupType];
        const altAvailVal = altType ? (availability[empId]?.[dayKey]?.[altType] ?? null) : null;
        effectiveAv = availVal;
        if (!availVal && altAvailVal) {
          effectiveType = altType;
          effectiveAv   = altAvailVal;
        }
        // Note: no slot-type switching in manual DnD (unlike auto-schedule).
        // If the employee can't fill this slot type, status becomes 'forced'
        // (red slot + alert) — placement is still allowed as an admin override.
      }

      if      (effectiveAv === AVAIL.low) status = 'low';
      else if (!effectiveAv)              status = 'forced';
    }

    // ── 2 + 3. Build patches then apply atomically (one undo step) ────────
    const patches = [];

    // Clear source slot (slot-to-slot move)
    if (drag.type === 'slot-employee') {
      let clearPatch;
      if (fromIsSecondary) {
        clearPatch = { employee2: null, status2: null };
      } else {
        // If a second employee exists, promote them to primary so they aren't orphaned
        const srcSlot = findSlot(schedule, fromDayKey, fromSlotId, fromIsAdHoc);
        clearPatch = srcSlot?.employee2
          ? { employee: srcSlot.employee2, status: srcSlot.status2, employee2: null, status2: null }
          : { employee: null, status: null };
      }
      patches.push({ dayKey: fromDayKey, slotId: fromSlotId, isAdHoc: fromIsAdHoc, patch: clearPatch });
    }

    // Assign employee (primary or secondary)
    let applyPatch;
    if (fillSecondary) {
      applyPatch = { employee2: empId, status2: status };
    } else {
      applyPatch = { employee: empId, status };
      if (effectiveType !== slotType) applyPatch.type = effectiveType;
    }
    patches.push({ dayKey, slotId, isAdHoc, patch: applyPatch });

    applySchedulePatches(patches);

    // ── 4. Alerts ─────────────────────────────────────────────────────────
    const emp = employees.find((e) => e.id === empId);
    const name = emp?.name ?? empId;

    if (status === 'forced') {
      const isFemale = emp?.gender === 'female';
      showCenterAlert(`שיבוץ חסום — ${name} לא ${isFemale ? 'סימנה' : 'סימן'} זמינות למשמרת זו`, 'forced');
    }

    if (!isJoker) {
      const warnings = checkConstraints(
        schedule, empId, dayKey, effectiveType, fromSlotId, fromDayKey
      );
      if (warnings.length) {
        showCenterAlert(warnings[0], 'clopen');
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}

      {/* Floating drag preview */}
      <DragOverlay dropAnimation={null}>
        {draggedEmployee && (
          <div className="bg-[#1a2e4a] text-white px-3 py-1.5 rounded-xl text-sm font-bold shadow-2xl cursor-grabbing select-none">
            {draggedEmployee.name}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
