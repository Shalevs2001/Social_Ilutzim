import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../../firebase';
import { DAYS, DAY_KEYS } from '../../constants';
import { buildScheduleView } from '../../utils/scheduleViewModel';
import { exportScheduleSquareCanvas } from '../../utils/exportScheduleSquare';

// ── Fixed, lean palette ───────────────────────────────────────────────────────
// Deliberately independent of the app's per-shift / per-status colors. Just a
// small set of neutral tones so the exported view stays clean and consistent.
const C = {
  headerBg:    '#1a2e4a',  // top header row + shift column
  headerText:  '#ffffff',
  rowOdd:      '#ffffff',
  rowEven:     '#f3f6fa',
  border:      '#d7deea',
  name:        '#1a2e4a',  // employee names
  muted:       '#8a96a8',  // empty cells / secondary text
  shiftHours:  '#aebacc',  // hours under the shift label (on dark bg)
  deviation:   '#c2410c',  // changed hours — stands out
  deviationBg: '#fff4ec',
};

// ── Entry (one slot's worth of content inside a cell) ──────────────────────────

function CellEntry({ entry }) {
  return (
    <div className="py-0.5">
      {entry.customLabel && (
        <div style={{ color: C.muted }} className="text-[11px] font-semibold leading-tight mb-0.5">
          {entry.customLabel}
        </div>
      )}

      {entry.names.length > 0 ? (
        entry.names.map((n, i) => (
          <div key={i} style={{ color: C.name }} className="font-bold text-[15px] leading-tight">
            {n}
          </div>
        ))
      ) : (
        <span style={{ color: C.muted }}>—</span>
      )}

      {entry.tags.map((t) => (
        <div
          key={t}
          style={{ backgroundColor: C.headerBg, color: C.headerText }}
          className="mt-1 inline-block rounded px-1.5 py-0.5 text-[13px] font-bold leading-tight"
        >
          {t}
        </div>
      ))}

      {entry.deviation && (
        <div
          style={{ color: C.deviation, backgroundColor: C.deviationBg, direction: 'ltr' }}
          className="mt-1 inline-block rounded px-1.5 py-0.5 text-[15px] font-extrabold leading-tight"
        >
          {entry.deviation}
        </div>
      )}
    </div>
  );
}

// ── Table ──────────────────────────────────────────────────────────────────────

function ScheduleTable({ rows }) {
  if (rows.length === 0) {
    return <div className="text-center text-gray-400 py-10">אין משמרות לשבוע זה</div>;
  }

  const cellBorder = `1px solid ${C.border}`;

  return (
    <table className="w-full border-collapse text-center" style={{ tableLayout: 'fixed' }}>
      <thead>
        <tr>
          <th
            style={{ backgroundColor: C.headerBg, color: C.headerText, border: cellBorder, width: '15%' }}
            className="py-2.5 px-2 text-[13px] font-bold"
          >
            משמרת
          </th>
          {DAY_KEYS.map((d, i) => (
            <th
              key={d}
              style={{ backgroundColor: C.headerBg, color: C.headerText, border: cellBorder }}
              className="py-2.5 px-1 text-[14px] font-bold"
            >
              {DAYS[i]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => {
          const rowBg = ri % 2 === 0 ? C.rowOdd : C.rowEven;
          return (
            <tr key={row.key}>
              {/* Right-hand shift column: name + standard hours */}
              <th
                scope="row"
                style={{ backgroundColor: C.headerBg, color: C.headerText, border: cellBorder }}
                className="py-2 px-2 align-middle"
              >
                <div className="text-[14px] font-bold leading-tight">{row.label}</div>
                {row.hours && (
                  <div style={{ color: C.shiftHours, direction: 'ltr' }} className="text-[11px] font-mono mt-0.5">
                    {row.hours}
                  </div>
                )}
              </th>

              {row.days.map((entries, i) => (
                <td
                  key={DAY_KEYS[i]}
                  style={{ backgroundColor: rowBg, border: cellBorder }}
                  className="py-1.5 px-1 align-top"
                >
                  {entries.length > 0
                    ? entries.map((entry, ei) => <CellEntry key={ei} entry={entry} />)
                    : <span style={{ color: C.muted }} className="text-[13px]">—</span>}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── Square image preview + download ───────────────────────────────────────────

function SquareExport({ data }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    const canvas = exportScheduleSquareCanvas(data, 1080);
    setSrc(canvas.toDataURL('image/png'));
  }, [data]);

  if (!src) return null;

  return (
    <div className="max-w-[420px] mx-auto">
      <img
        src={src}
        alt="סידור משמרות"
        className="w-full rounded-xl shadow-md border border-gray-200 bg-white"
      />
      <div className="text-center text-xs text-gray-400 mt-1.5">
        תמונה ריבועית 1080×1080 — לחיצה ימנית / לחיצה ארוכה על התמונה כדי לשמור
      </div>
    </div>
  );
}

// ── Main view page ───────────────────────────────────────────────────────────

export function ScheduleViewPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onValue(ref(db, 'sharedSchedule'), (snap) => {
      setData(snap.exists() ? snap.val() : null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-gray-400 text-sm">⏳ טוען סידור...</div>
      </div>
    );
  }

  if (!data || !data.visible) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center select-none">
          <div className="text-7xl mb-4">🚧</div>
          <div className="text-2xl font-bold text-gray-700 mb-1">הסידור בבנייה</div>
          <div className="text-gray-400 text-sm">חזרו מאוחר יותר</div>
        </div>
      </div>
    );
  }

  const { scheduleDate, scheduleNotes, savedAt } = data;

  const rows = buildScheduleView(data);

  const savedDate = savedAt
    ? new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(savedAt))
    : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">

      {/* Header */}
      <div className="bg-[#1a2e4a] text-white px-4 py-5 shrink-0 text-center">
        <div className="text-2xl font-bold tracking-tight">סידור משמרות</div>
        {scheduleDate && (
          <div className="text-white/75 text-base mt-1 font-medium">{scheduleDate}</div>
        )}
        {savedDate && (
          <div className="text-white/35 text-xs mt-1">עודכן {savedDate}</div>
        )}
      </div>

      {/* Notes — prominently above the grid */}
      {scheduleNotes && (
        <div className="bg-yellow-50 border-b-2 border-yellow-200 px-4 py-3 shrink-0">
          <div className="max-w-[760px] mx-auto">
            <div className="text-xs font-bold text-yellow-700 uppercase tracking-wide mb-1.5">📌 הערות</div>
            <div
              className="text-base text-gray-800 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: scheduleNotes }}
            />
          </div>
        </div>
      )}

      {/* Square image for WhatsApp group picture */}
      <div className="p-4 shrink-0">
        <SquareExport data={data} />
      </div>

      {/* Readable table */}
      <div className="flex-1 px-3 pb-4">
        <div className="mx-auto max-w-[760px] overflow-x-auto">
          <ScheduleTable rows={rows} />
        </div>
      </div>

    </div>
  );
}
