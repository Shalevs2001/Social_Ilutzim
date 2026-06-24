import { DAY_KEYS, WEEKEND_DAYS, SLOT_ALTERNATIVES } from '../constants';

const EVENING_TYPES = new Set(['evening', 'samples', 'weekend_evening']);
const MORNING_TYPES = new Set(['morning', 'short_morning', 'weekend_morning', 'reshem_bet']);

// short_morning and samples count as half a shift toward the quota
const HALF_SHIFT_TYPES = new Set(['short_morning', 'samples']);
export const shiftWeight = (type) => HALF_SHIFT_TYPES.has(type) ? 0.5 : 1;

export const DEFAULT_SHIFT_PRIORITY = ['evening', 'samples', 'morning', 'custom', 'sat_morning', 'middle', 'reshem_bet'];

// Map a slot to its priority-category ID
function slotCategoryId(slotType, dayKey) {
  if (slotType === 'samples')                                                   return 'samples';
  if (EVENING_TYPES.has(slotType))                                              return 'evening';
  if (slotType === 'weekend_morning' && dayKey === 'sat')                       return 'sat_morning';
  if (['morning', 'short_morning', 'weekend_morning'].includes(slotType))      return 'morning';
  if (slotType === 'custom')                                                    return 'custom';
  if (slotType === 'reshem_bet')                                                return 'reshem_bet';
  return 'middle';
}

function adjacentDay(dayKey, delta) {
  const i = DAY_KEYS.indexOf(dayKey) + delta;
  return i >= 0 && i < DAY_KEYS.length ? DAY_KEYS[i] : null;
}

function allDaySlots(dayData) {
  return [...dayData.slots, ...dayData.adHocShifts];
}

// How many availability options an employee marked across the whole week
// (any 'regular' or 'low' cell). Used as a tiebreaker: when two editors compete
// for the same single shift, the one who offered more availability that week wins.
function weeklyAvailabilityCount(empId, availability) {
  let count = 0;
  Object.values(availability[empId] ?? {}).forEach((day) => {
    Object.values(day ?? {}).forEach((v) => { if (v) count += 1; });
  });
  return count;
}

function wouldCauseClopen(empId, dayKey, shiftType, schedule) {
  if (EVENING_TYPES.has(shiftType)) {
    const nextKey = adjacentDay(dayKey, 1);
    if (nextKey && allDaySlots(schedule[nextKey]).some(
      (s) => s.employee === empId && MORNING_TYPES.has(s.type)
    )) return true;
  }
  if (MORNING_TYPES.has(shiftType)) {
    const prevKey = adjacentDay(dayKey, -1);
    if (prevKey && allDaySlots(schedule[prevKey]).some(
      (s) => s.employee === empId && EVENING_TYPES.has(s.type)
    )) return true;
  }
  return false;
}

// Auto-schedule type switching: when a slot can flip to the narrower type
// if no candidates match the broader type.
// evening → samples, morning → short_morning
const SLOT_TYPE_SWITCH = {
  evening: 'samples',
  morning: 'short_morning',
};

/**
 * Returns the best availability value for an employee on a slot.
 * Checks: direct type → one-directional alternative (keeps slot type) →
 *         type-switch alternative (changes slot to narrower type).
 * Returns { av, effectiveType } or null if no availability at all.
 */
export function bestAvailability(empId, dayKey, slotType, availability, boundType = null) {
  // Custom slots: use boundType for availability lookup if set
  const lookup = (slotType === 'custom' && boundType) ? boundType : slotType;

  // Custom slot with no boundType — skip (no availability data to check)
  if (lookup === 'custom') return null;

  // reshem_bet (or custom bound to morning-family): check the morning-family
  // availability for the day — morning + short_morning on weekdays, or
  // weekend_morning on Fri/Sat (so weekend reshem_bet shifts can auto-fill too).
  if (lookup === 'reshem_bet') {
    const dayAvail = availability[empId]?.[dayKey] ?? {};
    const morningFamily = [dayAvail.morning, dayAvail.short_morning, dayAvail.weekend_morning];
    if (morningFamily.every((v) => !v)) return null;
    if (morningFamily.includes('regular')) return { av: 'regular', effectiveType: slotType };
    if (morningFamily.includes('low'))     return { av: 'low',     effectiveType: slotType };
    return null;
  }

  const av    = availability[empId]?.[dayKey]?.[lookup]    ?? null;
  const altT  = SLOT_ALTERNATIVES[lookup];
  const avAlt = altT ? (availability[empId]?.[dayKey]?.[altT] ?? null) : null;

  // Type-switch: e.g. evening slot → check samples avail (slot will switch to samples)
  const switchT  = SLOT_TYPE_SWITCH[lookup];
  const avSwitch = switchT ? (availability[empId]?.[dayKey]?.[switchT] ?? null) : null;

  if (!av && !avAlt && !avSwitch) return null;

  if (av === 'regular')       return { av: 'regular', effectiveType: slotType };
  if (avAlt === 'regular')    return { av: 'regular', effectiveType: slotType };
  if (avSwitch === 'regular') return { av: 'regular', effectiveType: switchT };
  if (av === 'low')           return { av: 'low',     effectiveType: slotType };
  if (avAlt === 'low')        return { av: 'low',     effectiveType: slotType };
  if (avSwitch === 'low')     return { av: 'low',     effectiveType: switchT };
  return null;
}

