import { useState, useEffect } from 'react';
import { AppProvider, useApp } from '../../context/AppContext';
import { AvailabilityGrid } from '../availability/AvailabilityGrid';
import { useEmployeeValidation } from '../availability/ValidationSummary';

// ─── Submitted screen ─────────────────────────────────────────────────────────

function SubmittedScreen({ emp, onEdit }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center flex flex-col items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl">✓</div>
        <div>
          <div className="text-lg font-bold text-[#1a2e4a]">האילוצים הוגשו!</div>
          <div className="text-sm text-gray-500 mt-1">תודה {emp.name}, האילוצים שלך נקלטו בהצלחה</div>
        </div>
        <button
          onClick={onEdit}
          className="px-6 py-2.5 rounded-xl border border-[#1a2e4a] text-[#1a2e4a] text-sm font-medium hover:bg-[#1a2e4a] hover:text-white transition-colors"
        >
          ערוך אילוצים
        </button>
      </div>
    </div>
  );
}

// ─── Main shell ───────────────────────────────────────────────────────────────

function EmployeeShell() {
  const { employees: allEmployees, submissions, approvalRequests, submitAvailability, requestApproval, startEditing, saveEditing, enableDraftMode, discardDraft } = useApp();
  const employees = allEmployees.filter((e) => !e.joker);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => { document.title = 'סידור משמרות שבועי - עובדים'; }, []);

  const emp = employees.find((e) => e.id === selectedId);
  const sub = emp ? (submissions[emp.id] ?? {}) : {};
  const isSubmitted    = !!sub.submitted;
  const isEditing      = !!sub.editing;
  const isPendingApproval = emp ? !!approvalRequests[emp.id] : false;
  const showingForm = !!emp && (!isSubmitted || isEditing);

  // All hooks must be declared before any conditional return
  const [showWarning, setShowWarning] = useState(false);
  const validation = useEmployeeValidation(emp?.id ?? null);

  useEffect(() => {
    if (showingForm) enableDraftMode(emp.id);
    else discardDraft();
  }, [showingForm, emp?.id]); // eslint-disable-line

  // ── Name picker ──────────────────────────────────────────────────────────────
  if (!emp) {
    return (
      <div className="min-h-screen bg-[#f0f6fb] flex flex-col" dir="rtl">
        <Header subtitle="הגשת אילוצים שבועית" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
            <h2 className="text-lg font-bold text-[#1a2e4a] mb-1 text-center">מי את/ה?</h2>
            <p className="text-xs text-gray-400 text-center mb-6">בחר/י שם כדי להגיש אילוצים</p>
            <div className="flex flex-col gap-2">
              {employees.map((e) => {
                return (
                  <button
                    key={e.id}
                    onClick={() => setSelectedId(e.id)}
                    className="w-full px-4 py-3 rounded-xl border text-sm font-medium text-right transition-colors
                      border-gray-200 text-gray-700 hover:bg-[#1a2e4a] hover:text-white hover:border-[#1a2e4a]"
                  >
                    {e.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Submitted (and not editing) ───────────────────────────────────────────────
  if (isSubmitted && !isEditing) {
    return (
      <div className="min-h-screen bg-[#f0f6fb] flex flex-col" dir="rtl">
        <Header subtitle={`הגשת אילוצים — ${emp.name}`} onBack={() => setSelectedId(null)} />
        <SubmittedScreen emp={emp} onEdit={() => startEditing(emp.id)} />
      </div>
    );
  }

  // ── Form (new submission or editing) ─────────────────────────────────────────
  const doSubmit = () => {
    setShowWarning(false);
    if (isEditing) saveEditing(emp.id);
    else submitAvailability(emp.id);
  };

  const doRequestApproval = () => {
    setShowWarning(false);
    requestApproval(emp.id);
  };

  const handleSubmit = () => {
    if (!validation.passed) {
      setShowWarning(true);
    } else {
      doSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f6fb] flex flex-col" dir="rtl">
      <Header
        subtitle={isEditing ? `עריכת אילוצים — ${emp.name}` : `הגשת אילוצים — ${emp.name}`}
        onBack={() => setSelectedId(null)}
      />
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-hidden">
          <AvailabilityGrid singleEmpId={emp.id} />
        </div>

        {/* Submit / Save button — or pending-approval banner */}
        <div className="bg-white border-t border-gray-200 px-4 py-3 flex justify-center">
          {isPendingApproval ? (
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-sm font-semibold">
              <span className="text-base">⏳</span>
              ממתין לאישור מנהל
            </div>
          ) : (
            <button
              onClick={handleSubmit}
              className="px-8 py-3 rounded-xl bg-[#1a2e4a] text-white font-bold text-sm hover:bg-[#2563a8] transition-colors shadow-sm"
            >
              {isEditing ? 'שמור עדכון' : 'שלח אילוצים ✓'}
            </button>
          )}
        </div>
      </div>

      {/* Validation warning overlay */}
      {showWarning && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden">
            <div className="bg-red-50 px-5 pt-5 pb-4">
              <div className="text-base font-bold text-red-700 mb-3">האילוצים שהגשת לא עומדים בדרישות:</div>
              <ul className="flex flex-col gap-1.5">
                {validation.errors.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                    <span className="font-bold shrink-0">✕</span>
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="px-5 py-4 flex flex-col items-center gap-3">
              <button
                onClick={() => setShowWarning(false)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#1a2e4a] text-white text-sm font-bold hover:bg-[#2563a8] transition-colors"
              >
                חזור ותקן
              </button>
              <button
                onClick={doRequestApproval}
                className="w-full px-4 py-2.5 rounded-xl border border-amber-400 bg-amber-50 text-amber-800 text-sm font-semibold hover:bg-amber-100 transition-colors"
              >
                שלח לאישור מנהל
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared header ────────────────────────────────────────────────────────────

function Header({ subtitle, onBack }) {
  return (
    <header className="bg-[#1a2e4a] text-white shadow-lg px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#38bcd4] flex items-center justify-center font-bold text-sm shrink-0">כ</div>
        <div>
          <div className="font-bold text-base leading-tight">סושיאל כאן חדשות</div>
          <div className="text-xs text-[#38bcd4] leading-tight">{subtitle}</div>
        </div>
      </div>
      {onBack && (
        <button
          onClick={onBack}
          className="text-xs text-white/60 hover:text-white border border-white/20 hover:border-white/40 rounded-lg px-3 py-1.5 transition-colors"
        >
          חזרה
        </button>
      )}
    </header>
  );
}

export function EmployeeViewPage() {
  return (
    <AppProvider>
      <EmployeeShell />
    </AppProvider>
  );
}
