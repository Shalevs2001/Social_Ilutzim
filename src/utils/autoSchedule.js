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
      .sort((a, b) => a.score - b.score);

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

  // ── Second pass: fill employee2 on slots that already have employee1 ─────

  // Identify primary slots that first pass couldn't fill — these take priority.
  const stillEmptyPrimary = emptySlots.filter(({ slotId, dayKey, isAdHoc }) => {
    const slotArr = isAdHoc ? result[dayKey].adHocShifts : result[dayKey].slots;
    const s = slotArr.find((sl) => sl.id === slotId);
    return s && !s.employee;
  });

  const slotsNeedingSecond = [];
  DAY_KEYS.forEach((dayKey) => {
    const day = result[dayKey];
    day.slots.forEach((s) => {
      if (s.employee && !s.employee2) slotsNeedingSecond.push({ dayKey, slotId: s.id, slotType: s.type, boundType: s.boundType ?? null, isAdHoc: false, primaryEmp: s.employee });
    });
    day.adHocShifts.forEach((s) => {
      if (s.employee && !s.employee2) slotsNeedingSecond.push({ dayKey, slotId: s.id, slotType: s.type, boundType: s.boundType ?? null, isAdHoc: true, primaryEmp: s.employee });
    });
  });

  slotsNeedingSecond.sort((a, b) => {
    // notAlone slots get priority (0 = wants pair, 1 = no preference)
    const notAloneA = employees.find((e) => e.id === a.primaryEmp)?.preferences?.notAlone ? 0 : 1;
    const notAloneB = employees.find((e) => e.id === b.primaryEmp)?.preferences?.notAlone ? 0 : 1;
    if (notAloneA !== notAloneB) return notAloneA - notAloneB;
    const count = ({ dayKey, slotType, boundType, primaryEmp }) =>
      employees.filter((e) => e.id !== primaryEmp && bestAvailability(e.id, dayKey, slotType, availability, boundType) !== null).length;
    return count(a) - count(b);
  });

  for (const { dayKey, slotId, slotType, boundType, isAdHoc, primaryEmp } of slotsNeedingSecond) {
    const candidates = employees
      .filter((emp) => {
        if (emp.id === primaryEmp) return false;
        if (!passesRashetRule(emp, slotType)) return false;
        if (empDayKey.has(`${emp.id}:${dayKey}`)) return false;
        if (WEEKEND_DAYS.includes(dayKey) && empWeekendCount[emp.id] >= 1) return false;
        const best = bestAvailability(emp.id, dayKey, slotType, availability, boundType);
        if (!best) return false;
        // For secondary, we cannot switch the slot type — skip if a type-switch would be needed
        if (best.effectiveType !== slotType) return false;
        if (emp.quota > 0 && empShiftCount[emp.id] + shiftWeight(slotType) > emp.quota) return false;
        if (wouldCauseClopen(emp.id, dayKey, best.effectiveType, result)) return false;
        // Hard-exclude: mandatory avoid rule matches this slot
        if ((emp.preferences?.shiftRules ?? []).some((rule) =>
          rule.mandatory && rule.direction === 'avoid' &&
          rule.shiftType === slotType &&
          (rule.days?.length === 0 || rule.days.includes(dayKey))
        )) return false;
        // Hard-exclude: avoidWithMandatory pairing (bidirectional)
        const primaryObj2 = employees.find((e) => e.id === primaryEmp);
        if (emp.preferences?.avoidWithMandatory?.includes(primaryEmp))      return false;
        if (primaryObj2?.preferences?.avoidWithMandatory?.includes(emp.id)) return false;
        // Don't use an employee as employee2 if they could fill a still-empty primary slot
        const couldFillPrimary = stillEmptyPrimary.some(({ dayKey: ed, slotType: est, boundType: ebt }) => {
          if (!passesRashetRule(emp, est)) return false;
          if (empDayKey.has(`${emp.id}:${ed}`)) return false;
          if (WEEKEND_DAYS.includes(ed) && empWeekendCount[emp.id] >= 1) return false;
          const b = bestAvailability(emp.id, ed, est, availability, ebt);
          if (!b) return false;
          if (emp.quota > 0 && empShiftCount[emp.id] + shiftWeight(b.effectiveType) > emp.quota) return false;
          if (wouldCauseClopen(emp.id, ed, b.effectiveType, result)) return false;
          return true;
        });
        if (couldFillPrimary) return false;
        return true;
      })
      .map((emp) => {
        const best        = bestAvailability(emp.id, dayKey, slotType, availability, boundType);
        const fillRate    = emp.quota > 0 ? empShiftCount[emp.id] / emp.quota : 0;
        const primaryObj  = employees.find((e) => e.id === primaryEmp);
        let score         = fillRate * 100;
        // Strong priority boost for employees below their minimum quota
        const minQ2 = emp.minQuota ?? 0;
        if (minQ2 > 0 && empShiftCount[emp.id] < minQ2) score -= 300;
        if (best.av === 'low') score += 200;
        // Shift rules (prefer / avoid; mandatory prefer = very strong)
        for (const rule of (emp.preferences?.shiftRules ?? [])) {
          if (rule.shiftType !== slotType) continue;
          if (rule.days?.length > 0 && !rule.days.includes(dayKey)) continue;
          if (rule.direction === 'avoid')  score += 100;
          if (rule.direction === 'prefer') score  = Math.max(0, score - (rule.mandatory ? 150 : 40));
        }
        // Soft: avoid / prefer pairing (bidirectional)
        if (emp.preferences?.avoidWith?.includes(primaryEmp))       score += 80;
        if (primaryObj?.preferences?.avoidWith?.includes(emp.id))   score += 80;
        if (emp.preferences?.preferWith?.includes(primaryEmp))      score -= 40;
        if (primaryObj?.preferences?.preferWith?.includes(emp.id))  score -= 40;
        // Hard: prefer pairing (bidirectional) — very strong pull
        if (emp.preferences?.preferWithMandatory?.includes(primaryEmp))      score -= 150;
        if (primaryObj?.preferences?.preferWithMandatory?.includes(emp.id))  score -= 150;
        score = Math.max(0, score);
        return { emp, score, av: best.av };
      })
      .sort((a, b) => a.score - b.score);

    if (!candidates.length) continue;

    const { emp, av } = candidates[0];
    const status2 = av === 'low' ? 'low' : null;

    const dayData = result[dayKey];
    const slotArr = isAdHoc ? dayData.adHocShifts : dayData.slots;
    const slot    = slotArr.find((s) => s.id === slotId);
    if (slot) { slot.employee2 = emp.id; slot.status2 = status2; }

    empShiftCount[emp.id] += shiftWeight(slotType);
    empDayKey.add(`${emp.id}:${dayKey}`);
    if (WEEKEND_DAYS.includes(dayKey)) empWeekendCount[emp.id]++;
    filled++;
    if (status2 === 'low') lowCount++;
  }

  // ── Cleanup: notAlone mandatory — unschedule solo employees ─────────────────
  DAY_KEYS.forEach((dayKey) => {
    ['slots', 'adHocShifts'].forEach((arr) => {
      result[dayKey][arr].forEach((slot) => {
        if (!slot.employee || slot.employee2) return;
        const emp = employees.find((e) => e.id === slot.employee);
        if (emp?.preferences?.notAlone && emp?.preferences?.notAloneMandatory) {
          empShiftCount[emp.id] = Math.max(0, (empShiftCount[emp.id] ?? 1) - shiftWeight(slot.type));
          empDayKey.delete(`${emp.id}:${dayKey}`);
          if (WEEKEND_DAYS.includes(dayKey)) {
            empWeekendCount[emp.id] = Math.max(0, (empWeekendCount[emp.id] ?? 1) - 1);
          }
          slot.employee = null;
          slot.status   = null;
          filled  = Math.max(0, filled - 1);
          skipped = skipped + 1;
        }
      });
    });
  });

  return { result, stats: { filled, skipped, lowCount } };
}