export function runAutoSchedule(schedule, availability, employees, priorityOrder = DEFAULT_SHIFT_PRIORITY) {
  const result = JSON.parse(JSON.stringify(schedule));
  employees = employees.filter((e) => !e.joker);

  // Rashet-bet editors are auto-assigned ONLY to reshem_bet slots, and
  // reshem_bet slots are auto-filled ONLY by rashet-bet editors. (Manual
  // placement is unaffected — this rule only governs auto-scheduling.)
  const passesRashetRule = (emp, slotType) =>
    slotType === 'reshem_bet' ? !!emp.isRashetBet : !emp.isRashetBet;

  const empShiftCount   = Object.fromEntries(employees.map((e) => [e.id, 0]));
  const empWeekendCount = Object.fromEntries(employees.map((e) => [e.id, 0]));
  const empDayKey       = new Set();

  // Precompute weekly availability counts for the conflict tiebreaker.
  const availCount = Object.fromEntries(
    employees.map((e) => [e.id, weeklyAvailabilityCount(e.id, availability)])
  );

  DAY_KEYS.forEach((dayKey) => {
    allDaySlots(result[dayKey]).forEach((slot) => {
      [slot.employee, slot.employee2].forEach((empId) => {
        if (!empId) return;
        empShiftCount[empId] = (empShiftCount[empId] ?? 0) + shiftWeight(slot.type);
        empDayKey.add(`${empId}:${dayKey}`);
        if (WEEKEND_DAYS.includes(dayKey)) {
          empWeekendCount[empId] = (empWeekendCount[empId] ?? 0) + 1;
        }
      });
    });
  });

  const emptySlots = [];
  DAY_KEYS.forEach((dayKey) => {
    const day = result[dayKey];
    day.slots.forEach((slot) => {
      if (!slot.employee) emptySlots.push({ dayKey, slotId: slot.id, slotType: slot.type, boundType: slot.boundType ?? null, isAdHoc: false });
    });
    day.adHocShifts.forEach((slot) => {
      if (slot.type === 'reshem_bet') {
        if (!slot.employee && !slot.manualEmployee)
          emptySlots.push({ dayKey, slotId: slot.id, slotType: slot.type, boundType: null, isAdHoc: true });
      } else {
        if (!slot.employee) emptySlots.push({ dayKey, slotId: slot.id, slotType: slot.type, boundType: slot.boundType ?? null, isAdHoc: true });
      }
    });
  });

  // Priority derived from user-configured order (index in priorityOrder array)
  const slotTypePriority = (slotType, dayKey) => {
    const cat = slotCategoryId(slotType, dayKey);
    const idx = priorityOrder.indexOf(cat);
    return idx === -1 ? 99 : idx;
  };

  // Live eligible count — respects current quota/day/weekend state
  const liveEligible = ({ dayKey, slotType, boundType }) =>
    employees.filter((emp) => {
      if (!passesRashetRule(emp, slotType)) return false;
      if (empDayKey.has(`${emp.id}:${dayKey}`)) return false;
      if (WEEKEND_DAYS.includes(dayKey) && empWeekendCount[emp.id] >= 1) return false;
      const best = bestAvailability(emp.id, dayKey, slotType, availability, boundType);
      if (!best) return false;
      if (emp.quota > 0 && empShiftCount[emp.id] + shiftWeight(best.effectiveType) > emp.quota) return false;
      if (wouldCauseClopen(emp.id, dayKey, best.effectiveType, result)) return false;
      return true;
    }).length;

  let filled = 0, skipped = 0, lowCount = 0;

  // ── First pass: dynamic hardest-first ────────────────────────────────────
  // Each iteration we re-pick the slot with the fewest currently-eligible
  // employees (ties broken by shift-type priority). This prevents "wasting"
  // a rare employee on an easy slot before a hard slot is processed.
  const pendingSlots = [...emptySlots];

  // Returns true when filling this slot would complete the "weak day" pattern:
  // short_morning + samples on the same day with no middle filled.
  // Such slots are deprioritised as a final tiebreaker.
  const isWeakPatternSlot = ({ dayKey, slotType }) => {
    if (slotType !== 'samples' && slotType !== 'short_morning') return false;
    const daySlots = allDaySlots(result[dayKey]);
    const hasShortMorning = daySlots.some((s) => s.type === 'short_morning' && s.employee);
    const hasSamples      = daySlots.some((s) => s.type === 'samples'       && s.employee);
    const hasMiddle       = daySlots.some((s) => s.type === 'middle'        && s.employee);
    if (hasMiddle) return false;
    if (slotType === 'samples'       && hasShortMorning) return true;
    if (slotType === 'short_morning' && hasSamples)      return true;
    return false;
  };

  while (pendingSlots.length > 0) {
    // Find the hardest slot right now.
    // Sort key (ascending = better): [liveEligible, typePriority, weakPattern]
    let pickedIdx      = 0;
    let pickedEligible = liveEligible(pendingSlots[0]);
    let pickedPriority = slotTypePriority(pendingSlots[0].slotType, pendingSlots[0].dayKey);
    let pickedWeak     = isWeakPatternSlot(pendingSlots[0]) ? 1 : 0;

    for (let i = 1; i < pendingSlots.length; i++) {
      const ec = liveEligible(pendingSlots[i]);
      const sp = slotTypePriority(pendingSlots[i].slotType, pendingSlots[i].dayKey);
      const wp = isWeakPatternSlot(pendingSlots[i]) ? 1 : 0;
      if (
        ec < pickedEligible ||
        (ec === pickedEligible && sp < pickedPriority) ||
        (ec === pickedEligible && sp === pickedPriority && wp < pickedWeak)
      ) {
        pickedEligible = ec;
        pickedPriority = sp;
        pickedWeak     = wp;
        pickedIdx      = i;
      }
    }

    const [{ dayKey, slotId, slotType, boundType, isAdHoc }] = pendingSlots.splice(pickedIdx, 1);

    const candidates = employees
      .filter((emp) => {
        if (!passesRashetRule(emp, slotType)) return false;
        if (empDayKey.has(`${emp.id}:${dayKey}`)) return false;
        if (WEEKEND_DAYS.includes(dayKey) && empWeekendCount[emp.id] >= 1) return false;
        const best = bestAvailability(emp.id, dayKey, slotType, availability, boundType);
        if (!best) return false;
        if (emp.quota > 0 && empShiftCount[emp.id] + shiftWeight(best.effectiveType) > emp.quota) return false;
        if (wouldCauseClopen(emp.id, dayKey, best.effectiveType, result)) return false;
        // Hard-exclude: mandatory avoid rule matches this slot
        if ((emp.preferences?.shiftRules ?? []).some((rule) =>
          rule.mandatory && rule.direction === 'avoid' &&
          rule.shiftType === best.effectiveType &&
          (rule.days?.length === 0 || rule.days.includes(dayKey))
        )) return false;
        return true;
      })
      .map((emp) => {
        const best     = bestAvailability(emp.id, dayKey, slotType, availability, boundType);
        const fillRate = emp.quota > 0 ? empShiftCount[emp.id] / emp.quota : 0;
        let score      = fillRate * 100;
        // Strong priority boost for employees below their minimum quota
        const minQ = emp.minQuota ?? 0;
        if (minQ > 0 && empShiftCount[emp.id] < minQ) score -= 300;
        if (best.av === 'low') score += 200;
        // Shift rules (prefer / avoid, optionally day-filtered; mandatory prefer = very strong)
        for (const rule of (emp.preferences?.shiftRules ?? [])) {
          if (rule.shiftType !== best.effectiveType) continue;
          if (rule.days?.length > 0 && !rule.days.includes(dayKey)) continue;
          if (rule.direction === 'avoid')  score += 100;
          if (rule.direction === 'prefer') score  = Math.max(0, score - (rule.mandatory ? 150 : 40));
        }
        return { emp, score, av: best.av, effectiveType: best.effectiveType };
      })
      // Lower score wins; ties go to the editor who offered more availability
      // this week (more flexible candidate takes the contested shift).
      .sort((a, b) =>
        a.score - b.score ||
        (availCount[b.emp.id] ?? 0) - (availCount[a.emp.id] ?? 0)
      );

    if (!candidates.length) { skipped++; continue; }

    const { emp, av, effectiveType } = candidates[0];
    const status = av === 'low' ? 'low' : null;

    const dayData = result[dayKey];
    const slotArr = isAdHoc ? dayData.adHocShifts : dayData.slots;
    const slot    = slotArr.find((s) => s.id === slotId);
    if (slot) {
      slot.employee = emp.id;
      slot.status   = status;
      // Auto-switch slot type if needed (e.g. morning → short_morning)
      if (effectiveType !== slotType) slot.type = effectiveType;
    }

    empShiftCount[emp.id] += shiftWeight(effectiveType);
    empDayKey.add(`${emp.id}:${dayKey}`);
    if (WEEKEND_DAYS.includes(dayKey)) empWeekendCount[emp.id]++;

    filled++;
    if (status === 'low') lowCount++;
  }

  // Auto-schedule assigns at most ONE editor per shift — there is intentionally
  // no second pass that fills employee2. A second editor can still be added
  // manually (drag-and-drop). Employees left under their required shift count
  // are surfaced by the sidebar (faint-red card) for manual handling.

  return { result, stats: { filled, skipped, lowCount } };
}
