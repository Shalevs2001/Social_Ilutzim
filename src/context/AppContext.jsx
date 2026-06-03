import { createContext, useCallback, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { ref, set as fbSet, onValue, remove } from 'firebase/database';
import { db } from '../firebase';
import { useLocalStorage } from '../hooks/useLocalStorage';
import {
  DAY_KEYS,
  WEEKEND_DAYS,
  DEFAULT_EMPLOYEES,
  DEFAULT_SETTINGS,
  DEFAULT_SHIFT_TIMES,
  SETTINGS_VERSION,
  AVAIL,
} from '../constants';
import { runAutoSchedule, DEFAULT_SHIFT_PRIORITY, shiftWeight } from '../utils/autoSchedule';

// Runs once at module load — before any hook reads localStorage.
// If stored settings version doesn't match, wipe and replace with defaults.
try {
  const raw = localStorage.getItem('ks_settings');
  if (raw) {
    const stored = JSON.parse(raw);
    if (stored.version !== SETTINGS_VERSION) {
      localStorage.setItem('ks_settings', JSON.stringify(DEFAULT_SETTINGS));
    }
  }
} catch { /* ignore */ }

// Migrate employees: deduplicate by id, then add any jokers missing from stored list.
try {
  const raw = localStorage.getItem('ks_employees');
  if (raw) {
    const stored = JSON.parse(raw);
    const seen   = new Set();
    const deduped = stored.filter((e) => !seen.has(e.id) && seen.add(e.id));
    const missing = DEFAULT_EMPLOYEES.filter(
      (d) => d.joker && !deduped.some((e) => e.id === d.id)
    );
    const final = missing.length ? [...deduped, ...missing] : deduped;
    if (final.length !== stored.length) {
      localStorage.setItem('ks_employees', JSON.stringify(final));
    }
  }
} catch { /* ignore */ }

// ─── Factory helpers ──────────────────────────────────────────────────────────

function makeEmptySchedule() {
  const schedule = {};
  DAY_KEYS.forEach((day) => {
    const isWeekend = WEEKEND_DAYS.includes(day);
    schedule[day] = {
      reshemBetBackup: false,
      weekendMiddle: false,
      adHocShifts: [],
      slots: isWeekend
        ? [
            { id: `${day}_morning`, type: 'weekend_morning', employee: null, status: null },
            { id: `${day}_evening`, type: 'weekend_evening', employee: null, status: null },
          ]
        : [
            { id: `${day}_morning`, type: 'morning',  employee: null, status: null },
            { id: `${day}_middle`,  type: 'middle',   employee: null, status: null },
            { id: `${day}_evening`, type: 'evening',  employee: null, status: null },
          ],
    };
  });
  return schedule;
}

function makeEmptyAvailability(employees) {
  const avail = {};
  employees.forEach((emp) => {
    avail[emp.id] = {};
    DAY_KEYS.forEach((day) => {
      const isWeekend = WEEKEND_DAYS.includes(day);
      avail[emp.id][day] = isWeekend
        ? { weekend_morning: AVAIL.none, weekend_middle: AVAIL.none, weekend_evening: AVAIL.none }
        : {
            morning:       AVAIL.none,
            short_morning: AVAIL.none,
            middle:        AVAIL.none,
            evening:       AVAIL.none,
            samples:       AVAIL.none,
          };
    });
  });
  return avail;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AppContext = createContext(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children, isAdmin = false }) {
  // Persisted state (localStorage)
  const [schedule,       setSchedule]   = useLocalStorage('ks_schedule',        makeEmptySchedule);
  const [employees,      setEmployees]  = useLocalStorage('ks_employees',        DEFAULT_EMPLOYEES);
  const [settings,       setSettings]   = useLocalStorage('ks_settings_v5',      DEFAULT_SETTINGS);
  const [shiftPriority,  setShiftPriority] = useLocalStorage('ks_shift_priority', DEFAULT_SHIFT_PRIORITY);
  const [scheduleDate,    setScheduleDate]    = useLocalStorage('ks_schedule_date',    '');
  const [scheduleNotes,   setScheduleNotes]   = useLocalStorage('ks_schedule_notes',  '');
  const [scheduleVisible, setScheduleVisible] = useLocalStorage('ks_schedule_visible', false);
  // Employee notes — Firebase-backed for boss↔employee sync
  const [employeeNotes, _setEmployeeNotes] = useState({});
  const employeeNotesRef = useRef({});
  useEffect(() => onValue(ref(db, 'employeeNotes'), (s) => {
    const val = s.val() ?? {};
    _setEmployeeNotes(val);
    employeeNotesRef.current = val;
  }), []);

  // Notes snapshots — saved at submission time, used for restore
  const [notesSnapshots, _setNotesSnapshots] = useState({});
  useEffect(() => onValue(ref(db, 'notesSnapshots'), (s) => _setNotesSnapshots(s.val() ?? {})), []);

  // Shift times — driven by Firebase (synced to employee view)
  const [shiftTimes, _setShiftTimes] = useState(DEFAULT_SHIFT_TIMES);
  useEffect(() => onValue(ref(db, 'shiftTimes'), (s) => {
    _setShiftTimes({ ...DEFAULT_SHIFT_TIMES, ...(s.val() ?? {}) });
  }), []);

  const updateShiftTime = useCallback((type, time) => {
    _setShiftTimes((prev) => ({ ...prev, [type]: time }));
    fbSet(ref(db, `shiftTimes/${type}`), time).catch(console.error);
  }, []);

  // Submissions — driven by Firebase  { empId: { submitted, submittedAt, editing } }
  const [submissions, _setSubmissions] = useState({});
  useEffect(() => onValue(ref(db, 'submissions'), (s) => _setSubmissions(s.val() ?? {})), []);

  // Approval requests — driven by Firebase  { empId: { empId, empName, timestamp } }
  const [approvalRequests, _setApprovalRequests] = useState({});
  useEffect(() => onValue(ref(db, 'approvalRequests'), (s) => _setApprovalRequests(s.val() ?? {})), []);

  // Notifications — driven by Firebase  [{ id, empId, empName, type, timestamp, read }]
  const [notifications, _setNotifications] = useState([]);
  useEffect(() => onValue(ref(db, 'notifications'), (s) => {
    const data = s.val() ?? {};
    const arr  = Object.entries(data).map(([id, n]) => ({ id, ...n }));
    arr.sort((a, b) => b.timestamp - a.timestamp);
    _setNotifications(arr);
  }), []);

  // Availability snapshots — saved at submission time { empId: { dayKey: { shiftType: value } } }
  const [availSnapshots, _setAvailSnapshots] = useState({});
  useEffect(() => onValue(ref(db, 'availabilitySnapshots'), (s) => _setAvailSnapshots(s.val() ?? {})), []);

  // Employee roster — synced to Firebase by admin, read from Firebase by employee view
  const [firebaseEmployees, _setFirebaseEmployees] = useState(null);
  useEffect(() => {
    if (isAdmin) return;
    return onValue(ref(db, 'employeeRoster'), (s) => {
      const val = s.val();
      if (Array.isArray(val)) _setFirebaseEmployees(val);
    });
  }, [isAdmin]);
  useEffect(() => {
    if (!isAdmin) return;
    fbSet(ref(db, 'employeeRoster'),
      employees.map(({ id, name, joker }) => ({ id, name, joker: joker ?? false }))
    ).catch(() => {});
  }, [isAdmin, employees]);
  const effectiveEmployees = (!isAdmin && firebaseEmployees) ? firebaseEmployees : employees;

  // Availability — driven by Firebase Realtime Database
  const [availability, _setAvailState] = useState(() => makeEmptyAvailability(DEFAULT_EMPLOYEES));
  const availabilityRef = useRef(availability);
  useEffect(() => { availabilityRef.current = availability; }, [availability]);

  // Draft availability — local edits in employee view, only flushed to Firebase on submit
  const [availDraft, _setAvailDraft] = useState(null);   // { dayKey: { shiftType: value } } | null
  const [draftEmpId, _setDraftEmpId] = useState(null);
  const draftEmpIdRef  = useRef(null);
  const availDraftRef  = useRef(null);

  const enableDraftMode = useCallback((empId) => {
    const empAvail = availabilityRef.current[empId] ?? {};
    const draft = Object.fromEntries(
      Object.entries(empAvail).map(([day, dayData]) => [day, { ...dayData }])
    );
    _setAvailDraft(draft);
    availDraftRef.current = draft;
    _setDraftEmpId(empId);
    draftEmpIdRef.current = empId;
  }, []);

  const discardDraft = useCallback(() => {
    _setAvailDraft(null);
    availDraftRef.current = null;
    _setDraftEmpId(null);
    draftEmpIdRef.current = null;
  }, []);

  // What consumers read: Firebase data, except for the draft employee who sees local draft
  const mergedAvailability = useMemo(() => {
    if (!draftEmpId || !availDraft) return availability;
    return { ...availability, [draftEmpId]: availDraft };
  }, [availability, availDraft, draftEmpId]);
  const employeesRef = useRef(effectiveEmployees);
  useEffect(() => { employeesRef.current = effectiveEmployees; }, [effectiveEmployees]);

  // ── Undo history (schedule + availability) ────────────────────────────────
  // entries: { type: 'schedule', data } | { type: 'availability', data }
  const undoHistoryRef = useRef([]);
  const scheduleRef    = useRef(schedule);
  useEffect(() => { scheduleRef.current = schedule; }, [schedule]);
  const MAX_HISTORY = 50;

  useEffect(() => {
    const availRef = ref(db, 'availability');
    const unsubscribe = onValue(availRef, (snapshot) => {
      const data = snapshot.val() ?? {};
      _setAvailState(() => {
        const base = makeEmptyAvailability(employeesRef.current);
        Object.entries(data).forEach(([empId, days]) => {
          if (!base[empId]) return;
          Object.entries(days ?? {}).forEach(([dayKey, slots]) => {
            if (!base[empId][dayKey]) return;
            Object.assign(base[empId][dayKey], slots ?? {});
          });
        });
        return base;
      });
    });
    return () => unsubscribe();
  }, []); // subscribe once

  // Ephemeral UI state
  const [activeView,        setActiveView]        = useState('schedule');
  const [showSettings,      setShowSettings]      = useState(false);
  const [toasts,            setToasts]            = useState([]);
  const [confirmDialog,     setConfirmDialog]     = useState(null);
  const [centerAlert,       setCenterAlert]       = useState(null);
  const [showLowPriority,   setShowLowPriority]   = useState(true);
  const [showMissingSlots,  setShowMissingSlots]  = useState(false);
  const [highlightEmpId,    setHighlightEmpId]    = useState(null);

  // ── Notifications ──────────────────────────────────────────────────────────

  const activeToastKeys = useRef(new Set());

  const toast = useCallback((message, type = 'info', tag = null) => {
    const key = tag ?? message;
    if (activeToastKeys.current.has(key)) {
      setToasts((prev) => prev.map((t) =>
        (tag ? t.tag === tag : t.message === message)
          ? { ...t, bump: (t.bump ?? 0) + 1 }
          : t
      ));
      return;
    }
    const id = Date.now() + Math.random();
    activeToastKeys.current.add(key);
    setToasts((prev) => [...prev, { id, message, type, bump: 0, tag }]);
    setTimeout(() => {
      activeToastKeys.current.delete(key);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showCenterAlert = useCallback((message, type = 'info') => {
    setCenterAlert({ message, type });
  }, []);

  const dismissCenterAlert = useCallback(() => setCenterAlert(null), []);

  // ── Confirm dialog ─────────────────────────────────────────────────────────

  const confirm = useCallback((message, onConfirm) => {
    setConfirmDialog({ message, onConfirm });
  }, []);

  const resolveConfirm = useCallback((yes) => {
    if (yes && confirmDialog?.onConfirm) confirmDialog.onConfirm();
    setConfirmDialog(null);
  }, [confirmDialog]);

  // ── Schedule mutations ─────────────────────────────────────────────────────

  const pushUndoEntry = useCallback((entry) => {
    undoHistoryRef.current = [
      ...undoHistoryRef.current.slice(-(MAX_HISTORY - 1)),
      entry,
    ];
  }, []);

  /**
   * setSchedule wrapper that snapshots before applying — outside the React
   * updater to avoid Strict Mode double-invoke duplicating history entries.
   */
  const setScheduleWithHistory = useCallback((updater) => {
    pushUndoEntry({ type: 'schedule', data: scheduleRef.current });
    setSchedule(updater);
  }, [setSchedule, pushUndoEntry]);

  const undo = useCallback(() => {
    const history = undoHistoryRef.current;
    if (history.length === 0) return;
    const entry = history[history.length - 1];
    undoHistoryRef.current = history.slice(0, -1);
    if (entry.type === 'schedule') {
      setSchedule(entry.data);
    } else if (entry.type === 'availability') {
      _setAvailState(entry.data);
      fbSet(ref(db, 'availability'), entry.data).catch(console.error);
    }
  }, [setSchedule, _setAvailState]);

  useEffect(() => {
    const handler = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.code !== 'KeyZ') return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      undo();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo]);

  const clearSchedule = useCallback(() => {
    confirm('האם לנקות את כל הסידור?', () => {
      setScheduleWithHistory(makeEmptySchedule());
      toast('הסידור נוקה', 'success');
    });
  }, [confirm, setScheduleWithHistory, toast]);

  const updateSlot = useCallback((dayKey, slotId, patch) => {
    setScheduleWithHistory((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        slots: prev[dayKey].slots.map((s) =>
          s.id === slotId ? { ...s, ...patch } : s
        ),
      },
    }));
  }, [setScheduleWithHistory]);

  const updateAdHocSlot = useCallback((dayKey, slotId, patch) => {
    setScheduleWithHistory((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        adHocShifts: prev[dayKey].adHocShifts.map((s) =>
          s.id === slotId ? { ...s, ...patch } : s
        ),
      },
    }));
  }, [setScheduleWithHistory]);

  const removeAdHocSlot = useCallback((dayKey, slotId) => {
    setScheduleWithHistory((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        adHocShifts: prev[dayKey].adHocShifts.filter((s) => s.id !== slotId),
      },
    }));
  }, [setScheduleWithHistory]);

  /**
   * Apply multiple slot patches in one history snapshot.
   * patches: [{ dayKey, slotId, isAdHoc, patch }]
   * Used by DndProvider so a drag-move is a single undo step.
   */
  const applySchedulePatches = useCallback((patches) => {
    setScheduleWithHistory((prev) => {
      let next = prev;
      patches.forEach(({ dayKey: dk, slotId, isAdHoc, patch }) => {
        if (isAdHoc) {
          next = {
            ...next,
            [dk]: {
              ...next[dk],
              adHocShifts: next[dk].adHocShifts.map((s) =>
                s.id === slotId ? { ...s, ...patch } : s
              ),
            },
          };
        } else {
          next = {
            ...next,
            [dk]: {
              ...next[dk],
              slots: next[dk].slots.map((s) =>
                s.id === slotId ? { ...s, ...patch } : s
              ),
            },
          };
        }
      });
      return next;
    });
  }, [setScheduleWithHistory]);

  const toggleReshemBet = useCallback((dayKey) => {
    setScheduleWithHistory((prev) => {
      const day = prev[dayKey];
      if (day.reshemBetBackup) {
        return {
          ...prev,
          [dayKey]: {
            ...day,
            reshemBetBackup: false,
            adHocShifts: day.adHocShifts.filter((s) => s.type !== 'reshem_bet'),
          },
        };
      } else {
        const reshemSlot = {
          id: `${dayKey}_reshem_bet`,
          type: 'reshem_bet',
          label: 'רשת ב׳',
          time: '',
          employee: null,
          status: null,
        };
        return {
          ...prev,
          [dayKey]: {
            ...day,
            reshemBetBackup: true,
            adHocShifts: [reshemSlot, ...day.adHocShifts],
          },
        };
      }
    });
  }, [setScheduleWithHistory]);

  const toggleWeekendMiddle = useCallback((dayKey) => {
    setScheduleWithHistory((prev) => {
      const day = prev[dayKey];
      if (day.weekendMiddle) {
        fbSet(ref(db, `weekendMiddleActive/${dayKey}`), false).catch(console.error);
        return {
          ...prev,
          [dayKey]: {
            ...day,
            weekendMiddle: false,
            adHocShifts: day.adHocShifts.filter((s) => s.type !== 'weekend_middle'),
          },
        };
      } else {
        const slot = {
          id: `${dayKey}_weekend_middle`,
          type: 'weekend_middle',
          label: 'אמצע',
          time: '',
          employee: null,
          status: null,
        };
        fbSet(ref(db, `weekendMiddleActive/${dayKey}`), true).catch(console.error);
        return {
          ...prev,
          [dayKey]: {
            ...day,
            weekendMiddle: true,
            adHocShifts: [...day.adHocShifts, slot],
          },
        };
      }
    });
  }, [setScheduleWithHistory]);

  // weekendMiddleActive — synced from Firebase so employee site can read it
  const [weekendMiddleActive, _setWeekendMiddleActive] = useState({ fri: false, sat: false });
  useEffect(() => onValue(ref(db, 'weekendMiddleActive'), (s) => {
    _setWeekendMiddleActive(s.val() ?? { fri: false, sat: false });
  }), []);

  // Admin: push schedule's weekendMiddle state to Firebase on every change (including on load)
  useEffect(() => {
    if (!isAdmin) return;
    WEEKEND_DAYS.forEach((day) => {
      fbSet(ref(db, `weekendMiddleActive/${day}`), !!schedule[day]?.weekendMiddle).catch(console.error);
    });
  }, [isAdmin, schedule.fri?.weekendMiddle, schedule.sat?.weekendMiddle]); // eslint-disable-line

  const addAdHocShift = useCallback((dayKey, { label, time, boundType }) => {
    const newSlot = {
      id: `adhoc_${dayKey}_${Date.now()}`,
      type: 'custom',
      label,
      time,
      boundType: boundType || null,
      employee: null,
      status: null,
    };
    setScheduleWithHistory((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        adHocShifts: [...prev[dayKey].adHocShifts, newSlot],
      },
    }));
  }, [setScheduleWithHistory]);

  // ── Availability mutations (Firebase) ──────────────────────────────────────

  const setAvail = useCallback((empId, dayKey, shiftType, value) => {
    if (draftEmpIdRef.current === empId) {
      // Draft mode — local only, no Firebase write, no undo history
      _setAvailDraft((prev) => {
        const updated = {
          ...(prev ?? {}),
          [dayKey]: { ...((prev ?? {})[dayKey] ?? {}), [shiftType]: value },
        };
        availDraftRef.current = updated;
        return updated;
      });
    } else {
      // Boss view — save to undo history, then write to Firebase
      pushUndoEntry({ type: 'availability', data: availabilityRef.current });
      _setAvailState((prev) => ({
        ...prev,
        [empId]: {
          ...prev[empId],
          [dayKey]: { ...prev[empId]?.[dayKey], [shiftType]: value },
        },
      }));
      fbSet(ref(db, `availability/${empId}/${dayKey}/${shiftType}`), value ?? null)
        .catch(console.error);
    }
  }, [pushUndoEntry]);

  // Bulk setter — used by ClearEmployeeButton (writes one employee's data to Firebase)
  const setAvailability = useCallback((valOrFn) => {
    _setAvailState((prev) => {
      const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      fbSet(ref(db, 'availability'), next).catch(console.error);
      return next;
    });
  }, []);

  const clearEmployeeAvailability = useCallback((empId) => {
    const emptyDay = (dayData) =>
      Object.fromEntries(Object.keys(dayData).map((st) => [st, AVAIL.none]));

    if (draftEmpIdRef.current === empId) {
      // Draft mode (employee site) — clear the local draft
      _setAvailDraft((prev) => {
        const cleared = Object.fromEntries(
          Object.entries(prev ?? {}).map(([day, dayData]) => [day, emptyDay(dayData)])
        );
        availDraftRef.current = cleared;
        return cleared;
      });
    } else {
      // Admin mode — clear Firebase directly
      _setAvailState((prev) => {
        const emptyForEmp = Object.fromEntries(
          Object.entries(prev[empId] ?? {}).map(([day, dayData]) => [day, emptyDay(dayData)])
        );
        fbSet(ref(db, `availability/${empId}`), emptyForEmp).catch(console.error);
        return { ...prev, [empId]: emptyForEmp };
      });
    }
  }, []);

  const clearAvailability = useCallback(() => {
    confirm('האם לנקות את כל הזמינויות?', () => {
      _setAvailState(makeEmptyAvailability(employees));
      remove(ref(db, 'availability')).catch(console.error);
      toast('הזמינויות נוקו', 'success');
    });
  }, [confirm, employees, toast]);

  // ── Submission actions ─────────────────────────────────────────────────────

  const _flushDraft = useCallback((empId) => {
    const draft = availDraftRef.current;
    if (!draft || draftEmpIdRef.current !== empId) return;
    _setAvailState((prev) => ({ ...prev, [empId]: draft }));
    fbSet(ref(db, `availability/${empId}`), draft).catch(console.error);
    fbSet(ref(db, `availabilitySnapshots/${empId}`), draft).catch(console.error);
    _setAvailDraft(null);
    availDraftRef.current = null;
    _setDraftEmpId(null);
    draftEmpIdRef.current = null;
  }, []);

  const submitAvailability = useCallback((empId) => {
    _flushDraft(empId);
    const emp = employeesRef.current.find((e) => e.id === empId);
    const now = Date.now();
    fbSet(ref(db, `submissions/${empId}`), { submitted: true, submittedAt: now, editing: false })
      .catch(console.error);
    fbSet(ref(db, `notifications/sub_${now}_${empId}`), {
      empId, empName: emp?.name ?? empId, type: 'submitted', timestamp: now, read: false,
    }).catch(console.error);
    // Save notes snapshot
    fbSet(ref(db, `notesSnapshots/${empId}`), employeeNotesRef.current[empId] ?? null)
      .catch(console.error);
  }, [_flushDraft]);

  // Request approval from manager (employee submitted invalid availability)
  const requestApproval = useCallback((empId) => {
    _flushDraft(empId);  // push draft to Firebase so manager can see the availability
    const emp = employeesRef.current.find((e) => e.id === empId);
    const now = Date.now();
    fbSet(ref(db, `approvalRequests/${empId}`), {
      empId, empName: emp?.name ?? empId, timestamp: now,
    }).catch(console.error);
    // Notify manager
    fbSet(ref(db, `notifications/approval_${now}_${empId}`), {
      empId, empName: emp?.name ?? empId, type: 'approval_request', timestamp: now, read: false,
    }).catch(console.error);
  }, [_flushDraft]);

  // Manager approves a pending request → submit on behalf of the employee
  const approveSubmission = useCallback((empId) => {
    const emp = employeesRef.current.find((e) => e.id === empId);
    const now = Date.now();
    // Mark as submitted
    fbSet(ref(db, `submissions/${empId}`), { submitted: true, submittedAt: now, editing: false })
      .catch(console.error);
    // Save availability snapshot
    fbSet(ref(db, `availabilitySnapshots/${empId}`), availabilityRef.current[empId] ?? null)
      .catch(console.error);
    // Save notes snapshot
    fbSet(ref(db, `notesSnapshots/${empId}`), employeeNotesRef.current[empId] ?? null)
      .catch(console.error);
    // Remove the approval request
    remove(ref(db, `approvalRequests/${empId}`)).catch(console.error);
    // Notify (optional)
    fbSet(ref(db, `notifications/approved_${now}_${empId}`), {
      empId, empName: emp?.name ?? empId, type: 'approved', timestamp: now, read: false,
    }).catch(console.error);
  }, []);

  // Manager rejects a pending request
  const rejectApproval = useCallback((empId) => {
    remove(ref(db, `approvalRequests/${empId}`)).catch(console.error);
  }, []);

  const startEditing = useCallback((empId) => {
    const emp = employeesRef.current.find((e) => e.id === empId);
    const now = Date.now();
    fbSet(ref(db, `submissions/${empId}/editing`), true).catch(console.error);
    fbSet(ref(db, `notifications/edit_${now}_${empId}`), {
      empId, empName: emp?.name ?? empId, type: 'edited', timestamp: now, read: false,
    }).catch(console.error);
  }, []);

  const saveEditing = useCallback((empId) => {
    _flushDraft(empId);
    fbSet(ref(db, `submissions/${empId}`), {
      submitted: true, submittedAt: Date.now(), editing: false, hasEdited: true,
    }).catch(console.error);
    // Save notes snapshot
    fbSet(ref(db, `notesSnapshots/${empId}`), employeeNotesRef.current[empId] ?? null)
      .catch(console.error);
  }, [_flushDraft]);

  const restoreAvailability = useCallback((empId) => {
    // Restore availability
    const snap = availSnapshots[empId];
    if (snap) {
      _setAvailState((prev) => ({ ...prev, [empId]: snap }));
      fbSet(ref(db, `availability/${empId}`), snap).catch(console.error);
    }
    // Restore notes
    const notesSnap = notesSnapshots[empId] ?? null;
    _setEmployeeNotes((prev) => ({ ...prev, [empId]: notesSnap ?? {} }));
    fbSet(ref(db, `employeeNotes/${empId}`), notesSnap).catch(console.error);
  }, [availSnapshots, notesSnapshots]);

  const resetWeek = useCallback(() => {
    confirm('לאפס את כל הגשות השבוע? העובדים יצטרכו להגיש מחדש.', () => {
      remove(ref(db, 'submissions')).catch(console.error);
      remove(ref(db, 'notifications')).catch(console.error);
      remove(ref(db, 'availability')).catch(console.error);
      remove(ref(db, 'availabilitySnapshots')).catch(console.error);
      _setAvailState(makeEmptyAvailability(employeesRef.current));
      toast('השבוע אופס — האילוצים נמחקו והעובדים יגישו מחדש', 'success');
    });
  }, [confirm, toast]);

  const generalReset = useCallback(() => {
    confirm('איפוס כללי — ימחק את הסידור, האילוצים, ההגשות וההתראות. להמשיך?', () => {
      // Schedule
      setSchedule(makeEmptySchedule());
      // Availability + submissions + notifications + snapshots
      remove(ref(db, 'submissions')).catch(console.error);
      remove(ref(db, 'notifications')).catch(console.error);
      remove(ref(db, 'availability')).catch(console.error);
      remove(ref(db, 'availabilitySnapshots')).catch(console.error);
      remove(ref(db, 'notesSnapshots')).catch(console.error);
      _setAvailState(makeEmptyAvailability(employeesRef.current));
      toast('איפוס כללי בוצע', 'success');
    });
  }, [confirm, setSchedule, toast]);

  const markNotificationsRead = useCallback(() => {
    notifications.filter((n) => !n.read).forEach((n) => {
      fbSet(ref(db, `notifications/${n.id}/read`), true).catch(console.error);
    });
  }, [notifications]);

  const dismissNotification = useCallback((notifId) => {
    remove(ref(db, `notifications/${notifId}`)).catch(console.error);
  }, []);

  // ── Employee mutations ─────────────────────────────────────────────────────

  const updateEmployeeQuota = useCallback((empId, quota) => {
    setEmployees((prev) => prev.map((e) => (e.id === empId ? { ...e, quota } : e)));
  }, [setEmployees]);

  // ── Auto-fill ──────────────────────────────────────────────────────────────

  const autoFill = useCallback(() => {
    const { result, stats } = runAutoSchedule(schedule, availability, employees, shiftPriority);
    setScheduleWithHistory(result);

    const parts = [`שובצו ${stats.filled} משמרות`];
    if (stats.lowCount) parts.push(`${stats.lowCount} בעדיפות נמוכה`);
    if (stats.skipped)  parts.push(`לא ניתן לשבץ ${stats.skipped} משמרות (חסרים אילוצים)`);
    toast(parts.join(' · '), stats.skipped ? 'warning' : 'success', 'auto-schedule');
  }, [schedule, availability, employees, shiftPriority, setScheduleWithHistory, toast]);

  // ── Employee notes ─────────────────────────────────────────────────────────

  const addEmployeeNote = useCallback((empId, text) => {
    if (!text.trim()) return;
    const id   = `note_${Date.now()}`;
    const note = { id, text: text.trim(), checked: false };
    _setEmployeeNotes((prev) => ({
      ...prev,
      [empId]: { ...(prev[empId] ?? {}), [id]: note },
    }));
    fbSet(ref(db, `employeeNotes/${empId}/${id}`), note).catch(console.error);
  }, []);

  const toggleEmployeeNote = useCallback((empId, noteId) => {
    _setEmployeeNotes((prev) => {
      const cur     = prev[empId]?.[noteId];
      if (!cur) return prev;
      const updated = { ...cur, checked: !cur.checked };
      fbSet(ref(db, `employeeNotes/${empId}/${noteId}`), updated).catch(console.error);
      return { ...prev, [empId]: { ...prev[empId], [noteId]: updated } };
    });
  }, []);

  const deleteEmployeeNote = useCallback((empId, noteId) => {
    _setEmployeeNotes((prev) => {
      const next = { ...(prev[empId] ?? {}) };
      delete next[noteId];
      remove(ref(db, `employeeNotes/${empId}/${noteId}`)).catch(console.error);
      return { ...prev, [empId]: next };
    });
  }, []);

  const updateEmployeePreference = useCallback((empId, key, value) => {
    setEmployees((prev) => prev.map((e) =>
      e.id === empId
        ? { ...e, preferences: { notAlone: false, notAloneMandatory: false, shiftRules: [], preferWith: [], avoidWith: [], preferWithMandatory: [], avoidWithMandatory: [], ...(e.preferences ?? {}), [key]: value } }
        : e
    ));
  }, []);

  // ── Auto-sync to Firebase for the live /view page ────────────────────────
  const syncTimerRef = useRef(null);
  useEffect(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      fbSet(ref(db, 'sharedSchedule'), {
        schedule,
        scheduleDate,
        scheduleNotes,
        employees: employees.map(({ id: eid, name, joker }) => ({ id: eid, name, joker: joker ?? false })),
        shiftTimes,
        visible: scheduleVisible,
        savedAt: Date.now(),
      }).catch(() => {});
    }, 1500);
    return () => clearTimeout(syncTimerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule, scheduleDate, scheduleNotes, shiftTimes, scheduleVisible]);
  // (employees excluded intentionally — roster changes don't require immediate sync)

  // kept for the copy-URL button
  const saveScheduleSnapshot = useCallback(async () => {}, []);

  const updateEmployeeRequirementOverride = useCallback((empId, reqId, value) => {
    setEmployees((prev) => prev.map((e) =>
      e.id === empId
        ? { ...e, requirementOverrides: { ...(e.requirementOverrides ?? {}), [reqId]: value } }
        : e
    ));
  }, [setEmployees]);

  // ── Derived helpers ────────────────────────────────────────────────────────

  const getEmployeeShiftCount = useCallback(
    (empId) => {
      let count = 0;
      Object.values(schedule).forEach(({ slots, adHocShifts }) => {
        [...slots, ...adHocShifts].forEach((s) => {
          if (s.employee  === empId) count += shiftWeight(s.type);
          if (s.employee2 === empId) count += shiftWeight(s.type);
        });
      });
      return count;
    },
    [schedule]
  );

  // ── Context value ──────────────────────────────────────────────────────────

  const value = {
    // State
    schedule, setSchedule,
    availability: mergedAvailability, setAvailability,
    employees: effectiveEmployees, setEmployees,
    settings, setSettings,
    employeeNotes,

    // UI state
    activeView, setActiveView,
    showSettings, setShowSettings,
    showLowPriority, setShowLowPriority,
    showMissingSlots, setShowMissingSlots,
    highlightEmpId, setHighlightEmpId,
    toasts, dismissToast,
    confirmDialog, resolveConfirm,
    centerAlert, showCenterAlert, dismissCenterAlert,

    // Actions
    toast,
    confirm,
    undo,
    clearSchedule,
    clearAvailability,
    updateSlot,
    updateAdHocSlot,
    removeAdHocSlot,
    applySchedulePatches,
    toggleReshemBet,
    toggleWeekendMiddle,
    weekendMiddleActive,
    addAdHocShift,
    setAvail,
    clearEmployeeAvailability,
    updateEmployeeQuota,
    updateEmployeePreference,
    saveScheduleSnapshot,
    updateEmployeeRequirementOverride,
    addEmployeeNote,
    toggleEmployeeNote,
    deleteEmployeeNote,
    autoFill,
    shiftTimes,
    updateShiftTime,
    shiftPriority,
    setShiftPriority,
    submissions,
    availSnapshots,
    notesSnapshots,
    enableDraftMode,
    discardDraft,
    submitAvailability,
    requestApproval,
    approveSubmission,
    rejectApproval,
    approvalRequests,
    startEditing,
    saveEditing,
    restoreAvailability,
    resetWeek,
    generalReset,
    notifications,
    markNotificationsRead,
    dismissNotification,

    // Schedule metadata
    scheduleDate,    setScheduleDate,
    scheduleNotes,   setScheduleNotes,
    scheduleVisible, setScheduleVisible,

    // Derived
    getEmployeeShiftCount,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
