import { AVAIL, DAY_KEYS, SLOT_GROUPS } from '../../constants';
import { useApp } from '../../context/AppContext';

const REQ_NOTES = {
  req_evening_total: 'אפשר אחת דגימות',
};

/**
 * Computes and returns validation results for a single employee.
 * Returns { errors: string[], warnings: string[], passed: bool }
 */
export function useEmployeeValidation(empId) {
  const { availability, employees, settings } = useApp();
  const emp     = employees.find((e) => e.id === empId);
  const empAvail = availability[empId] ?? {};

  const errors   = [];
  const warnings = [];

  if (!emp) return { errors, warnings, passed: false };

  // ── Count totals (grouped: morning+short_morning = 1, evening+samples = 1) ─
  let totalRegular = 0;
  let totalLow     = 0;

  DAY_KEYS.forEach((day) => {
    const dayAvail = empAvail[day] ?? {};
    SLOT_GROUPS.forEach((group) => {
      const hasRegular = group.some((st) => dayAvail[st] === AVAIL.regular);
      const hasLow     = group.some((st) => dayAvail[st] === AVAIL.low);
      if (hasRegular) totalRegular++;
      else if (hasLow) totalLow++;
    });
  });

  const totalMarked = totalRegular + totalLow;

  // Counts effective marked slots for a requirement's shiftTypes (grouped per day).
  const countEffective = (shiftTypes) => {
    const typeSet = new Set(shiftTypes);
    let count = 0;
    DAY_KEYS.forEach((day) => {
      const dayAvail = empAvail[day] ?? {};
      SLOT_GROUPS.forEach((group) => {
        const relevant = group.filter((st) => typeSet.has(st));
        if (!relevant.length) return;
        if (relevant.some((st) => dayAvail[st] === AVAIL.regular || dayAvail[st] === AVAIL.low))
          count++;
      });
    });
    return count;
  };

  // ── Rashet-bet editors: validate only against their morning-family availability count. ──
  if (emp.isRashetBet) {
    let rashetCount = 0;
    DAY_KEYS.forEach((day) => {
      const d = empAvail[day] ?? {};
      const vals = [d.morning, d.short_morning, d.weekend_morning];
      if (vals.some((v) => v === AVAIL.regular || v === AVAIL.low)) rashetCount++;
    });
    const rashetRequired = emp.quota ?? 0;
    const passed = rashetRequired === 0 || rashetCount >= rashetRequired;
    if (!passed) {
      errors.push(`זמינות רשת ב׳ — ${rashetCount} מתוך ${rashetRequired} נדרשות`);
    }
    return {
      errors, warnings: [], totalMarked: rashetCount,
      totalRegular: rashetCount, totalLow: 0, passed,
      isRashetBet: true, rashetCount, rashetRequired,
    };
  }

  // ── Rule 1: Minimum availability count ───────────────────────────────────
  const minRequired = emp.quota;
  if (totalMarked < minRequired) {
    errors.push(`זמינויות — חסרות ${minRequired - totalMarked} מתוך ${minRequired}`);
  }

  // ── Rule 2: Mandatory shift type requirements ─────────────────────────────
  settings.mandatoryRequirements.forEach((req) => {
    // Per-employee override → global (respecting enabled flag)
    const globalMin    = req.enabled !== false ? req.minCount : 0;
    const effectiveMin = emp.requirementOverrides?.[req.id] ?? globalMin;
    if (!effectiveMin) return; // 0 = disabled

    let count;
    if (req.id === 'req_evening_total') {
      const nonSamples = countEffective(req.shiftTypes.filter((t) => t !== 'samples'));
      const hasSamples  = DAY_KEYS.some((d) => {
        const v = empAvail[d]?.samples;
        return v === AVAIL.regular || v === AVAIL.low;
      });
      count = nonSamples + (hasSamples ? 1 : 0);
    } else {
      count = countEffective(req.shiftTypes);
    }

    if (count < effectiveMin) {
      const note = REQ_NOTES[req.id];
      errors.push(`${req.label} — חסרות ${effectiveMin - count} מתוך ${effectiveMin}${note ? ` (${note})` : ''}`);
    }
  });

  // ── Rule 3: Low-priority used before quota of regular shifts is met
  if (totalLow > 0 && totalRegular < (emp.quota ?? 1)) {
    warnings.push(`עדיפות נמוכה לפני השלמת המכסה (${totalRegular}/${emp.quota} רגילות)`);
  }

  return {
    errors,
    warnings,
    totalMarked,
    totalRegular,
    totalLow,
    passed: errors.length === 0,
  };
}

