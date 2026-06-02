import { AVAIL, SHIFT_TYPES, DAY_KEYS, SLOT_GROUPS } from '../../constants';
import { useApp } from '../../context/AppContext';

/**
 * A single availability cell — styled like a schedule slot.
 * Click-cycles: none → regular (green) → low (light blue) → none.
 */
export function AvailabilityCell({ empId, dayKey, shiftType, compact = false }) {
  const { availability, setAvail, shiftTimes, employees } = useApp();

  const value    = availability[empId]?.[dayKey]?.[shiftType] ?? AVAIL.none;
  const shiftDef = SHIFT_TYPES[shiftType];
  const emp      = employees.find((e) => e.id === empId);

  const regularCountExcludingThis = () => {
    const empAvail = availability[empId] ?? {};
    let count = 0;
    DAY_KEYS.forEach((d) => {
      const dayAvail = empAvail[d] ?? {};
      SLOT_GROUPS.forEach((group) => {
        if (group.some((st) => {
          if (d === dayKey && st === shiftType) return false;
          return dayAvail[st] === AVAIL.regular;
        })) count++;
      });
    });
    return count;
  };

  const handleClick = () => {
    if (value === AVAIL.none) {
      setAvail(empId, dayKey, shiftType, AVAIL.regular);
    } else if (value === AVAIL.regular) {
      const minRegular = emp?.quota ?? 1;
      if (regularCountExcludingThis() < minRegular) {
        // Silently block — conditions not met, no alert
        setAvail(empId, dayKey, shiftType, AVAIL.none);
        return;
      }
      setAvail(empId, dayKey, shiftType, AVAIL.low);
    } else {
      setAvail(empId, dayKey, shiftType, AVAIL.none);
    }
  };

  const cellStyle = {
    [AVAIL.none]:    'bg-white border-dashed border-gray-300 text-gray-600 hover:bg-gray-100 hover:border-gray-400 hover:text-gray-700',
    [AVAIL.regular]: 'bg-green-100 border-green-400 text-green-900',
    [AVAIL.low]:     'bg-sky-100 border-sky-300 border-dashed text-sky-900',
  }[value ?? AVAIL.none];

  const tooltipLabel = {
    [AVAIL.none]:    'לא זמין — לחץ לסמן',
    [AVAIL.regular]: 'זמין — לחץ לעדיפות נמוכה',
    [AVAIL.low]:     'עדיפות נמוכה — לחץ לבטל',
  }[value ?? AVAIL.none];

  const timeStr = shiftTimes?.[shiftType] ?? shiftDef?.time ?? '';

  return (
    <button
      onClick={handleClick}
      title={tooltipLabel}
      className={`w-full rounded-lg border text-[9px] font-semibold transition-all duration-100 select-none leading-tight flex flex-col items-center justify-center px-0.5 ${compact ? 'h-9' : 'h-11'} ${cellStyle}`}
    >
      <span>{shiftDef?.label ?? shiftType}</span>
      {!compact && timeStr && (
        <span className="font-mono text-[9px] mt-0.5">{timeStr}</span>
      )}
    </button>
  );
}
