import { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ScheduleGrid }           from './components/schedule/ScheduleGrid';
import { AvailabilityGrid }       from './components/availability/AvailabilityGrid';
import { SettingsModal }          from './components/settings/SettingsModal';
import { DndProvider }            from './components/schedule/DndProvider';
import { DraggableEmployeeCard }  from './components/schedule/DraggableEmployeeCard';

// ─── Toast strip ─────────────────────────────────────────────────────────────

function Toasts() {
  const { toasts, dismissToast } = useApp();
  if (!toasts.length) return null;

  const typeClass = {
    info:    'bg-blue-100 border-blue-300 text-blue-800',
    success: 'bg-green-100 border-green-300 text-green-800',
    warning: 'bg-yellow-100 border-yellow-400 text-yellow-800',
    error:   'bg-red-100 border-red-300 text-red-800',
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 min-w-[280px]">
      {toasts.map((t) => (
        <div
          key={`${t.id}-${t.bump ?? 0}`}
          className={`${t.bump ? 'toast-shake' : ''} flex items-center justify-between gap-4 px-4 py-2 rounded-lg border shadow-md text-sm ${typeClass[t.type] ?? typeClass.info}`}
        >
          <span>{t.message}</span>
          <button onClick={() => dismissToast(t.id)} className="font-bold opacity-60 hover:opacity-100">✕</button>
        </div>
      ))}
    </div>
  );
}

// ─── Center alert ─────────────────────────────────────────────────────────────

function playErrorSound() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const t    = ctx.currentTime;
    [0, 0.18].forEach((offset) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.value = 180;
      gain.gain.setValueAtTime(0.35, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.16);
      osc.start(t + offset);
      osc.stop(t + offset + 0.16);
    });
  } catch { /* ignore */ }
}

function CenterAlert() {
  const { centerAlert, dismissCenterAlert } = useApp();

  useEffect(() => {
    if (!centerAlert) return;
    if (centerAlert.type === 'forced') playErrorSound();
    const timer = setTimeout(dismissCenterAlert, 1750);
    return () => clearTimeout(timer);
  }, [centerAlert, dismissCenterAlert]);

  if (!centerAlert) return null;

  const isForced = centerAlert.type === 'forced';
  const colors   = isForced
    ? 'bg-red-50 border-red-200 text-red-800'
    : 'bg-blue-50 border-blue-200 text-blue-800';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      onClick={dismissCenterAlert}
    >
      <div className={`px-10 py-5 rounded-2xl border shadow-lg text-center max-w-sm
        text-sm font-semibold leading-snug pointer-events-auto cursor-pointer ${colors}`}>
        {centerAlert.message}
      </div>
    </div>
  );
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────