/**
 * Compact badge for use in the employee tab selector.
 */
export function ValidationBadge({ empId }) {
  const { errors, warnings, passed } = useEmployeeValidation(empId);

  if (passed && warnings.length === 0) {
    return (
      <span className="text-[9px] bg-green-100 text-green-600 rounded-full px-1.5 py-0.5 font-bold">✓</span>
    );
  }
  if (errors.length > 0) {
    return (
      <span className="text-[9px] bg-red-100 text-red-600 rounded-full px-1.5 py-0.5 font-bold">
        {errors.length}✕
      </span>
    );
  }
  return (
    <span className="text-[9px] bg-yellow-100 text-yellow-600 rounded-full px-1.5 py-0.5 font-bold">!</span>
  );
}

/**
 * Detailed validation panel shown below the grid for the selected employee.
 */
export function ValidationSummary({ empId }) {
  const result = useEmployeeValidation(empId);
  const { errors, warnings, totalMarked, totalRegular, totalLow, passed } = result;
  const { employees } = useApp();
  const emp = employees.find((e) => e.id === empId);

  // ── Rashet-bet: simplified summary ────────────────────────────────────────
  if (emp?.isRashetBet) {
    const { rashetCount, rashetRequired } = result;
    const ok = rashetRequired === 0 || rashetCount >= rashetRequired;
    return (
      <div className={`rounded-xl border p-3 text-xs ${ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <span className="font-semibold text-gray-700">סיכום — {emp.name}</span>
          <span className="bg-white border border-gray-200 rounded-full px-2 py-0.5">
            זמינות רשת ב׳: <strong>{rashetCount}</strong>
          </span>
          {rashetRequired > 0 && (
            <span className={`rounded-full px-2 py-0.5 border ${ok ? 'bg-green-100 border-green-300 text-green-700' : 'bg-red-100 border-red-300 text-red-700'}`}>
              נדרש: <strong>{rashetRequired}</strong>
            </span>
          )}
        </div>
        {ok ? (
          <div className="flex items-center gap-1.5 text-green-700">
            <span className="font-bold">✓</span>
            <span>עומד בדרישות</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-red-700">
            <span className="font-bold">✕</span>
            <span>חסרות {rashetRequired - rashetCount} זמינויות רשת ב׳</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-3 text-xs ${passed && warnings.length === 0 ? 'bg-green-50 border-green-200' : errors.length > 0 ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
      {/* Stats row */}
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <span className="font-semibold text-gray-700">סיכום — {emp?.name}</span>
        <span className="bg-white border border-gray-200 rounded-full px-2 py-0.5">
          סה״כ: <strong>{totalMarked}</strong>
        </span>
        <span className="bg-green-100 border border-green-300 rounded-full px-2 py-0.5 text-green-700">
          רגיל: <strong>{totalRegular}</strong>
        </span>
        {totalLow > 0 && (
          <span className="bg-sky-100 border border-sky-200 rounded-full px-2 py-0.5 text-sky-700">
            נמוך: <strong>{totalLow}</strong>
          </span>
        )}
      </div>

      {/* Errors */}
      {errors.map((e, i) => (
        <div key={i} className="flex items-start gap-1.5 text-red-700 mt-1">
          <span className="shrink-0 font-bold">✕</span>
          <span>{e}</span>
        </div>
      ))}

      {/* Warnings */}
      {warnings.map((w, i) => (
        <div key={i} className="flex items-start gap-1.5 text-yellow-700 mt-1">
          <span className="shrink-0 font-bold">!</span>
          <span>{w}</span>
        </div>
      ))}

      {/* All clear */}
      {passed && warnings.length === 0 && (
        <div className="flex items-center gap-1.5 text-green-700">
          <span className="font-bold">✓</span>
          <span>כל הדרישות מולאו</span>
        </div>
      )}
    </div>
  );
}
