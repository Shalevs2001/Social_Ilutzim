import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { copyToClipboard } from '../../utils/clipboard';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DEFAULT_SETTINGS, DEFAULT_EMPLOYEES, DEFAULT_SHIFT_TIMES, SHIFT_TYPES, DEFAULT_PREFERENCES, DAY_KEYS } from '../../constants';
import { DEFAULT_SHIFT_PRIORITY } from '../../utils/autoSchedule';

function Tab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
        active
          ? 'border-[#38bcd4] text-[#1a2e4a]'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
    </button>
  );
}

const REQ_DEFS = [
  { id: 'req_evening_weekend', category: 'ערב', scope: 'סוף שבוע' },
  { id: 'req_evening_total',   category: 'ערב', scope: 'סה״כ',     note: 'אפשר אחת דגימות' },
  { id: 'req_morning_weekend', category: 'בוקר', scope: 'סוף שבוע' },
  { id: 'req_morning_total',   category: 'בוקר', scope: 'סה״כ'     },
];

// ─── Tab 1: Mandatory requirements ───────────────────────────────────────────

function RequirementsTab() {
  const { employees, updateEmployeeRequirementOverride, updateEmployeeQuota } = useApp();
  const [expandedEmpId, setExpandedEmpId] = useState(null);
  const regular = employees.filter((e) => !e.joker);


  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-gray-400 mb-1">ריק = דרישה לא מוגדרת לעובד זה. 0 = כבוי.</p>

      {regular.map((emp) => {
        const isOpen = expandedEmpId === emp.id;
        return (
          <div key={emp.id} className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedEmpId(isOpen ? null : emp.id)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-right"
            >
              <span className="text-sm font-medium text-gray-800">
                {emp.name}
                {emp.isRashetBet && <span className="text-[10px] text-sky-600 font-normal"> · עורך רשת ב׳</span>}
              </span>
              <span className="text-gray-400 text-[10px] shrink-0">{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && (
              <div className="px-4 py-3 bg-white border-t border-gray-100 flex flex-col gap-1.5">
                {emp.isRashetBet ? (
                  <div className="flex items-center justify-between bg-sky-50 border border-sky-200 rounded-xl px-3 py-2">
                    <span className="text-xs text-gray-700">
                      מינימום משמרות רשת ב׳
                      <span className="text-[10px] text-gray-400"> (0 = ללא דרישה)</span>
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={7}
                      value={emp.quota ?? 0}
                      onChange={(e) => {
                        const val = Math.max(0, Math.min(7, Number(e.target.value)));
                        updateEmployeeQuota(emp.id, val);
                      }}
                      className="w-12 text-center border border-gray-300 rounded-lg px-1 py-1 text-sm focus:outline-none focus:border-[#38bcd4]"
                    />
                  </div>
                ) : (
                  REQ_DEFS.map((def) => {
                    const overrideVal = emp.requirementOverrides?.[def.id];
                    return (
                      <div key={def.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                        <span className="text-xs text-gray-700">
                          {def.category} — {def.scope}
                          {def.note && <span className="text-[10px] text-gray-400"> ({def.note})</span>}
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={7}
                          value={overrideVal ?? ''}
                          placeholder="—"
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : Math.max(0, Number(e.target.value));
                            updateEmployeeRequirementOverride(emp.id, def.id, val);
                          }}
                          className="w-12 text-center border border-gray-300 rounded-lg px-1 py-1 text-sm focus:outline-none focus:border-[#38bcd4] placeholder-gray-300"
                        />
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Tab 2: Employee quotas ───────────────────────────────────────────────────

// Reusable row for a single employee
function EmpRow({ emp, onDelete, onQuotaChange, onMinQuotaChange, onToggleGender, onToggleRashetBet }) {
  const [confirm, setConfirm] = useState(false);
  const isFemale = emp.gender === 'female';
  const minQ = emp.minQuota ?? 0;

  if (confirm) {
    return (
      <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-3 py-2 gap-2">
        <span className="text-xs text-red-700">למחוק את {emp.name}?</span>
        <div className="flex gap-1.5">
          <button onClick={() => onDelete(emp.id)}
            className="text-xs px-2.5 py-1 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">
            מחק
          </button>
          <button onClick={() => setConfirm(false)}
            className="text-xs px-2.5 py-1 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-100 transition-colors">
            ביטול
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`grid items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 gap-x-2 gap-y-0 ${emp.joker ? 'grid-cols-[1fr_28px_32px]' : 'grid-cols-[1fr_28px_28px_116px_32px]'}`}>
      <span className="text-sm font-medium text-gray-800 truncate">{emp.name}</span>
      <button
        onClick={() => onToggleGender(emp.id)}
        title={isFemale ? 'נקבה — לחץ להחלפה' : 'זכר — לחץ להחלפה'}
        className={`text-[10px] font-bold w-6 h-6 rounded-full border transition-colors leading-none flex items-center justify-center ${
          isFemale
            ? 'bg-pink-100 border-pink-300 text-pink-600'
            : 'bg-blue-100 border-blue-300 text-blue-600'
        }`}
      >
        {isFemale ? 'נ' : 'ז'}
      </button>
      {!emp.joker && (
        <button
          onClick={() => onToggleRashetBet(emp.id, !emp.isRashetBet)}
          title={emp.isRashetBet ? 'עורך רשת ב׳ — לחץ לביטול' : 'הגדר כעורך רשת ב׳'}
          className={`text-[10px] font-bold w-6 h-6 rounded-full border transition-colors leading-none flex items-center justify-center ${
            emp.isRashetBet
              ? 'bg-sky-100 border-sky-400 text-sky-700'
              : 'bg-gray-50 border-gray-200 text-gray-300 hover:border-sky-300 hover:text-sky-500'
          }`}
        >
          ר
        </button>
      )}
      {!emp.joker && (
        <div className="flex items-center gap-1">
          <input
            type="number" min={0} max={emp.quota} value={minQ}
            onChange={(e) => onMinQuotaChange(emp.id, e.target.value)}
            title="מינימום משמרות"
            className="w-10 text-center border border-gray-300 rounded-lg px-1 py-1 text-sm focus:outline-none focus:border-[#38bcd4]"
          />
          <span className="text-gray-400 text-xs select-none">–</span>
          <input
            type="number" min={minQ || 1} max={14} value={emp.quota}
            onChange={(e) => onQuotaChange(emp.id, e.target.value)}
            title="מקסימום משמרות"
            className="w-10 text-center border border-gray-300 rounded-lg px-1 py-1 text-sm focus:outline-none focus:border-[#38bcd4]"
          />
        </div>
      )}
      <button onClick={() => setConfirm(true)}
        className="text-gray-300 hover:text-red-400 transition-colors text-sm leading-none text-center"
        title="הסר עובד">✕</button>
    </div>
  );
}

function EmployeesTab() {
  const { employees, setEmployees, updateEmployeeIsRashetBet } = useApp();
  const [newName,      setNewName]      = useState('');
  const [newJokerName, setNewJokerName] = useState('');

  const updateQuota = (id, value) =>
    setEmployees((prev) => prev.map((e) => {
      if (e.id !== id) return e;
      const newMax = Math.max(1, Number(value));
      const newMin = Math.min(e.minQuota ?? 0, newMax);
      return { ...e, quota: newMax, minQuota: newMin };
    }));

  const updateMinQuota = (id, value) =>
    setEmployees((prev) => prev.map((e) => {
      if (e.id !== id) return e;
      const newMin = Math.max(0, Math.min(Number(value), e.quota));
      return { ...e, minQuota: newMin };
    }));

  const deleteEmployee = (id) =>
    setEmployees((prev) =>
      prev
        .filter((e) => e.id !== id)
        .map((e) =>
          e.preferences
            ? {
                ...e,
                preferences: {
                  ...e.preferences,
                  preferWith: (e.preferences.preferWith ?? []).filter((pid) => pid !== id),
                  avoidWith:  (e.preferences.avoidWith  ?? []).filter((pid) => pid !== id),
                },
              }
            : e
        )
    );

  const addEmployee = () => {
    const name = newName.trim();
    if (!name) return;
    setEmployees((prev) => [...prev, { id: `emp_${Date.now()}`, name, quota: 3 }]);
    setNewName('');
  };

  const addJoker = () => {
    const name = newJokerName.trim();
    if (!name) return;
    setEmployees((prev) => [...prev, { id: `joker_${Date.now()}`, name, joker: true }]);
    setNewJokerName('');
  };

  const toggleGender = (id) =>
    setEmployees((prev) => prev.map((e) =>
      e.id === id ? { ...e, gender: e.gender === 'female' ? 'male' : 'female' } : e
    ));

  const regular = employees.filter((e) => !e.joker);
  const jokers  = employees.filter((e) =>  e.joker);

  return (
    <div className="flex flex-col gap-2">

      {/* ── Regular employees ── */}
      <p className="text-xs text-gray-500">עובדים רגילים</p>
      <p className="text-[10px] text-gray-400 -mt-1">
        כפתור <span className="font-bold text-sky-600">ר</span> = הגדרה כעורך רשת ב׳ (משובץ אוטומטית רק למשמרות רשת ב׳).
      </p>
      <div className="grid grid-cols-[1fr_116px_32px] gap-2 text-[10px] font-semibold text-gray-400 px-3">
        <span>שם</span>
        <div className="flex items-center justify-center gap-2 text-center">
          <span>מינ׳</span><span className="text-gray-200">–</span><span>מקס׳</span>
        </div>
        <span/>
      </div>
      {regular.map((emp) => (
        <EmpRow key={emp.id} emp={emp} onDelete={deleteEmployee} onQuotaChange={updateQuota} onMinQuotaChange={updateMinQuota} onToggleGender={toggleGender} onToggleRashetBet={updateEmployeeIsRashetBet} />
      ))}
      <div className="flex gap-2 pt-1">
        <input value={newName} onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addEmployee(); }}
          placeholder="שם עובד חדש..."
          className="flex-1 text-sm border border-gray-300 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#38bcd4]" />
        <button onClick={addEmployee} disabled={!newName.trim()}
          className="px-3 py-1.5 rounded-xl bg-[#1a2e4a] text-white text-sm hover:bg-[#2563a8] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          + הוסף
        </button>
      </div>

      {/* ── Jokers ── */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-2">
        <p className="text-xs text-gray-500">ג׳וקרים <span className="text-gray-400 font-normal">(ללא מכסה)</span></p>
        {jokers.map((emp) => (
          <EmpRow key={emp.id} emp={emp} onDelete={deleteEmployee} onQuotaChange={() => {}} onToggleGender={toggleGender} />
        ))}
        <div className="flex gap-2 pt-1">
          <input value={newJokerName} onChange={(e) => setNewJokerName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addJoker(); }}
            placeholder="שם ג׳וקר חדש..."
            className="flex-1 text-sm border border-gray-300 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#38bcd4]" />
          <button onClick={addJoker} disabled={!newJokerName.trim()}
            className="px-3 py-1.5 rounded-xl bg-[#1a2e4a] text-white text-sm hover:bg-[#2563a8] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            + הוסף
          </button>
        </div>
      </div>

    </div>
  );
}

// ─── Tab 3: Shift times ───────────────────────────────────────────────────────

const SHIFT_TIME_ROWS = [
  { id: 'morning',         label: 'בוקר'          },
  { id: 'short_morning',   label: 'בוקר קצר'      },
  { id: 'middle',          label: 'אמצע'          },
  { id: 'evening',         label: 'ערב'           },
  { id: 'samples',         label: 'דגימות'        },
  { id: 'weekend_morning', label: 'בוקר (סופ"ש)'  },
  { id: 'weekend_middle',  label: 'אמצע (סופ"ש)'  },
  { id: 'weekend_evening', label: 'ערב (סופ"ש)'   },
];

function ShiftTimesTab() {
  const { shiftTimes, updateShiftTime } = useApp();

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-gray-500 mb-1">
        שנה את שעות המשמרות.
      </p>

      <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-gray-400 px-3">
        <span>משמרת</span>
        <span>שעות</span>
      </div>

      {SHIFT_TIME_ROWS.map(({ id, label }) => (
        <div key={id} className="grid grid-cols-2 gap-2 items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
          <span className="text-sm font-medium text-gray-800">{label}</span>
          <input
            type="text"
            value={shiftTimes[id] ?? DEFAULT_SHIFT_TIMES[id]}
            onChange={(e) => updateShiftTime(id, e.target.value)}
            placeholder={DEFAULT_SHIFT_TIMES[id]}
            className="border border-gray-300 rounded-lg px-2 py-1 text-sm font-mono focus:outline-none focus:border-[#38bcd4] text-center"
            dir="ltr"
          />
        </div>
      ))}
    </div>
  );
}

// ─── Tab 4: Employee links ────────────────────────────────────────────────────

function LinksTab() {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/employee`;

  const copy = () => {
    copyToClipboard(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-gray-500">
        שלח את הקישור הזה לכל העובדים. כל אחד יבחר את שמו וימלא את הזמינות שלו — הכל מתעדכן אצלך בזמן אמת.
      </p>

      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 flex flex-col gap-3">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">קישור לעובדים</div>
        <div className="font-mono text-sm text-[#1a2e4a] break-all">{url}</div>
        <button
          onClick={copy}
          className={`self-start text-xs px-4 py-2 rounded-lg border transition-colors ${
            copied
              ? 'bg-green-50 border-green-300 text-green-700'
              : 'bg-white border-gray-300 text-gray-600 hover:border-[#38bcd4] hover:text-[#1a2e4a]'
          }`}
        >
          {copied ? '✓ הועתק' : 'העתק קישור'}
        </button>
      </div>

      <p className="text-[11px] text-gray-400">
        כשעובד נכנס לקישור, הוא בוחר את שמו מהרשימה ומגיש זמינות. השינויים נשמרים אוטומטית.
      </p>
    </div>
  );
}

// ─── Tab 4: Shift priority ────────────────────────────────────────────────────

const PRIORITY_CATS = [
  { id: 'evening',     label: 'ערב',        sub: 'ערב, דגימות, ערב סופ"ש' },
  { id: 'morning',     label: 'בוקר א–ו',   sub: 'בוקר, בוקר קצר, שישי בוקר' },
  { id: 'custom',      label: 'בלת"ם',      sub: 'משמרות שהוספת ידנית', customOnly: true },
  { id: 'sat_morning', label: 'שבת בוקר',   sub: 'בוקר שבת בלבד' },
  { id: 'middle',      label: 'אמצע',       sub: 'אמצע, אמצע סופ"ש' },
  { id: 'reshem_bet',  label: 'רשת ב׳',     sub: 'רק כשפתוח ביום' },
];

function SortablePriorityRow({ cat, index }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-3 border rounded-xl px-4 py-2.5 select-none cursor-grab active:cursor-grabbing ${
        isDragging ? 'bg-white shadow-lg border-[#38bcd4]' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
      }`}
    >
      <span className="text-sm font-bold text-[#38bcd4] w-5 shrink-0">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-800">{cat.label}</div>
        <div className="text-[10px] text-gray-400">{cat.sub}</div>
      </div>
      <span className="text-gray-300 px-1 text-base leading-none">⠿</span>
    </div>
  );
}

function PriorityTab() {
  const { shiftPriority, setShiftPriority, schedule } = useApp();

  const hasCustom = Object.values(schedule).some((day) =>
    day.adHocShifts.some((s) => s.type === 'custom')
  );

  const fullPriority = [
    ...shiftPriority.filter((id) => DEFAULT_SHIFT_PRIORITY.includes(id)),
    ...DEFAULT_SHIFT_PRIORITY.filter((id) => !shiftPriority.includes(id)),
  ];

  const ordered = fullPriority
    .map((id) => PRIORITY_CATS.find((c) => c.id === id))
    .filter((c) => c && (!c.customOnly || hasCustom));

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = fullPriority.indexOf(active.id);
    const newIndex = fullPriority.indexOf(over.id);
    setShiftPriority(arrayMove(fullPriority, oldIndex, newIndex));
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-gray-500">
        גרור כדי לשנות את סדר העדיפות. עדיפות 1 = השיבוץ האוטומטי ממלא ראשון.
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ordered.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-1.5">
            {ordered.map((cat, i) => (
              <SortablePriorityRow key={cat.id} cat={cat} index={i} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button
        onClick={() => setShiftPriority(DEFAULT_SHIFT_PRIORITY)}
        className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 self-start transition-colors mt-1"
      >
        איפוס לברירת מחדל
      </button>
    </div>
  );
}

// ─── Tab 5: Professional considerations ──────────────────────────────────────

const DAY_SHORT_MAP = { sun: 'א', mon: 'ב', tue: 'ג', wed: 'ד', thu: 'ה', fri: 'ו', sat: 'ש' };

const PREF_SHIFTS = [
  { id: 'morning',         label: 'בוקר'       },
  { id: 'short_morning',   label: 'בוקר קצר'   },
  { id: 'middle',          label: 'אמצע'       },
  { id: 'evening',         label: 'ערב'        },
  { id: 'samples',         label: 'דגימות'     },
  { id: 'weekend_morning', label: 'בוקר סופ"ש' },
  { id: 'weekend_evening', label: 'ערב סופ"ש'  },
];

function ShiftRuleRow({ rule, onUpdate, onRemove }) {
  const toggleDay = (dk) => {
    const next = rule.days.includes(dk)
      ? rule.days.filter((d) => d !== dk)
      : [...rule.days, dk];
    onUpdate({ ...rule, days: next });
  };

  return (
    <div className={`flex flex-col gap-2 rounded-xl px-3 py-2.5 border ${rule.mandatory ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center gap-2">
        {/* Direction toggle */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200 shrink-0">
          <button
            onClick={() => onUpdate({ ...rule, direction: 'prefer' })}
            className={`text-xs px-2.5 py-1 transition-colors font-medium ${
              rule.direction === 'prefer'
                ? 'bg-green-100 text-green-700'
                : 'bg-white text-gray-400 hover:bg-gray-50'
            }`}
          >
            עדיף
          </button>
          <button
            onClick={() => onUpdate({ ...rule, direction: 'avoid' })}
            className={`text-xs px-2.5 py-1 transition-colors font-medium ${
              rule.direction === 'avoid'
                ? 'bg-red-100 text-red-700'
                : 'bg-white text-gray-400 hover:bg-gray-50'
            }`}
          >
            הימנע
          </button>
        </div>

        {/* Shift type */}
        <select
          value={rule.shiftType}
          onChange={(e) => onUpdate({ ...rule, shiftType: e.target.value })}
          className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-[#38bcd4]"
        >
          {PREF_SHIFTS.map(({ id, label }) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>

        {/* Mandatory toggle */}
        <button
          onClick={() => onUpdate({ ...rule, mandatory: !rule.mandatory })}
          title={rule.mandatory ? 'כלל חובה — לחץ לשינוי לרך' : 'כלל רך — לחץ להפוך לחובה'}
          className={`text-[10px] px-2 py-1 rounded-lg border transition-colors font-medium shrink-0 ${
            rule.mandatory
              ? 'bg-orange-100 border-orange-300 text-orange-700'
              : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-500'
          }`}
        >
          {rule.mandatory ? '🔒 חובה' : 'רך'}
        </button>

        <button
          onClick={onRemove}
          className="text-gray-300 hover:text-red-500 transition-colors text-sm shrink-0"
          title="הסר כלל"
        >
          ✕
        </button>
      </div>

      {/* Day filter */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-gray-400 shrink-0">ימים:</span>
        <div className="flex gap-0.5">
          {DAY_KEYS.map((dk) => {
            const on = rule.days.includes(dk);
            return (
              <button
                key={dk}
                onClick={() => toggleDay(dk)}
                className={`w-6 h-6 rounded-full text-[9px] font-bold flex items-center justify-center transition-colors ${
                  on
                    ? 'bg-[#1a2e4a] text-white'
                    : 'bg-white border border-gray-200 text-gray-400 hover:border-[#38bcd4]'
                }`}
              >
                {DAY_SHORT_MAP[dk]}
              </button>
            );
          })}
        </div>
        <span className="text-[10px] text-gray-400 italic">
          {rule.days.length === 0 ? 'כל הימים' : ''}
        </span>
      </div>
    </div>
  );
}

function PreferencesTab() {
  const { employees, updateEmployeePreference } = useApp();
  const [expandedId, setExpandedId] = useState(null);
  const regular = employees.filter((e) => !e.joker);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-gray-500 mb-1">
        שיקולים רכים — השיבוץ האוטומטי מנסה לכבד אותם אבל ישבץ בכל זאת אם אין ברירה.
      </p>

      {regular.map((emp) => {
        const prefs  = { ...DEFAULT_PREFERENCES, ...(emp.preferences ?? {}) };
        const isOpen = expandedId === emp.id;
        const others = regular.filter((e) => e.id !== emp.id);

        const avoidCount        = prefs.shiftRules.filter((r) => r.direction === 'avoid').length;
        const preferCount       = prefs.shiftRules.filter((r) => r.direction === 'prefer').length;
        const avoidHasMand      = prefs.shiftRules.some((r) => r.direction === 'avoid'  && r.mandatory);
        const preferHasMand     = prefs.shiftRules.some((r) => r.direction === 'prefer' && r.mandatory);
        const preferWithTotal   = prefs.preferWith.length + (prefs.preferWithMandatory ?? []).length;
        const avoidWithTotal    = prefs.avoidWith.length  + (prefs.avoidWithMandatory  ?? []).length;
        const prefWithHasMand   = (prefs.preferWithMandatory ?? []).length > 0;
        const avoidWithHasMand  = (prefs.avoidWithMandatory  ?? []).length > 0;

        return (
          <div key={emp.id} className="border border-gray-200 rounded-xl overflow-hidden">
            {/* Header row */}
            <button
              onClick={() => setExpandedId(isOpen ? null : emp.id)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-right"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-800">{emp.name}</span>
                {prefs.notAlone && (
                  <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-1.5 py-0.5">
                    לא לבד{prefs.notAloneMandatory ? ' 🔒' : ''}
                  </span>
                )}
                {avoidCount > 0 && (
                  <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 rounded-full px-1.5 py-0.5">
                    ✕ {avoidCount} משמרות{avoidHasMand ? ' 🔒' : ''}
                  </span>
                )}
                {preferCount > 0 && (
                  <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 rounded-full px-1.5 py-0.5">
                    ✓ {preferCount} עדיפות{preferHasMand ? ' 🔒' : ''}
                  </span>
                )}
                {preferWithTotal > 0 && (
                  <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 rounded-full px-1.5 py-0.5">
                    ♥ {preferWithTotal}{prefWithHasMand ? ' 🔒' : ''}
                  </span>
                )}
                {avoidWithTotal > 0 && (
                  <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 rounded-full px-1.5 py-0.5">
                    ✕ {avoidWithTotal}{avoidWithHasMand ? ' 🔒' : ''}
                  </span>
                )}
              </div>
              <span className="text-gray-400 text-[10px] shrink-0 mr-2">{isOpen ? '▲' : '▼'}</span>
            </button>

            {/* Expanded panel */}
            {isOpen && (
              <div className="px-4 py-3 bg-white flex flex-col gap-4 border-t border-gray-100">

                {/* Not alone */}
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={prefs.notAlone}
                      onChange={(e) => {
                        updateEmployeePreference(emp.id, 'notAlone', e.target.checked);
                        if (!e.target.checked) updateEmployeePreference(emp.id, 'notAloneMandatory', false);
                      }}
                      className="w-4 h-4 accent-[#1a2e4a]"
                    />
                    <span className="text-sm text-gray-700">לא לבד — השתדל להצמיד עובד שני</span>
                  </label>
                  {prefs.notAlone && (
                    <button
                      onClick={() => updateEmployeePreference(emp.id, 'notAloneMandatory', !prefs.notAloneMandatory)}
                      title={prefs.notAloneMandatory ? 'חובה — לחץ לשינוי לרך' : 'רך — לחץ להפוך לחובה'}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors font-medium ${
                        prefs.notAloneMandatory
                          ? 'bg-orange-100 border-orange-300 text-orange-700'
                          : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-500'
                      }`}
                    >
                      {prefs.notAloneMandatory ? '🔒 חובה' : 'רך'}
                    </button>
                  )}
                </div>

                {/* Shift rules */}
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">כללי משמרות</div>
                  <div className="flex flex-col gap-1.5">
                    {prefs.shiftRules.map((rule) => (
                      <ShiftRuleRow
                        key={rule.id}
                        rule={rule}
                        onUpdate={(updated) => updateEmployeePreference(emp.id, 'shiftRules',
                          prefs.shiftRules.map((r) => r.id === rule.id ? updated : r)
                        )}
                        onRemove={() => updateEmployeePreference(emp.id, 'shiftRules',
                          prefs.shiftRules.filter((r) => r.id !== rule.id)
                        )}
                      />
                    ))}
                    <button
                      onClick={() => updateEmployeePreference(emp.id, 'shiftRules', [
                        ...prefs.shiftRules,
                        { id: Date.now(), shiftType: 'morning', days: [], direction: 'avoid', mandatory: false },
                      ])}
                      className="text-xs px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-[#38bcd4] hover:text-[#1a2e4a] transition-colors"
                    >
                      + הוסף כלל
                    </button>
                  </div>
                </div>

                {others.length > 0 && (
                  <>
                    {/* Prefer with */}
                    <div>
                      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                        עדיפות לצמד עם
                        <span className="text-gray-300 font-normal normal-case tracking-normal mr-1">· לחץ פעמיים לחובה</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {others.map((other) => {
                          const isSoft = prefs.preferWith.includes(other.id);
                          const isMand = (prefs.preferWithMandatory ?? []).includes(other.id);
                          return (
                            <button
                              key={other.id}
                              onClick={() => {
                                if (!isSoft && !isMand) {
                                  updateEmployeePreference(emp.id, 'preferWith', [...prefs.preferWith, other.id]);
                                } else if (isSoft) {
                                  updateEmployeePreference(emp.id, 'preferWith', prefs.preferWith.filter((id) => id !== other.id));
                                  updateEmployeePreference(emp.id, 'preferWithMandatory', [...(prefs.preferWithMandatory ?? []), other.id]);
                                } else {
                                  updateEmployeePreference(emp.id, 'preferWithMandatory', (prefs.preferWithMandatory ?? []).filter((id) => id !== other.id));
                                }
                              }}
                              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                                isMand ? 'bg-orange-100 border-orange-300 text-orange-700 font-medium'
                                : isSoft ? 'bg-green-100 border-green-300 text-green-700'
                                : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                              }`}
                            >
                              {isMand ? `🔒 ${other.name}` : other.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Avoid with */}
                    <div>
                      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                        הימנעות מצמוד עם
                        <span className="text-gray-300 font-normal normal-case tracking-normal mr-1">· לחץ פעמיים לחובה</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {others.map((other) => {
                          const isSoft = prefs.avoidWith.includes(other.id);
                          const isMand = (prefs.avoidWithMandatory ?? []).includes(other.id);
                          return (
                            <button
                              key={other.id}
                              onClick={() => {
                                if (!isSoft && !isMand) {
                                  updateEmployeePreference(emp.id, 'avoidWith', [...prefs.avoidWith, other.id]);
                                } else if (isSoft) {
                                  updateEmployeePreference(emp.id, 'avoidWith', prefs.avoidWith.filter((id) => id !== other.id));
                                  updateEmployeePreference(emp.id, 'avoidWithMandatory', [...(prefs.avoidWithMandatory ?? []), other.id]);
                                } else {
                                  updateEmployeePreference(emp.id, 'avoidWithMandatory', (prefs.avoidWithMandatory ?? []).filter((id) => id !== other.id));
                                }
                              }}
                              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                                isMand ? 'bg-orange-100 border-orange-300 text-orange-700 font-medium'
                                : isSoft ? 'bg-red-100 border-red-300 text-red-700'
                                : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                              }`}
                            >
                              {isMand ? `🔒 ${other.name}` : other.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Modal shell ─────────────────────────────────────────────────────────────

const TABS = [
  { id: 'requirements',  label: 'דרישות חובה'     },
  { id: 'employees',     label: 'עובדים'           },
  { id: 'preferences',   label: 'שיקולים מקצועיים' },
  { id: 'shifttimes',    label: 'שעות משמרות'     },
  { id: 'priority',      label: 'תעדוף שיבוץ'     },
];

export function SettingsModal() {
  const { showSettings, setShowSettings, setSettings, setEmployees, setShiftPriority, toast } = useApp();
  const [activeTab, setActiveTab] = useState('requirements');

  if (!showSettings) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) setShowSettings(false); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-0">
          <h2 className="text-base font-bold text-[#1a2e4a]">⚙ הגדרות מנהל</h2>
          <button
            onClick={() => setShowSettings(false)}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="relative mt-3 border-b border-gray-200">
          <div className="flex overflow-x-auto scrollbar-none px-5">
            {TABS.map((t) => (
              <Tab
                key={t.id}
                label={t.label}
                active={activeTab === t.id}
                onClick={() => setActiveTab(t.id)}
              />
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'requirements' && <RequirementsTab />}
          {activeTab === 'employees'    && <EmployeesTab />}
          {activeTab === 'preferences'  && <PreferencesTab />}
          {activeTab === 'shifttimes'   && <ShiftTimesTab />}
          {activeTab === 'priority'     && <PriorityTab />}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
          <button
            onClick={() => setShowSettings(false)}
            className="px-5 py-2 rounded-xl bg-[#1a2e4a] text-white text-sm hover:bg-[#2563a8] transition-colors"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