function ConfirmDialog() {
  const { confirmDialog, resolveConfirm } = useApp();
  if (!confirmDialog) return null;

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
        <p className="text-gray-800 text-base mb-5">{confirmDialog.message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => resolveConfirm(false)}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            ביטול
          </button>
          <button
            onClick={() => resolveConfirm(true)}
            className="px-4 py-2 rounded-lg bg-red-400 text-white hover:bg-red-500"
          >
            אישור
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function NotificationsBell() {
  const { notifications, markNotificationsRead, dismissNotification, employees,
          approvalRequests, approveSubmission, rejectApproval } = useApp();
  const [open, setOpen] = useState(false);
  const pendingApprovals = Object.values(approvalRequests);
  const unread = notifications.filter((n) => !n.read).length + pendingApprovals.length;

  const toggle = () => {
    if (!open) markNotificationsRead();
    setOpen((v) => !v);
  };

  const formatTime = (ts) => {
    const d   = new Date(ts);
    const now = new Date();
    const time = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return time;
    return `${d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })} ${time}`;
  };

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="relative px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition-colors"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden" dir="rtl">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-bold text-[#1a2e4a]">התראות</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
          </div>
          {pendingApprovals.length === 0 && notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">אין התראות</div>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-gray-50">

              {/* ── Pending approval requests (always on top) ── */}
              {pendingApprovals.map((req) => (
                <li key={req.empId} className="px-4 py-3 bg-amber-50">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-lg shrink-0">⚠️</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-800 font-semibold">{req.empName}</div>
                      <div className="text-xs text-amber-700">מבקש/ת אישור להגשה חריגה</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">{formatTime(req.timestamp)}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); approveSubmission(req.empId); }}
                      className="flex-1 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-bold transition-colors"
                    >
                      ✓ אשר
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); rejectApproval(req.empId); }}
                      className="flex-1 py-1.5 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 text-xs font-bold transition-colors"
                    >
                      ✕ דחה
                    </button>
                  </div>
                </li>
              ))}

              {/* ── Regular notifications ── */}
              {notifications.map((n) => (
                <li key={n.id} className="px-4 py-3 flex items-start gap-3 group">
                  <span className="text-lg shrink-0">{n.type === 'submitted' ? '📬' : n.type === 'approved' ? '✅' : '✏️'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-800">
                      <span className="font-semibold">{n.empName}</span>
                      {(() => {
                        const emp = employees.find((e) => e.id === n.empId);
                        const isFemale = emp?.gender === 'female';
                        if (n.type === 'submitted') return isFemale ? ' הגישה אילוצים' : ' הגיש אילוצים';
                        if (n.type === 'approved')  return ' — אישרת הגשה חריגה';
                        return isFemale ? ' עדכנה אילוצים' : ' עדכן אילוצים';
                      })()}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{formatTime(n.timestamp)}</div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); dismissNotification(n.id); }}
                    className="opacity-0 group-hover:opacity-50 hover:!opacity-100 text-gray-400 hover:text-red-500 text-[10px] shrink-0 mt-0.5 transition-opacity"
                    title="הסר התראה"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/employee`;

  const copy = () => {
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className={`w-36 py-1.5 rounded-lg text-sm transition-colors text-center ${
        copied
          ? 'bg-green-500/80 text-white'
          : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white'
      }`}
    >
      {copied ? '✓ הועתק' : '🔗 קישור לעובדים'}
    </button>
  );
}

function Header() {
  const { activeView, setActiveView, setShowSettings, generalReset, undo } = useApp();

  return (
    <header className="bg-[#1a2e4a] text-white shadow-lg">
      <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Logo / title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#38bcd4] flex items-center justify-center font-bold text-sm">כ</div>
          <div>
            <div className="font-bold text-base leading-tight">סושיאל כאן חדשות</div>
            <div className="text-xs text-[#38bcd4] leading-tight">סידור משמרות שבועי</div>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex bg-white/10 rounded-lg p-1 gap-1">
          {[
            { key: 'schedule',     label: 'סידור'  },
            { key: 'availability', label: 'אילוצים'  },
            { key: 'split',        label: 'מפוצל' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveView(key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeView === key
                  ? 'bg-white text-[#1a2e4a]'
                  : 'text-white/80 hover:bg-white/20'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <CopyLinkButton />
          <NotificationsBell />
          <button
            onClick={undo}
            title="בטל פעולה אחרונה (Ctrl+Z)"
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition-colors"
          >
            ↩ בטל
          </button>
          <button
            onClick={generalReset}
            className="px-3 py-1.5 rounded-lg bg-red-500/70 hover:bg-red-500 text-sm transition-colors"
          >
            איפוס כללי
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition-colors"
          >
            ⚙ הגדרות
          </button>
        </div>
      </div>
    </header>
  );
}

// ─── Sidebar – employee quota tracker (dnd-kit draggable cards) ──────────────

function Sidebar() {
  const { employees, getEmployeeShiftCount } = useApp();

  return (
    <aside className="w-48 shrink-0 bg-white border-l border-gray-200 p-3 flex flex-col gap-2">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">עובדים</h2>
      {employees.map((emp) => (
        <DraggableEmployeeCard
          key={emp.id}
          emp={emp}
          count={getEmployeeShiftCount(emp.id)}
        />
      ))}
      <div className="mt-auto pt-3 border-t border-gray-100">
        <p className="text-[10px] text-gray-400 text-center">גרור עובד לתא הרצוי</p>
      </div>
    </aside>
  );
}

// ─── Placeholder views (filled in later stages) ──────────────────────────────

function ScheduleView({ compact = false }) {
  return <ScheduleGrid compact={compact} />;
}

function AvailabilityView({ compact = false }) {
  return <AvailabilityGrid compact={compact} />;
}


// ─── Root shell ───────────────────────────────────────────────────────────────

function Shell() {
  const { activeView } = useApp();

  useEffect(() => { document.title = 'סידור משמרות שבועי - מנהל'; }, []);

  return (
    <div className="min-h-screen bg-[#f0f6fb] flex flex-col" dir="rtl">
      <Header />

      <DndProvider>
        {activeView !== 'split' ? (
          <div className="flex flex-1 overflow-hidden max-w-screen-xl mx-auto w-full">
            {activeView !== 'availability' && <Sidebar />}
            <main className="flex-1 overflow-auto">
              {activeView === 'schedule'     && <ScheduleView />}
              {activeView === 'availability' && <AvailabilityView />}
            </main>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden w-full">
            <Sidebar />
            <div className="flex-1 overflow-auto border-r border-gray-200">
              <ScheduleView compact />
            </div>
            <div className="w-[40%] shrink-0 overflow-hidden border-r border-gray-200">
              <AvailabilityView compact />
            </div>
          </div>
        )}
      </DndProvider>

      <Toasts />
      <CenterAlert />
      <ConfirmDialog />
      <SettingsModal />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider isAdmin>
      <Shell />
    </AppProvider>
  );
}
